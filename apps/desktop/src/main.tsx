import ReactDOM from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/globals.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<pre style="color:#f33;padding:2rem">#root not found</pre>';
} else {
  ReactDOM.createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
