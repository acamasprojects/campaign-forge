import { useState, useEffect, useRef } from "react";
import { emptyNpc, emptyRelationship, DISPOSITIONS, NPC_STATUSES } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import ChoiceChips from "../ChoiceChips.jsx";
import LinkPicker from "../LinkPicker.jsx";

const DISPOSITION_COLOR = {
  friendly: "#55704A",
  neutral: "#93762E",
  hostile: "#7A2020",
  unknown: "#6E655C",
};

const NPC_STATUS_COLOR = {
  alive: "#55704A",
  missing: "#93762E",
  captured: "#5E4A70",
  dead: "#7A2020",
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "disposition", label: "Disposition" },
];
const SORT_COMPARATORS = {
  "name-asc": (a, b) => (a.name || "").localeCompare(b.name || ""),
  "name-desc": (a, b) => (b.name || "").localeCompare(a.name || ""),
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  disposition: (a, b) => DISPOSITIONS.indexOf(a.disposition) - DISPOSITIONS.indexOf(b.disposition),
};

export default function NpcPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeDispositions, setActiveDispositions] = useState([]);
  const [activeStatuses, setActiveStatuses] = useState([]);
  const [activeLocations, setActiveLocations] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("relevance");
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const locationOptions = campaign.locations.map((l) => ({ id: l.id, label: l.name || "Untitled" }));
  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;
  const npcName = (id) => campaign.npcs.find((x) => x.id === id)?.name || null;
  const incomingRelationshipsFor = (npcId) =>
    campaign.npcs.flatMap((other) =>
      (other.relationships || [])
        .filter((r) => r.npcId === npcId)
        .map((r) => ({ ...r, fromNpcId: other.id, fromName: other.name }))
    );

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.npcs.find((n) => n.id === focusId);
    if (target) {
      setSearch(target.name);
      setActiveDispositions([]);
      setActiveLocations([]);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.npcs);
  const questsForNpc = (npcId) =>
    campaign.quests.filter((q) => q.giverId === npcId || q.relatedNpcIds.includes(npcId));
  const sessionsForNpc = (npcId) => campaign.sessions.filter((s) => s.relatedNpcIds.includes(npcId));
  const sessionLabel = (s) => `Session ${s.sessionNumber}${s.title ? `: ${s.title}` : ""}`;

  const fieldsFor = (n) => [
    { value: n.name, weight: 3, label: "name" },
    { value: n.role, weight: 1.5, label: "role" },
    { value: n.faction, weight: 1.5, label: "faction" },
    { value: n.race, weight: 1, label: "race" },
    { value: locationName(n.locationId), weight: 1, label: "location" },
    { value: (n.tags || []).join(" "), weight: 2, label: "tags" },
    { value: n.description, weight: 0.5, label: "description" },
    { value: n.status, weight: 1, label: "status" },
    { value: questsForNpc(n.id).map((q) => q.title).join(" "), weight: 1, label: "quests" },
    {
      value: [
        ...(n.relationships || []).map((r) => npcName(r.npcId)),
        ...incomingRelationshipsFor(n.id).map((r) => r.fromName),
      ]
        .filter(Boolean)
        .join(" "),
      weight: 1,
      label: "relationships",
    },
    { value: sessionsForNpc(n.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
  ];

  const extraFilter = (n) =>
    (activeDispositions.length === 0 || activeDispositions.includes(n.disposition)) &&
    (activeStatuses.length === 0 || activeStatuses.includes(n.status)) &&
    (activeLocations.length === 0 || activeLocations.includes(n.locationId)) &&
    (!pinnedOnly || n.pinned) &&
    hasAllTags(n.tags, activeTags);

  const results = searchAndFilter(campaign.npcs, { search, fieldsFn: fieldsFor, extraFilter });
  const filtered = SORT_COMPARATORS[sortMode]
    ? results.map((r) => r.item).sort(SORT_COMPARATORS[sortMode])
    : results.map((r) => r.item);
  const matchNoteFor = (id) => {
    const r = results.find((x) => x.item.id === id);
    if (!search.trim() || !r || r.matchedFields.length === 0) return null;
    if (r.matchedFields.length === 1 && r.matchedFields[0] === "name") return null;
    return `matched: ${r.matchedFields.join(", ")}`;
  };

  const suggestions =
    filtered.length === 0 && search.trim() && campaign.npcs.length > 0
      ? suggestClosest(search, [...campaign.npcs.map((n) => n.name), ...allTags])
      : [];

  const addNpc = () => {
    const n = emptyNpc();
    update((c) => {
      c.npcs = [n, ...c.npcs];
      return c;
    });
    setExpandedId(n.id);
    flash("NPC added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.npcs = c.npcs.map((n) => (n.id === id ? { ...n, [field]: value } : n));
      return c;
    });
  };

  const removeNpc = (id) => {
    update((c) => {
      c.npcs = c.npcs
        .filter((n) => n.id !== id)
        .map((n) => ({ ...n, relationships: (n.relationships || []).filter((r) => r.npcId !== id) }));
      c.quests = c.quests.map((q) => ({
        ...q,
        giverId: q.giverId === id ? null : q.giverId,
        relatedNpcIds: q.relatedNpcIds.filter((x) => x !== id),
      }));
      return c;
    });
  };

  const addRelationship = (npcId) => {
    const npc = campaign.npcs.find((x) => x.id === npcId);
    setField(npcId, "relationships", [...(npc.relationships || []), emptyRelationship()]);
  };

  const setRelationshipField = (npcId, relId, field, value) => {
    const npc = campaign.npcs.find((x) => x.id === npcId);
    setField(
      npcId,
      "relationships",
      (npc.relationships || []).map((r) => (r.id === relId ? { ...r, [field]: value } : r))
    );
  };

  const removeRelationship = (npcId, relId) => {
    const npc = campaign.npcs.find((x) => x.id === npcId);
    setField(npcId, "relationships", (npc.relationships || []).filter((r) => r.id !== relId));
  };

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">NPCs</h2>
        <button className="cf-btn cf-btn-primary" onClick={addNpc}>
          + New NPC
        </button>
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        resultCount={filtered.length}
        sort={{ value: sortMode, options: SORT_OPTIONS, onChange: setSortMode }}
        pinnedOnly={{ active: pinnedOnly, onChange: setPinnedOnly }}
        onClearAll={() => {
          setSearch("");
          setActiveDispositions([]);
          setActiveStatuses([]);
          setActiveLocations([]);
          setActiveTags([]);
          setPinnedOnly(false);
        }}
        groups={[
          {
            label: "Disposition",
            values: DISPOSITIONS,
            active: activeDispositions,
            setActive: setActiveDispositions,
          },
          {
            label: "Status",
            values: NPC_STATUSES,
            active: activeStatuses,
            setActive: setActiveStatuses,
          },
          {
            label: "Location",
            values: campaign.locations.map((l) => l.id),
            active: activeLocations,
            setActive: setActiveLocations,
            formatLabel: (id) => locationName(id) || "Untitled",
          },
          { label: "Tags", values: allTags, active: activeTags, setActive: setActiveTags },
        ]}
      />

      {campaign.npcs.length === 0 ? (
        <div className="cf-empty-panel">No NPCs yet. Add one to start populating your world.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No NPCs match the current filters.
          {suggestions.length > 0 && (
            <div className="cf-suggestions">
              <span className="cf-suggestions-label">Did you mean:</span>
              {suggestions.map((s) => (
                <button key={s} type="button" className="cf-chip cf-chip-link" onClick={() => setSearch(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="cf-card-list">
          {filtered.map((n) => {
            const expanded = expandedId === n.id;
            const linkedQuests = questsForNpc(n.id);
            const linkedSessions = sessionsForNpc(n.id);
            const incomingRels = incomingRelationshipsFor(n.id);
            const otherNpcOptions = campaign.npcs
              .filter((x) => x.id !== n.id)
              .map((x) => ({ id: x.id, label: x.name || "Untitled" }));
            return (
              <EntityCard
                key={n.id}
                cardRef={(el) => (cardRefs.current[n.id] = el)}
                title={n.name}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : n.id)}
                onDelete={() => {
                  if (confirm(`Delete NPC "${n.name || "Untitled"}"?`)) removeNpc(n.id);
                }}
                pinned={n.pinned}
                onTogglePin={() => setField(n.id, "pinned", !n.pinned)}
                badges={
                  <>
                    <span className="cf-badge" style={{ color: DISPOSITION_COLOR[n.disposition], borderColor: DISPOSITION_COLOR[n.disposition] }}>
                      {n.disposition}
                    </span>
                    {n.status !== "alive" && (
                      <span className="cf-badge" style={{ color: NPC_STATUS_COLOR[n.status], borderColor: NPC_STATUS_COLOR[n.status] }}>
                        {n.status}
                      </span>
                    )}
                    {n.locationId && locationName(n.locationId) && (
                      <span className="cf-badge cf-badge-muted">{locationName(n.locationId)}</span>
                    )}
                  </>
                }
                meta={<span className="cf-card-submeta">{n.role || n.faction || ""}</span>}
                matchNote={matchNoteFor(n.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field">
                    <span className="cf-field-label">Name</span>
                    <input className="cf-input" value={n.name} onChange={(e) => setField(n.id, "name", e.target.value)} placeholder="Kaelen Vray" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Role / occupation</span>
                    <input className="cf-input" value={n.role} onChange={(e) => setField(n.id, "role", e.target.value)} placeholder="Blacksmith" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Race</span>
                    <input className="cf-input" value={n.race} onChange={(e) => setField(n.id, "race", e.target.value)} placeholder="Half-elf" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Faction</span>
                    <input className="cf-input" value={n.faction} onChange={(e) => setField(n.id, "faction", e.target.value)} placeholder="Thieves' Guild" />
                  </label>
                </div>

                <div className="cf-form-grid">
                  <div className="cf-field">
                    <span className="cf-field-label">Disposition</span>
                    <ChoiceChips values={DISPOSITIONS} value={n.disposition} onChange={(v) => setField(n.id, "disposition", v)} />
                  </div>
                  <div className="cf-field">
                    <span className="cf-field-label">Status</span>
                    <ChoiceChips values={NPC_STATUSES} value={n.status} onChange={(v) => setField(n.id, "status", v)} />
                  </div>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Location</span>
                  <LinkPicker
                    options={locationOptions}
                    selected={n.locationId}
                    onChange={(id) => setField(n.id, "locationId", id)}
                    placeholder="Link a location…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Relationships</span>
                  <div className="cf-relationship-list">
                    {(n.relationships || []).map((r) => (
                      <div className="cf-relationship-row" key={r.id}>
                        <input
                          className="cf-input cf-relationship-label-input"
                          value={r.label}
                          placeholder="rival, sister, owes a debt to…"
                          onChange={(e) => setRelationshipField(n.id, r.id, "label", e.target.value)}
                        />
                        <LinkPicker
                          options={otherNpcOptions}
                          selected={r.npcId}
                          onChange={(id) => setRelationshipField(n.id, r.id, "npcId", id)}
                          placeholder="Link an NPC…"
                        />
                        <button
                          type="button"
                          className="cf-delete-btn"
                          onClick={() => removeRelationship(n.id, r.id)}
                          title="Remove relationship"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="cf-btn cf-btn-ghost cf-btn-small" onClick={() => addRelationship(n.id)}>
                    + Add relationship
                  </button>
                  {incomingRels.length > 0 && (
                    <div className="cf-relationship-incoming">
                      <span className="cf-field-label">Also linked from</span>
                      <div className="cf-chip-row">
                        {incomingRels.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="cf-chip cf-chip-link"
                            onClick={() => onNavigate("npcs", r.fromNpcId)}
                          >
                            {r.fromName || "Untitled"}
                            {r.label ? ` (${r.label})` : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={n.tags} onChange={(tags) => setField(n.id, "tags", tags)} suggestions={allTags} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Description / notes</span>
                  <textarea
                    className="cf-textarea"
                    value={n.description}
                    onChange={(e) => setField(n.id, "description", e.target.value)}
                    placeholder="Appearance, personality, secrets…"
                  />
                </div>

                {linkedQuests.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">Involved in quests</span>
                    <div className="cf-chip-row">
                      {linkedQuests.map((q) => (
                        <button key={q.id} type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("quests", q.id)}>
                          {q.title || "Untitled quest"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {linkedSessions.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">Mentioned in sessions</span>
                    <div className="cf-chip-row">
                      {linkedSessions.map((s) => (
                        <button key={s.id} type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("sessions", s.id)}>
                          {sessionLabel(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </EntityCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
