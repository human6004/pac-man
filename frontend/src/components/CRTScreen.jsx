// CRTScreen.jsx — Màn hình CRT bọc <canvas>: bezel cong, scanline, vạch quét,
// hiệu ứng bật nguồn. Canvas được expose qua ref để renderer vẽ imperative.

import { forwardRef } from "react";

export const CRTScreen = forwardRef(function CRTScreen({ poweron }, ref) {
  return (
    <div className="crt w-full max-w-[480px] 2xl:max-w-[560px] mx-auto xl:mx-0 p-3">
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
