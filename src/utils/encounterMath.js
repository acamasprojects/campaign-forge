// DMG encounter-building math (Dungeon Master's Guide, "Building a Combat
// Encounter"): XP thresholds per character level, monster XP by challenge
// rating, and the encounter multiplier based on how many monsters are
// involved (adjusted for a notably small or large party).

/** XP value of one monster at a given challenge rating (DMG table). */
export const XP_BY_CR = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  1: 200,
  2: 450,
  3: 700,
  4: 1100,
  5: 1800,
  6: 2300,
  7: 2900,
  8: 3900,
  9: 5000,
  10: 5900,
  11: 7200,
  12: 8400,
  13: 10000,
  14: 11500,
  15: 13000,
  16: 15000,
  17: 18000,
  18: 20000,
  19: 22000,
  20: 25000,
  21: 33000,
  22: 41000,
  23: 50000,
  24: 62000,
  25: 75000,
  26: 90000,
  27: 105000,
  28: 120000,
  29: 135000,
  30: 155000,
};

/** Per-character XP thresholds by level, one row per difficulty tier. */
export const XP_THRESHOLDS_BY_LEVEL = {
  1: { easy: 25, medium: 50, hard: 75, deadly: 100 },
  2: { easy: 50, medium: 100, hard: 150, deadly: 200 },
  3: { easy: 75, medium: 150, hard: 225, deadly: 400 },
  4: { easy: 125, medium: 250, hard: 375, deadly: 500 },
  5: { easy: 250, medium: 500, hard: 750, deadly: 1100 },
  6: { easy: 300, medium: 600, hard: 900, deadly: 1400 },
  7: { easy: 350, medium: 750, hard: 1100, deadly: 1700 },
  8: { easy: 450, medium: 900, hard: 1400, deadly: 2100 },
  9: { easy: 550, medium: 1100, hard: 1600, deadly: 2400 },
  10: { easy: 600, medium: 1200, hard: 1900, deadly: 2800 },
  11: { easy: 800, medium: 1600, hard: 2400, deadly: 3600 },
  12: { easy: 1000, medium: 2000, hard: 3000, deadly: 4500 },
  13: { easy: 1100, medium: 2200, hard: 3400, deadly: 5100 },
  14: { easy: 1250, medium: 2500, hard: 3800, deadly: 5700 },
  15: { easy: 1400, medium: 2800, hard: 4300, deadly: 6400 },
  16: { easy: 1600, medium: 3200, hard: 4800, deadly: 7200 },
  17: { easy: 2000, medium: 3900, hard: 5900, deadly: 8800 },
  18: { easy: 2100, medium: 4200, hard: 6300, deadly: 9500 },
  19: { easy: 2400, medium: 4900, hard: 7300, deadly: 10900 },
  20: { easy: 2800, medium: 5700, hard: 8500, deadly: 12700 },
};

export const DIFFICULTY_LEVELS = ["trivial", "easy", "medium", "hard", "deadly"];

// Multiplier steps for 1 / 2 / 3-6 / 7-10 / 11-14 / 15+ monsters.
const MULTIPLIER_STEPS = [1, 1.5, 2, 2.5, 3, 4];

function multiplierStepIndex(monsterCount) {
  if (monsterCount <= 1) return 0;
  if (monsterCount === 2) return 1;
  if (monsterCount <= 6) return 2;
  if (monsterCount <= 10) return 3;
  if (monsterCount <= 14) return 4;
  return 5;
}

/** A party of fewer than 3 treats the encounter as one step more dangerous;
 * a party of 6 or more treats it as one step less dangerous. */
function getMultiplier(monsterCount, partySize) {
  let step = multiplierStepIndex(monsterCount);
  if (partySize > 0 && partySize < 3) step = Math.min(step + 1, MULTIPLIER_STEPS.length - 1);
  else if (partySize >= 6) step = Math.max(step - 1, 0);
  return MULTIPLIER_STEPS[step];
}

/**
 * monsters: [{ cr: "1/4", count: 2 }, ...]
 * Returns the raw and multiplier-adjusted XP, this party's thresholds, and
 * which difficulty tier the adjusted XP lands in.
 */
export function calculateEncounterDifficulty({ partySize, partyLevel, monsters }) {
  const totalXp = monsters.reduce((sum, m) => sum + (XP_BY_CR[m.cr] || 0) * m.count, 0);
  const monsterCount = monsters.reduce((sum, m) => sum + m.count, 0);
  const multiplier = monsterCount === 0 ? 1 : getMultiplier(monsterCount, partySize);
  const adjustedXp = Math.round(totalXp * multiplier);

  const perCharacter = XP_THRESHOLDS_BY_LEVEL[partyLevel] || XP_THRESHOLDS_BY_LEVEL[1];
  const thresholds = {
    easy: perCharacter.easy * partySize,
    medium: perCharacter.medium * partySize,
    hard: perCharacter.hard * partySize,
    deadly: perCharacter.deadly * partySize,
  };

  let difficulty = "trivial";
  if (adjustedXp >= thresholds.deadly) difficulty = "deadly";
  else if (adjustedXp >= thresholds.hard) difficulty = "hard";
  else if (adjustedXp >= thresholds.medium) difficulty = "medium";
  else if (adjustedXp >= thresholds.easy) difficulty = "easy";

  return { totalXp, adjustedXp, multiplier, monsterCount, thresholds, difficulty };
}
