import { useState, useEffect, useRef } from "react";
import { emptyMonster, MONSTER_TYPES, MONSTER_SIZES, CHALLENGE_RATINGS, ABILITY_KEYS } from "../../data/model.js";
import { searchAndFilter, suggestClosest, hasAllTags, collectTags } from "../../utils/search.js";
import EntityCard from "../EntityCard.jsx";
import FilterBar from "../FilterBar.jsx";
import TagInput from "../TagInput.jsx";
import ChoiceChips from "../ChoiceChips.jsx";
import LinkPicker from "../LinkPicker.jsx";

const titleCase = (s) => (s ? s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "");

const abilityMod = (score) => {
  if (score === null || score === undefined || score === "") return null;
  return Math.floor((Number(score) - 10) / 2);
};
const fmtMod = (mod) => (mod === null ? "—" : mod >= 0 ? `+${mod}` : `${mod}`);

/** DMG-style stat block header, e.g. "Large dragon, chaotic evil". */
const statBlockHeader = (m) => `${titleCase(m.size)} ${titleCase(m.type)}, ${m.alignment || "unaligned"}`;

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "cr", label: "Challenge Rating" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];
const SORT_COMPARATORS = {
  "name-asc": (a, b) => (a.name || "").localeCompare(b.name || ""),
  "name-desc": (a, b) => (b.name || "").localeCompare(a.name || ""),
  cr: (a, b) => CHALLENGE_RATINGS.indexOf(a.challengeRating) - CHALLENGE_RATINGS.indexOf(b.challengeRating),
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
};

export default function MonsterPanel({ campaign, update, flash, focusId, onConsumeFocus, onNavigate }) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState([]);
  const [activeSizes, setActiveSizes] = useState([]);
  const [activeTags, setActiveTags] = useState([]);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [sortMode, setSortMode] = useState("relevance");
  const [expandedId, setExpandedId] = useState(null);
  const cardRefs = useRef({});

  const locationName = (id) => campaign.locations.find((l) => l.id === id)?.name || null;

  useEffect(() => {
    if (!focusId) return;
    const target = campaign.monsters.find((m) => m.id === focusId);
    if (target) {
      setSearch(target.name);
      setActiveTypes([]);
      setActiveSizes([]);
      setActiveTags([]);
      setExpandedId(target.id);
      setTimeout(() => cardRefs.current[target.id]?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
    }
    onConsumeFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  const allTags = collectTags(campaign.monsters);

  const fieldsFor = (m) => [
    { value: m.name, weight: 3, label: "name" },
    { value: m.type, weight: 1, label: "type" },
    { value: m.size, weight: 1, label: "size" },
    { value: m.alignment, weight: 0.5, label: "alignment" },
    { value: locationName(m.locationId), weight: 1, label: "location" },
    { value: (m.tags || []).join(" "), weight: 2, label: "tags" },
    { value: m.traits, weight: 0.5, label: "traits" },
    { value: m.actions, weight: 0.5, label: "actions" },
    { value: m.description, weight: 0.5, label: "description" },
  ];

  const extraFilter = (m) =>
    (activeTypes.length === 0 || activeTypes.includes(m.type)) &&
    (activeSizes.length === 0 || activeSizes.includes(m.size)) &&
    (!pinnedOnly || m.pinned) &&
    hasAllTags(m.tags, activeTags);

  const results = searchAndFilter(campaign.monsters, { search, fieldsFn: fieldsFor, extraFilter });
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
    filtered.length === 0 && search.trim() && campaign.monsters.length > 0
      ? suggestClosest(search, [...campaign.monsters.map((m) => m.name), ...allTags])
      : [];

  const addMonster = () => {
    const m = emptyMonster();
    update((c) => {
      c.monsters = [m, ...c.monsters];
      return c;
    });
    setExpandedId(m.id);
    flash("Monster added");
  };

  const setField = (id, field, value) => {
    update((c) => {
      c.monsters = c.monsters.map((m) => (m.id === id ? { ...m, [field]: value } : m));
      return c;
    });
  };

  const setAbility = (id, key, value) => {
    update((c) => {
      c.monsters = c.monsters.map((m) =>
        m.id === id ? { ...m, abilityScores: { ...m.abilityScores, [key]: value === "" ? null : Number(value) } } : m
      );
      return c;
    });
  };

  const removeMonster = (id) => {
    update((c) => {
      c.monsters = c.monsters.filter((m) => m.id !== id);
      return c;
    });
  };

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Bestiary</h2>
        <button className="cf-btn cf-btn-primary" onClick={addMonster}>
          + New Monster
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
          setActiveSizes([]);
          setActiveTags([]);
          setPinnedOnly(false);
        }}
        groups={[
          { label: "Type", values: MONSTER_TYPES, active: activeTypes, setActive: setActiveTypes, formatLabel: titleCase },
          { label: "Size", values: MONSTER_SIZES, active: activeSizes, setActive: setActiveSizes, formatLabel: titleCase },
          { label: "Tags", values: allTags, active: activeTags, setActive: setActiveTags },
        ]}
      />

      {campaign.monsters.length === 0 ? (
        <div className="cf-empty-panel">No monsters yet. Stat up whatever's stalking the party.</div>
      ) : filtered.length === 0 ? (
        <div className="cf-empty-panel">
          No monsters match the current filters.
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
          {filtered.map((m) => {
            const expanded = expandedId === m.id;
            const locationOptions = campaign.locations.map((l) => ({ id: l.id, label: l.name || "Untitled" }));
            return (
              <EntityCard
                key={m.id}
                cardRef={(el) => (cardRefs.current[m.id] = el)}
                title={m.name}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : m.id)}
                onDelete={() => {
                  if (confirm(`Delete monster "${m.name || "Untitled"}"?`)) removeMonster(m.id);
                }}
                pinned={m.pinned}
                onTogglePin={() => setField(m.id, "pinned", !m.pinned)}
                badges={
                  <>
                    <span className="cf-badge">CR {m.challengeRating}</span>
                    <span className="cf-badge cf-badge-muted">{titleCase(m.type)}</span>
                  </>
                }
                meta={<span className="cf-card-submeta">{locationName(m.locationId) ? `found at ${locationName(m.locationId)}` : ""}</span>}
                matchNote={matchNoteFor(m.id)}
              >
                <div className="cf-form-grid">
                  <label className="cf-field cf-field-wide">
                    <span className="cf-field-label">Name</span>
                    <input className="cf-input" value={m.name} onChange={(e) => setField(m.id, "name", e.target.value)} placeholder="Grung War-Chanter" />
                  </label>
                </div>

                <div className="cf-item-statblock">{statBlockHeader(m)}</div>

                <div className="cf-form-grid">
                  <div className="cf-field">
                    <span className="cf-field-label">Size</span>
                    <ChoiceChips values={MONSTER_SIZES} value={m.size} onChange={(v) => setField(m.id, "size", v)} formatLabel={titleCase} />
                  </div>
                  <label className="cf-field">
                    <span className="cf-field-label">Alignment</span>
                    <input
                      className="cf-input"
                      value={m.alignment}
                      onChange={(e) => setField(m.id, "alignment", e.target.value)}
                      placeholder="chaotic evil, unaligned…"
                    />
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Type</span>
                  <ChoiceChips values={MONSTER_TYPES} value={m.type} onChange={(v) => setField(m.id, "type", v)} formatLabel={titleCase} />
                </div>

                <div className="cf-form-grid">
                  <label className="cf-field">
                    <span className="cf-field-label">Armor Class</span>
                    <div className="cf-inline-fields">
                      <input
                        className="cf-input cf-input-narrow"
                        type="number"
                        value={m.armorClass ?? ""}
                        onChange={(e) => setField(m.id, "armorClass", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="15"
                      />
                      <input
                        className="cf-input"
                        value={m.armorClassNote}
                        onChange={(e) => setField(m.id, "armorClassNote", e.target.value)}
                        placeholder="natural armor"
                      />
                    </div>
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Hit Points</span>
                    <div className="cf-inline-fields">
                      <input
                        className="cf-input cf-input-narrow"
                        type="number"
                        value={m.hitPoints ?? ""}
                        onChange={(e) => setField(m.id, "hitPoints", e.target.value === "" ? null : Number(e.target.value))}
                        placeholder="45"
                      />
                      <input className="cf-input" value={m.hitDice} onChange={(e) => setField(m.id, "hitDice", e.target.value)} placeholder="6d8 + 18" />
                    </div>
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Speed</span>
                    <input className="cf-input" value={m.speed} onChange={(e) => setField(m.id, "speed", e.target.value)} placeholder="30 ft., fly 60 ft." />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Challenge Rating</span>
                    <select className="cf-input" value={m.challengeRating} onChange={(e) => setField(m.id, "challengeRating", e.target.value)}>
                      {CHALLENGE_RATINGS.map((cr) => (
                        <option key={cr} value={cr}>
                          {cr}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Ability Scores</span>
                  <div className="cf-ability-grid">
                    {ABILITY_KEYS.map((key) => (
                      <div className="cf-ability-box" key={key}>
                        <span className="cf-ability-key">{key.toUpperCase()}</span>
                        <input
                          className="cf-input cf-ability-input"
                          type="number"
                          value={m.abilityScores?.[key] ?? ""}
                          onChange={(e) => setAbility(m.id, key, e.target.value)}
                        />
                        <span className="cf-ability-mod">{fmtMod(abilityMod(m.abilityScores?.[key]))}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="cf-form-grid">
                  <label className="cf-field">
                    <span className="cf-field-label">Saving Throws</span>
                    <input className="cf-input" value={m.savingThrows} onChange={(e) => setField(m.id, "savingThrows", e.target.value)} placeholder="Dex +5, Wis +3" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Skills</span>
                    <input className="cf-input" value={m.skills} onChange={(e) => setField(m.id, "skills", e.target.value)} placeholder="Perception +5, Stealth +6" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Damage Vulnerabilities</span>
                    <input className="cf-input" value={m.damageVulnerabilities} onChange={(e) => setField(m.id, "damageVulnerabilities", e.target.value)} placeholder="fire" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Damage Resistances</span>
                    <input className="cf-input" value={m.damageResistances} onChange={(e) => setField(m.id, "damageResistances", e.target.value)} placeholder="cold, bludgeoning from nonmagical attacks" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Damage Immunities</span>
                    <input className="cf-input" value={m.damageImmunities} onChange={(e) => setField(m.id, "damageImmunities", e.target.value)} placeholder="poison" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Condition Immunities</span>
                    <input className="cf-input" value={m.conditionImmunities} onChange={(e) => setField(m.id, "conditionImmunities", e.target.value)} placeholder="charmed, frightened" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Senses</span>
                    <input className="cf-input" value={m.senses} onChange={(e) => setField(m.id, "senses", e.target.value)} placeholder="darkvision 60 ft., passive Perception 12" />
                  </label>
                  <label className="cf-field">
                    <span className="cf-field-label">Languages</span>
                    <input className="cf-input" value={m.languages} onChange={(e) => setField(m.id, "languages", e.target.value)} placeholder="Common, Goblin" />
                  </label>
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Traits</span>
                  <textarea className="cf-textarea" value={m.traits} onChange={(e) => setField(m.id, "traits", e.target.value)} placeholder="Pack Tactics. The creature has advantage on an attack roll…" />
                </div>
                <div className="cf-field">
                  <span className="cf-field-label">Actions</span>
                  <textarea className="cf-textarea" value={m.actions} onChange={(e) => setField(m.id, "actions", e.target.value)} placeholder="Multiattack. Bite. Claw…" />
                </div>
                <div className="cf-field">
                  <span className="cf-field-label">Bonus Actions</span>
                  <textarea className="cf-textarea" value={m.bonusActions} onChange={(e) => setField(m.id, "bonusActions", e.target.value)} />
                </div>
                <div className="cf-field">
                  <span className="cf-field-label">Reactions</span>
                  <textarea className="cf-textarea" value={m.reactions} onChange={(e) => setField(m.id, "reactions", e.target.value)} />
                </div>
                <div className="cf-field">
                  <span className="cf-field-label">Legendary Actions</span>
                  <textarea className="cf-textarea" value={m.legendaryActions} onChange={(e) => setField(m.id, "legendaryActions", e.target.value)} />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Description / lore</span>
                  <textarea className="cf-textarea" value={m.description} onChange={(e) => setField(m.id, "description", e.target.value)} placeholder="Appearance, behavior, habitat…" />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Typically found at</span>
                  <LinkPicker options={locationOptions} selected={m.locationId} onChange={(id) => setField(m.id, "locationId", id)} placeholder="Link a location…" />
                </div>

                <div className="cf-field">
                  <span className="cf-field-label">Tags</span>
                  <TagInput tags={m.tags} onChange={(tags) => setField(m.id, "tags", tags)} suggestions={allTags} />
                </div>
              </EntityCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
