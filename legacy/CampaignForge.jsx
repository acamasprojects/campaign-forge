import React, { useState, useEffect, useCallback, useRef } from "react";

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const rollD20 = () => Math.floor(Math.random() * 20) + 1;

const emptyCombatant = () => ({
  id: uid(),
  name: "",
  type: "monster", // monster | npc | pc
  ac: 10,
  maxHp: 10,
  initMod: 0,
});

const emptyCampaign = (name) => ({
  id: uid(),
  name: name || "Untitled Campaign",
  createdAt: Date.now(),
  encounters: [],
  quests: [],
  activeEncounter: null,
});

const STORE_KEY = "campaign-forge-data";

export default function CampaignForge() {
  const [loaded, setLoaded] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [tab, setTab] = useState("session");
  const [toast, setToast] = useState(null);
  const saveTimer = useRef(null);

  const current = campaigns.find((c) => c.id === currentId) || null;

  // ---------- load ----------
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORE_KEY);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setCampaigns(parsed.campaigns || []);
          setCurrentId(parsed.currentId || (parsed.campaigns?.[0]?.id ?? null));
        }
      } catch (e) {
        // no existing data yet
      }
      setLoaded(true);
    })();
  }, []);

  // ---------- save (debounced) ----------
  const persist = useCallback((nextCampaigns, nextCurrentId) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(
          STORE_KEY,
          JSON.stringify({ campaigns: nextCampaigns, currentId: nextCurrentId })
        );
      } catch (e) {
        console.error("save failed", e);
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    persist(campaigns, currentId);
  }, [campaigns, currentId, loaded, persist]);

  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const updateCurrent = (fn) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === currentId ? fn({ ...c }) : c))
    );
  };

  const addCampaign = () => {
    const c = emptyCampaign(`Campaign ${campaigns.length + 1}`);
    setCampaigns((p) => [...p, c]);
    setCurrentId(c.id);
    flash("New campaign created");
  };

  const deleteCampaign = (id) => {
    setCampaigns((p) => p.filter((c) => c.id !== id));
    if (currentId === id) {
      const rest = campaigns.filter((c) => c.id !== id);
      setCurrentId(rest[0]?.id ?? null);
    }
  };

  const renameCampaign = (id, name) => {
    setCampaigns((p) => p.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  if (!loaded) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Unrolling the map…</div>
        <style>{globalCss}</style>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{globalCss}</style>
      <Sidebar
        campaigns={campaigns}
        currentId={currentId}
        setCurrentId={setCurrentId}
        addCampaign={addCampaign}
        deleteCampaign={deleteCampaign}
        renameCampaign={renameCampaign}
      />
      <main style={styles.main}>
        {!current ? (
          <EmptyState onCreate={addCampaign} />
        ) : (
          <>
            <TopBar tab={tab} setTab={setTab} campaign={current} />
            <div style={styles.content}>
              {tab === "session" && (
                <QuestLog campaign={current} update={updateCurrent} flash={flash} />
              )}
              {tab === "encounters" && (
                <EncounterBuilder
                  campaign={current}
                  update={updateCurrent}
                  flash={flash}
                  goToTracker={() => setTab("tracker")}
                />
              )}
              {tab === "tracker" && (
                <InitiativeTracker campaign={current} update={updateCurrent} flash={flash} />
              )}
            </div>
          </>
        )}
      </main>
      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

// ---------- Sidebar ----------
function Sidebar({ campaigns, currentId, setCurrentId, addCampaign, deleteCampaign, renameCampaign }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <div style={styles.brandMark}>⚔</div>
        <div>
          <div style={styles.brandTitle}>Campaign Forge</div>
          <div style={styles.brandSub}>session &amp; encounter ledger</div>
        </div>
      </div>

      <button style={styles.newCampaignBtn} onClick={addCampaign}>
        + New Campaign
      </button>

      <div style={styles.campaignList}>
        {campaigns.length === 0 && (
          <div style={styles.sidebarEmpty}>No campaigns yet.</div>
        )}
        {campaigns.map((c) => (
          <div
            key={c.id}
            style={{
              ...styles.campaignItem,
              ...(c.id === currentId ? styles.campaignItemActive : {}),
            }}
            onClick={() => setCurrentId(c.id)}
          >
            {editingId === c.id ? (
              <input
                autoFocus
                style={styles.renameInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => {
                  renameCampaign(c.id, draft.trim() || c.name);
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                style={styles.campaignName}
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
              style={styles.deleteBtn}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete "${c.name}"? This cannot be undone.`)) {
                  deleteCampaign(c.id);
                }
              }}
              title="Delete campaign"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div style={styles.sidebarFooter}>Saved automatically in your browser.</div>
    </aside>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div style={styles.emptyStateWrap}>
      <div style={styles.emptyStateMark}>🎲</div>
      <h2 style={styles.emptyStateTitle}>No campaign at the table</h2>
      <p style={styles.emptyStateBody}>
        Start a new campaign to plan quests, build encounters, and run combat.
      </p>
      <button style={styles.newCampaignBtn} onClick={onCreate}>
        + New Campaign
      </button>
    </div>
  );
}

function TopBar({ tab, setTab, campaign }) {
  const tabs = [
    { id: "session", label: "Quest Log" },
    { id: "encounters", label: "Encounters" },
    { id: "tracker", label: "Initiative Tracker" },
  ];
  return (
    <div style={styles.topBar}>
      <div style={styles.topBarTitle}>{campaign.name}</div>
      <nav style={styles.tabNav}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...styles.tabBtn,
              ...(tab === t.id ? styles.tabBtnActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ---------- Quest Log ----------
function QuestLog({ campaign, update, flash }) {
  const [title, setTitle] = useState("");

  const addQuest = () => {
    if (!title.trim()) return;
    update((c) => {
      c.quests = [
        ...c.quests,
        { id: uid(), title: title.trim(), status: "active", notes: "" },
      ];
      return c;
    });
    setTitle("");
    flash("Quest added");
  };

  const setQuestField = (id, field, value) => {
    update((c) => {
      c.quests = c.quests.map((q) => (q.id === id ? { ...q, [field]: value } : q));
      return c;
    });
  };

  const removeQuest = (id) => {
    update((c) => {
      c.quests = c.quests.filter((q) => q.id !== id);
      return c;
    });
  };

  const statusOrder = ["active", "complete", "failed"];
  const statusColor = { active: "#C9A227", complete: "#5A8F5A", failed: "#A33D2C" };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h2 style={styles.panelTitle}>Quest Log</h2>
      </div>
      <div style={styles.addRow}>
        <input
          style={styles.textInput}
          placeholder="New quest title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addQuest()}
        />
        <button style={styles.primaryBtn} onClick={addQuest}>
          Add Quest
        </button>
      </div>

      {campaign.quests.length === 0 ? (
        <EmptyPanel text="No quests logged yet. Add one above to start tracking the party's threads." />
      ) : (
        <div style={styles.questGrid}>
          {campaign.quests
            .slice()
            .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status))
            .map((q) => (
              <div key={q.id} style={styles.questCard}>
                <div style={styles.questCardHead}>
                  <input
                    style={styles.questTitleInput}
                    value={q.title}
                    onChange={(e) => setQuestField(q.id, "title", e.target.value)}
                  />
                  <button style={styles.deleteBtnSmall} onClick={() => removeQuest(q.id)}>
                    ✕
                  </button>
                </div>
                <div style={styles.statusRow}>
                  {statusOrder.map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuestField(q.id, "status", s)}
                      style={{
                        ...styles.statusPill,
                        borderColor: statusColor[s],
                        color: q.status === s ? "#14110F" : statusColor[s],
                        background: q.status === s ? statusColor[s] : "transparent",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <textarea
                  style={styles.questNotes}
                  placeholder="Notes, clues, NPCs involved…"
                  value={q.notes}
                  onChange={(e) => setQuestField(q.id, "notes", e.target.value)}
                />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------- Encounter Builder ----------
function EncounterBuilder({ campaign, update, flash, goToTracker }) {
  const [selectedId, setSelectedId] = useState(campaign.encounters[0]?.id ?? null);
  const selected = campaign.encounters.find((e) => e.id === selectedId) || null;

  useEffect(() => {
    if (!selected && campaign.encounters.length > 0) {
      setSelectedId(campaign.encounters[0].id);
    }
    if (selected && !campaign.encounters.find((e) => e.id === selected.id)) {
      setSelectedId(campaign.encounters[0]?.id ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.encounters]);

  const addEncounter = () => {
    const enc = { id: uid(), name: `Encounter ${campaign.encounters.length + 1}`, combatants: [] };
    update((c) => {
      c.encounters = [...c.encounters, enc];
      return c;
    });
    setSelectedId(enc.id);
  };

  const removeEncounter = (id) => {
    update((c) => {
      c.encounters = c.encounters.filter((e) => e.id !== id);
      return c;
    });
  };

  const renameEncounter = (id, name) => {
    update((c) => {
      c.encounters = c.encounters.map((e) => (e.id === id ? { ...e, name } : e));
      return c;
    });
  };

  const addCombatant = () => {
    update((c) => {
      c.encounters = c.encounters.map((e) =>
        e.id === selectedId ? { ...e, combatants: [...e.combatants, emptyCombatant()] } : e
      );
      return c;
    });
  };

  const setCombatantField = (combatantId, field, value) => {
    update((c) => {
      c.encounters = c.encounters.map((e) =>
        e.id === selectedId
          ? {
              ...e,
              combatants: e.combatants.map((cb) =>
                cb.id === combatantId ? { ...cb, [field]: value } : cb
              ),
            }
          : e
      );
      return c;
    });
  };

  const removeCombatant = (combatantId) => {
    update((c) => {
      c.encounters = c.encounters.map((e) =>
        e.id === selectedId ? { ...e, combatants: e.combatants.filter((cb) => cb.id !== combatantId) } : e
      );
      return c;
    });
  };

  const launchEncounter = () => {
    if (!selected || selected.combatants.length === 0) {
      flash("Add combatants before launching");
      return;
    }
    update((c) => {
      c.activeEncounter = {
        sourceEncounterId: selected.id,
        sourceName: selected.name,
        round: 1,
        turnIndex: 0,
        combatants: selected.combatants
          .filter((cb) => cb.name.trim())
          .map((cb) => ({
            id: uid(),
            name: cb.name,
            type: cb.type,
            ac: Number(cb.ac) || 10,
            maxHp: Number(cb.maxHp) || 1,
            currentHp: Number(cb.maxHp) || 1,
            initiative: rollD20() + (Number(cb.initMod) || 0),
            conditions: [],
          }))
          .sort((a, b) => b.initiative - a.initiative),
      };
      return c;
    });
    flash("Encounter launched — see Initiative Tracker");
    goToTracker();
  };

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeadRow}>
        <h2 style={styles.panelTitle}>Encounters</h2>
        <button style={styles.primaryBtn} onClick={addEncounter}>
          + New Encounter
        </button>
      </div>

      {campaign.encounters.length === 0 ? (
        <EmptyPanel text="No encounters built yet. Create one to start stacking monsters and NPCs." />
      ) : (
        <div style={styles.encounterLayout}>
          <div style={styles.encounterList}>
            {campaign.encounters.map((e) => (
              <div
                key={e.id}
                style={{
                  ...styles.encounterListItem,
                  ...(e.id === selectedId ? styles.encounterListItemActive : {}),
                }}
                onClick={() => setSelectedId(e.id)}
              >
                <span>{e.name}</span>
                <span style={styles.encounterCount}>{e.combatants.length}</span>
              </div>
            ))}
          </div>

          {selected && (
            <div style={styles.encounterDetail}>
              <div style={styles.encounterDetailHead}>
                <input
                  style={styles.encounterNameInput}
                  value={selected.name}
                  onChange={(e) => renameEncounter(selected.id, e.target.value)}
                />
                <div style={styles.encounterHeadBtns}>
                  <button style={styles.ghostBtn} onClick={() => removeEncounter(selected.id)}>
                    Delete
                  </button>
                  <button style={styles.primaryBtn} onClick={launchEncounter}>
                    Launch ▶
                  </button>
                </div>
              </div>

              <div style={styles.statBlockTableWrap}>
                <table style={styles.statBlockTable}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>AC</th>
                      <th style={styles.th}>Max HP</th>
                      <th style={styles.th}>Init Mod</th>
                      <th style={styles.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.combatants.map((cb) => (
                      <tr key={cb.id}>
                        <td style={styles.td}>
                          <input
                            style={styles.cellInput}
                            value={cb.name}
                            placeholder="Goblin"
                            onChange={(e) => setCombatantField(cb.id, "name", e.target.value)}
                          />
                        </td>
                        <td style={styles.td}>
                          <select
                            style={styles.cellSelect}
                            value={cb.type}
                            onChange={(e) => setCombatantField(cb.id, "type", e.target.value)}
                          >
                            <option value="monster">Monster</option>
                            <option value="npc">NPC</option>
                            <option value="pc">PC</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            style={styles.cellInputNum}
                            value={cb.ac}
                            onChange={(e) => setCombatantField(cb.id, "ac", e.target.value)}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            style={styles.cellInputNum}
                            value={cb.maxHp}
                            onChange={(e) => setCombatantField(cb.id, "maxHp", e.target.value)}
                          />
                        </td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            style={styles.cellInputNum}
                            value={cb.initMod}
                            onChange={(e) => setCombatantField(cb.id, "initMod", e.target.value)}
                          />
                        </td>
                        <td style={styles.td}>
                          <button style={styles.deleteBtnSmall} onClick={() => removeCombatant(cb.id)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button style={styles.ghostBtn} onClick={addCombatant}>
                + Add Combatant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Initiative Tracker ----------
function InitiativeTracker({ campaign, update, flash }) {
  const enc = campaign.activeEncounter;

  const setEnc = (fn) => {
    update((c) => {
      c.activeEncounter = fn({ ...c.activeEncounter, combatants: c.activeEncounter.combatants.map((x) => ({ ...x })) });
      return c;
    });
  };

  const adjustHp = (id, delta) => {
    setEnc((e) => {
      e.combatants = e.combatants.map((cb) =>
        cb.id === id ? { ...cb, currentHp: clamp(cb.currentHp + delta, 0, cb.maxHp) } : cb
      );
      return e;
    });
  };

  const removeCombatant = (id) => {
    setEnc((e) => {
      e.combatants = e.combatants.filter((cb) => cb.id !== id);
      if (e.turnIndex >= e.combatants.length) e.turnIndex = 0;
      return e;
    });
  };

  const addCondition = (id, condition) => {
    if (!condition.trim()) return;
    setEnc((e) => {
      e.combatants = e.combatants.map((cb) =>
        cb.id === id ? { ...cb, conditions: [...cb.conditions, condition.trim()] } : cb
      );
      return e;
    });
  };

  const removeCondition = (id, idx) => {
    setEnc((e) => {
      e.combatants = e.combatants.map((cb) =>
        cb.id === id ? { ...cb, conditions: cb.conditions.filter((_, i) => i !== idx) } : cb
      );
      return e;
    });
  };

  const nextTurn = () => {
    setEnc((e) => {
      const n = e.combatants.length;
      if (n === 0) return e;
      const nextIndex = e.turnIndex + 1;
      if (nextIndex >= n) {
        e.turnIndex = 0;
        e.round = e.round + 1;
      } else {
        e.turnIndex = nextIndex;
      }
      return e;
    });
  };

  const prevTurn = () => {
    setEnc((e) => {
      const n = e.combatants.length;
      if (n === 0) return e;
      const prevIndex = e.turnIndex - 1;
      if (prevIndex < 0) {
        e.turnIndex = n - 1;
        e.round = Math.max(1, e.round - 1);
      } else {
        e.turnIndex = prevIndex;
      }
      return e;
    });
  };

  const endEncounter = () => {
    if (!confirm("End this encounter? Current HP and conditions will be cleared.")) return;
    update((c) => {
      c.activeEncounter = null;
      return c;
    });
  };

  if (!enc) {
    return (
      <div style={styles.panel}>
        <h2 style={styles.panelTitle}>Initiative Tracker</h2>
        <EmptyPanel text="No encounter is live. Build one under Encounters, then press Launch." />
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.trackerHeader}>
        <div>
          <h2 style={styles.panelTitle}>{enc.sourceName}</h2>
          <div style={styles.roundLabel}>Round {enc.round}</div>
        </div>
        <div style={styles.trackerControls}>
          <button style={styles.ghostBtn} onClick={prevTurn}>◀ Prev</button>
          <button style={styles.primaryBtn} onClick={nextTurn}>Next Turn ▶</button>
          <button style={styles.dangerBtn} onClick={endEncounter}>End Encounter</button>
        </div>
      </div>

      <div style={styles.ledger}>
        {enc.combatants.map((cb, idx) => {
          const isTurn = idx === enc.turnIndex;
          const hpPct = cb.maxHp > 0 ? cb.currentHp / cb.maxHp : 0;
          const hpColor = hpPct > 0.5 ? "#5A8F5A" : hpPct > 0.2 ? "#C9A227" : "#A33D2C";
          return (
            <div
              key={cb.id}
              style={{
                ...styles.ledgerRow,
                ...(isTurn ? styles.ledgerRowActive : {}),
                ...(cb.currentHp === 0 ? styles.ledgerRowDown : {}),
              }}
            >
              <div style={styles.initBadge}>{cb.initiative}</div>
              <div style={styles.ledgerMain}>
                <div style={styles.ledgerNameRow}>
                  <span style={styles.ledgerName}>{cb.name}</span>
                  <span style={styles.typeTag}>{cb.type}</span>
                  <span style={styles.acTag}>AC {cb.ac}</span>
                  {cb.currentHp === 0 && <span style={styles.downTag}>DOWN</span>}
                </div>
                <div style={styles.hpBarTrack}>
                  <div style={{ ...styles.hpBarFill, width: `${hpPct * 100}%`, background: hpColor }} />
                </div>
                <div style={styles.hpRow}>
                  <button style={styles.hpBtn} onClick={() => adjustHp(cb.id, -1)}>-1</button>
                  <button style={styles.hpBtn} onClick={() => adjustHp(cb.id, -5)}>-5</button>
                  <span style={styles.hpText}>{cb.currentHp} / {cb.maxHp}</span>
                  <button style={styles.hpBtn} onClick={() => adjustHp(cb.id, 5)}>+5</button>
                  <button style={styles.hpBtn} onClick={() => adjustHp(cb.id, 1)}>+1</button>
                </div>
                <div style={styles.conditionsRow}>
                  {cb.conditions.map((cond, i) => (
                    <span key={i} style={styles.conditionTag} onClick={() => removeCondition(cb.id, i)} title="Click to remove">
                      {cond} ✕
                    </span>
                  ))}
                  <ConditionAdder onAdd={(v) => addCondition(cb.id, v)} />
                </div>
              </div>
              <button style={styles.deleteBtnSmall} onClick={() => removeCombatant(cb.id)}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConditionAdder({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <input
      style={styles.conditionInput}
      placeholder="+ condition"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          onAdd(val);
          setVal("");
        }
      }}
    />
  );
}

function EmptyPanel({ text }) {
  return <div style={styles.emptyPanel}>{text}</div>;
}

// ---------- styles ----------
const globalCss = `
  * { box-sizing: border-box; }
  input, select, textarea, button { font-family: inherit; }
  ::placeholder { color: #6E6658; }
  input:focus, select:focus, textarea:focus, button:focus-visible {
    outline: 2px solid #C9A227;
    outline-offset: 1px;
  }
  @media (max-width: 720px) {
    .cf-sidebar { display: none !important; }
  }
`;

const FONT_DISPLAY = "'Bitter', Georgia, serif";
const FONT_BODY = "'Inter', -apple-system, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

const styles = {
  page: {
    display: "flex",
    height: "100%",
    minHeight: "640px",
    background: "#14110F",
    color: "#E8E1D3",
    fontFamily: FONT_BODY,
    fontSize: 14,
  },
  loading: { margin: "auto", color: "#C9A227", fontFamily: FONT_DISPLAY, fontSize: 18 },
  sidebar: {
    width: 240,
    flexShrink: 0,
    background: "#1B1712",
    borderRight: "1px solid #322B22",
    display: "flex",
    flexDirection: "column",
    padding: "18px 14px",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18 },
  brandMark: {
    width: 34, height: 34, borderRadius: 6, background: "#2A2318",
    border: "1px solid #C9A227", display: "flex", alignItems: "center",
    justifyContent: "center", color: "#C9A227", fontSize: 16, flexShrink: 0,
  },
  brandTitle: { fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: "#EFE7D6", lineHeight: 1.2 },
  brandSub: { fontSize: 10.5, color: "#8A8172", letterSpacing: "0.03em", textTransform: "uppercase" },
  newCampaignBtn: {
    background: "#C9A227", color: "#14110F", border: "none", borderRadius: 5,
    padding: "9px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 14,
  },
  campaignList: { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 },
  sidebarEmpty: { color: "#6E6658", fontSize: 12.5, padding: "8px 4px" },
  campaignItem: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "8px 10px", borderRadius: 5, cursor: "pointer", color: "#B8AF9E",
    fontSize: 13, gap: 6,
  },
  campaignItemActive: { background: "#2A2318", color: "#EFE7D6" },
  campaignName: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
  renameInput: {
    flex: 1, background: "#14110F", border: "1px solid #C9A227", borderRadius: 3,
    color: "#EFE7D6", padding: "2px 6px", fontSize: 13,
  },
  deleteBtn: {
    background: "none", border: "none", color: "#6E6658", cursor: "pointer",
    fontSize: 12, padding: "2px 4px",
  },
  sidebarFooter: { fontSize: 10.5, color: "#5C5548", marginTop: 12, borderTop: "1px solid #2A2318", paddingTop: 10 },
  main: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 24px", borderBottom: "1px solid #2A2318", flexWrap: "wrap", gap: 10,
  },
  topBarTitle: { fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, color: "#EFE7D6" },
  tabNav: { display: "flex", gap: 4, background: "#1B1712", padding: 4, borderRadius: 7 },
  tabBtn: {
    background: "none", border: "none", color: "#8A8172", padding: "7px 14px",
    borderRadius: 5, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  },
  tabBtnActive: { background: "#C9A227", color: "#14110F" },
  content: { flex: 1, overflowY: "auto", padding: 24 },
  panel: { maxWidth: 980, margin: "0 auto" },
  panelHeadRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 },
  panelTitle: { fontFamily: FONT_DISPLAY, fontSize: 22, color: "#EFE7D6", margin: 0 },
  emptyStateWrap: { margin: "auto", textAlign: "center", maxWidth: 360, padding: 24 },
  emptyStateMark: { fontSize: 40, marginBottom: 12 },
  emptyStateTitle: { fontFamily: FONT_DISPLAY, fontSize: 20, color: "#EFE7D6", margin: "0 0 8px" },
  emptyStateBody: { color: "#9A9182", fontSize: 13.5, lineHeight: 1.5, margin: "0 0 18px" },
  emptyPanel: {
    border: "1px dashed #322B22", borderRadius: 8, padding: "36px 20px",
    textAlign: "center", color: "#8A8172", fontSize: 13.5, lineHeight: 1.5,
  },
  addRow: { display: "flex", gap: 8, marginBottom: 18 },
  textInput: {
    flex: 1, background: "#1B1712", border: "1px solid #322B22", borderRadius: 5,
    padding: "9px 12px", color: "#EFE7D6", fontSize: 13.5,
  },
  primaryBtn: {
    background: "#C9A227", color: "#14110F", border: "none", borderRadius: 5,
    padding: "9px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
  },
  ghostBtn: {
    background: "none", border: "1px solid #3A3226", color: "#C9A227", borderRadius: 5,
    padding: "8px 14px", fontWeight: 600, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap",
  },
  dangerBtn: {
    background: "none", border: "1px solid #5A2A20", color: "#C56A55", borderRadius: 5,
    padding: "8px 14px", fontWeight: 600, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap",
  },
  questGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 },
  questCard: { background: "#1B1712", border: "1px solid #2A2318", borderRadius: 8, padding: 14 },
  questCardHead: { display: "flex", gap: 6, alignItems: "center", marginBottom: 8 },
  questTitleInput: {
    flex: 1, background: "none", border: "none", color: "#EFE7D6", fontWeight: 700,
    fontSize: 14.5, fontFamily: FONT_DISPLAY, padding: "2px 0",
  },
  deleteBtnSmall: { background: "none", border: "none", color: "#6E6658", cursor: "pointer", fontSize: 12 },
  statusRow: { display: "flex", gap: 6, marginBottom: 10 },
  statusPill: {
    border: "1px solid", borderRadius: 20, padding: "3px 10px", fontSize: 10.5,
    textTransform: "uppercase", letterSpacing: "0.03em", cursor: "pointer", fontWeight: 700, background: "transparent",
  },
  questNotes: {
    width: "100%", minHeight: 64, background: "#14110F", border: "1px solid #2A2318",
    borderRadius: 5, color: "#C7BFAF", fontSize: 12.5, padding: 8, resize: "vertical",
  },
  encounterLayout: { display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" },
  encounterList: { width: 220, display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 },
  encounterListItem: {
    display: "flex", justifyContent: "space-between", padding: "9px 12px", borderRadius: 6,
    cursor: "pointer", color: "#B8AF9E", fontSize: 13, background: "#1B1712",
  },
  encounterListItemActive: { background: "#2A2318", color: "#EFE7D6", border: "1px solid #C9A227" },
  encounterCount: { color: "#6E6658", fontFamily: FONT_MONO, fontSize: 12 },
  encounterDetail: { flex: 1, minWidth: 320 },
  encounterDetailHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  encounterNameInput: {
    background: "none", border: "none", color: "#EFE7D6", fontFamily: FONT_DISPLAY,
    fontSize: 18, fontWeight: 700, flex: 1, minWidth: 160,
  },
  encounterHeadBtns: { display: "flex", gap: 8 },
  statBlockTableWrap: { overflowX: "auto", marginBottom: 10, border: "1px solid #2A2318", borderRadius: 6 },
  statBlockTable: { width: "100%", borderCollapse: "collapse", fontFamily: FONT_MONO, fontSize: 12.5 },
  th: {
    textAlign: "left", padding: "8px 10px", color: "#8A8172", fontWeight: 600,
    borderBottom: "1px solid #2A2318", background: "#1B1712", fontSize: 11, textTransform: "uppercase",
  },
  td: { padding: "6px 8px", borderBottom: "1px solid #201C18" },
  cellInput: {
    width: "100%", minWidth: 100, background: "#14110F", border: "1px solid #2A2318",
    borderRadius: 4, color: "#EFE7D6", padding: "5px 7px", fontFamily: FONT_BODY, fontSize: 13,
  },
  cellInputNum: {
    width: 64, background: "#14110F", border: "1px solid #2A2318", borderRadius: 4,
    color: "#EFE7D6", padding: "5px 7px", fontFamily: FONT_MONO, fontSize: 13,
  },
  cellSelect: {
    background: "#14110F", border: "1px solid #2A2318", borderRadius: 4,
    color: "#EFE7D6", padding: "5px 7px", fontSize: 12.5,
  },
  trackerHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 },
  roundLabel: { color: "#C9A227", fontFamily: FONT_MONO, fontSize: 13, marginTop: 2 },
  trackerControls: { display: "flex", gap: 8, flexWrap: "wrap" },
  ledger: { display: "flex", flexDirection: "column", gap: 8 },
  ledgerRow: {
    display: "flex", gap: 12, alignItems: "flex-start", background: "#1B1712",
    border: "1px solid #2A2318", borderRadius: 8, padding: 12,
  },
  ledgerRowActive: { borderColor: "#C9A227", boxShadow: "0 0 0 1px #C9A227 inset" },
  ledgerRowDown: { opacity: 0.55 },
  initBadge: {
    width: 38, height: 38, borderRadius: 6, background: "#14110F", border: "1px solid #3A3226",
    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_MONO,
    fontSize: 15, fontWeight: 700, color: "#C9A227", flexShrink: 0,
  },
  ledgerMain: { flex: 1, minWidth: 0 },
  ledgerNameRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  ledgerName: { fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: "#EFE7D6" },
  typeTag: {
    fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "#8A8172",
    border: "1px solid #322B22", borderRadius: 3, padding: "1px 6px",
  },
  acTag: { fontSize: 11, color: "#8A8172", fontFamily: FONT_MONO },
  downTag: {
    fontSize: 9.5, color: "#C56A55", border: "1px solid #5A2A20", borderRadius: 3,
    padding: "1px 6px", fontWeight: 700, letterSpacing: "0.04em",
  },
  hpBarTrack: { height: 6, background: "#14110F", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  hpBarFill: { height: "100%", transition: "width 0.2s ease" },
  hpRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 6 },
  hpBtn: {
    background: "#14110F", border: "1px solid #322B22", color: "#C7BFAF", borderRadius: 4,
    padding: "3px 8px", fontSize: 11.5, cursor: "pointer", fontFamily: FONT_MONO,
  },
  hpText: { fontFamily: FONT_MONO, fontSize: 12.5, color: "#EFE7D6", minWidth: 64, textAlign: "center" },
  conditionsRow: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  conditionTag: {
    fontSize: 11, background: "#2A2318", color: "#D7A75B", borderRadius: 12,
    padding: "2px 9px", cursor: "pointer",
  },
  conditionInput: {
    background: "none", border: "1px dashed #3A3226", borderRadius: 12, color: "#C7BFAF",
    fontSize: 11, padding: "2px 9px", width: 90,
  },
  toast: {
    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
    background: "#2A2318", border: "1px solid #C9A227", color: "#EFE7D6",
    padding: "9px 18px", borderRadius: 20, fontSize: 12.5, zIndex: 50,
  },
};
