import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SynthProvider } from "./state/SynthContext";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SynthProvider>
      <App />
    </SynthProvider>
  </React.StrictMode>,
);
