import { vi } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { PageObject, Spied, TranslateTestingModule } from '@keira/shared/test-utils';
import { QueryError } from 'mysql2';
import { TooltipDirective } from 'ngx-bootstrap/tooltip';
import { of, Subject, throwError } from 'rxjs';
import { instance, mock } from 'ts-mockito';

import { ElectronService } from '@keira/shared/common-services';
import { KeiraConnectionOptions, MysqlService } from '@keira/shared/db-layer';
import { LoginConfigService } from '@keira/shared/login-config';
import { ConnectionWindowComponent } from './connection-window.component';

class ConnectionWindowComponentPage extends PageObject<ConnectionWindowComponent> {
  get hostInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#host');
  }
  get portInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#port');
  }
  get userInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#user');
  }
  get passwordInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#password');
  }
  get databaseInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#database');
  }
  get advancedOptions(): HTMLDetailsElement {
    return this.query<HTMLDetailsElement>('#advanced-options');
  }
  get advancedOptionsSummary(): HTMLElement {
    return this.query<HTMLElement>('#advanced-options summary');
  }
  get connectTimeoutInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#connect-timeout');
  }
  get connectBtn(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('.connect-button');
  }
  get errorElement(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('keira-query-error');
  }
  get savePasswordInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#save-password');
  }
  get sslEnabledInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#ssl-enabled');
  }
  get rememberMeInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#remember-me');
  }
  get loadRecentBtn(): HTMLButtonElement {
    return this.query<HTMLButtonElement>('#load-recent button');
  }
  get clearAll(): HTMLUListElement {
    return this.query<HTMLUListElement>('#clear-all');
  }
  get recentConfigs(): HTMLUListElement[] {
    return this.queryAll<HTMLUListElement>('.config-item');
  }
  get sshEnabledInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#ssh-enabled');
  }
  get sshPrivateKeyInput(): HTMLTextAreaElement {
    return this.query<HTMLTextAreaElement>('#ssh-private-key');
  }
  get sshKeyFileInput(): HTMLInputElement {
    return this.query<HTMLInputElement>('#ssh-key-file');
  }

  selectSshKeyFile(files: File[]): void {
    Object.defineProperty(this.sshKeyFileInput, 'files', { value: files });
    this.sshKeyFileInput.dispatchEvent(new Event('change'));
  }
}

describe('ConnectionWindowComponent', () => {
  const mockConfigsWithPass: Partial<KeiraConnectionOptions>[] = [
    {
      host: 'localhost',
      port: 3306,
      user: 'Shin',
      password: 'shin123',
      database: 'shin_world',
      sslEnabled: false,
    },
    {
      host: '127.0.0.1',
      port: 3306,
      user: 'Helias',
      password: 'helias123',
      database: 'helias_world',
      sslEnabled: false,
    },
  ];
  const mockConfigsNoPass: Partial<KeiraConnectionOptions>[] = [
    {
      host: 'localhost',
      port: 3306,
      user: 'Shin',
      password: 'shin123',
      database: 'shin_world',
      sslEnabled: false,
    },
    {
      host: '127.0.0.1',
      port: 3306,
      user: 'Helias',
      password: '',
      database: 'helias_world',
      sslEnabled: false,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TooltipDirective, ConnectionWindowComponent, TranslateTestingModule],
      providers: [
        provideZonelessChangeDetection(),
        provideNoopAnimations(),
        { provide: MysqlService, useValue: instance(mock(MysqlService)) },
        { provide: ElectronService, useValue: { isElectron: () => false, fs: { readFileSync: vi.fn() } } },
        {
          provide: LoginConfigService,
          useValue: {
            getConfigs: vi.fn(),
            removeAllConfigs: vi.fn(),
            saveNewConfig: vi.fn(),
            isRememberMeEnabled: vi.fn(),
            saveRememberPreference: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  const setup = (detectChanges = true) => {
    const connectSpy = vi.spyOn(TestBed.inject(MysqlService), 'connect').mockReturnValue(of({}));
    const loginConfigService = TestBed.inject(LoginConfigService) as unknown as Spied<LoginConfigService>;

    const fixture = TestBed.createComponent(ConnectionWindowComponent);
    const page = new ConnectionWindowComponentPage(fixture);
    const component = fixture.componentInstance;

    if (detectChanges) {
      fixture.detectChanges();
      fixture.autoDetectChanges(true);
    }

    return { fixture, page, component, connectSpy, loginConfigService };
  };

  it('clicking on the connect button without altering the default values should correctly work', () => {
    const { page, component, connectSpy } = setup();
    component.error = { code: 'some previous error', errno: 1234 } as QueryError;

    page.sslEnabledInput.click();
    page.clickElement(page.connectBtn);

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledWith({
      host: '127.0.0.1',
      port: 3306,
      user: 'acore',
      password: 'acore',
      database: 'acore_world',
      connectTimeout: 10000,
      sslEnabled: true,
      sshEnabled: false,
      sshHost: '',
      sshPort: 22,
      sshUser: '',
      sshPassword: '',
      sshPrivateKey: '',
      ssl: { rejectUnauthorized: false },
    });
    expect(component.error).toBeUndefined();
    expect(page.errorElement.innerHTML).not.toContain('error-box');
  });

  it('the latest config should be loaded by default (if any)', () => {
    const { fixture, page, component, connectSpy, loginConfigService } = setup(false);
    loginConfigService.getConfigs.mockReturnValue(mockConfigsWithPass);
    component.error = { code: 'some previous error', errno: 1234 } as QueryError;
    fixture.detectChanges();

    page.clickElement(page.connectBtn);

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledWith({
      host: '127.0.0.1',
      port: 3306,
      user: 'Helias',
      password: 'helias123',
      database: 'helias_world',
      connectTimeout: 10000,
      sslEnabled: false,
      sshEnabled: false,
      sshHost: '',
      sshPort: 22,
      sshUser: '',
      sshPassword: '',
      sshPrivateKey: '',
    });

    expect(component.error).toBeUndefined();
    expect(page.errorElement.innerHTML).not.toContain('error-box');
  });

  it('filling the form and clicking on the connect button should correctly work', () => {
    const { page, component, connectSpy } = setup();
    const host = '192.168.1.100';
    const port = 9000;
    const user = 'shin';
    const password = 'helias';
    const database = 'my_world';
    component.error = { code: 'some previous error', errno: 1234 } as QueryError;

    page.setInputValue(page.hostInput, host);
    page.setInputValue(page.portInput, port);
    page.setInputValue(page.userInput, user);
    page.setInputValue(page.passwordInput, password);
    page.setInputValue(page.databaseInput, database);
    page.clickElement(page.connectBtn);

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(connectSpy).toHaveBeenCalledWith({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 10000,
      sslEnabled: false,
      sshEnabled: false,
      sshHost: '',
      sshPort: 22,
      sshUser: '',
      sshPassword: '',
      sshPrivateKey: '',
    });
    expect(component.error).toBeUndefined();
    expect(page.errorElement.innerHTML).not.toContain('error-box');
  });

  it('should correctly react on mysql connection error', () => {
    const { page, component, connectSpy } = setup();
    const error = {
      code: 'some error happened',
      errno: 1000,
      message: 'some SQL error message',
      stack: 'some SQL stack trace',
      sqlState: 'some SQL state',
    } as QueryError;
    connectSpy.mockReturnValue(throwError(error));

    page.clickElement(page.connectBtn);

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(component.error).toEqual(error);
    expect(page.errorElement.innerHTML).toContain('error-box');
    expect(page.errorElement.innerHTML).toContain(error.code);
    expect(page.errorElement.innerHTML).toContain(error.message as string);
    expect(page.errorElement.innerHTML).toContain(error.sqlState as string);
    expect(page.errorElement.innerHTML).toContain(`${error.errno}`);

    // by default the stack trace is hidden behind the trace toggle
    expect(page.errorElement.innerHTML).not.toContain(error.stack as string);

    page.clickElement(page.query<HTMLButtonElement>('keira-query-error button'));

    expect(page.errorElement.innerHTML).toContain(error.stack as string);
    expect(page.errorElement.innerHTML).not.toContain(error.message as string);
  });

  it('should show an error that arrives after the click, such as a connection timeout', async () => {
    const { page, connectSpy } = setup();
    const connection$ = new Subject<void>();
    connectSpy.mockReturnValue(connection$);

    page.clickElement(page.connectBtn);
    connection$.error({ code: 'ETIMEDOUT', message: 'connect ETIMEDOUT' } as QueryError);
    await page.whenStable();

    expect(page.errorElement.innerHTML).toContain('error-box');
    expect(page.errorElement.innerHTML).toContain('ETIMEDOUT');
  });

  describe('the advanced options', () => {
    // the browser fires the details toggle event asynchronously
    const toggleAdvancedOptions = async (page: ConnectionWindowComponentPage) => {
      const toggled = new Promise((resolve) => page.advancedOptions.addEventListener('toggle', resolve, { once: true }));
      page.clickElement(page.advancedOptionsSummary);
      await toggled;
      await page.whenStable();
    };

    it('should be collapsed by default and hold the timeout, SSL and SSH options', () => {
      const { page } = setup();

      expect(page.advancedOptions.open).toBe(false);
      expect(page.advancedOptions.contains(page.connectTimeoutInput)).toBe(true);
      expect(page.advancedOptions.contains(page.sslEnabledInput)).toBe(true);
      expect(page.advancedOptions.contains(page.query('#ssh-enabled'))).toBe(true);
    });

    it('should open and close when clicking the summary', async () => {
      const { page, component } = setup();

      await toggleAdvancedOptions(page);

      expect(page.advancedOptions.open).toBe(true);
      expect(component.advancedOptionsOpen()).toBe(true);

      await toggleAdvancedOptions(page);

      expect(page.advancedOptions.open).toBe(false);
      expect(component.advancedOptionsOpen()).toBe(false);
    });

    it('should stay collapsed when the last saved config uses only default advanced options', async () => {
      const { page, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue([{ ...mockConfigsWithPass[1], connectTimeout: 10000 }]);

      page.detectChanges();
      await page.whenStable();

      expect(page.advancedOptions.open).toBe(false);
    });

    it.each([
      ['SSL', { sslEnabled: true }],
      ['SSH', { sshEnabled: true }],
      ['a custom timeout', { connectTimeout: 25000 }],
    ])('should be open when the last saved config uses %s', async (_name, advancedOptions) => {
      const { page, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue([{ ...mockConfigsWithPass[1], ...advancedOptions }]);

      page.detectChanges();
      await page.whenStable();

      expect(page.advancedOptions.open).toBe(true);
    });

    it('should open when loading a recent config that uses SSL', async () => {
      const { page, component } = setup();

      component.loadConfig({ ...mockConfigsWithPass[0], sslEnabled: true });
      await page.whenStable();

      expect(page.advancedOptions.open).toBe(true);
      expect(page.sslEnabledInput.checked).toBe(true);
    });
  });

  describe('the connection timeout', () => {
    it('should send and save the timeout typed by the user', () => {
      const { page, connectSpy, loginConfigService } = setup();

      expect(page.connectTimeoutInput.value).toBe('10000');

      page.setInputValue(page.connectTimeoutInput, 30000);
      page.clickElement(page.connectBtn);

      expect(connectSpy).toHaveBeenCalledWith(expect.objectContaining({ connectTimeout: 30000 }));
      expect(loginConfigService.saveNewConfig).toHaveBeenCalledWith(expect.objectContaining({ connectTimeout: 30000 }));
    });

    it('should fall back to the default timeout when the field is empty', () => {
      const { page, connectSpy, loginConfigService } = setup();

      page.setInputValue(page.connectTimeoutInput, '');
      page.clickElement(page.connectBtn);

      expect(connectSpy).toHaveBeenCalledWith(expect.objectContaining({ connectTimeout: 10000 }));
      expect(loginConfigService.saveNewConfig).toHaveBeenCalledWith(expect.objectContaining({ connectTimeout: 10000 }));
      expect(page.connectTimeoutInput.value).toBe('10000');
    });

    it('should fall back to the default timeout when the value is not positive', () => {
      const { page, connectSpy } = setup();

      page.setInputValue(page.connectTimeoutInput, 0);
      page.clickElement(page.connectBtn);

      expect(connectSpy).toHaveBeenCalledWith(expect.objectContaining({ connectTimeout: 10000 }));
    });

    it('should be restored from the last saved config', async () => {
      const { page, connectSpy, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue([{ ...mockConfigsWithPass[1], connectTimeout: 25000 }]);

      page.detectChanges();
      await page.whenStable();

      expect(page.connectTimeoutInput.value).toBe('25000');

      page.clickElement(page.connectBtn);

      expect(connectSpy).toHaveBeenCalledWith(expect.objectContaining({ connectTimeout: 25000 }));
    });
  });

  describe('the save checkbox', () => {
    it('should be checked by default when there is no config', async () => {
      const { page, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue(null);

      page.detectChanges();
      await page.whenStable();

      expect(page.savePasswordInput.checked).toBe(true);
    });

    it('should be checked by default when the last used config has a non-empty password', async () => {
      const { page, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue(mockConfigsWithPass);

      page.detectChanges();
      await page.whenStable();

      expect(page.savePasswordInput.checked).toBe(true);
      expect(page.rememberMeInput.disabled).toBe(false);
    });

    it('should be unchecked by default when the last used config has an empty password', async () => {
      const { page, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue(mockConfigsNoPass);

      page.detectChanges();
      await page.whenStable();

      expect(page.savePasswordInput.checked).toBe(false);
      expect(page.rememberMeInput.disabled).toBe(true);
    });

    it('when selected, the password should be saved', async () => {
      const password = 'opensource';
      const { page, loginConfigService, connectSpy } = setup(false);
      loginConfigService.getConfigs.mockReturnValue(mockConfigsNoPass); // initially unselected, password empty
      page.detectChanges();
      await page.whenStable();

      page.setInputValue(page.passwordInput, password); // test toggle
      page.clickElement(page.savePasswordInput); // test toggle
      page.clickElement(page.connectBtn);

      expect(loginConfigService.saveNewConfig).toHaveBeenCalledTimes(1);
      expect(loginConfigService.saveNewConfig).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 3306,
        user: 'Helias',
        password,
        database: 'helias_world',
        connectTimeout: 10000,
        sslEnabled: false,
        sshEnabled: false,
        sshHost: '',
        sshPort: 22,
        sshUser: '',
        sshPassword: '',
        sshPrivateKey: '',
      });
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 3306,
        user: 'Helias',
        password,
        database: 'helias_world',
        connectTimeout: 10000,
        sslEnabled: false,
        sshEnabled: false,
        sshHost: '',
        sshPort: 22,
        sshUser: '',
        sshPassword: '',
        sshPrivateKey: '',
      });
    });

    it('when unselected, the password should NOT be saved', async () => {
      const { page, loginConfigService, connectSpy } = setup(false);
      loginConfigService.getConfigs.mockReturnValue(mockConfigsWithPass); // initially selected, password filled
      page.detectChanges();
      await page.whenStable();

      page.clickElement(page.savePasswordInput); // test toggle
      page.clickElement(page.connectBtn);

      expect(loginConfigService.saveNewConfig).toHaveBeenCalledTimes(1);
      expect(loginConfigService.saveNewConfig).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 3306,
        user: 'Helias',
        password: '',
        database: 'helias_world',
        connectTimeout: 10000,
        sslEnabled: false,
        sshEnabled: false,
        sshHost: '',
        sshPort: 22,
        sshUser: '',
        sshPassword: '',
        sshPrivateKey: '',
      });
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 3306,
        user: 'Helias',
        password: 'helias123',
        database: 'helias_world',
        connectTimeout: 10000,
        sslEnabled: false,
        sshEnabled: false,
        sshHost: '',
        sshPort: 22,
        sshUser: '',
        sshPassword: '',
        sshPrivateKey: '',
      });
    });
  });

  describe('remember me checkbox', () => {
    it('when isRememberMeEnabled return true it should call onConnect', async () => {
      const { page, component, loginConfigService } = setup(false);
      vi.spyOn(component, 'onConnect').mockImplementation(() => undefined);
      loginConfigService.getConfigs.mockReturnValue(mockConfigsWithPass);
      loginConfigService.isRememberMeEnabled.mockReturnValue(true);

      page.detectChanges();
      await page.whenStable();

      expect(component.onConnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('the SSH private key file picker', () => {
    function setupSshKey() {
      const result = setup();
      const readFileSyncSpy = vi.spyOn(TestBed.inject(ElectronService).fs, 'readFileSync');
      result.page.clickElement(result.page.sshEnabledInput);
      return { ...result, readFileSyncSpy };
    }

    it('should fill the private key with the content of the selected file', async () => {
      const { page, component, readFileSyncSpy } = setupSshKey();
      readFileSyncSpy.mockReturnValue('PRIVATE KEY CONTENT');
      // Electron exposes the absolute path of the picked file on the File object
      const keyFile = Object.assign(new File(['ignored'], 'id_rsa'), { path: '/home/shin/.ssh/id_rsa' });

      page.selectSshKeyFile([keyFile]);
      await page.whenStable();

      expect(readFileSyncSpy).toHaveBeenCalledExactlyOnceWith('/home/shin/.ssh/id_rsa', 'utf8');
      expect(component.form.controls.sshPrivateKey.value).toBe('PRIVATE KEY CONTENT');
      expect(page.sshPrivateKeyInput.value).toBe('PRIVATE KEY CONTENT');
    });

    it('should keep the private key unchanged when no file is selected', async () => {
      const { page, component, readFileSyncSpy } = setupSshKey();
      page.setInputValue(page.sshPrivateKeyInput, 'EXISTING KEY');

      page.selectSshKeyFile([]);
      await page.whenStable();

      expect(readFileSyncSpy).toHaveBeenCalledTimes(0);
      expect(component.form.controls.sshPrivateKey.value).toBe('EXISTING KEY');
    });
  });

  describe('the load recent menu', () => {
    it('should be disabled when there are no recent configs [null]', async () => {
      const { page, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue([]);

      page.detectChanges();
      await page.whenStable();

      expect(page.loadRecentBtn.disabled).toBe(true);
    });

    it('should be disabled when there are no recent configs [empty array]', async () => {
      const { page, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue([]);

      page.detectChanges();
      await page.whenStable();

      expect(page.loadRecentBtn.disabled).toBe(true);
    });

    it('should be enabled when there are recent configs, allowing the user to select them', async () => {
      const { page, loginConfigService } = setup(false);
      loginConfigService.getConfigs.mockReturnValue(mockConfigsWithPass);

      page.detectChanges();
      await page.whenStable();

      expect(page.loadRecentBtn.disabled).toBe(false);
      // TODO: ideally we should click the dropdown and do more checks
      //  but we can't because of: https://github.com/valor-software/ngx-bootstrap/issues/4282
    });

    it('clear all should correctly work', () => {
      const { page, component, loginConfigService } = setup();

      // TODO: ideally we should click the dropdown's item instead of calling the method
      //  but we can't because of: https://github.com/valor-software/ngx-bootstrap/issues/4282
      component.removeAllConfigs();

      expect(loginConfigService.removeAllConfigs).toHaveBeenCalledTimes(1);
      expect(component.configs).toEqual([]);
      expect(page.hostInput.value).toBe('');
      expect(page.portInput.value).toBe('');
      expect(page.userInput.value).toBe('');
      expect(page.passwordInput.value).toBe('');
      expect(page.databaseInput.value).toBe('');
    });

    it('loadConfig should correctly work', () => {
      const { page, component } = setup();

      // TODO: ideally we should click the dropdown's item instead of calling the method
      //  but we can't because of: https://github.com/valor-software/ngx-bootstrap/issues/4282
      component.loadConfig(mockConfigsWithPass[0]);

      expect(page.hostInput.value).toBe(mockConfigsWithPass[0].host as string);
      expect(page.portInput.value).toBe(String(mockConfigsWithPass[0].port));
      expect(page.userInput.value).toBe(mockConfigsWithPass[0].user as string);
      expect(page.passwordInput.value).toBe(mockConfigsWithPass[0].password as string);
      expect(page.databaseInput.value).toBe(mockConfigsWithPass[0].database as string);
    });
  });

  afterEach(() => {
    localStorage.clear();
  });
});
