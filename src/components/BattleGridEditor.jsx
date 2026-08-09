import { useState, useEffect, useRef } from "react";
import { emptyToken } from "../data/model.js";
import ChoiceChips from "./ChoiceChips.jsx";
import LinkPicker from "./LinkPicker.jsx";
import TagInput from "./TagInput.jsx";

const CELL = 36; // px per grid square

const LINK_TYPES = [
  { value: null, label: "Freeform" },
  { value: "npcs", label: "NPC" },
  { value: "pcs", label: "PC" },
  { value: "monsters", label: "Monster" },
];

const CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
];

/**
 * Full-screen tactical grid: a fixed rows×cols board with draggable, linkable
 * tokens. Token hp/conditions live on the token itself (this encounter's
 * instance), not on the linked NPC/PC/monster — so four goblin tokens linked
 * to the same bestiary entry each take separate damage.
 */
export default function BattleGridEditor({ campaign, grid, update, onClose }) {
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const dragIdRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (selectedTokenId) setSelectedTokenId(null);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedTokenId, onClose]);

  const updateGrid = (fn) => {
    update((c) => {
      c.grids = c.grids.map((g) => (g.id === grid.id ? fn({ ...g }) : g));
      return c;
    });
  };

  const addToken = () => {
    const t = emptyToken(0, 0);
    updateGrid((g) => {
      g.tokens = [...g.tokens, t];
      return g;
    });
    setSelectedTokenId(t.id);
  };

  const setTokenField = (id, field, value) => {
    updateGrid((g) => {
      g.tokens = g.tokens.map((t) => (t.id === id ? { ...t, [field]: value } : t));
      return g;
    });
  };

  const setTokenLinkType = (id, type) => {
    updateGrid((g) => {
      g.tokens = g.tokens.map((t) => (t.id === id ? { ...t, linkedType: type, linkedId: null } : t));
      return g;
    });
  };

  const setTokenLink = (id, type, linkedId) => {
    updateGrid((g) => {
      g.tokens = g.tokens.map((t) => {
        if (t.id !== id) return t;
        const patch = { linkedType: type, linkedId };
        // Default hp/maxHp from the linked monster/PC's sheet, but only once —
        // never clobber hp the DM has already tracked for this instance.
        if (linkedId && t.maxHp === null) {
          if (type === "monsters") {
            const mon = campaign.monsters.find((m) => m.id === linkedId);
            if (mon?.hitPoints != null) return { ...t, ...patch, hp: mon.hitPoints, maxHp: mon.hitPoints };
          } else if (type === "pcs") {
            const pc = campaign.pcs.find((p) => p.id === linkedId);
            if (pc?.maxHitPoints != null) return { ...t, ...patch, hp: pc.hitPoints ?? pc.maxHitPoints, maxHp: pc.maxHitPoints };
          }
        }
        return { ...t, ...patch };
      });
      return g;
    });
  };

  // ---------- initiative / turn order ----------
  const sortedParticipants = (tokens) =>
    tokens.filter((t) => t.initiative !== null && t.initiative !== undefined).sort((a, b) => b.initiative - a.initiative);

  const startCombat = () => {
    updateGrid((g) => {
      const participants = sortedParticipants(g.tokens);
      if (participants.length === 0) return g;
      g.round = 1;
      g.turnTokenId = participants[0].id;
      return g;
    });
  };

  const nextTurn = () => {
    updateGrid((g) => {
      const participants = sortedParticipants(g.tokens);
      if (participants.length === 0) return g;
      if (g.round == null) {
        g.round = 1;
        g.turnTokenId = participants[0].id;
        return g;
      }
      const idx = participants.findIndex((t) => t.id === g.turnTokenId);
      if (idx === -1 || idx === participants.length - 1) {
        g.round = g.round + 1;
        g.turnTokenId = participants[0].id;
      } else {
        g.turnTokenId = participants[idx + 1].id;
      }
      return g;
    });
  };

  const prevTurn = () => {
    updateGrid((g) => {
      const participants = sortedParticipants(g.tokens);
      if (participants.length === 0 || g.round == null) return g;
      const idx = participants.findIndex((t) => t.id === g.turnTokenId);
      if (idx <= 0) {
        g.round = Math.max(1, g.round - 1);
        g.turnTokenId = participants[participants.length - 1].id;
      } else {
        g.turnTokenId = participants[idx - 1].id;
      }
      return g;
    });
  };

  const endCombat = () => {
    updateGrid((g) => {
      g.round = null;
      g.turnTokenId = null;
      return g;
    });
  };

  const removeToken = (id) => {
    updateGrid((g) => {
      g.tokens = g.tokens.filter((t) => t.id !== id);
      return g;
    });
    if (selectedTokenId === id) setSelectedTokenId(null);
  };

  const moveToken = (id, row, col) => {
    updateGrid((g) => {
      const t = g.tokens.find((tk) => tk.id === id);
      const size = t?.size || 1;
      const clampedRow = Math.max(0, Math.min(g.rows - size, row));
      const clampedCol = Math.max(0, Math.min(g.cols - size, col));
      g.tokens = g.tokens.map((tk) => (tk.id === id ? { ...tk, row: clampedRow, col: clampedCol } : tk));
      return g;
    });
  };

  const linkedName = (t) => {
    if (!t.linkedType || !t.linkedId) return null;
    const list = t.linkedType === "npcs" ? campaign.npcs : t.linkedType === "pcs" ? campaign.pcs : campaign.monsters;
    return list.find((x) => x.id === t.linkedId)?.name || null;
  };

  const displayLabel = (t) => t.label || linkedName(t) || "Token";

  const linkOptionsFor = (type) => {
    if (type === "npcs") return campaign.npcs.map((n) => ({ id: n.id, label: n.name || "Untitled" }));
    if (type === "pcs") return campaign.pcs.map((p) => ({ id: p.id, label: p.name || "Untitled" }));
    if (type === "monsters") return campaign.monsters.map((m) => ({ id: m.id, label: m.name || "Untitled" }));
    return [];
  };

  const onTokenDragStart = (e, id) => {
    dragIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const onBoardDrop = (e) => {
    e.preventDefault();
    const id = dragIdRef.current || e.dataTransfer.getData("text/plain");
    if (!id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    moveToken(id, Math.floor(y / CELL), Math.floor(x / CELL));
    dragIdRef.current = null;
  };

  const selectedToken = grid.tokens.find((t) => t.id === selectedTokenId) || null;
  const participants = sortedParticipants(grid.tokens);
  const activeToken = grid.tokens.find((t) => t.id === grid.turnTokenId) || null;

  return (
    <div className="cf-gridview">
      <div className="cf-gridview-header">
        <div className="cf-playerview-title">
          ⚔ {grid.name || "Untitled Grid"} <span className="cf-badge cf-badge-muted">{grid.rows}×{grid.cols}</span>
          {grid.round != null && (
            <span className="cf-badge">
              Round {grid.round}
              {activeToken ? ` — ${displayLabel(activeToken)}'s turn` : ""}
            </span>
          )}
        </div>
        <button type="button" className="cf-btn cf-btn-ghost" onClick={onClose}>
          Close ✕
        </button>
      </div>
      <div className="cf-gridview-body">
        <div className="cf-grid-viewport">
          <div
            className="cf-grid-board"
            style={{ width: grid.cols * CELL, height: grid.rows * CELL, backgroundSize: `${CELL}px ${CELL}px` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onBoardDrop}
          >
            {grid.tokens.map((t) => (
              <div
                key={t.id}
                className={`cf-token${selectedTokenId === t.id ? " cf-token-selected" : ""}${grid.turnTokenId === t.id ? " cf-token-active-turn" : ""}`}
                style={{ left: t.col * CELL, top: t.row * CELL, width: t.size * CELL, height: t.size * CELL, background: t.color }}
                draggable
                onDragStart={(e) => onTokenDragStart(e, t.id)}
                onClick={() => setSelectedTokenId(t.id)}
                title={`${displayLabel(t)}${t.hp !== null && t.maxHp !== null ? ` (${t.hp}/${t.maxHp} hp)` : ""}`}
              >
                <span className="cf-token-label">{displayLabel(t).slice(0, 3)}</span>
                {t.hp !== null && t.maxHp !== null && (
                  <span className="cf-token-hp">
                    {t.hp}/{t.maxHp}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="cf-grid-sidebar">
          <div className="cf-combat-tracker">
            <div className="cf-panel-head-row">
              <h3 className="cf-dashboard-heading">Combat{grid.round != null ? ` — Round ${grid.round}` : ""}</h3>
              <div className="cf-chip-row">
                {grid.round == null ? (
                  <button type="button" className="cf-btn cf-btn-small cf-btn-primary" onClick={startCombat} disabled={participants.length === 0}>
                    Start Combat
                  </button>
                ) : (
                  <>
                    <button type="button" className="cf-btn cf-btn-small cf-btn-ghost" onClick={prevTurn} title="Previous turn">
                      ◂
                    </button>
                    <button type="button" className="cf-btn cf-btn-small cf-btn-primary" onClick={nextTurn}>
                      Next Turn ▸
                    </button>
                    <button type="button" className="cf-btn cf-btn-small cf-btn-danger" onClick={endCombat}>
                      End
                    </button>
                  </>
                )}
              </div>
            </div>
            {participants.length === 0 ? (
              <div className="cf-empty-panel">Set an initiative on a token below to add it to the turn order.</div>
            ) : (
              <div className="cf-combat-order-list">
                {participants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`cf-combat-order-row${grid.turnTokenId === t.id ? " cf-combat-order-row-active" : ""}`}
                    onClick={() => setSelectedTokenId(t.id)}
                  >
                    <span className="cf-grid-token-swatch" style={{ background: t.color }} />
                    <span className="cf-combat-order-init">{t.initiative}</span>
                    <span className="cf-combat-order-name">{displayLabel(t)}</span>
                    {t.hp !== null && t.maxHp !== null && (
                      <span className="cf-card-submeta">
                        {t.hp}/{t.maxHp}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="cf-panel-head-row">
            <h3 className="cf-dashboard-heading">Tokens ({grid.tokens.length})</h3>
            <button type="button" className="cf-btn cf-btn-small cf-btn-primary" onClick={addToken}>
              + Token
            </button>
          </div>

          <div className="cf-grid-token-list">
            {grid.tokens.length === 0 && <div className="cf-empty-panel">No tokens yet. Add one, then drag it onto the board.</div>}
            {grid.tokens.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`cf-grid-token-chip${selectedTokenId === t.id ? " cf-grid-token-chip-active" : ""}`}
                onClick={() => setSelectedTokenId(t.id)}
              >
                <span className="cf-grid-token-swatch" style={{ background: t.color }} />
                {displayLabel(t)}
                {t.hp !== null && t.maxHp !== null && <span className="cf-card-submeta"> {t.hp}/{t.maxHp}</span>}
              </button>
            ))}
          </div>

          {selectedToken && (
            <div className="cf-grid-token-detail">
              <div className="cf-panel-head-row">
                <h3 className="cf-dashboard-heading">Edit Token</h3>
                <button
                  type="button"
                  className="cf-delete-btn"
                  onClick={() => {
                    if (confirm(`Remove token "${displayLabel(selectedToken)}"?`)) removeToken(selectedToken.id);
                  }}
                  title="Delete token"
                >
                  ✕
                </button>
              </div>

              <label className="cf-field">
                <span className="cf-field-label">Label</span>
                <input
                  className="cf-input"
                  value={selectedToken.label}
                  onChange={(e) => setTokenField(selectedToken.id, "label", e.target.value)}
                  placeholder={linkedName(selectedToken) || "Goblin #1"}
                />
              </label>

              <div className="cf-form-grid">
                <div className="cf-field">
                  <span className="cf-field-label">Color</span>
                  <input
                    type="color"
                    className="cf-token-color-input"
                    value={selectedToken.color}
                    onChange={(e) => setTokenField(selectedToken.id, "color", e.target.value)}
                  />
                </div>
                <div className="cf-field">
                  <span className="cf-field-label">Size</span>
                  <ChoiceChips values={[1, 2, 3]} value={selectedToken.size} onChange={(v) => setTokenField(selectedToken.id, "size", v)} formatLabel={(v) => `${v}×${v}`} />
                </div>
              </div>

              <div className="cf-field">
                <span className="cf-field-label">Link to</span>
                <div className="cf-chip-row">
                  {LINK_TYPES.map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      className={`cf-chip cf-choice-chip${selectedToken.linkedType === opt.value ? " cf-chip-active" : ""}`}
                      onClick={() => setTokenLinkType(selectedToken.id, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {selectedToken.linkedType && (
                  <LinkPicker
                    options={linkOptionsFor(selectedToken.linkedType)}
                    selected={selectedToken.linkedId}
                    onChange={(id) => setTokenLink(selectedToken.id, selectedToken.linkedType, id)}
                    placeholder="Search…"
                  />
                )}
              </div>

              <label className="cf-field">
                <span className="cf-field-label">Initiative</span>
                <input
                  className="cf-input"
                  type="number"
                  value={selectedToken.initiative ?? ""}
                  onChange={(e) => setTokenField(selectedToken.id, "initiative", e.target.value === "" ? null : Number(e.target.value))}
                  placeholder="Roll or enter…"
                />
              </label>

              <div className="cf-form-grid">
                <label className="cf-field">
                  <span className="cf-field-label">HP</span>
                  <input
                    className="cf-input"
                    type="number"
                    value={selectedToken.hp ?? ""}
                    onChange={(e) => setTokenField(selectedToken.id, "hp", e.target.value === "" ? null : Number(e.target.value))}
                  />
                </label>
                <label className="cf-field">
                  <span className="cf-field-label">Max HP</span>
                  <input
                    className="cf-input"
                    type="number"
                    value={selectedToken.maxHp ?? ""}
                    onChange={(e) => setTokenField(selectedToken.id, "maxHp", e.target.value === "" ? null : Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="cf-field">
                <span className="cf-field-label">Conditions</span>
                <TagInput tags={selectedToken.conditions} onChange={(tags) => setTokenField(selectedToken.id, "conditions", tags)} suggestions={CONDITIONS} placeholder="+ condition" />
              </div>

              <div className="cf-field">
                <span className="cf-field-label">Notes</span>
                <textarea className="cf-textarea" value={selectedToken.notes} onChange={(e) => setTokenField(selectedToken.id, "notes", e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
