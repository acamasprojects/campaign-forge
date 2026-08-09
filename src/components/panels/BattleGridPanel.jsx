import { useState, useEffect, useRef } from "react";
import { emptyBattleGrid } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import LinkPicker from "../LinkPicker.jsx";
import BattleGridEditor from "../BattleGridEditor.jsx";

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

export default function BattleGridPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("relevance");
  const [expandedId, setExpandedId] = useState(null);
  const [openGridId, setOpenGridId] = useState(null);
  const cardRefs = useRef({});

  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.grids.find((g) => g.id === focusId);
    if (target) {
      setSearch(target.name);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.grids);

  const fieldsFor = (g) => [
    { value: g.name, weight: 3, label: "name" },
    { value: locationName(g.locationId), weight: 1, label: "location" },
    { value: (g.tags || []).join(" "), weight: 2, label: "tags" },
    { value: g.notes, weight: 0.5, label: "notes" },
  ];

  const extraFilter = (g) => (!pinnedOnly || g.pinned) && hasAllTags(g.tags, activeTags);

  const results = searchAndFilter(campaign.grids, { search, fieldsFn: fieldsFor, extraFilter });
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
    filtered.length === 0 && search.trim() && campaign.grids.length > 0
      ? suggestClosest(search, [...campaign.grids.map((g) => g.name), ...allTags])
      : [];

  const addGrid = () => {
    const g = emptyBattleGrid();
    update((c) => {
      c.grids = [g, ...c.grids];
      return c;
    });
    setExpandedId(g.id);
    flash("Battle grid added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.grids = c.grids.map((g) => (g.id === id ? { ...g, [field]: value } : g));
      return c;
    });
  };

  const removeGrid = (id) => {
    update((c) => {
      c.grids = c.grids.filter((g) => g.id !== id);
      return c;
    });
  };

  const openGrid = campaign.grids.find((g) => g.id === openGridId) || null;

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Battle Grids</h2>
        <button className="cf-btn cf-btn-primary" onClick={addGrid}>
          + New Grid
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
          setActiveTags([]);
          setPinnedOnly(false);
        }}
        groups={[{ label: "Tags", values: allTags, active: activeTags, setActive: setActiveTags }]}
      />

      {campaign.grids.length === 0 ? (
        <div className="cf-empty-panel">No battle grids yet. Build a map before the next fight breaks out.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No grids match the current filters.
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
          {filtered.map((g) => {
            const expanded = expandedId === g.id;
            const locationOptions = campaign.locations.map((l) => ({ id: l.id, label: l.name || "Untitled" }));
            return (
              <EntityCard
                key={g.id}
                cardRef={(el) => (cardRefs.current[g.id] = el)}
                title={g.name}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : g.id)}
                onDelete={() => {
                  if (confirm(`Delete battle grid "${g.name || "Untitled"}"?`)) removeGrid(g.id);
                }}
                pinned={g.pinned}
                onTogglePin={() => setField(g.id, "pinned", !g.pinned)}
                badges={
                  <span className="cf-badge cf-badge-muted">
                    {g.rows}×{g.cols}
                  </span>
                }
                meta={
                  <span className="cf-card-submeta">
                    {g.tokens.length} token{g.tokens.length === 1 ? "" : "s"}
                    {locationName(g.locationId) ? ` · ${locationName(g.locationId)}` : ""}
                  </span>
                }
                matchNote={matchNoteFor(g.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field cf-field-wide">
                    <span className="cf-field-label">Name</span>
                    <input className="cf-input" value={g.name} onChange={(e) => setField(g.id, "name", e.target.value)} placeholder="Ambush at the Old Bridge" />
                  </label>
                </div>

                <div className="cf-form-grid">
                  <label className="cf-field">
                    <span className="cf-field-label">Rows</span>
                    <input
                      className="cf-input"
                      type="number"
                      min={1}
                      max={100}
                      value={g.rows}
                      onChange={(e) => setField(g.id, "rows", Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Columns</span>
                    <input
                      className="cf-input"
                      type="number"
                      min={1}
                      max={100}
                      value={g.cols}
                      onChange={(e) => setField(g.id, "cols", Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    />
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Map location</span>
                  <LinkPicker options={locationOptions} selected={g.locationId} onChange={(id) => setField(g.id, "locationId", id)} placeholder="Link a location…" />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Notes</span>
                  <textarea className="cf-textarea" value={g.notes} onChange={(e) => setField(g.id, "notes", e.target.value)} placeholder="Terrain, hazards, DM reminders…" />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={g.tags} onChange={(tags) => setField(g.id, "tags", tags)} suggestions={allTags} />
                </div>

                <button type="button" className="cf-btn cf-btn-primary" onClick={() => setOpenGridId(g.id)}>
                  ⚔ Open Grid Editor
                </button>
              </EntityCard>
            );
          })}
        </div>
      )}

      {openGrid && <BattleGridEditor campaign={campaign} grid={openGrid} update={update} onClose={() => setOpenGridId(null)} />}
    </div>
  );
}
