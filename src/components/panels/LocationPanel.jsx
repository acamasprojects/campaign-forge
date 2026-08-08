import { useState, useEffect, useRef } from "react";
import { emptyLocation, LOCATION_TYPES } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import ChoiceChips from "../ChoiceChips.jsx";
import LinkPicker from "../LinkPicker.jsx";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "type", label: "Type" },
];
const SORT_COMPARATORS = {
  "name-asc": (a, b) => (a.name || "").localeCompare(b.name || ""),
  "name-desc": (a, b) => (b.name || "").localeCompare(a.name || ""),
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  type: (a, b) => LOCATION_TYPES.indexOf(a.type) - LOCATION_TYPES.indexOf(b.type),
};

export default function LocationPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("relevance");
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const nameOf = (id) => campaign.locations.find((l) => l.id === id)?.name || null;

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.locations.find((l) => l.id === focusId);
    if (target) {
      setSearch(target.name);
      setActiveTypes([]);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.locations);
  const npcsAt = (locId) => campaign.npcs.filter((n) => n.locationId === locId);
  const questsAt = (locId) => campaign.quests.filter((q) => q.locationId === locId);
  const childrenOf = (locId) => campaign.locations.filter((l) => l.parentId === locId);
  const sessionsAt = (locId) => campaign.sessions.filter((s) => s.relatedLocationIds.includes(locId));
  const sessionLabel = (s) => `Session ${s.sessionNumber}${s.title ? `: ${s.title}` : ""}`;

  const fieldsFor = (l) => [
    { value: l.name, weight: 3, label: "name" },
    { value: l.type, weight: 1, label: "type" },
    { value: nameOf(l.parentId), weight: 1, label: "parent location" },
    { value: (l.tags || []).join(" "), weight: 2, label: "tags" },
    { value: l.description, weight: 0.5, label: "description" },
    { value: npcsAt(l.id).map((n) => n.name).join(" "), weight: 1, label: "NPCs here" },
    { value: questsAt(l.id).map((q) => q.title).join(" "), weight: 1, label: "quests here" },
    { value: childrenOf(l.id).map((c) => c.name).join(" "), weight: 0.5, label: "sub-locations" },
    { value: sessionsAt(l.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
  ];

  const extraFilter = (l) =>
    (activeTypes.length === 0 || activeTypes.includes(l.type)) && (!pinnedOnly || l.pinned) && hasAllTags(l.tags, activeTags);

  const results = searchAndFilter(campaign.locations, { search, fieldsFn: fieldsFor, extraFilter });
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
    filtered.length === 0 && search.trim() && campaign.locations.length > 0
      ? suggestClosest(search, [...campaign.locations.map((l) => l.name), ...allTags])
      : [];

  const addLocation = () => {
    const l = emptyLocation();
    update((c) => {
      c.locations = [l, ...c.locations];
      return c;
    });
    setExpandedId(l.id);
    flash("Location added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.locations = c.locations.map((l) => (l.id === id ? { ...l, [field]: value } : l));
      return c;
    });
  };

  const removeLocation = (id) => {
    update((c) => {
      c.locations = c.locations.filter((l) => l.id !== id);
      c.locations = c.locations.map((l) => (l.parentId === id ? { ...l, parentId: null } : l));
      c.npcs = c.npcs.map((n) => (n.locationId === id ? { ...n, locationId: null } : n));
      c.quests = c.quests.map((q) => (q.locationId === id ? { ...q, locationId: null } : q));
      return c;
    });
  };

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Locations</h2>
        <button className="cf-btn cf-btn-primary" onClick={addLocation}>
          + New Location
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
          setActiveTypes([]);
          setActiveTags([]);
          setPinnedOnly(false);
        }}
        groups={[
          { label: "Type", values: LOCATION_TYPES, active: activeTypes, setActive: setActiveTypes },
          { label: "Tags", values: allTags, active: activeTags, setActive: setActiveTags },
        ]}
      />

      {campaign.locations.length === 0 ? (
        <div className="cf-empty-panel">No locations yet. Add one to start mapping the world.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No locations match the current filters.
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
          {filtered.map((l) => {
            const expanded = expandedId === l.id;
            const npcs = npcsAt(l.id);
            const quests = questsAt(l.id);
            const children = childrenOf(l.id);
            const sessions = sessionsAt(l.id);
            const locationOptions = campaign.locations
              .filter((o) => o.id !== l.id)
              .map((o) => ({ id: o.id, label: o.name || "Untitled" }));
            return (
              <EntityCard
                key={l.id}
                cardRef={(el) => (cardRefs.current[l.id] = el)}
                title={l.name}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : l.id)}
                onDelete={() => {
                  if (confirm(`Delete location "${l.name || "Untitled"}"?`)) removeLocation(l.id);
                }}
                pinned={l.pinned}
                onTogglePin={() => setField(l.id, "pinned", !l.pinned)}
                badges={
                  <>
                    <span className="cf-badge">{l.type}</span>
                    {l.parentId && nameOf(l.parentId) && <span className="cf-badge cf-badge-muted">in {nameOf(l.parentId)}</span>}
                  </>
                }
                meta={<span className="cf-card-submeta">{npcs.length > 0 ? `${npcs.length} NPC${npcs.length === 1 ? "" : "s"}` : ""}</span>}
                matchNote={matchNoteFor(l.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field">
                    <span className="cf-field-label">Name</span>
                    <input className="cf-input" value={l.name} onChange={(e) => setField(l.id, "name", e.target.value)} placeholder="Ravenhollow" />
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Type</span>
                  <ChoiceChips values={LOCATION_TYPES} value={l.type} onChange={(v) => setField(l.id, "type", v)} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Parent location</span>
                  <LinkPicker
                    options={locationOptions}
                    selected={l.parentId}
                    onChange={(id) => setField(l.id, "parentId", id)}
                    placeholder="e.g. a tavern's parent city…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={l.tags} onChange={(tags) => setField(l.id, "tags", tags)} suggestions={allTags} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Description / notes</span>
                  <textarea
                    className="cf-textarea"
                    value={l.description}
                    onChange={(e) => setField(l.id, "description", e.target.value)}
                    placeholder="Atmosphere, points of interest, history…"
                  />
                </div>

                {children.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">Contains</span>
                    <div className="cf-chip-row">
                      {children.map((c) => (
                        <button key={c.id} type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("locations", c.id)}>
                          {c.name || "Untitled"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {npcs.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">NPCs here</span>
                    <div className="cf-chip-row">
                      {npcs.map((n) => (
                        <button key={n.id} type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("npcs", n.id)}>
                          {n.name || "Untitled"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {quests.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">Quests here</span>
                    <div className="cf-chip-row">
                      {quests.map((q) => (
                        <button key={q.id} type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("quests", q.id)}>
                          {q.title || "Untitled quest"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {sessions.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">Mentioned in sessions</span>
                    <div className="cf-chip-row">
                      {sessions.map((s) => (
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
