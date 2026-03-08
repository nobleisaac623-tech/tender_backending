import React from 'react';

interface State { hasError: boolean; }

export default class AIErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('ProcureAI render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '16px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          color: '#991b1b',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 600 }}>ProcureAI encountered an error</div>
            <div style={{ fontSize: '12px', marginTop: '2px', color: '#b91c1c' }}>
              Please refresh the page or start a new chat.
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{ marginTop: '8px', padding: '4px 12px', borderRadius: '6px', border: '1px solid #fca5a5', background: 'white', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
