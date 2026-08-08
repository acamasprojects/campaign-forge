import { useState, useRef, useEffect } from "react";
import { suggestClosest } from "../utils/search.js";
import { scoreCampaign } from "../utils/campaignSearch.js";

const TABS = [
  { id: "home", label: "Home" },
  { id: "npcs", label: "NPCs" },
  { id: "pcs", label: "Party" },
  { id: "factions", label: "Factions" },
  { id: "locations", label: "Locations" },
  { id: "items", label: "Items" },
  { id: "quests", label: "Quests" },
  { id: "sessions", label: "Sessions" },
  { id: "tags", label: "Tags" },
];

/** Top bar: campaign title, tab nav, and a global quick-search across all three lists. */
export default function TopBar({ tab, setTab, campaign, onNavigate, renameCampaign, onOpenPlayerView }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Score every entity across every field it has — including the entities
  // it's cross-linked to — so a search finds an NPC by a quest they're tied
  // to, a location by who's stationed there, and vice versa.
  const scored = scoreCampaign(campaign, query);

  const q = query.trim();
  const results = q
    ? scored
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
    : [];

  const suggestions =
    q && results.length === 0
      ? suggestClosest(query, scored.map((r) => r.label))
      : [];

  const jump = (r) => {
    onNavigate(r.type, r.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="cf-topbar">
      {editingTitle ? (
        <input
          autoFocus
          className="cf-topbar-title-input"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => {
            renameCampaign(campaign.id, titleDraft.trim() || campaign.name);
            setEditingTitle(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.target.blur();
            if (e.key === "Escape") setEditingTitle(false);
          }}
        />
      ) : (
        <div
          className="cf-topbar-title"
          onClick={() => {
            setTitleDraft(campaign.name);
            setEditingTitle(true);
          }}
          title="Click to rename campaign"
        >
          {campaign.name}
        </div>
      )}
      <div className="cf-quick-search" ref={wrapRef}>
        <input
          className="cf-input cf-quick-search-input"
          placeholder="Quick search everything…"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {open && q && (
          <div className="cf-quick-search-dropdown">
            {results.length === 0 ? (
              <div className="cf-link-option cf-link-option-empty">
                No matches
                {suggestions.length > 0 && (
                  <>
                    {" — did you mean "}
                    {suggestions.map((s, i) => (
                      <span key={s}>
                        {i > 0 && ", "}
                        <span className="cf-quick-search-suggestion" onMouseDown={() => setQuery(s)}>
                          {s}
                        </span>
                      </span>
                    ))}
                    ?
                  </>
                )}
              </div>
            ) : (
              results.map((r) => (
                <div key={`${r.type}-${r.id}`} className="cf-link-option" onMouseDown={() => jump(r)}>
                  <span className="cf-quick-search-kind">{r.kind}</span> {r.label || "Untitled"}
                  {r.matchedFields.length > 0 && !(r.matchedFields.length === 1 && ["name", "title", "session number"].includes(r.matchedFields[0])) && (
                    <span className="cf-match-note"> — matched: {r.matchedFields.join(", ")}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <nav className="cf-tab-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`cf-tab-btn${tab === t.id ? " cf-tab-btn-active" : ""}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <button type="button" className="cf-btn cf-btn-ghost cf-btn-small" onClick={onOpenPlayerView} title="Full-screen search view for the table">
        🎭 Player View
      </button>
    </div>
  );
}
