import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center min-h-[200px]">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="font-semibold mb-2" style={{ color: '#FFFFFF' }}>Something went wrong</h3>
          <p className="text-sm mb-4" style={{ color: '#888888' }}>
            This section encountered an error
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-sm font-semibold"
            style={{ background: '#E8FF00', color: '#0A0A0A' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
