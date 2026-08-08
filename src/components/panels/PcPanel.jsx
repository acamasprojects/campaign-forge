import { useState, useEffect, useRef } from "react";
import { emptyPc, emptyRelationship, PC_STATUSES } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import ChoiceChips from "../ChoiceChips.jsx";
import LinkPicker from "../LinkPicker.jsx";

const PC_STATUS_COLOR = {
  active: "#55704A",
  retired: "#93762E",
  deceased: "#7A2020",
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];
const SORT_COMPARATORS = {
  "name-asc": (a, b) => (a.name || "").localeCompare(b.name || ""),
  "name-desc": (a, b) => (b.name || "").localeCompare(a.name || ""),
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
};

export default function PcPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeStatuses, setActiveStatuses] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("relevance");
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const locationOptions = campaign.locations.map((l) => ({ id: l.id, label: l.name || "Untitled" }));
  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;
  const npcName = (id) => campaign.npcs.find((x) => x.id === id)?.name || null;
  const questsForPc = (pcId) => campaign.quests.filter((q) => q.relatedPcIds.includes(pcId));
  const sessionsForPc = (pcId) => campaign.sessions.filter((s) => s.relatedPcIds.includes(pcId));
  const sessionLabel = (s) => `Session ${s.sessionNumber}${s.title ? `: ${s.title}` : ""}`;

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.pcs.find((p) => p.id === focusId);
    if (target) {
      setSearch(target.name);
      setActiveStatuses([]);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.pcs);

  const fieldsFor = (p) => [
    { value: p.name, weight: 3, label: "name" },
    { value: p.playerName, weight: 1.5, label: "player" },
    { value: p.classLevel, weight: 1, label: "class" },
    { value: p.race, weight: 1, label: "race" },
    { value: locationName(p.hometownLocationId), weight: 1, label: "hometown" },
    { value: p.backstory, weight: 0.5, label: "backstory" },
    { value: (p.tags || []).join(" "), weight: 2, label: "tags" },
    { value: (p.relationships || []).map((r) => npcName(r.npcId)).filter(Boolean).join(" "), weight: 1, label: "connections" },
    { value: questsForPc(p.id).map((q) => q.title).join(" "), weight: 1, label: "quests" },
    { value: sessionsForPc(p.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
  ];

  const extraFilter = (p) =>
    (activeStatuses.length === 0 || activeStatuses.includes(p.status)) && (!pinnedOnly || p.pinned) && hasAllTags(p.tags, activeTags);

  const results = searchAndFilter(campaign.pcs, { search, fieldsFn: fieldsFor, extraFilter });
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
    filtered.length === 0 && search.trim() && campaign.pcs.length > 0
      ? suggestClosest(search, [...campaign.pcs.map((p) => p.name), ...allTags])
      : [];

  const addPc = () => {
    const p = emptyPc();
    update((c) => {
      c.pcs = [p, ...c.pcs];
      return c;
    });
    setExpandedId(p.id);
    flash("PC added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.pcs = c.pcs.map((p) => (p.id === id ? { ...p, [field]: value } : p));
      return c;
    });
  };

  const removePc = (id) => {
    update((c) => {
      c.pcs = c.pcs.filter((p) => p.id !== id);
      c.quests = c.quests.map((q) => ({ ...q, relatedPcIds: q.relatedPcIds.filter((x) => x !== id) }));
      c.sessions = c.sessions.map((s) => ({ ...s, relatedPcIds: s.relatedPcIds.filter((x) => x !== id) }));
      c.items = c.items.map((i) => (i.ownerPcId === id ? { ...i, ownerPcId: null } : i));
      return c;
    });
  };

  const addRelationship = (pcId) => {
    const pc = campaign.pcs.find((x) => x.id === pcId);
    setField(pcId, "relationships", [...(pc.relationships || []), emptyRelationship()]);
  };

  const setRelationshipField = (pcId, relId, field, value) => {
    const pc = campaign.pcs.find((x) => x.id === pcId);
    setField(
      pcId,
      "relationships",
      (pc.relationships || []).map((r) => (r.id === relId ? { ...r, [field]: value } : r))
    );
  };

  const removeRelationship = (pcId, relId) => {
    const pc = campaign.pcs.find((x) => x.id === pcId);
    setField(pcId, "relationships", (pc.relationships || []).filter((r) => r.id !== relId));
  };

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Party</h2>
        <button className="cf-btn cf-btn-primary" onClick={addPc}>
          + New PC
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
          setActiveStatuses([]);
          setActiveTags([]);
          setPinnedOnly(false);
        }}
        groups={[
          { label: "Status", values: PC_STATUSES, active: activeStatuses, setActive: setActiveStatuses },
          { label: "Tags", values: allTags, active: activeTags, setActive: setActiveTags },
        ]}
      />

      {campaign.pcs.length === 0 ? (
        <div className="cf-empty-panel">No player characters yet. Add your party to start tying NPCs and quests back to them.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No PCs match the current filters.
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
          {filtered.map((p) => {
            const expanded = expandedId === p.id;
            const linkedQuests = questsForPc(p.id);
            const linkedSessions = sessionsForPc(p.id);
            const npcOptions = campaign.npcs.map((n) => ({ id: n.id, label: n.name || "Untitled" }));
            return (
              <EntityCard
                key={p.id}
                cardRef={(el) => (cardRefs.current[p.id] = el)}
                title={p.name}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : p.id)}
                onDelete={() => {
                  if (confirm(`Delete PC "${p.name || "Untitled"}"?`)) removePc(p.id);
                }}
                pinned={p.pinned}
                onTogglePin={() => setField(p.id, "pinned", !p.pinned)}
                badges={
                  <span className="cf-badge" style={{ color: PC_STATUS_COLOR[p.status], borderColor: PC_STATUS_COLOR[p.status] }}>
                    {p.status}
                  </span>
                }
                meta={<span className="cf-card-submeta">{p.playerName ? `played by ${p.playerName}` : ""}</span>}
                matchNote={matchNoteFor(p.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field">
                    <span className="cf-field-label">Character name</span>
                    <input className="cf-input" value={p.name} onChange={(e) => setField(p.id, "name", e.target.value)} placeholder="Mira Ashvane" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Player name</span>
                    <input className="cf-input" value={p.playerName} onChange={(e) => setField(p.id, "playerName", e.target.value)} placeholder="Alex" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Class / level</span>
                    <input className="cf-input" value={p.classLevel} onChange={(e) => setField(p.id, "classLevel", e.target.value)} placeholder="Level 5 Ranger" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Race</span>
                    <input className="cf-input" value={p.race} onChange={(e) => setField(p.id, "race", e.target.value)} placeholder="Wood elf" />
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Status</span>
                  <ChoiceChips values={PC_STATUSES} value={p.status} onChange={(v) => setField(p.id, "status", v)} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Hometown</span>
                  <LinkPicker
                    options={locationOptions}
                    selected={p.hometownLocationId}
                    onChange={(id) => setField(p.id, "hometownLocationId", id)}
                    placeholder="Link a location…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Connected NPCs</span>
                  <div className="cf-relationship-list">
                    {(p.relationships || []).map((r) => (
                      <div className="cf-relationship-row" key={r.id}>
                        <input
                          className="cf-input cf-relationship-label-input"
                          value={r.label}
                          placeholder="estranged brother, mentor…"
                          onChange={(e) => setRelationshipField(p.id, r.id, "label", e.target.value)}
                        />
                        <LinkPicker
                          options={npcOptions}
                          selected={r.npcId}
                          onChange={(id) => setRelationshipField(p.id, r.id, "npcId", id)}
                          placeholder="Link an NPC…"
                        />
                        <button
                          type="button"
                          className="cf-delete-btn"
                          onClick={() => removeRelationship(p.id, r.id)}
                          title="Remove connection"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="cf-btn cf-btn-ghost cf-btn-small" onClick={() => addRelationship(p.id)}>
                    + Add connection
                  </button>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={p.tags} onChange={(tags) => setField(p.id, "tags", tags)} suggestions={allTags} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Backstory / hooks</span>
                  <textarea
                    className="cf-textarea"
                    value={p.backstory}
                    onChange={(e) => setField(p.id, "backstory", e.target.value)}
                    placeholder="Personal goals, unresolved threads, things this player cares about…"
                  />
                </div>

                {linkedQuests.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">Personal quests</span>
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
                    <span className="cf-field-label">Featured in sessions</span>
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
