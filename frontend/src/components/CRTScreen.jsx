// CRTScreen.jsx — Màn hình CRT bọc <canvas>: bezel cong, scanline, vạch quét,
// hiệu ứng bật nguồn. Canvas được expose qua ref để renderer vẽ imperative.

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
          ? `Bản đồ Pac-Man chọn đích. ${goal ? `Đích hiện tại hàng ${goal[0]}, cột ${goal[1]}.` : "Chưa chọn đích."} Dùng phím mũi tên và Enter.`
          : "Bản đồ Pac-Man mô phỏng quá trình tìm kiếm."}
        style={goalEnabled ? { cursor: "crosshair" } : undefined}
        className={poweron ? "crt-poweron" : ""}
      />
      {goalEnabled && <p className="canvas-help">Mũi tên: di chuyển đích. Enter: xác nhận. Escape: xóa.</p>}
    </div>
  );
});
