import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          padding: 20,
          background: "#0b1220",
          color: "#e2e8f0",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        }}>
          <h1 style={{ fontSize: 18, marginBottom: 12 }}>🚨 App quebrou (erro JS)</h1>
          <div style={{ whiteSpace: "pre-wrap", opacity: 0.9 }}>
            {String(this.state.error?.stack || this.state.error)}
          </div>
          {this.state.info?.componentStack && (
            <>
              <h2 style={{ marginTop: 16, fontSize: 14, opacity: 0.85 }}>Component Stack</h2>
              <pre style={{ whiteSpace: "pre-wrap", opacity: 0.85 }}>
                {this.state.info.componentStack}
              </pre>
            </>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
