import { useState } from "react";
import Modal from "./Modal.jsx";

const DIE_TYPES = [4, 6, 8, 10, 12, 20, 100];

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function fmtModifier(mod) {
  if (!mod) return "";
  return mod > 0 ? `+${mod}` : `${mod}`;
}

/**
 * Standalone dice roller — not tied to campaign data at all, so there's
 * nothing to save and the roll history is just session state, gone on
 * reload. Reachable from the top bar on any tab, since a DM might want to
 * roll while looking at anything.
 */
export default function DiceRollerModal({ onClose }) {
  const [dieType, setDieType] = useState(20);
  const [count, setCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [history, setHistory] = useState([]);

  const roll = () => {
    const n = Math.max(1, Math.min(100, Number(count) || 1));
    const mod = Number(modifier) || 0;
    const rolls = Array.from({ length: n }, () => rollDie(dieType));
    const total = rolls.reduce((a, b) => a + b, 0) + mod;
    const entry = { id: `${Date.now()}-${Math.random()}`, label: `${n}d${dieType}${fmtModifier(mod)}`, rolls, modifier: mod, total };
    setHistory((prev) => [entry, ...prev].slice(0, 20));
  };

  return (
    <Modal title="Dice Roller" onClose={onClose}>
      <div className="cf-chip-row">
        {DIE_TYPES.map((d) => (
          <button
            key={d}
            type="button"
            className={`cf-chip cf-choice-chip${dieType === d ? " cf-chip-active" : ""}`}
            onClick={() => setDieType(d)}
          >
            d{d}
          </button>
        ))}
      </div>

      <div className="cf-dice-controls-row">
        <label className="cf-field cf-dice-field">
          <span className="cf-field-label">Count</span>
          <input className="cf-input" type="number" min="1" max="100" value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <label className="cf-field cf-dice-field">
          <span className="cf-field-label">Modifier</span>
          <input className="cf-input" type="number" value={modifier} onChange={(e) => setModifier(e.target.value)} />
        </label>
        <button type="button" className="cf-btn cf-btn-primary" onClick={roll}>
          Roll {count}d{dieType}
          {fmtModifier(Number(modifier) || 0)}
        </button>
      </div>

      {history.length > 0 && (
        <div className="cf-dice-history">
          {history.map((h) => (
            <div key={h.id} className="cf-dice-history-row">
              <span className="cf-dice-history-label">{h.label}</span>
              <span className="cf-dice-history-detail">
                ({h.rolls.join(" + ")}
                {h.modifier !== 0 ? ` ${fmtModifier(h.modifier)}` : ""})
              </span>
              <span className="cf-dice-history-total">{h.total}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
