import { vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ElectronService } from '@keira/shared/common-services';
import { Connection, ConnectionOptions, QueryError } from 'mysql2';
import { tickAsync } from 'ngx-page-object-model';
import { of, Subscriber, throwError } from 'rxjs';
import { instance, mock, reset } from 'ts-mockito';
import { MysqlService } from './mysql.service';
import { KeiraConnectionOptions } from './mysql.model';

class MockMySql {
  createConnection() {}
}

class MockConnection {
  query() {}
  connect() {}
  on() {}
}

type SshHandler = (arg?: unknown) => void;

class MockSshClient {
  private readonly handlers = new Map<string, SshHandler>();
  on(event: string, handler: SshHandler): this {
    this.handlers.set(event, handler);
    return this;
  }
  connect() {}
  end() {}
  forwardOut() {}
  emit(event: string, arg?: unknown): void {
    this.handlers.get(event)?.(arg);
  }
}

describe('MysqlService', () => {
  const config: ConnectionOptions = { host: 'azerothcore.org' };

  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        MysqlService,
        { provide: ElectronService, useValue: instance(mock(ElectronService)) },
      ],
    }),
  );

  function setup() {
    const service = TestBed.inject(MysqlService);
    return { service };
  }

  it('connectionEstablished getter', () => {
    const { service } = setup();
    service['_connectionEstablished'] = true;
    expect(service.connectionEstablished).toBe(true);
  });

  it('getConnectionState should return null when there is no connection', () => {
    const { service } = setup();
    (service as any)._connection = null;
    expect(service.getConnectionState()).toBe('EMPTY');

    (service as any)._connection = {};
    expect(service.getConnectionState()).toBe('CONNECTED');
  });

  it('connect(config) should properly work', () => {
    const { service } = setup();
    (service as any).mysql = new MockMySql();
    const mockConnection = new MockConnection();
    const createConnectionSpy = vi.spyOn((service as any).mysql, 'createConnection').mockReturnValue(mockConnection);
    const connectSpy = vi.spyOn(mockConnection, 'connect').mockImplementation(() => undefined);

    const obs = service.connect(config);

    expect(createConnectionSpy).toHaveBeenCalledWith(config);
    expect(service.config).toEqual(config);

    obs.subscribe(() => {
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('connect(config) with the SSH tunnel enabled', () => {
    const stream = { mock: 'stream' };
    const sshConfig: KeiraConnectionOptions = {
      host: 'db.azerothcore.org',
      port: 3307,
      user: 'root',
      password: 'root',
      sshEnabled: true,
      sshHost: 'ssh.azerothcore.org',
      sshPort: 2222,
      sshUser: 'shin',
      sshPassword: 'sshSecret',
      sshPrivateKey: '',
    };

    function setupSsh() {
      const { service } = setup();
      const sshClients = [new MockSshClient(), new MockSshClient()];
      let createdClients = 0;
      (service as any).ssh2 = {
        Client: vi.fn(function () {
          return sshClients[createdClients++];
        }),
      };
      (service as any).mysql = new MockMySql();
      const mockConnection = new MockConnection();
      const createConnectionSpy = vi.spyOn((service as any).mysql, 'createConnection').mockReturnValue(mockConnection);
      vi.spyOn(mockConnection, 'connect').mockImplementation((callback: any) => callback(null));
      const sshClient = sshClients[0];
      const sshConnectSpy = vi.spyOn(sshClient, 'connect');
      const forwardOutSpy = vi.spyOn(sshClient, 'forwardOut').mockImplementation((...args: any[]) => args[4](undefined, stream));
      const next = vi.fn();
      const error = vi.fn();
      return { service, sshClients, sshClient, sshConnectSpy, forwardOutSpy, createConnectionSpy, next, error };
    }

    it('should authenticate with the SSH password and connect to MySQL through the forwarded stream', () => {
      const { service, sshClient, sshConnectSpy, forwardOutSpy, createConnectionSpy, next } = setupSsh();

      service.connect({ ...sshConfig }).subscribe({ next });
      sshClient.emit('ready');

      expect(sshConnectSpy).toHaveBeenCalledExactlyOnceWith({
        host: 'ssh.azerothcore.org',
        port: 2222,
        username: 'shin',
        password: 'sshSecret',
      });
      expect(forwardOutSpy).toHaveBeenCalledExactlyOnceWith('127.0.0.1', 0, 'db.azerothcore.org', 3307, expect.any(Function));
      expect(createConnectionSpy).toHaveBeenCalledExactlyOnceWith({
        user: 'root',
        password: 'root',
        multipleStatements: true,
        stream,
        host: undefined,
        port: undefined,
      });
      expect(next).toHaveBeenCalledTimes(1);
      expect(service.sshTunnelActive).toBe(true);
      expect(service.connectionEstablished).toBe(true);
    });

    it('should authenticate with the private key and use the SSH password as its passphrase', () => {
      const { service, sshConnectSpy } = setupSsh();

      service.connect({ ...sshConfig, sshPort: undefined, sshPrivateKey: 'PRIVATE KEY' }).subscribe();

      expect(sshConnectSpy).toHaveBeenCalledExactlyOnceWith({
        host: 'ssh.azerothcore.org',
        port: 22,
        username: 'shin',
        privateKey: 'PRIVATE KEY',
        passphrase: 'sshSecret',
      });
    });

    it('should authenticate with a private key that has no passphrase', () => {
      const { service, sshConnectSpy } = setupSsh();

      service.connect({ ...sshConfig, sshPassword: '', sshPrivateKey: 'PRIVATE KEY' }).subscribe();

      expect(sshConnectSpy).toHaveBeenCalledExactlyOnceWith({
        host: 'ssh.azerothcore.org',
        port: 2222,
        username: 'shin',
        privateKey: 'PRIVATE KEY',
      });
    });

    it('should forward to the default MySQL host and port when they are not set', () => {
      const { service, sshClient, forwardOutSpy } = setupSsh();

      service.connect({ ...sshConfig, host: '', port: undefined }).subscribe();
      sshClient.emit('ready');

      expect(forwardOutSpy).toHaveBeenCalledExactlyOnceWith('127.0.0.1', 0, '127.0.0.1', 3306, expect.any(Function));
    });

    it('should emit the error and mark the tunnel inactive when the port forwarding fails', () => {
      const { service, sshClient, forwardOutSpy, createConnectionSpy, next, error } = setupSsh();
      const forwardError = new Error('forwarding refused');
      forwardOutSpy.mockImplementation((...args: any[]) => args[4](forwardError));

      service.connect({ ...sshConfig }).subscribe({ next, error });
      sshClient.emit('ready');

      expect(error).toHaveBeenCalledExactlyOnceWith(forwardError);
      expect(next).toHaveBeenCalledTimes(0);
      expect(createConnectionSpy).toHaveBeenCalledTimes(0);
      expect(service.sshTunnelActive).toBe(false);
    });

    it('should emit the error and mark the tunnel inactive when the SSH client fails', () => {
      const { service, sshClient, next, error } = setupSsh();
      const sshError = new Error('authentication failed');

      service.connect({ ...sshConfig }).subscribe({ next, error });
      sshClient.emit('error', sshError);

      expect(error).toHaveBeenCalledExactlyOnceWith(sshError);
      expect(service.sshTunnelActive).toBe(false);
    });

    it('should mark the tunnel inactive when the SSH connection closes', () => {
      const { service, sshClient } = setupSsh();

      service.connect({ ...sshConfig }).subscribe();
      sshClient.emit('ready');
      sshClient.emit('close');

      expect(service.sshTunnelActive).toBe(false);
    });

    it('should close the previous tunnel before opening a new one', () => {
      const { service, sshClients } = setupSsh();
      const endSpy = vi.spyOn(sshClients[0], 'end');
      const secondConnectSpy = vi.spyOn(sshClients[1], 'connect');

      service.connect({ ...sshConfig }).subscribe();
      sshClients[0].emit('ready');
      service.connect({ ...sshConfig }).subscribe();

      expect(endSpy).toHaveBeenCalledTimes(1);
      expect(secondConnectSpy).toHaveBeenCalledTimes(1);
      expect(service.sshTunnelActive).toBe(false);
    });
  });

  describe('dbQuery(queryString)', () => {
    it('should properly work', () => {
      const { service } = setup();
      (service as any).mysql = new MockMySql();
      const mockConnection = new MockConnection();
      service['_connection'] = mockConnection as unknown as Connection;
      const querySpy = vi.spyOn(mockConnection, 'query').mockImplementation(() => undefined);
      const queryStr = '--some mock query';

      const obs = service.dbQuery(queryStr, []);

      obs.subscribe(() => {
        expect(querySpy).toHaveBeenCalledTimes(1);
        expect(querySpy).toHaveBeenCalledWith(queryStr, [], expect.any(Function));
      });
    });

    it('should give error if _connection is not defined', () => {
      const { service } = setup();
      (service as any).mysql = new MockMySql();
      service['_connection'] = undefined as any;
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const queryStr = '--some mock query';

      const obs = service.dbQuery(queryStr, []);

      obs.subscribe(() => {
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith(`_connection was not defined when trying to run query: ${queryStr}`);
      });
    });

    it('should give error if reconnection is in progress', () => {
      const { service } = setup();
      (service as any).mysql = new MockMySql();
      service['_reconnecting'] = true;
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const queryStr = '--some mock query';

      const obs = service.dbQuery(queryStr);

      obs.subscribe(() => {
        expect(console.error).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalledWith(`Reconnection in progress while trying to run query: ${queryStr}`);
      });
    });
  });

  describe('callbacks', () => {
    const error = { code: 'some error', errno: 1234 } as QueryError;

    function setupCallbacks() {
      const { service } = setup();
      const subscriber = new Subscriber();
      const errorSpy = vi.spyOn(subscriber, 'error').mockImplementation(() => undefined);
      const nextSpy = vi.spyOn(subscriber, 'next').mockImplementation(() => undefined);
      const completeSpy = vi.spyOn(subscriber, 'complete').mockImplementation(() => undefined);
      return { service, subscriber, errorSpy, nextSpy, completeSpy };
    }

    describe('connect', () => {
      function setupConnect() {
        const result = setupCallbacks();
        const callback = result.service['getConnectCallback'](result.subscriber) as any;
        return { ...result, callback };
      }

      it('should correctly work', () => {
        const { service, errorSpy, nextSpy, completeSpy, callback } = setupConnect();
        service['_connectionEstablished'] = false;
        service['_connection'] = { on: vi.fn() } as any;

        callback();

        expect(errorSpy).toHaveBeenCalledTimes(0);
        expect(nextSpy).toHaveBeenCalledTimes(1);
        expect(completeSpy).toHaveBeenCalledTimes(1);
        expect(service['_connectionEstablished']).toBe(true);
        expect(service['_connection'].on).toHaveBeenCalledTimes(1);
      });

      it('should correctly handle errors', () => {
        const { service, errorSpy, nextSpy, completeSpy, callback } = setupConnect();
        service['_connectionEstablished'] = true;

        callback(error);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(error);
        expect(nextSpy).toHaveBeenCalledTimes(0);
        expect(completeSpy).toHaveBeenCalledTimes(1);
        expect(service['_connectionEstablished']).toBe(false);
      });
    });

    describe('query', () => {
      const result = 'some mock result';
      const fields = 'some mock fields';

      function setupQuery() {
        const callbacksResult = setupCallbacks();
        const callback = callbacksResult.service['getQueryCallback'](callbacksResult.subscriber) as any;
        return { ...callbacksResult, callback };
      }

      it('should correctly work', () => {
        const { errorSpy, nextSpy, completeSpy, callback } = setupQuery();
        callback(undefined, result, fields);

        expect(errorSpy).toHaveBeenCalledTimes(0);
        expect(nextSpy).toHaveBeenCalledTimes(1);
        expect(nextSpy).toHaveBeenCalledWith({ result, fields });
        expect(completeSpy).toHaveBeenCalledTimes(1);
      });

      it('should correctly handle errors', () => {
        const { errorSpy, nextSpy, completeSpy, callback } = setupQuery();
        callback(error, result, fields);

        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy).toHaveBeenCalledWith(error);
        expect(nextSpy).toHaveBeenCalledTimes(0);
        expect(completeSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('handleConnectionError(error)', () => {
    it('should call reconnect if the error is PROTOCOL_CONNECTION_LOST', () => {
      const { service } = setup();
      const error = { code: 'PROTOCOL_CONNECTION_LOST' };
      vi.spyOn<any>(service, 'reconnect').mockImplementation(() => undefined);

      service['handleConnectionError'](error);

      expect(service['reconnect']).toHaveBeenCalledTimes(1);
    });

    it('should NOT call reconnect if the error is something else', () => {
      const { service } = setup();
      const error = { code: 'SOME_OTHER_ERROR' };
      vi.spyOn<any>(service, 'reconnect').mockImplementation(() => undefined);

      service['handleConnectionError'](error);

      expect(service['reconnect']).toHaveBeenCalledTimes(0);
    });
  });

  it('reconnect() should correctly work ', async () => {
    const { service } = setup();
    service['_reconnecting'] = false;
    service['_config'] = {} as KeiraConnectionOptions;
    vi.spyOn(service['_connectionLostSubject'], 'next').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    (service as any).mysql = new MockMySql();
    const mockConnection = new MockConnection();
    vi.spyOn((service as any).mysql, 'createConnection').mockReturnValue(mockConnection);

    service['reconnect']();

    expect(service['_reconnecting']).toBe(true);
    expect(service['_connectionLostSubject'].next).toHaveBeenCalledTimes(1);
    expect(service['_connectionLostSubject'].next).toHaveBeenCalledWith(false);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledWith(`DB connection lost. Reconnecting in 500 ms...`);

    await tickAsync(500);
    expect(service['_connection']).toEqual(mockConnection as unknown as Connection);
  });

  describe('reconnect() with the SSH tunnel enabled', () => {
    function setupSshReconnect() {
      const { service } = setup();
      service['_config'] = { sshEnabled: true } as KeiraConnectionOptions;
      vi.spyOn(service['_connectionLostSubject'], 'next').mockImplementation(() => undefined);
      vi.spyOn(console, 'info').mockImplementation(() => undefined);
      const reconnectCallbackSpy = vi.spyOn<any>(service, 'reconnectCallback').mockImplementation(() => undefined);
      return { service, reconnectCallbackSpy };
    }

    it('should reopen the tunnel and complete the reconnection', async () => {
      const { service, reconnectCallbackSpy } = setupSshReconnect();
      const connectViaSshTunnelSpy = vi.spyOn<any>(service, 'connectViaSshTunnel').mockReturnValue(of(undefined));

      service['reconnect']();
      await tickAsync(500);

      expect(connectViaSshTunnelSpy).toHaveBeenCalledExactlyOnceWith(service.config);
      expect(reconnectCallbackSpy).toHaveBeenCalledExactlyOnceWith(null);
    });

    it('should retry when reopening the tunnel fails', async () => {
      const { service, reconnectCallbackSpy } = setupSshReconnect();
      vi.spyOn<any>(service, 'connectViaSshTunnel').mockReturnValue(throwError(() => new Error('tunnel down')));

      service['reconnect']();
      const retrySpy = vi.spyOn<any>(service, 'reconnect').mockImplementation(() => undefined);
      await tickAsync(500);

      expect(retrySpy).toHaveBeenCalledTimes(1);
      expect(reconnectCallbackSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('reconnectCallback(err)', () => {
    it('should call reconnect() in case of error', () => {
      const { service } = setup();
      service['_reconnecting'] = true;
      vi.spyOn(service['_connectionLostSubject'], 'next').mockImplementation(() => undefined);
      vi.spyOn<any>(service, 'reconnect').mockImplementation(() => undefined);
      service['_connection'] = { on: vi.fn() } as any;

      service['reconnectCallback']({ code: 'mock-error' } as unknown as QueryError);

      expect(service['reconnect']).toHaveBeenCalledTimes(1);
      expect(service['_reconnecting']).toBe(true);
      expect(service['_connectionLostSubject'].next).toHaveBeenCalledTimes(0);
      expect(service['_connection'].on).toHaveBeenCalledTimes(0);
    });

    it('should correctly work otherwise', () => {
      const { service } = setup();
      service['_reconnecting'] = true;
      vi.spyOn(service['_connectionLostSubject'], 'next').mockImplementation(() => undefined);
      vi.spyOn<any>(service, 'reconnect').mockImplementation(() => undefined);
      service['_connection'] = { on: vi.fn() } as any;

      service['reconnectCallback'](null);

      expect(service['reconnect']).toHaveBeenCalledTimes(0);
      expect(service['_reconnecting']).toBe(false);
      expect(service['_connectionLostSubject'].next).toHaveBeenCalledTimes(1);
      expect(service['_connectionLostSubject'].next).toHaveBeenCalledWith(true);
      expect(service['_connection'].on).toHaveBeenCalledTimes(1);
    });
  });

  afterEach(() => {
    reset(mock(ElectronService));
  });
});
