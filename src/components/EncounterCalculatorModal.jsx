import { useState } from "react";
import Modal from "./Modal.jsx";
import { CHALLENGE_RATINGS } from "../data/model.js";
import { calculateEncounterDifficulty, DIFFICULTY_LEVELS } from "../utils/encounterMath.js";

const DIFFICULTY_COLOR = {
  trivial: "#6E655C",
  easy: "#55704A",
  medium: "#93762E",
  hard: "#A1601F",
  deadly: "#7A2020",
};

/**
 * DMG-style "how hard is this fight" calculator: pick party size/level, add
 * monsters from the Bestiary with a count each, see the adjusted XP against
 * this party's thresholds. Read-only tool — nothing here touches campaign
 * data, so there's no update()/flash() wiring, just campaign for lookups.
 */
export default function EncounterCalculatorModal({ campaign, onClose }) {
  const [partySize, setPartySize] = useState(campaign.pcs.length || 4);
  const [partyLevel, setPartyLevel] = useState(1);
  const [encounterMonsters, setEncounterMonsters] = useState([]); // [{ monsterId, cr, count }]
  const [pickedMonsterId, setPickedMonsterId] = useState(campaign.monsters[0]?.id || "");

  const monsterName = (id) => campaign.monsters.find((m) => m.id === id)?.name || "Untitled";

  const addMonster = () => {
    const monster = campaign.monsters.find((m) => m.id === pickedMonsterId);
    if (!monster) return;
    setEncounterMonsters((prev) => {
      const existing = prev.find((m) => m.monsterId === monster.id);
      if (existing) {
        return prev.map((m) => (m.monsterId === monster.id ? { ...m, count: m.count + 1 } : m));
      }
      return [...prev, { monsterId: monster.id, cr: monster.challengeRating, count: 1 }];
    });
  };

  const setCount = (monsterId, count) => {
    const n = Math.max(1, Number(count) || 1);
    setEncounterMonsters((prev) => prev.map((m) => (m.monsterId === monsterId ? { ...m, count: n } : m)));
  };

  const removeMonster = (monsterId) => {
    setEncounterMonsters((prev) => prev.filter((m) => m.monsterId !== monsterId));
  };

  const result = calculateEncounterDifficulty({
    partySize: Number(partySize) || 0,
    partyLevel: Number(partyLevel) || 1,
    monsters: encounterMonsters,
  });

  return (
    <Modal title="Encounter Difficulty Calculator" onClose={onClose} wide>
      <div className="cf-form-grid">
        <label className="cf-field">
          <span className="cf-field-label">Party size</span>
          <input
            className="cf-input"
            type="number"
            min="1"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
          />
        </label>
        <label className="cf-field">
          <span className="cf-field-label">Party level</span>
          <select className="cf-input" value={partyLevel} onChange={(e) => setPartyLevel(e.target.value)}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((lvl) => (
              <option key={lvl} value={lvl}>
                Level {lvl}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cf-field">
        <span className="cf-field-label">Monsters in the encounter</span>
        {campaign.monsters.length === 0 ? (
          <p className="cf-empty-panel">No monsters in the Bestiary yet — add some first.</p>
        ) : (
          <div className="cf-encounter-add-row">
            <select className="cf-input" value={pickedMonsterId} onChange={(e) => setPickedMonsterId(e.target.value)}>
              {campaign.monsters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || "Untitled"} (CR {m.challengeRating})
                </option>
              ))}
            </select>
            <button type="button" className="cf-btn cf-btn-ghost" onClick={addMonster}>
              + Add
            </button>
          </div>
        )}

        {encounterMonsters.length > 0 && (
          <div className="cf-encounter-monster-list">
            {encounterMonsters.map((m) => (
              <div className="cf-encounter-monster-row" key={m.monsterId}>
                <span className="cf-encounter-monster-name">{monsterName(m.monsterId)}</span>
                <span className="cf-badge">CR {m.cr}</span>
                <input
                  className="cf-input cf-input-narrow"
                  type="number"
                  min="1"
                  value={m.count}
                  onChange={(e) => setCount(m.monsterId, e.target.value)}
                />
                <button type="button" className="cf-delete-btn" onClick={() => removeMonster(m.monsterId)} title="Remove">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="cf-encounter-result">
        <div className="cf-encounter-result-head">
          <span
            className="cf-encounter-difficulty-badge"
            style={{ color: DIFFICULTY_COLOR[result.difficulty], borderColor: DIFFICULTY_COLOR[result.difficulty] }}
          >
            {result.difficulty}
          </span>
          <span className="cf-encounter-xp">
            {result.adjustedXp.toLocaleString()} adjusted XP
            {result.multiplier !== 1 && ` (${result.totalXp.toLocaleString()} × ${result.multiplier})`}
          </span>
        </div>
        <div className="cf-encounter-thresholds">
          {DIFFICULTY_LEVELS.filter((d) => d !== "trivial").map((d) => (
            <span key={d} className="cf-encounter-threshold">
              <span className="cf-badge-muted">{d}</span> {result.thresholds[d].toLocaleString()}
            </span>
          ))}
        </div>
      </div>
    </Modal>
  );
}
