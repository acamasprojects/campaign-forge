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
 * localStorage/import data doesn't crash on or silently lose a new field.
 *
 * This covers every field in every emptyX() factory, not just the ones that
 * happened to get added after launch — a partial backfill here is exactly
 * what let old/partial data crash the app before (see CONTRIBUTING history).
 * Scalars fall back to their emptyX() default; nullable pointers use `??` so
 * a real `0`/`false` isn't mistaken for "missing"; arrays/sub-objects get
 * normalized recursively. Keep this in sync whenever a field is added to an
 * emptyX() factory — the test suite checks that for you. */
export const normalizeCampaign = (c) => ({
  ...c,
  id: c.id || uid(),
  name: c.name || "Untitled Campaign",
  createdAt: c.createdAt || Date.now(),
  npcs: (c.npcs || []).map((n) => ({
    ...n,
    id: n.id || uid(),
    name: n.name || "",
    role: n.role || "",
    race: n.race || "",
    factionId: n.factionId ?? null,
    disposition: n.disposition || "neutral",
    status: n.status || "alive",
    locationId: n.locationId ?? null,
    tags: n.tags || [],
    description: n.description || "",
    relationships: (n.relationships || []).map((r) => ({ id: r.id || uid(), npcId: r.npcId ?? null, label: r.label || "" })),
    pinned: n.pinned || false,
    createdAt: n.createdAt || Date.now(),
  })),
  locations: (c.locations || []).map((l) => ({
    ...l,
    id: l.id || uid(),
    name: l.name || "",
    type: l.type || "town",
    parentId: l.parentId ?? null,
    tags: l.tags || [],
    description: l.description || "",
    pinned: l.pinned || false,
    createdAt: l.createdAt || Date.now(),
  })),
  quests: (c.quests || []).map((q) => ({
    ...q,
    id: q.id || uid(),
    title: q.title || "",
    status: q.status || "not-started",
    arc: q.arc || "",
    giverId: q.giverId ?? null,
    locationId: q.locationId ?? null,
    relatedNpcIds: q.relatedNpcIds || [],
    relatedPcIds: q.relatedPcIds || [],
    clues: (q.clues || []).map((cl) => ({ id: cl.id || uid(), text: cl.text || "", revealed: cl.revealed || false })),
    tags: q.tags || [],
    description: q.description || "",
    rewards: q.rewards || "",
    pinned: q.pinned || false,
    createdAt: q.createdAt || Date.now(),
  })),
  sessions: (c.sessions || []).map((s) => ({
    ...s,
    id: s.id || uid(),
    sessionNumber: s.sessionNumber || 1,
    date: s.date || new Date().toISOString().slice(0, 10),
    title: s.title || "",
    summary: s.summary || "",
    relatedNpcIds: s.relatedNpcIds || [],
    relatedLocationIds: s.relatedLocationIds || [],
    relatedQuestIds: s.relatedQuestIds || [],
    relatedPcIds: s.relatedPcIds || [],
    tags: s.tags || [],
    pinned: s.pinned || false,
    createdAt: s.createdAt || Date.now(),
  })),
  factions: (c.factions || []).map((f) => ({
    ...f,
    id: f.id || uid(),
    name: f.name || "",
    agenda: f.agenda || "",
    standing: f.standing || "neutral",
    rivalFactionIds: f.rivalFactionIds || [],
    tags: f.tags || [],
    pinned: f.pinned || false,
    createdAt: f.createdAt || Date.now(),
  })),
  pcs: (c.pcs || []).map((p) => ({
    ...p,
    id: p.id || uid(),
    name: p.name || "",
    playerName: p.playerName || "",
    classLevel: p.classLevel || "",
    race: p.race || "",
    status: p.status || "active",
    armorClass: p.armorClass ?? null,
    hitPoints: p.hitPoints ?? null,
    maxHitPoints: p.maxHitPoints ?? null,
    hometownLocationId: p.hometownLocationId ?? null,
    backstory: p.backstory || "",
    relationships: (p.relationships || []).map((r) => ({ id: r.id || uid(), npcId: r.npcId ?? null, label: r.label || "" })),
    tags: p.tags || [],
    pinned: p.pinned || false,
    createdAt: p.createdAt || Date.now(),
  })),
  items: (c.items || []).map((i) => ({
    ...i,
    id: i.id || uid(),
    name: i.name || "",
    type: i.type || "wondrous-item",
    rarity: i.rarity || "common",
    attunement: i.attunement || false,
    attunementRequirement: i.attunementRequirement || "",
    effects: i.effects || "",
    description: i.description || "",
    locationId: i.locationId ?? null,
    ownerNpcId: i.ownerNpcId ?? null,
    ownerPcId: i.ownerPcId ?? null,
    tags: i.tags || [],
    pinned: i.pinned || false,
    createdAt: i.createdAt || Date.now(),
  })),
  monsters: (c.monsters || []).map((m) => ({
    ...m,
    id: m.id || uid(),
    name: m.name || "",
    size: m.size || "medium",
    type: m.type || "humanoid",
    alignment: m.alignment || "",
    armorClass: m.armorClass ?? null,
    armorClassNote: m.armorClassNote || "",
    hitPoints: m.hitPoints ?? null,
    hitDice: m.hitDice || "",
    speed: m.speed || "30 ft.",
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...(m.abilityScores || {}) },
    savingThrows: m.savingThrows || "",
    skills: m.skills || "",
    damageVulnerabilities: m.damageVulnerabilities || "",
    damageResistances: m.damageResistances || "",
    damageImmunities: m.damageImmunities || "",
    conditionImmunities: m.conditionImmunities || "",
    senses: m.senses || "",
    languages: m.languages || "",
    challengeRating: m.challengeRating || "1",
    traits: m.traits || "",
    actions: m.actions || "",
    bonusActions: m.bonusActions || "",
    reactions: m.reactions || "",
    legendaryActions: m.legendaryActions || "",
    description: m.description || "",
    locationId: m.locationId ?? null,
    tags: m.tags || [],
    pinned: m.pinned || false,
    createdAt: m.createdAt || Date.now(),
  })),
  grids: (c.grids || []).map((g) => ({
    ...g,
    id: g.id || uid(),
    name: g.name || "",
    locationId: g.locationId ?? null,
    rows: g.rows || 20,
    cols: g.cols || 20,
    round: g.round ?? null,
    turnTokenId: g.turnTokenId ?? null,
    tokens: (g.tokens || []).map((t) => ({
      ...t,
      id: t.id || uid(),
      label: t.label || "",
      color: t.color || "#A13D3D",
      row: t.row ?? 0,
      col: t.col ?? 0,
      size: t.size || 1,
      linkedType: t.linkedType ?? null,
      linkedId: t.linkedId ?? null,
      hp: t.hp ?? null,
      maxHp: t.maxHp ?? null,
      initiative: t.initiative ?? null,
      conditions: t.conditions || [],
      notes: t.notes || "",
    })),
    notes: g.notes || "",
    tags: g.tags || [],
    pinned: g.pinned || false,
    createdAt: g.createdAt || Date.now(),
  })),
});
