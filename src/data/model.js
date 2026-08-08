// ---------- id + factory helpers ----------
export const uid = () => Math.random().toString(36).slice(2, 10);

export const DISPOSITIONS = ["friendly", "neutral", "hostile", "unknown"];
export const NPC_STATUSES = ["alive", "missing", "captured", "dead"];

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

export const emptyCampaign = (name) => ({
  id: uid(),
  name: name || "Untitled Campaign",
  createdAt: Date.now(),
  npcs: [],
  locations: [],
  quests: [],
  sessions: [],
});

export const emptyNpc = () => ({
  id: uid(),
  name: "",
  role: "",
  race: "",
  faction: "",
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

export const emptyQuest = () => ({
  id: uid(),
  title: "",
  status: "not-started",
  arc: "", // freeform chapter/arc grouping, distinct from tags (one value, not many)
  giverId: null,
  locationId: null,
  relatedNpcIds: [],
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
  })),
  locations: (c.locations || []).map((l) => ({ ...l, pinned: l.pinned || false })),
  quests: (c.quests || []).map((q) => ({ ...q, arc: q.arc || "", pinned: q.pinned || false })),
  sessions: (c.sessions || []).map((s) => ({ ...s, pinned: s.pinned || false })),
});
