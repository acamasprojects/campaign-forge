import { useState, useRef } from "react";

export default function Sidebar({
  campaigns,
  currentId,
  setCurrentId,
  addCampaign,
  deleteCampaign,
  renameCampaign,
  onExportAll,
  onImportAll,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef(null);

  return (
    <aside className="cf-sidebar">
      <div className="cf-brand">
        <div className="cf-brand-mark">⚔</div>
        <div>
          <div className="cf-brand-title">Campaign Forge</div>
          <div className="cf-brand-sub">NPCs · Locations · Quests</div>
        </div>
      </div>

      <button className="cf-btn cf-btn-primary cf-new-campaign-btn" onClick={addCampaign}>
        + New Campaign
      </button>

      <div className="cf-campaign-list">
        {campaigns.length === 0 && <div className="cf-sidebar-empty">No campaigns yet.</div>}
        {campaigns.map((c) => (
          <div
            key={c.id}
            className={`cf-campaign-item${c.id === currentId ? " cf-campaign-item-active" : ""}`}
            onClick={() => setCurrentId(c.id)}
          >
            {editingId === c.id ? (
              <input
                autoFocus
                className="cf-rename-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  renameCampaign(c.id, draft.trim() || c.name);
                  setEditingId(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="cf-campaign-name"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingId(c.id);
                  setDraft(c.name);
                }}
                title="Double-click to rename"
              >
                {c.name}
              </span>
            )}
            <button
              className="cf-delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${c.name}"? This cannot be undone.`)) deleteCampaign(c.id);
              }}
              title="Delete campaign"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="cf-sidebar-footer">
        <div className="cf-sidebar-footer-text">Saved automatically in your browser.</div>
        <div className="cf-sidebar-footer-actions">
          <button className="cf-btn cf-btn-ghost cf-btn-small" onClick={onExportAll} disabled={campaigns.length === 0}>
            Export
          </button>
          <button className="cf-btn cf-btn-ghost cf-btn-small" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImportAll(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </aside>
  );
}
