import { useState } from "react";

/** Freeform tag editor: type + Enter/comma to add, click a pill to remove. */
export default function TagInput({ tags, onChange, placeholder = "+ tag" }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim();
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  };

  return (
    <div className="cf-tag-editor">
      {tags.map((t) => (
        <button
          key={t}
          type="button"
          className="cf-chip cf-chip-removable"
          onClick={() => onChange(tags.filter((x) => x !== t))}
          title="Remove tag"
        >
          {t} ✕
        </button>
      ))}
      <input
        className="cf-tag-input"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) {
            setDraft(v.slice(0, -1));
            commit();
          } else {
            setDraft(v);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
            onChange(tags.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}
