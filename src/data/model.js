// ---------- id + factory helpers ----------
export const uid = () => Math.random().toString(36).slice(2, 10);

export const DISPOSITIONS = ["friendly", "neutral", "hostile", "unknown"];
export const NPC_STATUSES = ["alive", "missing", "captured", "dead"];
export const PC_STATUSES = ["active", "retired", "deceased"];

export const LOCATION_TYPES = [
  "region",
  "city",
  "town",
  "village",
  "dungeon",
  "building",
  "wilderness",
  "landmark",
  "other",
];

export const QUEST_STATUSES = ["not-started", "active", "completed", "failed"];

// 5e DMG magic item categories (Table: "Magic Item Category") plus "other" for
// homebrew/mundane items that don't fit those nine.
export const ITEM_TYPES = ["armor", "potion", "ring", "rod", "scroll", "staff", "wand", "weapon", "wondrous-item", "other"];

// 5e DMG's six official rarity tiers — no "unique", that's a per-item tag
// (e.g. "legendary (requires attunement, unique)"), not a rarity of its own.
export const ITEM_RARITIES = ["common", "uncommon", "rare", "very-rare", "legendary", "artifact"];

// 5e Monster Manual creature types.
export const MONSTER_TYPES = [
  "aberration",
  "beast",
  "celestial",
  "construct",
  "dragon",
  "elemental",
  "fey",
  "fiend",
  "giant",
  "humanoid",
  "monstrosity",
  "ooze",
  "plant",
  "undead",
];

export const MONSTER_SIZES = ["tiny", "small", "medium", "large", "huge", "gargantuan"];

// 5e challenge ratings 0 through 30, with the sub-1 fractions the DMG uses.
export const CHALLENGE_RATINGS = ["0", "1/8", "1/4", "1/2", ...Array.from({ length: 30 }, (_, i) => String(i + 1))];

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];

export const emptyCampaign = (name) => ({
  id: uid(),
  name: name || "Untitled Campaign",
  createdAt: Date.now(),
  npcs: [],
  locations: [],
  quests: [],
  sessions: [],
  factions: [],
  pcs: [],
  items: [],
  monsters: [],
  grids: [],
});

export const emptyNpc = () => ({
  id: uid(),
  name: "",
  role: "",
  race: "",
  factionId: null,
  disposition: "neutral",
  status: "alive", // story state — alive/missing/captured/dead — separate from disposition (attitude)
  locationId: null,
  tags: [],
  description: "",
  relationships: [], // [{ id, npcId, label }] — directed edge to another NPC (e.g. "rival", "sister")
  pinned: false,
  createdAt: Date.now(),
});

export const emptyRelationship = () => ({ id: uid(), npcId: null, label: "" });

export const emptyLocation = () => ({
  id: uid(),
  name: "",
  type: "town",
  parentId: null,
  tags: [],
  description: "",
  pinned: false,
  createdAt: Date.now(),
});

export const emptyClue = () => ({ id: uid(), text: "", revealed: false });

export const emptyQuest = () => ({
  id: uid(),
  title: "",
  status: "not-started",
  arc: "", // freeform chapter/arc grouping, distinct from tags (one value, not many)
  giverId: null,
  locationId: null,
  relatedNpcIds: [],
  relatedPcIds: [],
  clues: [], // [{ id, text, revealed }] — secrets & clues tracker
  tags: [],
  description: "",
  rewards: "",
  pinned: false,
  createdAt: Date.now(),
});

export const emptySession = (nextNumber) => ({
  id: uid(),
  sessionNumber: nextNumber || 1,
  date: new Date().toISOString().slice(0, 10),
  title: "",
  summary: "",
  relatedNpcIds: [],
  relatedLocationIds: [],
  relatedQuestIds: [],
  relatedPcIds: [],
  tags: [],
  pinned: false,
  createdAt: Date.now(),
});

export const emptyFaction = () => ({
  id: uid(),
  name: "",
  agenda: "", // goals/notes
  standing: "neutral", // reuses the disposition scale — attitude toward the party
  rivalFactionIds: [],
  tags: [],
  pinned: false,
  createdAt: Date.now(),
});

export const emptyItem = () => ({
  id: uid(),
  name: "",
  type: "wondrous-item",
  rarity: "common",
  attunement: false,
  attunementRequirement: "", // e.g. "by a spellcaster", "by a druid" — the DMG's parenthetical qualifier
  effects: "", // mechanical rules text — what it actually does
  description: "", // flavor/lore text
  locationId: null, // where it's found/stored, if not currently carried
  ownerNpcId: null, // NPC currently carrying/holding it
  ownerPcId: null, // PC currently carrying/holding it
  tags: [],
  pinned: false,
  createdAt: Date.now(),
});

export const emptyMonster = () => ({
  id: uid(),
  name: "",
  size: "medium",
  type: "humanoid",
  alignment: "",
  armorClass: null,
  armorClassNote: "", // e.g. "natural armor", "leather armor, shield"
  hitPoints: null,
  hitDice: "", // e.g. "8d8 + 16"
  speed: "30 ft.",
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  savingThrows: "",
  skills: "",
  damageVulnerabilities: "",
  damageResistances: "",
  damageImmunities: "",
  conditionImmunities: "",
  senses: "",
  languages: "",
  challengeRating: "1",
  traits: "", // special abilities block, e.g. "Pack Tactics", "Amphibious"
  actions: "",
  bonusActions: "",
  reactions: "",
  legendaryActions: "",
  description: "", // flavor/lore text
  locationId: null, // where this creature is typically encountered
  tags: [],
  pinned: false,
  createdAt: Date.now(),
});

export const emptyBattleGrid = () => ({
  id: uid(),
  name: "",
  locationId: null, // the map this grid represents, if any
  rows: 20,
  cols: 20,
  tokens: [],
  round: null, // null = combat not started
  turnTokenId: null, // id of the token whose turn it currently is
  notes: "",
  tags: [],
  pinned: false,
  createdAt: Date.now(),
});

/** A token's own hp/maxHp track this specific encounter instance — independent
 * of any linked NPC/PC/monster's own data, since e.g. four goblin tokens
 * linked to the same bestiary entry each take separate damage. */
export const emptyToken = (row = 0, col = 0) => ({
  id: uid(),
  label: "", // shown as-is for freeform tokens; overrides the linked entity's name if set
  color: "#A13D3D",
  row,
  col,
  size: 1, // occupies size x size cells
  linkedType: null, // "npcs" | "pcs" | "monsters" | null
  linkedId: null,
  hp: null,
  maxHp: null,
  initiative: null, // rolled score — tokens with a value here join the turn order
  conditions: [],
  notes: "",
});

export const emptyPc = () => ({
  id: uid(),
  name: "",
  playerName: "",
  classLevel: "",
  race: "",
  status: "active", // active/retired/deceased
  armorClass: null,
  hitPoints: null, // current
  maxHitPoints: null,
  hometownLocationId: null,
  backstory: "", // hooks/goals the DM can pull from
  relationships: [], // [{ id, npcId, label }] — directed edge to an NPC (e.g. "estranged brother")
  tags: [],
  pinned: false,
  createdAt: Date.now(),
});

/** Backfills fields introduced after a campaign was first saved, so older
 * localStorage/import data doesn't crash on or silently lose a new field. */
export const normalizeCampaign = (c) => ({
  ...c,
  npcs: (c.npcs || []).map((n) => ({
    ...n,
    relationships: n.relationships || [],
    status: n.status || "alive",
    pinned: n.pinned || false,
    factionId: n.factionId ?? null,
  })),
  locations: (c.locations || []).map((l) => ({ ...l, pinned: l.pinned || false })),
  quests: (c.quests || []).map((q) => ({
    ...q,
    arc: q.arc || "",
    pinned: q.pinned || false,
    relatedPcIds: q.relatedPcIds || [],
    clues: q.clues || [],
  })),
  sessions: (c.sessions || []).map((s) => ({ ...s, pinned: s.pinned || false, relatedPcIds: s.relatedPcIds || [] })),
  factions: (c.factions || []).map((f) => ({ ...f, rivalFactionIds: f.rivalFactionIds || [], pinned: f.pinned || false })),
  pcs: (c.pcs || []).map((p) => ({
    ...p,
    relationships: p.relationships || [],
    pinned: p.pinned || false,
    armorClass: p.armorClass ?? null,
    hitPoints: p.hitPoints ?? null,
    maxHitPoints: p.maxHitPoints ?? null,
  })),
  items: (c.items || []).map((i) => ({
    ...i,
    attunement: i.attunement || false,
    attunementRequirement: i.attunementRequirement || "",
    locationId: i.locationId ?? null,
    ownerNpcId: i.ownerNpcId ?? null,
    ownerPcId: i.ownerPcId ?? null,
    tags: i.tags || [],
    pinned: i.pinned || false,
  })),
  monsters: (c.monsters || []).map((m) => ({
    ...m,
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...(m.abilityScores || {}) },
    locationId: m.locationId ?? null,
    tags: m.tags || [],
    pinned: m.pinned || false,
  })),
  grids: (c.grids || []).map((g) => ({
    ...g,
    locationId: g.locationId ?? null,
    rows: g.rows || 20,
    cols: g.cols || 20,
    round: g.round ?? null,
    turnTokenId: g.turnTokenId ?? null,
    tokens: (g.tokens || []).map((t) => ({
      ...t,
      size: t.size || 1,
      linkedType: t.linkedType ?? null,
      linkedId: t.linkedId ?? null,
      initiative: t.initiative ?? null,
      conditions: t.conditions || [],
    })),
    tags: g.tags || [],
    pinned: g.pinned || false,
  })),
});
