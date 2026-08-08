import { useState, useRef, useEffect } from "react";
import { scoreEntity, suggestClosest } from "../utils/search.js";

const TABS = [
  { id: "home", label: "Home" },
  { id: "npcs", label: "NPCs" },
  { id: "locations", label: "Locations" },
  { id: "quests", label: "Quests" },
  { id: "sessions", label: "Sessions" },
  { id: "tags", label: "Tags" },
];

/** Top bar: campaign title, tab nav, and a global quick-search across all three lists. */
export default function TopBar({ tab, setTab, campaign, onNavigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const npcName = (id) => campaign.npcs.find((n) => n.id === id)?.name || null;
  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;
  const questName = (id) => campaign.quests.find((q) => q.id === id)?.title || null;
  const questsForNpc = (npcId) =>
    campaign.quests.filter((q) => q.giverId === npcId || q.relatedNpcIds.includes(npcId));
  const npcsAt = (locId) => campaign.npcs.filter((n) => n.locationId === locId);
  const questsAt = (locId) => campaign.quests.filter((q) => q.locationId === locId);
  const relatedNpcNames = (q) => q.relatedNpcIds.map((id) => npcName(id)).filter(Boolean).join(" ");
  const sessionLabel = (s) => (s.title ? `${s.title}` : "");
  const sessionsForNpc = (npcId) => campaign.sessions.filter((s) => s.relatedNpcIds.includes(npcId));
  const sessionsForLocation = (locId) => campaign.sessions.filter((s) => s.relatedLocationIds.includes(locId));
  const sessionsForQuest = (questId) => campaign.sessions.filter((s) => s.relatedQuestIds.includes(questId));
  const relationshipNames = (n) =>
    [
      ...(n.relationships || []).map((r) => npcName(r.npcId)),
      ...campaign.npcs
        .filter((other) => (other.relationships || []).some((r) => r.npcId === n.id))
        .map((other) => other.name),
    ]
      .filter(Boolean)
      .join(" ");

  // Score every entity across every field it has — including the entities
  // it's cross-linked to — so a search finds an NPC by a quest they're tied
  // to, a location by who's stationed there, and vice versa.
  const scored = [
    ...campaign.npcs.map((n) => ({
      type: "npcs",
      id: n.id,
      label: n.name,
      kind: "NPC",
      ...scoreEntity(query, [
        { value: n.name, weight: 3, label: "name" },
        { value: n.role, weight: 1.5, label: "role" },
        { value: n.faction, weight: 1.5, label: "faction" },
        { value: n.race, weight: 1, label: "race" },
        { value: locationName(n.locationId), weight: 1, label: "location" },
        { value: (n.tags || []).join(" "), weight: 2, label: "tags" },
        { value: n.description, weight: 0.5, label: "description" },
        { value: questsForNpc(n.id).map((q) => q.title).join(" "), weight: 1, label: "quests" },
        { value: relationshipNames(n), weight: 1, label: "relationships" },
        { value: sessionsForNpc(n.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
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
        { value: (qu.tags || []).join(" "), weight: 2, label: "tags" },
        { value: qu.description, weight: 0.5, label: "description" },
        { value: sessionsForQuest(qu.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
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
      ]),
    })),
  ];

  const q = query.trim();
  const results = q
    ? scored
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
    : [];

  const suggestions =
    q && results.length === 0
      ? suggestClosest(query, scored.map((r) => r.label))
      : [];

  const jump = (r) => {
    onNavigate(r.type, r.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="cf-topbar">
      <div className="cf-topbar-title">{campaign.name}</div>
      <div className="cf-quick-search" ref={wrapRef}>
        <input
          className="cf-input cf-quick-search-input"
          placeholder="Quick search everything…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {open && q && (
          <div className="cf-quick-search-dropdown">
            {results.length === 0 ? (
              <div className="cf-link-option cf-link-option-empty">
                No matches
                {suggestions.length > 0 && (
                  <>
                    {" — did you mean "}
                    {suggestions.map((s, i) => (
                      <span key={s}>
                        {i > 0 && ", "}
                        <span className="cf-quick-search-suggestion" onMouseDown={() => setQuery(s)}>
                          {s}
                        </span>
                      </span>
                    ))}
                    ?
                  </>
                )}
              </div>
            ) : (
              results.map((r) => (
                <div key={`${r.type}-${r.id}`} className="cf-link-option" onMouseDown={() => jump(r)}>
                  <span className="cf-quick-search-kind">{r.kind}</span> {r.label || "Untitled"}
                  {r.matchedFields.length > 0 && !(r.matchedFields.length === 1 && ["name", "title", "session number"].includes(r.matchedFields[0])) && (
                    <span className="cf-match-note"> — matched: {r.matchedFields.join(", ")}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <nav className="cf-tab-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`cf-tab-btn${tab === t.id ? " cf-tab-btn-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
