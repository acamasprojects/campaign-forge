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

export const emptyPc = () => ({
  id: uid(),
  name: "",
  playerName: "",
  classLevel: "",
  race: "",
  status: "active", // active/retired/deceased
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
  pcs: (c.pcs || []).map((p) => ({ ...p, relationships: p.relationships || [], pinned: p.pinned || false })),
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
});
