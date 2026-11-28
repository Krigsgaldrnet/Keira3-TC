import { Flag } from '@keira/shared/constants';

// Each bit picks a ScalingStatValues.dbc column; names follow ScalingStatValuesEntry in AzerothCore's DBCStructure.h
export const ITEM_SCALING_STAT_VALUE: Flag[] = [
  { bit: 0, name: 'Stats: shoulder budget' },
  { bit: 1, name: 'Stats: trinket budget' },
  { bit: 2, name: 'Stats: one-hand weapon budget' },
  { bit: 3, name: 'Stats: primary budget' },
  { bit: 4, name: 'Stats: ranged budget' },
  { bit: 5, name: 'Armor: cloth shoulder' },
  { bit: 6, name: 'Armor: leather shoulder' },
  { bit: 7, name: 'Armor: mail shoulder' },
  { bit: 8, name: 'Armor: plate shoulder' },
  { bit: 9, name: 'DPS: one-hand weapon' },
  { bit: 10, name: 'DPS: two-hand weapon' },
  { bit: 11, name: 'DPS: one-hand caster weapon' },
  { bit: 12, name: 'DPS: two-hand caster weapon' },
  { bit: 13, name: 'DPS: ranged weapon' },
  { bit: 14, name: 'DPS: wand' },
  { bit: 15, name: 'Spell power' },
  { bit: 18, name: 'Stats: tertiary budget' },
  { bit: 19, name: 'Armor: cloak' },
  { bit: 20, name: 'Armor: cloth chest' },
  { bit: 21, name: 'Armor: leather chest' },
  { bit: 22, name: 'Armor: mail chest' },
  { bit: 23, name: 'Armor: plate chest' },
];
