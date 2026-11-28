export const MAX_PLAYER_LEVEL = 80;
export const QUEST_LEVEL_SCALING = -1;

/**
 * Same as Quest::XPValue in AzerothCore (QuestDef.cpp): the full amount until the player is more than 5 levels above the
 * quest, then 20% less for each further level, down to 10% from 10 levels above. The result is rounded to the nearest
 * 5, 10, 25 or 50 depending on its size. Example: 1350 XP at quest level 15 gives 1350 up to player level 20, 1100 at
 * level 21 and 140 from level 25 on.
 */
export function getQuestRewardXp(baseXp: number, questLevel: number, playerLevel: number): number {
  const diffFactor = Math.min(10, Math.max(1, 2 * (questLevel - playerLevel) + 20));
  const xp = Math.floor((diffFactor * baseXp) / 10);

  if (xp <= 100) {
    return 5 * Math.floor((xp + 2) / 5);
  }
  if (xp <= 500) {
    return 10 * Math.floor((xp + 5) / 10);
  }
  if (xp <= 1000) {
    return 25 * Math.floor((xp + 12) / 25);
  }
  return 50 * Math.floor((xp + 25) / 50);
}

/** The player level the XP slider starts at: the quest level, or the minimum level for quests that scale with the player. */
export function getDefaultXpPlayerLevel(questLevel: number, minLevel: number): number {
  const level = questLevel > 0 ? questLevel : minLevel;
  return Math.min(MAX_PLAYER_LEVEL, Math.max(1, level));
}
