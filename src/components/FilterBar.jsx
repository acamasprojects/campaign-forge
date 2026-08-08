import { toggleValue } from "../utils/search.js";

/**
 * Shared search + filter toolbar. `groups` is a list of independent toggle-chip
 * rows (e.g. status, disposition, tags) — each entry needs a label, all its
 * possible values, the currently active subset, and a setter.
 */
export default function FilterBar({ search, onSearch, groups, onClearAll, resultCount, sort, pinnedOnly }) {
  const anyActive = search.trim() !== "" || groups.some((g) => g.active.length > 0) || (pinnedOnly && pinnedOnly.active);

  return (
    <div className="cf-filter-bar">
      <div className="cf-filter-search-row">
        <input
          className="cf-input cf-search-input"
          placeholder="Search…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <span className="cf-result-count">{resultCount} result{resultCount === 1 ? "" : "s"}</span>
        {pinnedOnly && (
          <button
            type="button"
            className={`cf-chip cf-pinned-toggle${pinnedOnly.active ? " cf-chip-active" : ""}`}
            onClick={() => pinnedOnly.onChange(!pinnedOnly.active)}
          >
            ★ Pinned only
          </button>
        )}
        {sort && (
          <select className="cf-input cf-sort-select" value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
            {sort.options.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
        )}
        {anyActive && (
          <button type="button" className="cf-btn cf-btn-ghost cf-btn-small" onClick={onClearAll}>
            Clear filters
          </button>
        )}
      </div>
      {groups.map((g) => (
        <div className="cf-filter-group" key={g.label}>
          <span className="cf-filter-group-label">{g.label}</span>
          <div className="cf-chip-row">
            {g.values.map((v) => (
              <button
                key={v}
                type="button"
                className={`cf-chip cf-filter-chip${g.active.includes(v) ? " cf-chip-active" : ""}`}
                onClick={() => g.setActive(toggleValue(g.active, v))}
              >
                {g.formatLabel ? g.formatLabel(v) : v}
              </button>
            ))}
            {g.values.length === 0 && <span className="cf-filter-group-empty">none yet</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
