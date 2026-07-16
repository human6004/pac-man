import { useEffect, useState } from "react";

import {
  SearchTreePanel,
  TREE_FULLSCREEN_STORAGE_KEY,
} from "./SearchTreePanel";

import {
  applyTheme,
  getInitialTheme,
} from "../theme";

function readTreeSnapshot() {
  try {
    const raw = window.localStorage.getItem(
      TREE_FULLSCREEN_STORAGE_KEY,
    );

    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(
      "Cannot read the search tree snapshot.",
      error,
    );

    return null;
  }
}

export function TreeFullscreenPage() {
  const [snapshot] = useState(readTreeSnapshot);

  useEffect(() => {
    applyTheme(getInitialTheme());
    document.body.classList.add("tree-fullscreen-body");

    return () => {
      document.body.classList.remove(
        "tree-fullscreen-body",
      );
    };
  }, []);

  const handleBackToPacman = () => {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
    }

    window.close();
  };

  if (!snapshot?.tree?.length) {
    return (
      <main className="tree-fullscreen-error">
        <h1>Search tree unavailable</h1>

        <button
          type="button"
          className="tree-back-button"
          onClick={handleBackToPacman}
        >
          ← Back
        </button>
      </main>
    );
  }

  return (
    <main className="tree-fullscreen-page">
      <header className="tree-fullscreen-header">
        <button
          type="button"
          className="tree-back-button"
          onClick={handleBackToPacman}
          title="Back to Pac-Man"
          aria-label="Back to Pac-Man"
        >
          ← Back
        </button>
      </header>

      <div className="tree-fullscreen-content">
        <SearchTreePanel
          tree={snapshot.tree}
          active
          step={snapshot.step}
          treeMeta={snapshot.treeMeta}
          problem={snapshot.problem}
          algorithm={snapshot.algorithm}
          fullscreen
        />
      </div>
    </main>
  );
}
