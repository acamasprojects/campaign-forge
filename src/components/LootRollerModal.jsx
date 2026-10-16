import { useState } from "react";
import Modal from "./Modal.jsx";
import { ITEM_RARITIES, ITEM_TYPES } from "../data/model.js";
import { toggleValue } from "../utils/search.js";

const RARITY_LABEL = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  "very-rare": "Very Rare",
  legendary: "Legendary",
  artifact: "Artifact",
};

/** Picks `count` distinct items at random from `pool` (or all of them, if
 * there aren't enough to go around). */
function rollRandom(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Rolls random loot from the items you've already stocked in the Items
 * list — this doesn't invent new magic items, it hands out ones you've
 * already written up. Read-only tool, no campaign data gets touched.
 */
export default function LootRollerModal({ campaign, onClose }) {
  const [activeRarities, setActiveRarities] = useState([]);
  const [count, setCount] = useState(3);
  const [rolled, setRolled] = useState([]);

  const pool = campaign.items.filter(
    (i) => activeRarities.length === 0 || activeRarities.includes(i.rarity)
  );

  const roll = () => setRolled(rollRandom(pool, Number(count) || 1));
  const rerollOne = (id) => {
    const replacement = rollRandom(
      pool.filter((i) => !rolled.some((r) => r.id === i.id)),
      1
    )[0];
    if (!replacement) return;
    setRolled((prev) => prev.map((r) => (r.id === id ? replacement : r)));
  };

  return (
    <Modal title="Loot Roller" onClose={onClose}>
      <p className="cf-panel-note">Rolls random items from your existing Items list — write up the loot once, roll it out as needed.</p>

      <div className="cf-field">
        <span className="cf-field-label">Rarity (leave blank for any)</span>
        <div className="cf-chip-row">
          {ITEM_RARITIES.map((r) => (
            <button
              key={r}
              type="button"
              className={`cf-chip cf-filter-chip${activeRarities.includes(r) ? " cf-chip-active" : ""}`}
              onClick={() => setActiveRarities(toggleValue(activeRarities, r))}
            >
              {RARITY_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="cf-loot-roll-row">
        <label className="cf-field cf-loot-count-field">
          <span className="cf-field-label">How many</span>
          <input className="cf-input" type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} />
        </label>
        <button type="button" className="cf-btn cf-btn-primary" onClick={roll} disabled={pool.length === 0}>
          Roll
        </button>
      </div>

      {pool.length === 0 && (
        <p className="cf-empty-panel">No items match that rarity filter — add some in the Items tab, or clear the filter.</p>
      )}

      {rolled.length > 0 && (
        <div className="cf-card-list cf-loot-result-list">
          {rolled.map((item) => (
            <div key={item.id} className="cf-loot-result-row">
              <div>
                <span className="cf-loot-result-name">{item.name || "Untitled"}</span>
                <span className="cf-badge-muted"> {ITEM_TYPES.includes(item.type) ? item.type.replace(/-/g, " ") : item.type}</span>
              </div>
              <span className="cf-badge">{RARITY_LABEL[item.rarity] || item.rarity}</span>
              <button type="button" className="cf-btn cf-btn-ghost cf-btn-small" onClick={() => rerollOne(item.id)}>
                Reroll
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
