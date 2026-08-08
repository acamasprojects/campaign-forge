/** Exclusive single-select chip row — used inside forms (disposition, status, type). */
export default function ChoiceChips({ values, value, onChange, formatLabel }) {
  return (
    <div className="cf-chip-row">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          className={`cf-chip cf-choice-chip${value === v ? " cf-chip-active" : ""}`}
          onClick={() => onChange(v)}
        >
          {formatLabel ? formatLabel(v) : v}
        </button>
      ))}
    </div>
  );
}
