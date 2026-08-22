import React from "react";
import ReactDOM from "react-dom/client";

import App from "./app/App";
import "./styles/globals.css";
import "./styles/drivers.css";

class F1ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("F1 RACE REPLAY ERROR:", error);
    console.error("COMPONENT STACK:", info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#050505",
            color: "#fff",
            padding: "40px",
            fontFamily: "monospace",
          }}
        >
          <h1 style={{ color: "#ff2337" }}>
            F1 RACE REPLAY — RUNTIME ERROR
          </h1>

          <pre
            style={{
              marginTop: "24px",
              padding: "24px",
              background: "#111",
              border: "1px solid #333",
              whiteSpace: "pre-wrap",
            }}
          >
            {this.state.error.stack ||
              this.state.error.message}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

window.addEventListener("unhandledrejection", (event) => {
  console.error(
    "UNHANDLED PROMISE:",
    event.reason,
  );
});

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <F1ErrorBoundary>
      <App />
    </F1ErrorBoundary>
  </React.StrictMode>
);
