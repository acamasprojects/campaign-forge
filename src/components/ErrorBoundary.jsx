import { Component } from "react";

/**
 * Catches render-time errors anywhere below it (e.g. a saved record missing
 * a field normalizeCampaign() didn't backfill) and shows a recoverable
 * screen instead of a silent white screen. The error boundary API only
 * exists as a class component — there's no hook equivalent.
 *
 * Reloading is the fix for most causes here, since the crash is almost
 * always a render-time data-shape mismatch, not something reload-proof.
 * The underlying localStorage data isn't touched by a render crash, so
 * reloading doesn't lose anything beyond whatever hadn't saved yet.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Campaign Forge crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="cf-page">
          <div className="cf-empty-state">
            <div className="cf-empty-state-mark">⚠</div>
            <h2 className="cf-empty-state-title">Something went wrong</h2>
            <p className="cf-empty-state-body">
              A record didn't load the way the app expected. Your saved data wasn't touched by
              this — reloading usually clears it up.
            </p>
            <button className="cf-btn cf-btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
