// Small, dependency-free helpers that back every filter/search control in the app.

/** Case-insensitive substring match against any number of fields. Empty query always matches. */
export function textMatches(query, ...fields) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields
    .filter((f) => f !== null && f !== undefined && f !== "")
    .some((f) => String(f).toLowerCase().includes(q));
}

/** True if itemTags contains every tag in activeTags (AND logic). No active tags = always true. */
export function hasAllTags(itemTags, activeTags) {
  if (!activeTags || activeTags.length === 0) return true;
  const set = new Set(itemTags || []);
  return activeTags.every((t) => set.has(t));
}

/** Sorted list of every unique tag used across a collection of entities. */
export function collectTags(items) {
  const set = new Set();
  items.forEach((item) => (item.tags || []).forEach((t) => set.add(t)));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Toggle a value in/out of an array, returning a new array. */
export function toggleValue(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}
