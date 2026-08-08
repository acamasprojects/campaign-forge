import { useState, useEffect, useRef } from "react";
import { emptyFaction, DISPOSITIONS } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import ChoiceChips from "../ChoiceChips.jsx";
import LinkPicker from "../LinkPicker.jsx";

const STANDING_COLOR = {
  friendly: "#55704A",
  neutral: "#93762E",
  hostile: "#7A2020",
  unknown: "#6E655C",
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "standing", label: "Standing" },
];
const SORT_COMPARATORS = {
  "name-asc": (a, b) => (a.name || "").localeCompare(b.name || ""),
  "name-desc": (a, b) => (b.name || "").localeCompare(a.name || ""),
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  standing: (a, b) => DISPOSITIONS.indexOf(a.standing) - DISPOSITIONS.indexOf(b.standing),
};

export default function FactionPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeStandings, setActiveStandings] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("relevance");
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const factionName = (id) => campaign.factions.find((f) => f.id === id)?.name || null;
  const membersOf = (factionId) => campaign.npcs.filter((n) => n.factionId === factionId);
  const questsForFaction = (factionId) => {
    const memberIds = new Set(membersOf(factionId).map((n) => n.id));
    return campaign.quests.filter((q) => memberIds.has(q.giverId) || q.relatedNpcIds.some((id) => memberIds.has(id)));
  };

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.factions.find((f) => f.id === focusId);
    if (target) {
      setSearch(target.name);
      setActiveStandings([]);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.factions);

  const fieldsFor = (f) => [
    { value: f.name, weight: 3, label: "name" },
    { value: f.standing, weight: 1, label: "standing" },
    { value: f.agenda, weight: 1, label: "agenda" },
    { value: (f.tags || []).join(" "), weight: 2, label: "tags" },
    { value: membersOf(f.id).map((n) => n.name).join(" "), weight: 1, label: "members" },
    { value: (f.rivalFactionIds || []).map(factionName).join(" "), weight: 1, label: "rivals" },
  ];

  const extraFilter = (f) =>
    (activeStandings.length === 0 || activeStandings.includes(f.standing)) && (!pinnedOnly || f.pinned) && hasAllTags(f.tags, activeTags);

  const results = searchAndFilter(campaign.factions, { search, fieldsFn: fieldsFor, extraFilter });
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
    filtered.length === 0 && search.trim() && campaign.factions.length > 0
      ? suggestClosest(search, [...campaign.factions.map((f) => f.name), ...allTags])
      : [];

  const addFaction = () => {
    const f = emptyFaction();
    update((c) => {
      c.factions = [f, ...c.factions];
      return c;
    });
    setExpandedId(f.id);
    flash("Faction added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.factions = c.factions.map((f) => (f.id === id ? { ...f, [field]: value } : f));
      return c;
    });
  };

  const removeFaction = (id) => {
    update((c) => {
      c.factions = c.factions.filter((f) => f.id !== id).map((f) => ({ ...f, rivalFactionIds: f.rivalFactionIds.filter((x) => x !== id) }));
      c.npcs = c.npcs.map((n) => (n.factionId === id ? { ...n, factionId: null } : n));
      return c;
    });
  };

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Factions</h2>
        <button className="cf-btn cf-btn-primary" onClick={addFaction}>
          + New Faction
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
          setActiveStandings([]);
          setActiveTags([]);
          setPinnedOnly(false);
        }}
        groups={[
          { label: "Standing", values: DISPOSITIONS, active: activeStandings, setActive: setActiveStandings },
          { label: "Tags", values: allTags, active: activeTags, setActive: setActiveTags },
        ]}
      />

      {campaign.factions.length === 0 ? (
        <div className="cf-empty-panel">No factions yet. Add one to start tracking the politics of your world.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No factions match the current filters.
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
          {filtered.map((f) => {
            const expanded = expandedId === f.id;
            const members = membersOf(f.id);
            const linkedQuests = questsForFaction(f.id);
            const otherFactionOptions = campaign.factions
              .filter((o) => o.id !== f.id)
              .map((o) => ({ id: o.id, label: o.name || "Untitled" }));
            return (
              <EntityCard
                key={f.id}
                cardRef={(el) => (cardRefs.current[f.id] = el)}
                title={f.name}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : f.id)}
                onDelete={() => {
                  if (confirm(`Delete faction "${f.name || "Untitled"}"?`)) removeFaction(f.id);
                }}
                pinned={f.pinned}
                onTogglePin={() => setField(f.id, "pinned", !f.pinned)}
                badges={
                  <span className="cf-badge" style={{ color: STANDING_COLOR[f.standing], borderColor: STANDING_COLOR[f.standing] }}>
                    {f.standing}
                  </span>
                }
                meta={<span className="cf-card-submeta">{members.length > 0 ? `${members.length} member${members.length === 1 ? "" : "s"}` : ""}</span>}
                matchNote={matchNoteFor(f.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field cf-field-wide">
                    <span className="cf-field-label">Name</span>
                    <input className="cf-input" value={f.name} onChange={(e) => setField(f.id, "name", e.target.value)} placeholder="The Thieves' Guild" />
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Standing with the party</span>
                  <ChoiceChips values={DISPOSITIONS} value={f.standing} onChange={(v) => setField(f.id, "standing", v)} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Agenda / notes</span>
                  <textarea
                    className="cf-textarea"
                    value={f.agenda}
                    onChange={(e) => setField(f.id, "agenda", e.target.value)}
                    placeholder="Goals, methods, secrets…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Rival factions</span>
                  <LinkPicker
                    options={otherFactionOptions}
                    selected={f.rivalFactionIds}
                    onChange={(ids) => setField(f.id, "rivalFactionIds", ids)}
                    multiple
                    placeholder="Add a rival faction…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={f.tags} onChange={(tags) => setField(f.id, "tags", tags)} suggestions={allTags} />
                </div>

                {members.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">Members</span>
                    <div className="cf-chip-row">
                      {members.map((n) => (
                        <button key={n.id} type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("npcs", n.id)}>
                          {n.name || "Untitled"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {linkedQuests.length > 0 && (
                  <div className="cf-field">
                    <span className="cf-field-label">Quests involving this faction</span>
                    <div className="cf-chip-row">
                      {linkedQuests.map((q) => (
                        <button key={q.id} type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("quests", q.id)}>
                          {q.title || "Untitled quest"}
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
