import { useState } from "react";
import Modal from "./Modal.jsx";

/** Dedupe-preserving tag replace: renaming into an existing tag merges them. */
function withTagRenamed(items, oldTag, newTag) {
  return items.map((item) => {
    if (!item.tags?.includes(oldTag)) return item;
    const next = Array.from(new Set(item.tags.map((t) => (t === oldTag ? newTag : t))));
    return { ...item, tags: next };
  });
}

function withTagRemoved(items, tag) {
  return items.map((item) => (item.tags?.includes(tag) ? { ...item, tags: item.tags.filter((t) => t !== tag) } : item));
}

/**
 * Campaign-wide tag housekeeping: rename (and merge) or delete a tag across
 * every NPC, Location, and Quest at once — the fix for typo drift that
 * per-field autocomplete can't undo once it's already happened.
 */
export default function TagManagerModal({ campaign, update, flash, onClose }) {
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({}); // tag -> in-progress rename text

  const usage = new Map();
  const bump = (tag, key) => {
    if (!usage.has(tag)) usage.set(tag, { npcs: 0, locations: 0, quests: 0, sessions: 0, factions: 0, pcs: 0 });
    usage.get(tag)[key] += 1;
  };
  campaign.npcs.forEach((n) => (n.tags || []).forEach((t) => bump(t, "npcs")));
  campaign.locations.forEach((l) => (l.tags || []).forEach((t) => bump(t, "locations")));
  campaign.quests.forEach((q) => (q.tags || []).forEach((t) => bump(t, "quests")));
  campaign.sessions.forEach((s) => (s.tags || []).forEach((t) => bump(t, "sessions")));
  campaign.factions.forEach((f) => (f.tags || []).forEach((t) => bump(t, "factions")));
  campaign.pcs.forEach((p) => (p.tags || []).forEach((t) => bump(t, "pcs")));

  const tags = Array.from(usage.keys())
    .filter((t) => t.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const rename = (oldTag) => {
    const newTag = (drafts[oldTag] || "").trim();
    if (!newTag || newTag === oldTag) return;
    update((c) => {
      c.npcs = withTagRenamed(c.npcs, oldTag, newTag);
      c.locations = withTagRenamed(c.locations, oldTag, newTag);
      c.quests = withTagRenamed(c.quests, oldTag, newTag);
      c.sessions = withTagRenamed(c.sessions, oldTag, newTag);
      c.factions = withTagRenamed(c.factions, oldTag, newTag);
      c.pcs = withTagRenamed(c.pcs, oldTag, newTag);
      return c;
    });
    setDrafts((d) => ({ ...d, [oldTag]: "" }));
    flash(newTag === oldTag ? "No change" : `Renamed "${oldTag}" → "${newTag}"`);
  };

  const remove = (tag) => {
    if (!confirm(`Remove tag "${tag}" from everything it's on? This can't be undone.`)) return;
    update((c) => {
      c.npcs = withTagRemoved(c.npcs, tag);
      c.locations = withTagRemoved(c.locations, tag);
      c.quests = withTagRemoved(c.quests, tag);
      c.sessions = withTagRemoved(c.sessions, tag);
      c.factions = withTagRemoved(c.factions, tag);
      c.pcs = withTagRemoved(c.pcs, tag);
      return c;
    });
    flash(`Removed tag "${tag}"`);
  };

  return (
    <Modal title="Manage Tags" onClose={onClose}>
      <input
        className="cf-input"
        placeholder="Filter tags…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 14 }}
      />
      {tags.length === 0 ? (
        <div className="cf-empty-panel">{usage.size === 0 ? "No tags used yet." : "No tags match that filter."}</div>
      ) : (
        <div className="cf-tag-manager-list">
          {tags.map((tag) => {
            const u = usage.get(tag);
            const total = u.npcs + u.locations + u.quests + u.sessions + u.factions + u.pcs;
            return (
              <div className="cf-tag-manager-row" key={tag}>
                <div className="cf-tag-manager-info">
                  <span className="cf-chip">{tag}</span>
                  <span className="cf-tag-manager-count">
                    {total} use{total === 1 ? "" : "s"}
                    {u.npcs > 0 && ` · ${u.npcs} NPC${u.npcs === 1 ? "" : "s"}`}
                    {u.pcs > 0 && ` · ${u.pcs} PC${u.pcs === 1 ? "" : "s"}`}
                    {u.factions > 0 && ` · ${u.factions} faction${u.factions === 1 ? "" : "s"}`}
                    {u.locations > 0 && ` · ${u.locations} location${u.locations === 1 ? "" : "s"}`}
                    {u.quests > 0 && ` · ${u.quests} quest${u.quests === 1 ? "" : "s"}`}
                    {u.sessions > 0 && ` · ${u.sessions} session${u.sessions === 1 ? "" : "s"}`}
                  </span>
                </div>
                <div className="cf-tag-manager-actions">
                  <input
                    className="cf-input cf-tag-manager-rename-input"
                    placeholder="rename to…"
                    value={drafts[tag] || ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [tag]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && rename(tag)}
                  />
                  <button type="button" className="cf-btn cf-btn-ghost cf-btn-small" onClick={() => rename(tag)}>
                    Rename
                  </button>
                  <button type="button" className="cf-btn cf-btn-danger cf-btn-small" onClick={() => remove(tag)}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
