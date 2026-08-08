import { useState, useEffect, useRef } from "react";
import { emptySession } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import LinkPicker from "../LinkPicker.jsx";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "number-desc", label: "Session # (latest first)" },
  { value: "number-asc", label: "Session # (earliest first)" },
  { value: "date-newest", label: "Date (newest)" },
  { value: "date-oldest", label: "Date (oldest)" },
  { value: "name-asc", label: "Title (A–Z)" },
];
const SORT_COMPARATORS = {
  "number-desc": (a, b) => (b.sessionNumber || 0) - (a.sessionNumber || 0),
  "number-asc": (a, b) => (a.sessionNumber || 0) - (b.sessionNumber || 0),
  "date-newest": (a, b) => (b.date || "").localeCompare(a.date || ""),
  "date-oldest": (a, b) => (a.date || "").localeCompare(b.date || ""),
  "name-asc": (a, b) => (a.title || "").localeCompare(b.title || ""),
};

export default function SessionPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("number-desc");
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const npcOptions = campaign.npcs.map((n) => ({ id: n.id, label: n.name || "Untitled" }));
  const locationOptions = campaign.locations.map((l) => ({ id: l.id, label: l.name || "Untitled" }));
  const questOptions = campaign.quests.map((q) => ({ id: q.id, label: q.title || "Untitled" }));
  const namesOf = (options, ids) => ids.map((id) => options.find((o) => o.id === id)?.label).filter(Boolean).join(" ");

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.sessions.find((s) => s.id === focusId);
    if (target) {
      setSearch(target.title || `Session ${target.sessionNumber}`);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.sessions);

  const fieldsFor = (s) => [
    { value: `session ${s.sessionNumber}`, weight: 2, label: "session number" },
    { value: s.title, weight: 3, label: "title" },
    { value: s.date, weight: 1, label: "date" },
    { value: (s.tags || []).join(" "), weight: 2, label: "tags" },
    { value: s.summary, weight: 1, label: "summary" },
    { value: namesOf(npcOptions, s.relatedNpcIds), weight: 1, label: "NPCs" },
    { value: namesOf(locationOptions, s.relatedLocationIds), weight: 1, label: "locations" },
    { value: namesOf(questOptions, s.relatedQuestIds), weight: 1, label: "quests" },
  ];

  const extraFilter = (s) => (!pinnedOnly || s.pinned) && hasAllTags(s.tags, activeTags);

  const results = searchAndFilter(campaign.sessions, { search, fieldsFn: fieldsFor, extraFilter });
  const filtered = SORT_COMPARATORS[sortMode]
    ? results.map((r) => r.item).sort(SORT_COMPARATORS[sortMode])
    : results.map((r) => r.item);
  const matchNoteFor = (id) => {
    const r = results.find((x) => x.item.id === id);
    if (!search.trim() || !r || r.matchedFields.length === 0) return null;
    if (r.matchedFields.length === 1 && ["title", "session number"].includes(r.matchedFields[0])) return null;
    return `matched: ${r.matchedFields.join(", ")}`;
  };

  const suggestions =
    filtered.length === 0 && search.trim() && campaign.sessions.length > 0
      ? suggestClosest(search, [...campaign.sessions.map((s) => s.title), ...allTags])
      : [];

  const addSession = () => {
    const nextNumber = campaign.sessions.reduce((max, s) => Math.max(max, s.sessionNumber || 0), 0) + 1;
    const s = emptySession(nextNumber);
    update((c) => {
      c.sessions = [s, ...c.sessions];
      return c;
    });
    setExpandedId(s.id);
    flash("Session added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.sessions = c.sessions.map((s) => (s.id === id ? { ...s, [field]: value } : s));
      return c;
    });
  };

  const removeSession = (id) => {
    update((c) => {
      c.sessions = c.sessions.filter((s) => s.id !== id);
      return c;
    });
  };

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Session Log</h2>
        <button className="cf-btn cf-btn-primary" onClick={addSession}>
          + New Session
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

      {campaign.sessions.length === 0 ? (
        <div className="cf-empty-panel">No sessions logged yet. Add one after your next game to start building a recap history.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No sessions match the current filters.
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
          {filtered.map((s) => {
            const expanded = expandedId === s.id;
            return (
              <EntityCard
                key={s.id}
                cardRef={(el) => (cardRefs.current[s.id] = el)}
                title={`Session ${s.sessionNumber}${s.title ? `: ${s.title}` : ""}`}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : s.id)}
                onDelete={() => {
                  if (confirm(`Delete Session ${s.sessionNumber}?`)) removeSession(s.id);
                }}
                pinned={s.pinned}
                onTogglePin={() => setField(s.id, "pinned", !s.pinned)}
                badges={<span className="cf-badge cf-badge-muted">{s.date}</span>}
                matchNote={matchNoteFor(s.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field">
                    <span className="cf-field-label">Session #</span>
                    <input
                      type="number"
                      className="cf-input"
                      value={s.sessionNumber}
                      onChange={(e) => setField(s.id, "sessionNumber", Number(e.target.value) || 0)}
                    />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Date</span>
                    <input type="date" className="cf-input" value={s.date} onChange={(e) => setField(s.id, "date", e.target.value)} />
                  </label>
                  <label className="cf-field cf-field-wide">
                    <span className="cf-field-label">Title</span>
                    <input
                      className="cf-input"
                      value={s.title}
                      onChange={(e) => setField(s.id, "title", e.target.value)}
                      placeholder="The Ambush at Ravenhollow"
                    />
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Recap / notes</span>
                  <textarea
                    className="cf-textarea"
                    style={{ minHeight: 120 }}
                    value={s.summary}
                    onChange={(e) => setField(s.id, "summary", e.target.value)}
                    placeholder="What happened, decisions made, cliffhangers…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={s.tags} onChange={(tags) => setField(s.id, "tags", tags)} suggestions={allTags} />
                </div>

                <div className="cf-form-grid">
                  <div className="cf-field">
                    <span className="cf-field-label">NPCs involved</span>
                    <LinkPicker
                      options={npcOptions}
                      selected={s.relatedNpcIds}
                      onChange={(ids) => setField(s.id, "relatedNpcIds", ids)}
                      multiple
                      placeholder="Add an NPC…"
                    />
                  </div>
                  <div className="cf-field">
                    <span className="cf-field-label">Locations visited</span>
                    <LinkPicker
                      options={locationOptions}
                      selected={s.relatedLocationIds}
                      onChange={(ids) => setField(s.id, "relatedLocationIds", ids)}
                      multiple
                      placeholder="Add a location…"
                    />
                  </div>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Quests touched</span>
                  <LinkPicker
                    options={questOptions}
                    selected={s.relatedQuestIds}
                    onChange={(ids) => setField(s.id, "relatedQuestIds", ids)}
                    multiple
                    placeholder="Add a quest…"
                  />
                </div>
              </EntityCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
