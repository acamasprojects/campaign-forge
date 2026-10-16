import { useState, useEffect, useCallback, useRef } from "react";
import { emptyCampaign, normalizeCampaign } from "../data/model.js";

const STORE_KEY = "campaign-forge-data";

/**
 * Owns the full campaigns array + which one is active, loads it from
 * localStorage on mount and debounce-persists it on every change.
 */
export function useCampaignStore() {
  const [loaded, setLoaded] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const saveTimer = useRef(null);
  // Mirrors the latest campaigns/currentId so the exit-flush listener (set up
  // once, below) always sees current data instead of whatever was in scope
  // when it was registered.
  const latest = useRef({ campaigns, currentId });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setCampaigns((parsed.campaigns || []).map(normalizeCampaign));
        setCurrentId(parsed.currentId || parsed.campaigns?.[0]?.id || null);
      }
    } catch {
      // first run, or corrupt data — start fresh
    }
    setLoaded(true);
  }, []);

  const writeNow = useCallback((nextCampaigns, nextCurrentId) => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ campaigns: nextCampaigns, currentId: nextCurrentId }));
    } catch (e) {
      console.error("Campaign Forge: failed to save", e);
    }
  }, []);

  const persist = useCallback(
    (nextCampaigns, nextCurrentId) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => writeNow(nextCampaigns, nextCurrentId), 300);
    },
    [writeNow]
  );

  useEffect(() => {
    latest.current = { campaigns, currentId };
  }, [campaigns, currentId]);

  useEffect(() => {
    if (!loaded) return;
    persist(campaigns, currentId);
  }, [campaigns, currentId, loaded, persist]);

  // The debounce above means an edit can sit unsaved for up to 300ms, and
  // typing continuously keeps pushing that window back. Closing the tab (or
  // the browser crashing) inside that window loses whatever hasn't saved
  // yet. Flush immediately once the tab is actually going away: 'pagehide'
  // covers navigation/close, 'visibilitychange' covers backgrounding (tab
  // switch, app switch, phone lock) — together they catch far more exit
  // paths than 'beforeunload' alone, which mobile Safari doesn't fire
  // reliably. Only flushes if a save was actually pending, so this can't
  // overwrite real data with the empty initial state before the load effect
  // above has run.
  useEffect(() => {
    const flush = () => {
      if (!saveTimer.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      writeNow(latest.current.campaigns, latest.current.currentId);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, [writeNow]);

  const current = campaigns.find((c) => c.id === currentId) || null;

  const updateCurrent = useCallback(
    (fn) => {
      setCampaigns((prev) => prev.map((c) => (c.id === currentId ? fn({ ...c }) : c)));
    },
    [currentId]
  );

  const addCampaign = useCallback(() => {
    const c = emptyCampaign(`Campaign ${campaigns.length + 1}`);
    setCampaigns((p) => [...p, c]);
    setCurrentId(c.id);
    return c;
  }, [campaigns.length]);

  const deleteCampaign = useCallback(
    (id) => {
      setCampaigns((prev) => {
        const rest = prev.filter((c) => c.id !== id);
        if (currentId === id) setCurrentId(rest[0]?.id ?? null);
        return rest;
      });
    },
    [currentId]
  );

  const renameCampaign = useCallback((id, name) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);

  const replaceCampaign = useCallback((id, nextCampaign) => {
    setCampaigns((prev) => prev.map((c) => (c.id === id ? nextCampaign : c)));
  }, []);

  const importCampaign = useCallback((campaign) => {
    const normalized = normalizeCampaign(campaign);
    setCampaigns((prev) => [...prev, normalized]);
    setCurrentId(normalized.id);
  }, []);

  return {
    loaded,
    campaigns,
    currentId,
    setCurrentId,
    current,
    updateCurrent,
    addCampaign,
    deleteCampaign,
    renameCampaign,
    replaceCampaign,
    importCampaign,
  };
}
