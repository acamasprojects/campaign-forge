import { scoreEntity } from "./search.js";

/**
 * Cross-entity search: scores every NPC/Location/Quest/Session/Faction/PC in
 * a campaign against a query, weighting each entity's own fields plus the
 * entities it's cross-linked to (a quest's related NPCs, an NPC's faction,
 * etc.) so a search finds an NPC by a quest they're tied to, a location by
 * who's stationed there, and vice versa. Shared by the top bar's quick
 * search and Player View so both rank results identically.
 *
 * Returns one flat array of { type, id, label, kind, score, matchedFields }.
 */
export function scoreCampaign(campaign, query) {
  const npcName = (id) => campaign.npcs.find((n) => n.id === id)?.name || null;
  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;
  const questName = (id) => campaign.quests.find((q) => q.id === id)?.title || null;
  const pcName = (id) => campaign.pcs.find((p) => p.id === id)?.name || null;
  const factionName = (id) => campaign.factions.find((f) => f.id === id)?.name || null;
  const questsForNpc = (npcId) =>
    campaign.quests.filter((q) => q.giverId === npcId || q.relatedNpcIds.includes(npcId));
  const npcsAt = (locId) => campaign.npcs.filter((n) => n.locationId === locId);
  const questsAt = (locId) => campaign.quests.filter((q) => q.locationId === locId);
  const pcsFrom = (locId) => campaign.pcs.filter((p) => p.hometownLocationId === locId);
  const membersOf = (factionId) => campaign.npcs.filter((n) => n.factionId === factionId);
  const relatedNpcNames = (q) => q.relatedNpcIds.map((id) => npcName(id)).filter(Boolean).join(" ");
  const relatedPcNames = (ids) => ids.map((id) => pcName(id)).filter(Boolean).join(" ");
  const sessionLabel = (s) => (s.title ? `${s.title}` : "");
  const sessionsForNpc = (npcId) => campaign.sessions.filter((s) => s.relatedNpcIds.includes(npcId));
  const sessionsForLocation = (locId) => campaign.sessions.filter((s) => s.relatedLocationIds.includes(locId));
  const sessionsForQuest = (questId) => campaign.sessions.filter((s) => s.relatedQuestIds.includes(questId));
  const sessionsForPc = (pcId) => campaign.sessions.filter((s) => s.relatedPcIds.includes(pcId));
  const npcOrPcName = (npcId, pcId) => npcName(npcId) || pcName(pcId);
  const relationshipNames = (n) =>
    [
      ...(n.relationships || []).map((r) => npcName(r.npcId)),
      ...campaign.npcs
        .filter((other) => (other.relationships || []).some((r) => r.npcId === n.id))
        .map((other) => other.name),
    ]
      .filter(Boolean)
      .join(" ");
  const connectedNpcNames = (relationships) => (relationships || []).map((r) => npcName(r.npcId)).filter(Boolean).join(" ");

  return [
    ...campaign.npcs.map((n) => ({
      type: "npcs",
      id: n.id,
      label: n.name,
      kind: "NPC",
      ...scoreEntity(query, [
        { value: n.name, weight: 3, label: "name" },
        { value: n.role, weight: 1.5, label: "role" },
        { value: factionName(n.factionId), weight: 1.5, label: "faction" },
        { value: n.race, weight: 1, label: "race" },
        { value: locationName(n.locationId), weight: 1, label: "location" },
        { value: (n.tags || []).join(" "), weight: 2, label: "tags" },
        { value: n.description, weight: 0.5, label: "description" },
        { value: questsForNpc(n.id).map((q) => q.title).join(" "), weight: 1, label: "quests" },
        { value: relationshipNames(n), weight: 1, label: "relationships" },
        { value: sessionsForNpc(n.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
        {
          value: campaign.pcs
            .filter((p) => (p.relationships || []).some((r) => r.npcId === n.id))
            .map((p) => p.name)
            .join(" "),
          weight: 1,
          label: "connected PCs",
        },
      ]),
    })),
    ...campaign.locations.map((l) => ({
      type: "locations",
      id: l.id,
      label: l.name,
      kind: "Location",
      ...scoreEntity(query, [
        { value: l.name, weight: 3, label: "name" },
        { value: l.type, weight: 1, label: "type" },
        { value: (l.tags || []).join(" "), weight: 2, label: "tags" },
        { value: l.description, weight: 0.5, label: "description" },
        { value: npcsAt(l.id).map((n) => n.name).join(" "), weight: 1, label: "NPCs here" },
        { value: questsAt(l.id).map((q) => q.title).join(" "), weight: 1, label: "quests here" },
        { value: sessionsForLocation(l.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
        { value: pcsFrom(l.id).map((p) => p.name).join(" "), weight: 1, label: "PCs from here" },
      ]),
    })),
    ...campaign.quests.map((qu) => ({
      type: "quests",
      id: qu.id,
      label: qu.title,
      kind: "Quest",
      ...scoreEntity(query, [
        { value: qu.title, weight: 3, label: "title" },
        { value: qu.status, weight: 1, label: "status" },
        { value: npcName(qu.giverId), weight: 1.5, label: "giver" },
        { value: locationName(qu.locationId), weight: 1, label: "location" },
        { value: relatedNpcNames(qu), weight: 1, label: "related NPCs" },
        { value: relatedPcNames(qu.relatedPcIds), weight: 1, label: "related PCs" },
        { value: (qu.tags || []).join(" "), weight: 2, label: "tags" },
        { value: qu.description, weight: 0.5, label: "description" },
        { value: sessionsForQuest(qu.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
        { value: (qu.clues || []).filter((c) => c.revealed).map((c) => c.text).join(" "), weight: 0.5, label: "clues" },
      ]),
    })),
    ...campaign.sessions.map((s) => ({
      type: "sessions",
      id: s.id,
      label: s.title ? `Session ${s.sessionNumber}: ${s.title}` : `Session ${s.sessionNumber}`,
      kind: "Session",
      ...scoreEntity(query, [
        { value: `session ${s.sessionNumber}`, weight: 2, label: "session number" },
        { value: s.title, weight: 3, label: "title" },
        { value: s.date, weight: 1, label: "date" },
        { value: (s.tags || []).join(" "), weight: 2, label: "tags" },
        { value: s.summary, weight: 1, label: "summary" },
        { value: s.relatedNpcIds.map((id) => npcName(id)).join(" "), weight: 1, label: "NPCs" },
        { value: s.relatedLocationIds.map((id) => locationName(id)).join(" "), weight: 1, label: "locations" },
        { value: s.relatedQuestIds.map((id) => questName(id)).join(" "), weight: 1, label: "quests" },
        { value: relatedPcNames(s.relatedPcIds), weight: 1, label: "PCs" },
      ]),
    })),
    ...campaign.factions.map((f) => ({
      type: "factions",
      id: f.id,
      label: f.name,
      kind: "Faction",
      ...scoreEntity(query, [
        { value: f.name, weight: 3, label: "name" },
        { value: f.standing, weight: 1, label: "standing" },
        { value: f.agenda, weight: 1, label: "agenda" },
        { value: (f.tags || []).join(" "), weight: 2, label: "tags" },
        { value: membersOf(f.id).map((n) => n.name).join(" "), weight: 1, label: "members" },
        { value: (f.rivalFactionIds || []).map(factionName).join(" "), weight: 1, label: "rivals" },
      ]),
    })),
    ...campaign.pcs.map((p) => ({
      type: "pcs",
      id: p.id,
      label: p.name,
      kind: "PC",
      ...scoreEntity(query, [
        { value: p.name, weight: 3, label: "name" },
        { value: p.playerName, weight: 1.5, label: "player" },
        { value: p.classLevel, weight: 1, label: "class" },
        { value: p.race, weight: 1, label: "race" },
        { value: locationName(p.hometownLocationId), weight: 1, label: "hometown" },
        { value: p.backstory, weight: 0.5, label: "backstory" },
        { value: (p.tags || []).join(" "), weight: 2, label: "tags" },
        { value: connectedNpcNames(p.relationships), weight: 1, label: "connections" },
        { value: sessionsForPc(p.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
      ]),
    })),
    ...campaign.items.map((i) => ({
      type: "items",
      id: i.id,
      label: i.name,
      kind: "Item",
      ...scoreEntity(query, [
        { value: i.name, weight: 3, label: "name" },
        { value: i.type, weight: 1, label: "type" },
        { value: i.rarity, weight: 1, label: "rarity" },
        { value: locationName(i.locationId), weight: 1, label: "location" },
        { value: npcOrPcName(i.ownerNpcId, i.ownerPcId), weight: 1, label: "owner" },
        { value: (i.tags || []).join(" "), weight: 2, label: "tags" },
        { value: i.effects, weight: 1, label: "effects" },
        { value: i.description, weight: 0.5, label: "description" },
      ]),
    })),
    // Monsters and battle grids are DM-only content — spoilers (stat blocks,
    // encounter setups) that shouldn't surface in Player View's search, even
    // though they're findable via the DM-facing top bar quick search. Callers
    // that build a player-facing list from this array must filter these two
    // types out; see PlayerView.jsx.
    ...campaign.monsters.map((m) => ({
      type: "monsters",
      id: m.id,
      label: m.name,
      kind: "Monster",
      ...scoreEntity(query, [
        { value: m.name, weight: 3, label: "name" },
        { value: m.type, weight: 1, label: "type" },
        { value: m.size, weight: 1, label: "size" },
        { value: locationName(m.locationId), weight: 1, label: "location" },
        { value: (m.tags || []).join(" "), weight: 2, label: "tags" },
        { value: m.traits, weight: 0.5, label: "traits" },
        { value: m.description, weight: 0.5, label: "description" },
      ]),
    })),
    ...campaign.grids.map((g) => ({
      type: "grids",
      id: g.id,
      label: g.name,
      kind: "Battle Grid",
      ...scoreEntity(query, [
        { value: g.name, weight: 3, label: "name" },
        { value: locationName(g.locationId), weight: 1, label: "location" },
        { value: (g.tags || []).join(" "), weight: 2, label: "tags" },
        { value: g.notes, weight: 0.5, label: "notes" },
      ]),
    })),
  ];
}
