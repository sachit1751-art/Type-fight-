import React from 'react';
import { clearAllLocalData } from '../game/history';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected rendering issue interrupted the session.',
    };
  }

  override componentDidCatch(error: Error): void {
    console.error('[Hairline UI Error]', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  handleResetAndReload = () => {
    clearAllLocalData();
    window.location.reload();
  };

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="error-fallback" role="alert">
        <div className="error-card">
          <span className="cap">Hairline · Recovery</span>
          <h1>Session paused safely</h1>
          <p className="lede">
            Your browser hit a temporary display or storage error. You can resume cleanly or clear
            cached settings and reload.
          </p>
          <p className="error-msg mono">{this.state.message}</p>
          <div className="error-actions">
            <button type="button" className="cta" onClick={this.handleRetry}>
              ↻ &nbsp;RESUME VIEW
            </button>
            <button type="button" className="tool" onClick={this.handleResetAndReload}>
              CLEAR CACHE &amp; RELOAD
            </button>
          </div>
        </div>
      </main>
    );
  }
}
