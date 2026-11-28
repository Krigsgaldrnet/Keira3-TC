import { ITEM_MOD, ItemTemplate } from '@keira/shared/acore-world-model';
import { MAX_LEVEL } from './item-preview';
import { ScalingStatDistribution, ScalingStatValueMaskColumn, ScalingStatValues } from './item-scaling-stats.model';

const MAX_ITEM_STATS = 10;
const SCALING_STAT_MODIFIER_DIVISOR = 10000;
const ONE_HAND_DAMAGE_RANGE = 0.3;
const TWO_HAND_DAMAGE_RANGE = 0.2;

/*
 * Which ScalingStatValues column each bit of item_template.ScalingStatValue reads, in the order AzerothCore checks them:
 * when more than one bit of a group is set, the first one listed wins (see ScalingStatValuesEntry in DBCStructure.h).
 */
const STAT_BUDGET_COLUMNS: ScalingStatValueMaskColumn[] = [
  { mask: 0x1, column: 'ShoulderBudget' },
  { mask: 0x2, column: 'TrinketBudget' },
  { mask: 0x4, column: 'WeaponBudget1H' },
  { mask: 0x8, column: 'PrimaryBudget' },
  { mask: 0x10, column: 'RangedBudget' },
  { mask: 0x40000, column: 'TertiaryBudget' },
];

const ARMOR_COLUMNS: ScalingStatValueMaskColumn[] = [
  { mask: 0x20, column: 'ClothShoulderArmor' },
  { mask: 0x40, column: 'LeatherShoulderArmor' },
  { mask: 0x80, column: 'MailShoulderArmor' },
  { mask: 0x100, column: 'PlateShoulderArmor' },
  { mask: 0x80000, column: 'ClothCloakArmor' },
  { mask: 0x100000, column: 'ClothChestArmor' },
  { mask: 0x200000, column: 'LeatherChestArmor' },
  { mask: 0x400000, column: 'MailChestArmor' },
  { mask: 0x800000, column: 'PlateChestArmor' },
];

const DPS_COLUMNS: ScalingStatValueMaskColumn[] = [
  { mask: 0x200, column: 'WeaponDPS1H' },
  { mask: 0x400, column: 'WeaponDPS2H' },
  { mask: 0x800, column: 'SpellcasterDPS1H' },
  { mask: 0x1000, column: 'SpellcasterDPS2H' },
  { mask: 0x2000, column: 'RangedDPS' },
  { mask: 0x4000, column: 'WandDPS' },
];

const TWO_HAND_DPS_MASK = 0x400 | 0x1000;
const SPELL_POWER_MASK = 0x8000;

function getScalingValue(ssv: ScalingStatValues, mask: number, columns: ScalingStatValueMaskColumn[]): number {
  const match = columns.find((entry) => (mask & entry.mask) !== 0);
  return match ? Number(ssv[match.column]) : 0;
}

/** The character level at which the item is previewed: the max level of its distribution, capped at the max player level */
export function getScalingStatLevel(ssd: ScalingStatDistribution): number {
  return Math.min(Number(ssd.Maxlevel), MAX_LEVEL);
}

/**
 * Returns a copy of the item with the stats, armor and weapon damage the core gives it when the item scales with the level
 * (heirlooms), as Player::_ApplyItemBonuses and Player::_ApplyWeaponDamage compute them.
 * The core ignores stat_type/stat_value of these items and reads the stats from ScalingStatDistribution instead.
 */
export function applyScalingStats(itemTemplate: ItemTemplate, ssd: ScalingStatDistribution, ssv: ScalingStatValues): ItemTemplate {
  const mask = Number(itemTemplate.ScalingStatValue);
  const scaled: ItemTemplate = { ...itemTemplate };

  const budget = getScalingValue(ssv, mask, STAT_BUDGET_COLUMNS);
  const stats: { type: number; value: number }[] = [];
  for (let i = 1; i <= MAX_ITEM_STATS; i++) {
    const type = Number(ssd[`StatID_${i}`]);
    if (type >= 0) {
      stats.push({ type, value: Math.floor((budget * Number(ssd[`Bonus_${i}`])) / SCALING_STAT_MODIFIER_DIVISOR) });
    }
  }

  if ((mask & SPELL_POWER_MASK) !== 0) {
    stats.push({ type: ITEM_MOD.SPELL_POWER, value: Number(ssv.SpellPower) });
  }

  for (let i = 1; i <= MAX_ITEM_STATS; i++) {
    scaled[`stat_type${i}`] = stats[i - 1]?.type ?? 0;
    scaled[`stat_value${i}`] = stats[i - 1]?.value ?? 0;
  }

  const armor = getScalingValue(ssv, mask, ARMOR_COLUMNS);
  if (armor !== 0) {
    scaled.armor = armor;
  }

  const dps = getScalingValue(ssv, mask, DPS_COLUMNS);
  if (dps !== 0) {
    const average = (dps * Number(itemTemplate.delay)) / 1000;
    const range = (mask & TWO_HAND_DPS_MASK) !== 0 ? TWO_HAND_DAMAGE_RANGE : ONE_HAND_DAMAGE_RANGE;
    scaled.dmg_min1 = Math.floor((1 - range) * average);
    scaled.dmg_max1 = Math.floor((1 + range) * average);
  }

  return scaled;
}
