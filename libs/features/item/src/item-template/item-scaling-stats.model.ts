import { TableRow } from '@keira/shared/constants';

/** A row of ScalingStatDistribution.dbc, stored in the sqlite table `scalingstatdistribution_dbc` */
export interface ScalingStatDistribution extends TableRow {
  ID: number;
  StatID_1: number;
  StatID_2: number;
  StatID_3: number;
  StatID_4: number;
  StatID_5: number;
  StatID_6: number;
  StatID_7: number;
  StatID_8: number;
  StatID_9: number;
  StatID_10: number;
  Bonus_1: number;
  Bonus_2: number;
  Bonus_3: number;
  Bonus_4: number;
  Bonus_5: number;
  Bonus_6: number;
  Bonus_7: number;
  Bonus_8: number;
  Bonus_9: number;
  Bonus_10: number;
  Maxlevel: number;
}

/** A row of ScalingStatValues.dbc, stored in the sqlite table `scalingstatvalues_dbc` (one row per character level) */
export interface ScalingStatValues extends TableRow {
  ID: number;
  Charlevel: number;
  ShoulderBudget: number;
  TrinketBudget: number;
  WeaponBudget1H: number;
  RangedBudget: number;
  ClothShoulderArmor: number;
  LeatherShoulderArmor: number;
  MailShoulderArmor: number;
  PlateShoulderArmor: number;
  WeaponDPS1H: number;
  WeaponDPS2H: number;
  SpellcasterDPS1H: number;
  SpellcasterDPS2H: number;
  RangedDPS: number;
  WandDPS: number;
  SpellPower: number;
  PrimaryBudget: number;
  TertiaryBudget: number;
  ClothCloakArmor: number;
  ClothChestArmor: number;
  LeatherChestArmor: number;
  MailChestArmor: number;
  PlateChestArmor: number;
}

export type ScalingStatValuesColumn = Exclude<keyof ScalingStatValues, 'ID' | 'Charlevel'>;

export interface ScalingStatValueMaskColumn {
  mask: number;
  column: ScalingStatValuesColumn;
}
