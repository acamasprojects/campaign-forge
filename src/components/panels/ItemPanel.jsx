import { useState, useEffect, useRef } from "react";
import { emptyItem, ITEM_TYPES, ITEM_RARITIES } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import ChoiceChips from "../ChoiceChips.jsx";
import LinkPicker from "../LinkPicker.jsx";

const RARITY_COLOR = {
  common: "#6E655C",
  uncommon: "#55704A",
  rare: "#3D6B93",
  "very-rare": "#6B4A93",
  legendary: "#C2801A",
  artifact: "#A13D3D",
};

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "rarity", label: "Rarity" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];
const SORT_COMPARATORS = {
  "name-asc": (a, b) => (a.name || "").localeCompare(b.name || ""),
  "name-desc": (a, b) => (b.name || "").localeCompare(a.name || ""),
  rarity: (a, b) => ITEM_RARITIES.indexOf(a.rarity) - ITEM_RARITIES.indexOf(b.rarity),
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
};

const titleCase = (s) => (s ? s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");

/** DMG-style stat block header, e.g. "Wand, rare (requires attunement by a spellcaster)". */
const statBlockHeader = (i) => {
  const attunement = i.attunement ? ` (requires attunement${i.attunementRequirement ? ` ${i.attunementRequirement}` : ""})` : "";
  return `${titleCase(i.type)}, ${titleCase(i.rarity)}${attunement}`;
};

export default function ItemPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState([]);
  const [activeRarities, setActiveRarities] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("relevance");
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;
  const npcName = (id) => campaign.npcs.find((n) => n.id === id)?.name || null;
  const pcName = (id) => campaign.pcs.find((p) => p.id === id)?.name || null;

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.items.find((i) => i.id === focusId);
    if (target) {
      setSearch(target.name);
      setActiveTypes([]);
      setActiveRarities([]);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.items);

  const fieldsFor = (i) => [
    { value: i.name, weight: 3, label: "name" },
    { value: i.type, weight: 1, label: "type" },
    { value: i.rarity, weight: 1, label: "rarity" },
    { value: locationName(i.locationId), weight: 1, label: "location" },
    { value: npcName(i.ownerNpcId), weight: 1, label: "owner" },
    { value: pcName(i.ownerPcId), weight: 1, label: "owner" },
    { value: (i.tags || []).join(" "), weight: 2, label: "tags" },
    { value: i.effects, weight: 1, label: "effects" },
    { value: i.description, weight: 0.5, label: "description" },
    { value: i.attunementRequirement, weight: 0.5, label: "attunement" },
  ];

  const extraFilter = (i) =>
    (activeTypes.length === 0 || activeTypes.includes(i.type)) &&
    (activeRarities.length === 0 || activeRarities.includes(i.rarity)) &&
    (!pinnedOnly || i.pinned) &&
    hasAllTags(i.tags, activeTags);

  const results = searchAndFilter(campaign.items, { search, fieldsFn: fieldsFor, extraFilter });
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
    filtered.length === 0 && search.trim() && campaign.items.length > 0
      ? suggestClosest(search, [...campaign.items.map((i) => i.name), ...allTags])
      : [];

  const addItem = () => {
    const i = emptyItem();
    update((c) => {
      c.items = [i, ...c.items];
      return c;
    });
    setExpandedId(i.id);
    flash("Item added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.items = c.items.map((i) => (i.id === id ? { ...i, [field]: value } : i));
      return c;
    });
  };

  const removeItem = (id) => {
    update((c) => {
      c.items = c.items.filter((i) => i.id !== id);
      return c;
    });
  };

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Items</h2>
        <button className="cf-btn cf-btn-primary" onClick={addItem}>
          + New Item
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
          setActiveRarities([]);
          setActiveTags([]);
          setPinnedOnly(false);
        }}
        groups={[
          { label: "Type", values: ITEM_TYPES, active: activeTypes, setActive: setActiveTypes, formatLabel: titleCase },
          { label: "Rarity", values: ITEM_RARITIES, active: activeRarities, setActive: setActiveRarities, formatLabel: titleCase },
          { label: "Tags", values: allTags, active: activeTags, setActive: setActiveTags },
        ]}
      />

      {campaign.items.length === 0 ? (
        <div className="cf-empty-panel">No items yet. Add loot, gear, and artifacts as your party finds them.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No items match the current filters.
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
          {filtered.map((i) => {
            const expanded = expandedId === i.id;
            const locationOptions = campaign.locations.map((l) => ({ id: l.id, label: l.name || "Untitled" }));
            const npcOptions = campaign.npcs.map((n) => ({ id: n.id, label: n.name || "Untitled" }));
            const pcOptions = campaign.pcs.map((p) => ({ id: p.id, label: p.name || "Untitled" }));
            return (
              <EntityCard
                key={i.id}
                cardRef={(el) => (cardRefs.current[i.id] = el)}
                title={i.name}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : i.id)}
                onDelete={() => {
                  if (confirm(`Delete item "${i.name || "Untitled"}"?`)) removeItem(i.id);
                }}
                pinned={i.pinned}
                onTogglePin={() => setField(i.id, "pinned", !i.pinned)}
                badges={
                  <>
                    <span className="cf-badge" style={{ color: RARITY_COLOR[i.rarity], borderColor: RARITY_COLOR[i.rarity] }}>
                      {titleCase(i.rarity)}
                    </span>
                    <span className="cf-badge cf-badge-muted">{titleCase(i.type)}</span>
                  </>
                }
                meta={
                  <span className="cf-card-submeta">
                    {npcName(i.ownerNpcId) || pcName(i.ownerPcId)
                      ? `carried by ${npcName(i.ownerNpcId) || pcName(i.ownerPcId)}`
                      : locationName(i.locationId)
                      ? `at ${locationName(i.locationId)}`
                      : ""}
                  </span>
                }
                matchNote={matchNoteFor(i.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field cf-field-wide">
                    <span className="cf-field-label">Name</span>
                    <input className="cf-input" value={i.name} onChange={(e) => setField(i.id, "name", e.target.value)} placeholder="Blade of the Sundered Vale" />
                  </label>
                </div>

                <div className="cf-item-statblock">{statBlockHeader(i)}</div>

                <div className="cf-field">
                  <span className="cf-field-label">Type</span>
                  <ChoiceChips values={ITEM_TYPES} value={i.type} onChange={(v) => setField(i.id, "type", v)} formatLabel={titleCase} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Rarity</span>
                  <ChoiceChips values={ITEM_RARITIES} value={i.rarity} onChange={(v) => setField(i.id, "rarity", v)} formatLabel={titleCase} />
                </div>

                <div className="cf-field">
                  <button
                    type="button"
                    className={`cf-chip cf-clue-toggle${i.attunement ? " cf-clue-revealed" : ""}`}
                    onClick={() => setField(i.id, "attunement", !i.attunement)}
                  >
                    {i.attunement ? "Requires attunement" : "No attunement required"}
                  </button>
                </div>

                {i.attunement && (
                  <label className="cf-field">
                    <span className="cf-field-label">Attunement requirement</span>
                    <input
                      className="cf-input"
                      value={i.attunementRequirement}
                      onChange={(e) => setField(i.id, "attunementRequirement", e.target.value)}
                      placeholder="by a spellcaster, by a druid…"
                    />
                  </label>
                )}

                <div className="cf-field">
                  <span className="cf-field-label">Mechanical effects</span>
                  <textarea
                    className="cf-textarea"
                    value={i.effects}
                    onChange={(e) => setField(i.id, "effects", e.target.value)}
                    placeholder="What it actually does at the table — bonuses, charges, activation, drawbacks…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Description / lore</span>
                  <textarea
                    className="cf-textarea"
                    value={i.description}
                    onChange={(e) => setField(i.id, "description", e.target.value)}
                    placeholder="Appearance, history, rumors…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Found at</span>
                  <LinkPicker
                    options={locationOptions}
                    selected={i.locationId}
                    onChange={(id) => setField(i.id, "locationId", id)}
                    placeholder="Link a location…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Carried by (NPC)</span>
                  <LinkPicker
                    options={npcOptions}
                    selected={i.ownerNpcId}
                    onChange={(id) => setField(i.id, "ownerNpcId", id)}
                    placeholder="Link an NPC…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Carried by (PC)</span>
                  <LinkPicker
                    options={pcOptions}
                    selected={i.ownerPcId}
                    onChange={(id) => setField(i.id, "ownerPcId", id)}
                    placeholder="Link a PC…"
                  />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={i.tags} onChange={(tags) => setField(i.id, "tags", tags)} suggestions={allTags} />
                </div>
              </EntityCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
