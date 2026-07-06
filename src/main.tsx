import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { MockDataProvider } from "./state/MockDataContext";
import { MockUserProvider } from "./state/MockUserContext";
import "./styles.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <MockUserProvider>
        <MockDataProvider>
          <App />
        </MockDataProvider>
      </MockUserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
