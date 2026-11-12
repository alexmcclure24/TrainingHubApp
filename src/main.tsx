import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

/** Shows the error instead of a blank page if anything crashes while rendering. */
class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="wrap narrow">
        <h1>Something went wrong</h1>
        <p className="err">{this.state.error.message}</p>
        <button className="btn" type="button" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}

const root = document.getElementById("root")!;
root.dataset.mounted = "1";
createRoot(root).render(
  <StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </StrictMode>,
);
