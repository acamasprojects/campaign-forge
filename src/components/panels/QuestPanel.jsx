import { useState, useEffect, useRef } from "react";
import { emptyQuest, QUEST_STATUSES } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import ChoiceChips from "../ChoiceChips.jsx";
import LinkPicker from "../LinkPicker.jsx";

const STATUS_COLOR = {
  "not-started": "#8A8172",
  active: "#C9A227",
  completed: "#5A8F5A",
  failed: "#A33D2C",
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name-asc", label: "Title (A–Z)" },
  { value: "name-desc", label: "Title (Z–A)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "status", label: "Status" },
];
const SORT_COMPARATORS = {
  "name-asc": (a, b) => (a.title || "").localeCompare(b.title || ""),
  "name-desc": (a, b) => (b.title || "").localeCompare(a.title || ""),
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  status: (a, b) => QUEST_STATUSES.indexOf(a.status) - QUEST_STATUSES.indexOf(b.status),
};

export default function QuestPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeStatuses, setActiveStatuses] = useState([]);
  const [activeLocations, setActiveLocations] = useState([]);
  const [activeArcs, setActiveArcs] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("relevance");
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const npcOptions = campaign.npcs.map((n) => ({ id: n.id, label: n.name || "Untitled" }));
  const locationOptions = campaign.locations.map((l) => ({ id: l.id, label: l.name || "Untitled" }));
  const npcName = (id) => campaign.npcs.find((n) => n.id === id)?.name || null;
  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.quests.find((q) => q.id === focusId);
    if (target) {
      setSearch(target.title);
      setActiveStatuses([]);
      setActiveLocations([]);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.quests);
  const allArcs = Array.from(new Set(campaign.quests.map((q) => q.arc).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const relatedNpcNames = (q) => q.relatedNpcIds.map((id) => npcName(id)).filter(Boolean).join(" ");
  const sessionsForQuest = (questId) => campaign.sessions.filter((s) => s.relatedQuestIds.includes(questId));
  const sessionLabel = (s) => `Session ${s.sessionNumber}${s.title ? `: ${s.title}` : ""}`;

  const fieldsFor = (q) => [
    { value: q.title, weight: 3, label: "title" },
    { value: q.status, weight: 1, label: "status" },
    { value: q.arc, weight: 1.5, label: "arc" },
    { value: npcName(q.giverId), weight: 1.5, label: "giver" },
    { value: locationName(q.locationId), weight: 1, label: "location" },
    { value: relatedNpcNames(q), weight: 1, label: "related NPCs" },
    { value: (q.tags || []).join(" "), weight: 2, label: "tags" },
    { value: q.rewards, weight: 0.5, label: "rewards" },
    { value: q.description, weight: 0.5, label: "description" },
    { value: sessionsForQuest(q.id).map(sessionLabel).join(" "), weight: 1, label: "sessions" },
  ];

  const extraFilter = (q) =>
    (activeStatuses.length === 0 || activeStatuses.includes(q.status)) &&
    (activeLocations.length === 0 || activeLocations.includes(q.locationId)) &&
    (activeArcs.length === 0 || activeArcs.includes(q.arc)) &&
    (!pinnedOnly || q.pinned) &&
    hasAllTags(q.tags, activeTags);

  const results = searchAndFilter(campaign.quests, { search, fieldsFn: fieldsFor, extraFilter });
  const filtered = SORT_COMPARATORS[sortMode]
    ? results.map((r) => r.item).sort(SORT_COMPARATORS[sortMode])
    : results.map((r) => r.item);
  const matchNoteFor = (id) => {
    const r = results.find((x) => x.item.id === id);
    if (!search.trim() || !r || r.matchedFields.length === 0) return null;
    if (r.matchedFields.length === 1 && r.matchedFields[0] === "title") return null;
    return `matched: ${r.matchedFields.join(", ")}`;
  };

  const suggestions =
    filtered.length === 0 && search.trim() && campaign.quests.length > 0
      ? suggestClosest(search, [...campaign.quests.map((q) => q.title), ...allTags])
      : [];

  const addQuest = () => {
    const q = emptyQuest();
    update((c) => {
      c.quests = [q, ...c.quests];
      return c;
    });
    setExpandedId(q.id);
    flash("Quest added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.quests = c.quests.map((q) => (q.id === id ? { ...q, [field]: value } : q));
      return c;
    });
  };

  const removeQuest = (id) => {
    update((c) => {
      c.quests = c.quests.filter((q) => q.id !== id);
      return c;
    });
  };

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Quests</h2>
        <button className="cf-btn cf-btn-primary" onClick={addQuest}>
          + New Quest
        </button>
      </div>

      <datalist id="cf-quest-arc-options">
        {allArcs.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>

      <FilterBar
        search={search}
        onSearch={setSearch}
        resultCount={filtered.length}
        sort={{ value: sortMode, options: SORT_OPTIONS, onChange: setSortMode }}
        pinnedOnly={{ active: pinnedOnly, onChange: setPinnedOnly }}
        onClearAll={() => {
          setSearch("");
          setActiveStatuses([]);
          setActiveLocations([]);
          setActiveArcs([]);
          setActiveTags([]);
          setPinnedOnly(false);
        }}
        groups={[
          { label: "Status", values: QUEST_STATUSES, active: activeStatuses, setActive: setActiveStatuses },
          { label: "Arc", values: allArcs, active: activeArcs, setActive: setActiveArcs },
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

      {campaign.quests.length === 0 ? (
        <div className="cf-empty-panel">No quests logged yet. Add one to start tracking the party's threads.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No quests match the current filters.
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
          {filtered.map((q) => {
            const expanded = expandedId === q.id;
            const linkedSessions = sessionsForQuest(q.id);
            return (
              <EntityCard
                key={q.id}
                cardRef={(el) => (cardRefs.current[q.id] = el)}
                title={q.title}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : q.id)}
                onDelete={() => {
                  if (confirm(`Delete quest "${q.title || "Untitled"}"?`)) removeQuest(q.id);
                }}
                pinned={q.pinned}
                onTogglePin={() => setField(q.id, "pinned", !q.pinned)}
                badges={
                  <>
                    <span className="cf-badge" style={{ color: STATUS_COLOR[q.status], borderColor: STATUS_COLOR[q.status] }}>
                      {q.status}
                    </span>
                    {q.arc && <span className="cf-badge cf-badge-muted">{q.arc}</span>}
                  </>
                }
                meta={<span className="cf-card-submeta">{locationName(q.locationId) || ""}</span>}
                matchNote={matchNoteFor(q.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field cf-field-wide">
                    <span className="cf-field-label">Title</span>
                    <input className="cf-input" value={q.title} onChange={(e) => setField(q.id, "title", e.target.value)} placeholder="The Missing Caravan" />
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Status</span>
                  <ChoiceChips values={QUEST_STATUSES} value={q.status} onChange={(v) => setField(q.id, "status", v)} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Arc / chapter</span>
                  <input
                    className="cf-input"
                    list="cf-quest-arc-options"
                    value={q.arc}
                    onChange={(e) => setField(q.id, "arc", e.target.value)}
                    placeholder="Chapter 2: The Sunken Vault"
                  />
                </div>

                <div className="cf-form-grid">
                  <div className="cf-field">
                    <span className="cf-field-label">Quest giver</span>
                    <LinkPicker options={npcOptions} selected={q.giverId} onChange={(id) => setField(q.id, "giverId", id)} placeholder="Link an NPC…" />
                  </div>
                  <div className="cf-field">
                    <span className="cf-field-label">Location</span>
                    <LinkPicker options={locationOptions} selected={q.locationId} onChange={(id) => setField(q.id, "locationId", id)} placeholder="Link a location…" />
                  </div>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Related NPCs</span>
                  <LinkPicker
                    options={npcOptions}
                    selected={q.relatedNpcIds}
                    onChange={(ids) => setField(q.id, "relatedNpcIds", ids)}
                    multiple
                    placeholder="Add related NPCs…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={q.tags} onChange={(tags) => setField(q.id, "tags", tags)} suggestions={allTags} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Description / notes</span>
                  <textarea
                    className="cf-textarea"
                    value={q.description}
                    onChange={(e) => setField(q.id, "description", e.target.value)}
                    placeholder="Hooks, clues, twists…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Rewards</span>
                  <input className="cf-input" value={q.rewards} onChange={(e) => setField(q.id, "rewards", e.target.value)} placeholder="200 gp, a +1 dagger…" />
                </div>

                {q.giverId && npcName(q.giverId) && (
                  <div className="cf-field">
                    <span className="cf-field-label">Jump to</span>
                    <div className="cf-chip-row">
                      <button type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("npcs", q.giverId)}>
                        {npcName(q.giverId)} (giver)
                      </button>
                      {q.locationId && locationName(q.locationId) && (
                        <button type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("locations", q.locationId)}>
                          {locationName(q.locationId)}
                        </button>
                      )}
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
