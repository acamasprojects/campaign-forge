import { useState, useEffect, useRef } from "react";
import { emptyQuest, QUEST_STATUSES } from "../../data/model.js";
import { textMatches, hasAllTags, collectTags } from "../../utils/search.js";
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

export default function QuestPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeStatuses, setActiveStatuses] = useState([]);
  const [activeLocations, setActiveLocations] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
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

  const filtered = campaign.quests.filter(
    (q) =>
      textMatches(
        search,
        q.title,
        q.status,
        npcName(q.giverId),
        locationName(q.locationId),
        q.description,
        q.rewards,
        (q.tags || []).join(" ")
      ) &&
      (activeStatuses.length === 0 || activeStatuses.includes(q.status)) &&
      (activeLocations.length === 0 || activeLocations.includes(q.locationId)) &&
      hasAllTags(q.tags, activeTags)
  );

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

      <FilterBar
        search={search}
        onSearch={setSearch}
        resultCount={filtered.length}
        onClearAll={() => {
          setSearch("");
          setActiveStatuses([]);
          setActiveLocations([]);
          setActiveTags([]);
        }}
        groups={[
          { label: "Status", values: QUEST_STATUSES, active: activeStatuses, setActive: setActiveStatuses },
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
        <div className="cf-empty-panel">No quests match the current filters.</div>
      ) : (
        <div className="cf-card-list">
          {filtered.map((q) => {
            const expanded = expandedId === q.id;
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
                badges={
                  <span className="cf-badge" style={{ color: STATUS_COLOR[q.status], borderColor: STATUS_COLOR[q.status] }}>
                    {q.status}
                  </span>
                }
                meta={<span className="cf-card-submeta">{locationName(q.locationId) || ""}</span>}
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
                  <TagInput tags={q.tags} onChange={(tags) => setField(q.id, "tags", tags)} />
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
              </EntityCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
