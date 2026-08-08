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

  const persist = useCallback((nextCampaigns, nextCurrentId) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          STORE_KEY,
          JSON.stringify({ campaigns: nextCampaigns, currentId: nextCurrentId })
        );
      } catch (e) {
        console.error("Campaign Forge: failed to save", e);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persist(campaigns, currentId);
  }, [campaigns, currentId, loaded, persist]);

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
