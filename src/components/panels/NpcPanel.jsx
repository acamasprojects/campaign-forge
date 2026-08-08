import { useState, useEffect, useRef } from "react";
import { emptyNpc, DISPOSITIONS } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import ChoiceChips from "../ChoiceChips.jsx";
import LinkPicker from "../LinkPicker.jsx";

const DISPOSITION_COLOR = {
  friendly: "#5A8F5A",
  neutral: "#C9A227",
  hostile: "#A33D2C",
  unknown: "#8A8172",
};

export default function NpcPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeDispositions, setActiveDispositions] = useState([]);
  const [activeLocations, setActiveLocations] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const locationOptions = campaign.locations.map((l) => ({ id: l.id, label: l.name || "Untitled" }));
  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;

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

  const fieldsFor = (n) => [
    { value: n.name, weight: 3, label: "name" },
    { value: n.role, weight: 1.5, label: "role" },
    { value: n.faction, weight: 1.5, label: "faction" },
    { value: n.race, weight: 1, label: "race" },
    { value: locationName(n.locationId), weight: 1, label: "location" },
    { value: (n.tags || []).join(" "), weight: 2, label: "tags" },
    { value: n.description, weight: 0.5, label: "description" },
  ];

  const extraFilter = (n) =>
    (activeDispositions.length === 0 || activeDispositions.includes(n.disposition)) &&
    (activeLocations.length === 0 || activeLocations.includes(n.locationId)) &&
    hasAllTags(n.tags, activeTags);

  const results = searchAndFilter(campaign.npcs, { search, fieldsFn: fieldsFor, extraFilter });
  const filtered = results.map((r) => r.item);
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
      c.npcs = c.npcs.filter((n) => n.id !== id);
      c.quests = c.quests.map((q) => ({
        ...q,
        giverId: q.giverId === id ? null : q.giverId,
        relatedNpcIds: q.relatedNpcIds.filter((x) => x !== id),
      }));
      return c;
    });
  };

  const questsForNpc = (npcId) =>
    campaign.quests.filter((q) => q.giverId === npcId || q.relatedNpcIds.includes(npcId));

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
        onClearAll={() => {
          setSearch("");
          setActiveDispositions([]);
          setActiveLocations([]);
          setActiveTags([]);
        }}
        groups={[
          {
            label: "Disposition",
            values: DISPOSITIONS,
            active: activeDispositions,
            setActive: setActiveDispositions,
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
                badges={
                  <>
                    <span className="cf-badge" style={{ color: DISPOSITION_COLOR[n.disposition], borderColor: DISPOSITION_COLOR[n.disposition] }}>
                      {n.disposition}
                    </span>
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

                <div className="cf-field">
                  <span className="cf-field-label">Disposition</span>
                  <ChoiceChips values={DISPOSITIONS} value={n.disposition} onChange={(v) => setField(n.id, "disposition", v)} />
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
              </EntityCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
