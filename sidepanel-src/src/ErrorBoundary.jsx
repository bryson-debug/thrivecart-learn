import React from 'react';

// Without this, any uncaught error (e.g. the HelpScout SDK failing to reach
// its parent frame when this page is loaded outside HelpScout's real
// sidebar) unmounts the tree and leaves a blank white page with no clue why.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ fontFamily: 'sans-serif', fontSize: 13, padding: 12, color: '#b00020' }}>
          <p>Something went wrong loading this panel.</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
