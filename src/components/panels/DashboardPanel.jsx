/**
 * Landing view: what a DM wants to see opening the app right before a
 * session — the last recap, what's still active, and whatever's pinned —
 * without hunting across four tabs first.
 */
export default function DashboardPanel({ campaign, onNavigate }) {
  const lastSession = campaign.sessions.reduce(
    (best, s) => (!best || (s.sessionNumber || 0) > (best.sessionNumber || 0) ? s : best),
    null
  );

  const activeQuests = campaign.quests.filter((q) => q.status === "active");
  const arcGroups = new Map();
  activeQuests.forEach((q) => {
    const key = q.arc || "No arc";
    if (!arcGroups.has(key)) arcGroups.set(key, []);
    arcGroups.get(key).push(q);
  });

  const pinnedNpcs = campaign.npcs.filter((n) => n.pinned);
  const pinnedLocations = campaign.locations.filter((l) => l.pinned);
  const pinnedQuests = campaign.quests.filter((q) => q.pinned);
  const pinnedSessions = campaign.sessions.filter((s) => s.pinned);
  const anyPinned = pinnedNpcs.length + pinnedLocations.length + pinnedQuests.length + pinnedSessions.length > 0;

  const isEmpty =
    campaign.npcs.length === 0 && campaign.locations.length === 0 && campaign.quests.length === 0 && campaign.sessions.length === 0;

  if (isEmpty) {
    return (
      <div className="cf-panel">
        <div className="cf-empty-panel">
          Nothing in this campaign yet. Start adding NPCs, Locations, and Quests — this dashboard will
          fill in with your active threads and pinned favorites as you go.
        </div>
      </div>
    );
  }

  return (
    <div className="cf-panel">
      <div className="cf-panel-head-row">
        <h2 className="cf-panel-title">Dashboard</h2>
      </div>

      <div className="cf-dashboard-section">
        <h3 className="cf-dashboard-heading">Last Session</h3>
        {lastSession ? (
          <div className="cf-dashboard-recap" onClick={() => onNavigate("sessions", lastSession.id)}>
            <div className="cf-dashboard-recap-head">
              <span className="cf-card-title">
                Session {lastSession.sessionNumber}
                {lastSession.title ? `: ${lastSession.title}` : ""}
              </span>
              <span className="cf-badge cf-badge-muted">{lastSession.date}</span>
            </div>
            {lastSession.summary && (
              <p className="cf-dashboard-recap-body">
                {lastSession.summary.length > 240 ? `${lastSession.summary.slice(0, 240)}…` : lastSession.summary}
              </p>
            )}
          </div>
        ) : (
          <div className="cf-empty-panel">No sessions logged yet.</div>
        )}
      </div>

      <div className="cf-dashboard-section">
        <h3 className="cf-dashboard-heading">
          Active Quests <span className="cf-tag-browser-count">{activeQuests.length}</span>
        </h3>
        {activeQuests.length === 0 ? (
          <div className="cf-empty-panel">No active quests right now.</div>
        ) : (
          Array.from(arcGroups.entries()).map(([arc, quests]) => (
            <div key={arc} className="cf-field">
              <span className="cf-field-label">{arc}</span>
              <div className="cf-chip-row">
                {quests.map((q) => (
                  <button key={q.id} type="button" className="cf-chip cf-chip-link" onClick={() => onNavigate("quests", q.id)}>
                    {q.title || "Untitled quest"}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="cf-dashboard-section">
        <h3 className="cf-dashboard-heading">★ Pinned</h3>
        {!anyPinned ? (
          <div className="cf-empty-panel">Nothing pinned yet — star an NPC, Location, Quest, or Session to keep it here.</div>
        ) : (
          <>
            <PinnedGroup label="NPCs" items={pinnedNpcs} nameOf={(n) => n.name} onPick={(id) => onNavigate("npcs", id)} />
            <PinnedGroup label="Locations" items={pinnedLocations} nameOf={(l) => l.name} onPick={(id) => onNavigate("locations", id)} />
            <PinnedGroup label="Quests" items={pinnedQuests} nameOf={(q) => q.title} onPick={(id) => onNavigate("quests", id)} />
            <PinnedGroup
              label="Sessions"
              items={pinnedSessions}
              nameOf={(s) => `Session ${s.sessionNumber}${s.title ? `: ${s.title}` : ""}`}
              onPick={(id) => onNavigate("sessions", id)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function PinnedGroup({ label, items, nameOf, onPick }) {
  if (items.length === 0) return null;
  return (
    <div className="cf-field">
      <span className="cf-field-label">{label}</span>
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
