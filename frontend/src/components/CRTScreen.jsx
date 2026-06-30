// CRTScreen.jsx — Màn hình CRT bọc <canvas>: bezel cong, scanline, vạch quét,
// hiệu ứng bật nguồn. Canvas được expose qua ref để renderer vẽ imperative.

import { forwardRef } from "react";

export const CRTScreen = forwardRef(function CRTScreen({ poweron }, ref) {
  return (
    <div className="crt w-full max-w-[720px] mx-auto p-3">
      <div className="crt-sweep" />
      <canvas
        ref={ref}
        width={680}
        height={520}
        className={poweron ? "crt-poweron" : ""}
      />
    </div>
  );
});
