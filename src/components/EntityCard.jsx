/** Shared collapsible card shell used by NPC, Location, Quest, and Session cards. */
export default function EntityCard({ title, meta, badges, matchNote, pinned, onTogglePin, expanded, onToggle, onDelete, children, cardRef }) {
  return (
    <div className={`cf-card${expanded ? " cf-card-expanded" : ""}${pinned ? " cf-card-pinned" : ""}`} ref={cardRef}>
      <div className="cf-card-head" onClick={onToggle}>
        <div className="cf-card-head-main">
          <span className="cf-card-chevron">{expanded ? "▾" : "▸"}</span>
          {onTogglePin && (
            <button
              type="button"
              className={`cf-pin-btn${pinned ? " cf-pin-btn-active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin();
              }}
              title={pinned ? "Unpin" : "Pin"}
            >
              {pinned ? "★" : "☆"}
            </button>
          )}
          <span className="cf-card-title">{title || "Untitled"}</span>
          {badges}
          {matchNote && <span className="cf-match-note">{matchNote}</span>}
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
