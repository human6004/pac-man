// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.jsx'

// createRoot(document.getElementById('root')).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.jsx";
import { TreeFullscreenPage } from "./components/TreeFullscreenPage.jsx";

const isTreeFullscreen =
  new URLSearchParams(window.location.search).get(
    "treeFullscreen",
  ) === "1";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isTreeFullscreen ? (
      <TreeFullscreenPage />
    ) : (
      <App />
    )}
  </StrictMode>,
);