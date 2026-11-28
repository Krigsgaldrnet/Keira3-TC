import { ItemTemplate } from '@keira/shared/acore-world-model';
import { applyScalingStats, getScalingStatLevel } from './item-scaling-stats';
import { MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES } from './item-scaling-stats.mock';

describe('item scaling stats', () => {
  function createItem(values: Partial<ItemTemplate>): ItemTemplate {
    return Object.assign(new ItemTemplate(), values);
  }

  describe('getScalingStatLevel', () => {
    it('should return the max level of the distribution', () => {
      expect(getScalingStatLevel({ ...MOCK_SCALING_STAT_DISTRIBUTION, Maxlevel: 10 })).toBe(10);
    });

    it('should cap the level at the max player level', () => {
      expect(getScalingStatLevel({ ...MOCK_SCALING_STAT_DISTRIBUTION, Maxlevel: 100 })).toBe(80);
    });
  });

  describe('applyScalingStats', () => {
    it('should replace the item stats with the ones of the distribution, scaled by the selected budget', () => {
      const item = createItem({ ScalingStatValue: 0x8, stat_type1: 3, stat_value1: 99, stat_type4: 5, stat_value4: 12 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect([scaled.stat_type1, scaled.stat_value1]).toEqual([4, 68]);
      expect([scaled.stat_type2, scaled.stat_value2]).toEqual([7, 103]);
      expect([scaled.stat_type3, scaled.stat_value3]).toEqual([32, 68]);
      expect([scaled.stat_type4, scaled.stat_value4]).toEqual([0, 0]);
    });

    it('should not change the item it receives', () => {
      const item = createItem({ ScalingStatValue: 0x8, stat_type1: 3, stat_value1: 99 });

      applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect([item.stat_type1, item.stat_value1]).toEqual([3, 99]);
    });

    it('should use the first budget the core checks when more budget bits are set', () => {
      const item = createItem({ ScalingStatValue: 0x1 | 0x8 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect(scaled.stat_value2).toBe(76);
    });

    it('should give zero stat values when no budget bit is set', () => {
      const item = createItem({ ScalingStatValue: 0x100 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect([scaled.stat_type1, scaled.stat_value1]).toEqual([4, 0]);
    });

    it('should add the spell power after the stats of the distribution', () => {
      const item = createItem({ ScalingStatValue: 0x8 | 0x8000 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect([scaled.stat_type4, scaled.stat_value4]).toEqual([45, 343]);
    });

    it('should replace the armor when an armor bit is set', () => {
      const item = createItem({ ScalingStatValue: 0x1 | 0x100, armor: 31 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect(scaled.armor).toBe(1570);
    });

    it('should keep the armor when no armor bit is set', () => {
      const item = createItem({ ScalingStatValue: 0x1, armor: 31 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect(scaled.armor).toBe(31);
    });

    it('should set the damage of a two-hand weapon to 80% and 120% of the average hit', () => {
      const item = createItem({ ScalingStatValue: 0x8 | 0x400, delay: 3800, dmg_min1: 1, dmg_max1: 0 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect([scaled.dmg_min1, scaled.dmg_max1]).toEqual([474, 711]);
    });

    it('should set the damage of a one-hand weapon to 70% and 130% of the average hit', () => {
      const item = createItem({ ScalingStatValue: 0x4 | 0x200, delay: 2000, dmg_min1: 1, dmg_max1: 0 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect([scaled.dmg_min1, scaled.dmg_max1]).toEqual([168, 312]);
    });

    it('should keep the damage when no DPS bit is set', () => {
      const item = createItem({ ScalingStatValue: 0x8, delay: 3800, dmg_min1: 1, dmg_max1: 2 });

      const scaled = applyScalingStats(item, MOCK_SCALING_STAT_DISTRIBUTION, MOCK_SCALING_STAT_VALUES);

      expect([scaled.dmg_min1, scaled.dmg_max1]).toEqual([1, 2]);
    });
  });
});
