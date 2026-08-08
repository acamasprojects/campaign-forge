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
  createdAt: Date.now(),
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
