import { getDefaultXpPlayerLevel, getQuestRewardXp, MAX_PLAYER_LEVEL } from './quest-reward-xp';

describe('getQuestRewardXp', () => {
  const cases: { baseXp: number; questLevel: number; playerLevel: number; expected: number; description: string }[] = [
    { baseXp: 1350, questLevel: 15, playerLevel: 1, expected: 1350, description: 'gives the full XP to players below the quest level' },
    { baseXp: 1350, questLevel: 15, playerLevel: 20, expected: 1350, description: 'gives the full XP up to 5 levels above the quest' },
    { baseXp: 1350, questLevel: 15, playerLevel: 21, expected: 1100, description: 'removes 20% at 6 levels above, rounded to 50' },
    { baseXp: 1350, questLevel: 15, playerLevel: 24, expected: 270, description: 'rounds amounts up to 500 to the nearest 10' },
    { baseXp: 1350, questLevel: 15, playerLevel: 25, expected: 140, description: 'gives 10% from 10 levels above' },
    { baseXp: 1350, questLevel: 15, playerLevel: 80, expected: 140, description: 'never goes below 10%' },
    { baseXp: 1050, questLevel: 15, playerLevel: 22, expected: 625, description: 'rounds amounts up to 1000 to the nearest 25' },
    { baseXp: 105, questLevel: 15, playerLevel: 22, expected: 65, description: 'rounds amounts up to 100 to the nearest 5' },
    { baseXp: 0, questLevel: 15, playerLevel: 15, expected: 0, description: 'gives no XP when the base XP is 0' },
  ];

  for (const { baseXp, questLevel, playerLevel, expected, description } of cases) {
    it(`${description} (${baseXp} XP, quest level ${questLevel}, player level ${playerLevel})`, () => {
      expect(getQuestRewardXp(baseXp, questLevel, playerLevel)).toBe(expected);
    });
  }
});

describe('getDefaultXpPlayerLevel', () => {
  it('starts at the quest level', () => {
    expect(getDefaultXpPlayerLevel(15, 10)).toBe(15);
  });

  it('starts at the minimum level when the quest scales with the player', () => {
    expect(getDefaultXpPlayerLevel(-1, 10)).toBe(10);
  });

  it('starts at level 1 when neither the quest level nor the minimum level is set', () => {
    expect(getDefaultXpPlayerLevel(0, 0)).toBe(1);
  });

  it('never starts above the max player level', () => {
    expect(getDefaultXpPlayerLevel(85, 80)).toBe(MAX_PLAYER_LEVEL);
  });
});
