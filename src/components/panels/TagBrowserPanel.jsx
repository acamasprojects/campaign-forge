import { useState } from "react";

/**
 * Browse the campaign by tag instead of by entity type: pick a tag, see
 * every NPC, Location, and Quest that shares it in one place. The complement
 * to per-list tag filtering, for "show me everything about X" questions
 * that cut across all three lists at once.
 */
export default function TagBrowserPanel({ campaign, onNavigate }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const usage = new Map();
  const bump = (tag, key, item) => {
    if (!usage.has(tag)) usage.set(tag, { npcs: [], locations: [], quests: [] });
    usage.get(tag)[key].push(item);
  };
  campaign.npcs.forEach((n) => (n.tags || []).forEach((t) => bump(t, "npcs", n)));
  campaign.locations.forEach((l) => (l.tags || []).forEach((t) => bump(t, "locations", l)));
  campaign.quests.forEach((q) => (q.tags || []).forEach((t) => bump(t, "quests", q)));

  const tags = Array.from(usage.keys())
    .filter((t) => t.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const activeTag = selected && usage.has(selected) ? selected : null;
  const group = activeTag ? usage.get(activeTag) : null;

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Tags</h2>
      </div>

      {usage.size === 0 ? (
        <div className="cf-empty-panel">No tags used yet. Add tags to NPCs, Locations, or Quests to browse by them here.</div>
      ) : (
        <>
          <input
            className="cf-input"
            placeholder="Filter tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 14 }}
          />
          <div className="cf-chip-row" style={{ marginBottom: 20 }}>
            {tags.map((t) => {
              const u = usage.get(t);
              const total = u.npcs.length + u.locations.length + u.quests.length;
              return (
                <button
                  key={t}
                  type="button"
                  className={`cf-chip cf-filter-chip${activeTag === t ? " cf-chip-active" : ""}`}
                  onClick={() => setSelected(t)}
                >
                  {t} <span className="cf-tag-browser-count">{total}</span>
                </button>
              );
            })}
          </div>

          {group && (
            <div className="cf-tag-browser-groups">
              <TagBrowserGroup label="NPCs" items={group.npcs} nameOf={(n) => n.name} onPick={(id) => onNavigate("npcs", id)} />
              <TagBrowserGroup label="Locations" items={group.locations} nameOf={(l) => l.name} onPick={(id) => onNavigate("locations", id)} />
              <TagBrowserGroup label="Quests" items={group.quests} nameOf={(q) => q.title} onPick={(id) => onNavigate("quests", id)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TagBrowserGroup({ label, items, nameOf, onPick }) {
  if (items.length === 0) return null;
  return (
    <div className="cf-field">
      <span className="cf-field-label">{label} ({items.length})</span>
      <div className="cf-chip-row">
        {items.map((item) => (
          <button key={item.id} type="button" className="cf-chip cf-chip-link" onClick={() => onPick(item.id)}>
            {nameOf(item) || "Untitled"}
          </button>
        ))}
      </div>
    </div>
  );
}
