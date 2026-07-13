// useMetadata.js — Loads the list of maps + algorithms + heuristics from the backend.
//
// Returns { maps, algorithms, heuristics, algoInfo, loading, error }.
// algoInfo: map key -> {key, name, group, uses_heuristic} for quick lookup.

import { useEffect, useState } from "react";
import { Api } from "../api/client";

const ALGORITHM_NAME = { bfs: "BFS", dfs: "DFS", ucs: "UCS", greedy: "Greedy", astar: "A*" };

export function useMetadata() {
  const [state, setState] = useState({
    maps: [],
    algorithms: [],
    heuristics: [],
    algoInfo: {},
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [mapsResp, algoResp] = await Promise.all([
          Api.getMaps(),
          Api.getAlgorithms(),
        ]);
        if (!alive) return;
        const maps = mapsResp.maps.map((m) => m.name);
        const algorithms = algoResp.algorithms.map((a) => ({ ...a, name: ALGORITHM_NAME[a.key] || a.name }));
        const algoInfo = {};
        for (const a of algorithms) algoInfo[a.key] = a;
        setState({
          maps,
          algorithms,
          heuristics: algoResp.heuristics,
          algoInfo,
          loading: false,
          error: null,
        });
      } catch (e) {
        if (!alive) return;
        setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
