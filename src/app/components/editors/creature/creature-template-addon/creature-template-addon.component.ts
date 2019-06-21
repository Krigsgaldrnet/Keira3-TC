import { Component } from '@angular/core';

import { SingleRowEditorComponent } from '../../shared/single-row-editor.component';
import { CreatureHandlerService } from '../../../../services/handlers/creature-handler.service';
import { CreatureTemplateAddon } from '../../../../types/creature-template-addon.type';
import { CreatureTemplateAddonService } from '../../../../services/editors/creature/creature-template-addon.service';
import { EMOTE } from '../../../../constants/options/emote';
import { SPAWNS_ADDON_TABLE } from '../../../../types/spawns-addon.type';
import { CREATURE_ADDON_BYTES_1 } from '../../../../constants/options/creature-addon-bytes1';
import { CREATURE_ADDON_BYTES_2 } from '../../../../constants/options/creature-addon-bytes2';

@Component({
  selector: 'app-creature-template-addon',
  templateUrl: './creature-template-addon.component.html',
  styleUrls: ['./creature-template-addon.component.scss']
})
export class CreatureTemplateAddonComponent extends SingleRowEditorComponent<CreatureTemplateAddon> {

  public get docUrl() {
    return this.WIKI_BASE_URL + SPAWNS_ADDON_TABLE; // they share the same doc page
  }

  public readonly EMOTE = EMOTE;
  public readonly CREATURE_ADDON_BYTES_1 = CREATURE_ADDON_BYTES_1;
  public readonly CREATURE_ADDON_BYTES_2 = CREATURE_ADDON_BYTES_2;

  constructor(
    public editorService: CreatureTemplateAddonService,
    public handlerService: CreatureHandlerService,
  ) {
    super(editorService, handlerService);
  }
}
