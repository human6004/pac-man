// CRTScreen.jsx — CRT screen wrapping a <canvas>: curved bezel, scanlines, sweep line,
// power-on effect. Canvas is exposed via ref so the renderer can draw imperatively.

import { forwardRef } from "react";

export const CRTScreen = forwardRef(function CRTScreen({ poweron, onCanvasClick, onCanvasKeyDown, goalEnabled, goal }, ref) {
  return (
    <div className="crt game-screen">
      <div className="crt-sweep" />
      <canvas
        ref={ref}
        width={680}
        height={520}
        onClick={onCanvasClick}
        onKeyDown={onCanvasKeyDown}
        tabIndex={goalEnabled ? 0 : undefined}
        role="img"
        aria-label={goalEnabled
          ? `Pac-Man map, target selection. ${goal ? `Current target row ${goal[0]}, col ${goal[1]}.` : "No target selected."} Use arrow keys and Enter.`
          : "Pac-Man map visualizing the search process."}
        style={goalEnabled ? { cursor: "crosshair" } : undefined}
        className={poweron ? "crt-poweron" : ""}
      />
      {goalEnabled && <p className="canvas-help">Arrows: move target. Enter: confirm. Escape: clear.</p>}
    </div>
  );
});
