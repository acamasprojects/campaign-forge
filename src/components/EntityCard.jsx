/** Shared collapsible card shell used by NPC, Location, and Quest cards. */
export default function EntityCard({ title, meta, badges, expanded, onToggle, onDelete, children, cardRef }) {
  return (
    <div className={`cf-card${expanded ? " cf-card-expanded" : ""}`} ref={cardRef}>
      <div className="cf-card-head" onClick={onToggle}>
        <div className="cf-card-head-main">
          <span className="cf-card-chevron">{expanded ? "▾" : "▸"}</span>
          <span className="cf-card-title">{title || "Untitled"}</span>
          {badges}
        </div>
        <div className="cf-card-head-actions">
          {meta}
          <button
            type="button"
            className="cf-delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
      {expanded && <div className="cf-card-body">{children}</div>}
    </div>
  );
}
