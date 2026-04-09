import React from "react";

interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[orfc] ErrorBoundary caught:", error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <pre
          style={{
            padding: 32,
            color: "#ef4444",
            fontFamily: "ui-monospace, SF Mono, monospace",
            fontSize: 12,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
            background: "#0e0e10",
            height: "100vh",
            margin: 0,
            overflow: "auto",
          }}
        >
          <strong style={{ color: "#fca5a5" }}>[orfc] render error</strong>
          {"\n\n"}
          {this.state.error.name}: {this.state.error.message}
          {"\n\n"}
          {this.state.error.stack}
          {this.state.info?.componentStack && (
            <>
              {"\n\n---\nComponent stack:\n"}
              {this.state.info.componentStack}
            </>
          )}
        </pre>
      );
    }
    return this.props.children;
  }
}
