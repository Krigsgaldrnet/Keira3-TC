import { Component, viewChild } from '@angular/core';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { ICON_SKILLS } from '@keira/shared/constants';

import { PageObject } from '@keira/shared/test-utils';
import { of } from 'rxjs';
import { IconComponent } from './icon.component';
import { IconService } from './icon.service';

import { instance, mock } from 'ts-mockito';
import { SqliteService } from '@keira/shared/db-layer';
import Spy = jasmine.Spy;

@Component({
  template: `<keira-icon [size]="size" [itemId]="itemId" [itemDisplayId]="itemDisplayId" [skillId]="skillId" [spellId]="spellId" />`,
  imports: [IconComponent],
})
class TestHostComponent {
  readonly child = viewChild.required(IconComponent);
  size!: 'small' | 'medium' | 'large';
  itemId!: string;
  itemDisplayId!: string;
  skillId!: string;
  spellId!: string;
}

class IconComponentPage extends PageObject<TestHostComponent> {
  get img(): HTMLImageElement {
    return this.query<HTMLImageElement>('img');
  }
}

describe('ItemIconComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IconComponent, TestHostComponent],
      providers: [{ provide: SqliteService, useValue: instance(mock(SqliteService)) }],
    }).compileComponents();
  }));

  const setup = () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    const host = fixture.componentInstance;
    const component = host.child();
    const page = new IconComponentPage(fixture);
    const service = TestBed.inject(IconService);

    spyOn(service, 'getIconByItemId').and.callFake((id) => of(`getIconByItemId-${id}`));
    spyOn(service, 'getIconByItemDisplayId').and.callFake((id) => of(`getIconByItemDisplayId-${id}`));
    spyOn(service, 'getIconBySpellId').and.callFake((id) => of(`getIconBySpellId-${id}`));

    fixture.detectChanges();

    return { fixture, host, component, page, service };
  };

  describe('the image url should correctly reflect the inputs', () => {
    it('itemId', () => {
      const { page, host } = setup();
      host.size = 'medium';
      host.itemId = '1234';

      page.detectChanges();

      expect(page.img.src).toEqual('https://wow.zamimg.com/images/wow/icons/medium/getIconByItemId-1234.jpg');
    });

    it('itemDisplayId', () => {
      const { page, host } = setup();
      host.size = 'large';
      host.itemDisplayId = '5678';

      page.detectChanges();

      expect(page.img.src).toEqual('https://wow.zamimg.com/images/wow/icons/large/getIconByItemDisplayId-5678.jpg');
    });

    it('skillId', () => {
      const { page, host } = setup();
      const skillId = 755; // Jewelcrafting
      host.size = 'large';
      host.skillId = String(skillId);

      page.detectChanges();

      expect(page.img.src).toEqual(`https://wow.zamimg.com/images/wow/icons/large/${ICON_SKILLS[skillId]}.jpg`);
    });

    it('spellId', () => {
      const { page, host } = setup();
      const spellId = 123;
      host.size = 'large';
      host.spellId = String(spellId);

      page.detectChanges();

      expect(page.img.src).toEqual('https://wow.zamimg.com/images/wow/icons/large/getIconBySpellId-123.jpg');
    });

    it('empty', () => {
      const { page, host, service } = setup();
      host.size = 'medium';
      host.itemId = 'whatever';
      (service.getIconByItemId as Spy).and.returnValue(of(null));

      page.detectChanges();

      expect(page.img.src).toEqual('https://wow.zamimg.com/images/wow/icons/medium/inv_misc_questionmark.jpg');
    });
  });
});
