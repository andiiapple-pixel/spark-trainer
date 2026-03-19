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
          <h3 className="font-semibold mb-2" style={{ color: '#f8fafc' }}>Something went wrong</h3>
          <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
            This section encountered an error
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-full text-sm font-semibold"
            style={{ background: '#6366f1', color: '#fff' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
