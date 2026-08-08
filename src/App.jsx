import { useState } from "react";
import { useCampaignStore } from "./hooks/useCampaignStore.js";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import TagManagerModal from "./components/TagManagerModal.jsx";
import NpcPanel from "./components/panels/NpcPanel.jsx";
import LocationPanel from "./components/panels/LocationPanel.jsx";
import QuestPanel from "./components/panels/QuestPanel.jsx";
import SessionPanel from "./components/panels/SessionPanel.jsx";
import TagBrowserPanel from "./components/panels/TagBrowserPanel.jsx";
import DashboardPanel from "./components/panels/DashboardPanel.jsx";
import { uid } from "./data/model.js";

export default function App() {
  const store = useCampaignStore();
  const [tab, setTab] = useState("home");
  const [toast, setToast] = useState(null);
  const [focus, setFocus] = useState(null); // { type, id } | null
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const onNavigate = (type, id) => {
    setTab(type);
    setFocus({ type, id });
  };

  const exportAll = () => {
    const blob = new Blob(
      [JSON.stringify({ campaigns: store.campaigns, currentId: store.currentId }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-forge-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Exported backup");
  };

  const importAll = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = Array.isArray(parsed.campaigns)
          ? parsed.campaigns
          : parsed.npcs || parsed.locations || parsed.quests
          ? [parsed]
          : [];
        if (incoming.length === 0) throw new Error("No campaigns found in file");
        const withNewIds = incoming.map((c) => ({ ...c, id: uid() }));
        withNewIds.forEach((c) => store.importCampaign(c));
        flash(`Imported ${withNewIds.length} campaign${withNewIds.length === 1 ? "" : "s"}`);
      } catch (e) {
        flash("Import failed — invalid file");
        console.error(e);
      }
    };
    reader.readAsText(file);
  };

  if (!store.loaded) {
    return <div className="cf-page cf-loading">Unrolling the map…</div>;
  }

  return (
    <div className="cf-page">
      <Sidebar
        campaigns={store.campaigns}
        currentId={store.currentId}
        setCurrentId={store.setCurrentId}
        addCampaign={store.addCampaign}
        deleteCampaign={store.deleteCampaign}
        renameCampaign={store.renameCampaign}
        onExportAll={exportAll}
        onImportAll={importAll}
        onManageTags={() => setTagManagerOpen(true)}
      />
      <main className="cf-main">
        {!store.current ? (
          <EmptyState onCreate={store.addCampaign} />
        ) : (
          <>
            <TopBar tab={tab} setTab={setTab} campaign={store.current} onNavigate={onNavigate} />
            <div className="cf-content">
              {tab === "home" && <DashboardPanel campaign={store.current} onNavigate={onNavigate} />}
              {tab === "npcs" && (
                <NpcPanel
                  campaign={store.current}
                  update={store.updateCurrent}
                  flash={flash}
                  focusId={focus?.type === "npcs" ? focus.id : null}
                  onConsumeFocus={() => setFocus(null)}
                  onNavigate={onNavigate}
                />
              )}
              {tab === "locations" && (
                <LocationPanel
                  campaign={store.current}
                  update={store.updateCurrent}
                  flash={flash}
                  focusId={focus?.type === "locations" ? focus.id : null}
                  onConsumeFocus={() => setFocus(null)}
                  onNavigate={onNavigate}
                />
              )}
              {tab === "quests" && (
                <QuestPanel
                  campaign={store.current}
                  update={store.updateCurrent}
                  flash={flash}
                  focusId={focus?.type === "quests" ? focus.id : null}
                  onConsumeFocus={() => setFocus(null)}
                  onNavigate={onNavigate}
                />
              )}
              {tab === "sessions" && (
                <SessionPanel
                  campaign={store.current}
                  update={store.updateCurrent}
                  flash={flash}
                  focusId={focus?.type === "sessions" ? focus.id : null}
                  onConsumeFocus={() => setFocus(null)}
                  onNavigate={onNavigate}
                />
              )}
              {tab === "tags" && <TagBrowserPanel campaign={store.current} onNavigate={onNavigate} />}
            </div>
          </>
        )}
      </main>
      {toast && <div className="cf-toast">{toast}</div>}
      {tagManagerOpen && store.current && (
        <TagManagerModal
          campaign={store.current}
          update={store.updateCurrent}
          flash={flash}
          onClose={() => setTagManagerOpen(false)}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="cf-empty-state">
      <div className="cf-empty-state-mark">🎲</div>
      <h2 className="cf-empty-state-title">No campaign at the table</h2>
      <p className="cf-empty-state-body">
        Start a new campaign to build out NPCs, locations, and quests.
      </p>
      <button className="cf-btn cf-btn-primary" onClick={onCreate}>
        + New Campaign
      </button>
    </div>
  );
}
