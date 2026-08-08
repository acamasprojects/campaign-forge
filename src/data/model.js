// ---------- id + factory helpers ----------
export const uid = () => Math.random().toString(36).slice(2, 10);

export const DISPOSITIONS = ["friendly", "neutral", "hostile", "unknown"];

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
  locationId: null,
  tags: [],
  description: "",
  relationships: [], // [{ id, npcId, label }] — directed edge to another NPC (e.g. "rival", "sister")
  createdAt: Date.now(),
});

export const emptyRelationship = () => ({ id: uid(), npcId: null, label: "" });

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
  createdAt: Date.now(),
});

/** Backfills arrays introduced after a campaign was first saved, so older
 * localStorage/import data doesn't crash on a missing field. */
export const normalizeCampaign = (c) => ({
  ...c,
  npcs: (c.npcs || []).map((n) => ({ ...n, relationships: n.relationships || [] })),
  locations: c.locations || [],
  quests: c.quests || [],
  sessions: c.sessions || [],
});

export const emptyLocation = () => ({
  id: uid(),
  name: "",
  type: "town",
  parentId: null,
  tags: [],
  description: "",
  createdAt: Date.now(),
});

export const emptyQuest = () => ({
  id: uid(),
  title: "",
  status: "not-started",
  giverId: null,
  locationId: null,
  relatedNpcIds: [],
  tags: [],
  description: "",
  rewards: "",
  createdAt: Date.now(),
});
