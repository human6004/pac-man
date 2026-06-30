// useMetadata.js — Nạp danh sách bản đồ + thuật toán + heuristic từ backend.
//
// Trả về { maps, algorithms, heuristics, algoInfo, loading, error }.
// algoInfo: map key -> {key, name, group, uses_heuristic} để tra cứu nhanh.

import { useEffect, useState } from "react";
import { Api } from "../api/client";

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
        const algoInfo = {};
        for (const a of algoResp.algorithms) algoInfo[a.key] = a;
        setState({
          maps,
          algorithms: algoResp.algorithms,
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
