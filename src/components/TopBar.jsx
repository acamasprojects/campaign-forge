import { useState, useRef, useEffect } from "react";

const TABS = [
  { id: "npcs", label: "NPCs" },
  { id: "locations", label: "Locations" },
  { id: "quests", label: "Quests" },
];

/** Top bar: campaign title, tab nav, and a global quick-search across all three lists. */
export default function TopBar({ tab, setTab, campaign, onNavigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? [
        ...campaign.npcs
          .filter((n) => n.name.toLowerCase().includes(q))
          .map((n) => ({ type: "npcs", id: n.id, label: n.name, kind: "NPC" })),
        ...campaign.locations
          .filter((l) => l.name.toLowerCase().includes(q))
          .map((l) => ({ type: "locations", id: l.id, label: l.name, kind: "Location" })),
        ...campaign.quests
          .filter((qu) => qu.title.toLowerCase().includes(q))
          .map((qu) => ({ type: "quests", id: qu.id, label: qu.title, kind: "Quest" })),
      ].slice(0, 10)
    : [];

  const jump = (r) => {
    onNavigate(r.type, r.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="cf-topbar">
      <div className="cf-topbar-title">{campaign.name}</div>
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
              <div className="cf-link-option cf-link-option-empty">No matches</div>
            ) : (
              results.map((r) => (
                <div key={`${r.type}-${r.id}`} className="cf-link-option" onMouseDown={() => jump(r)}>
                  <span className="cf-quick-search-kind">{r.kind}</span> {r.label || "Untitled"}
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
    </div>
  );
}
