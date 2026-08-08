import { useEffect } from "react";

/** Simple centered overlay dialog: click the backdrop or press Escape to close. */
export default function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="cf-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`cf-modal${wide ? " cf-modal-wide" : ""}`}>
        <div className="cf-modal-head">
          <h2 className="cf-modal-title">{title}</h2>
          <button type="button" className="cf-delete-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div className="cf-modal-body">{children}</div>
      </div>
    </div>
  );
}
