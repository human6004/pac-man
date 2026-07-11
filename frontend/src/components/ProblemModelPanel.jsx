// ProblemModelPanel.jsx — Thẻ terminal giải thích MÔ HÌNH KHÔNG GIAN TRẠNG THÁI
// của bài toán đang chọn. Giúp người xem (giám khảo) nắm khái niệm mà không cần
// nghe thuyết trình miệng: State / Actions / Goal / Path cost.

// Nội dung theo từng chế độ + bài toán. Mỗi mục là [nhãn, mô tả].
const MODELS = {
  eat_all: {
    title: "Bài toán TĨNH — Ăn hết food",
    rows: [
      ["State", "(vị trí Pac-man, tập food còn lại)"],
      ["Initial", "Pac-man ở ô xuất phát, mọi food còn nguyên"],
      ["Actions", "đi UP / DOWN / LEFT / RIGHT (bỏ nước đâm tường)"],
      ["Goal test", "không còn food nào (đã ăn hết)"],
      ["Path cost", "mỗi bước = 1 → tối ưu là đường ít bước nhất"],
    ],
    dedup: {
      key: "state_key = (ô Pac-man, tập food còn lại)",
      lines: [
        "Loại trùng theo STATE, KHÔNG theo ô. Cùng đứng 1 ô nhưng khác tập food",
        "còn lại ⇒ vẫn là 2 state khác nhau, đều phải duyệt.",
        "Nếu loại chỉ theo ô sẽ cắt nhầm nhánh và không bao giờ ăn hết được.",
      ],
    },
    note: "Không gian trạng thái ~ 2^(số food) nên chỉ chạy được trên bản đồ nhỏ.",
  },
  path_to_farthest: {
    title: "Bài toán TĨNH — Đi tới food xa nhất",
    rows: [
      ["State", "vị trí Pac-man trên lưới"],
      ["Initial", "Pac-man ở ô xuất phát"],
      ["Actions", "đi UP / DOWN / LEFT / RIGHT (bỏ nước đâm tường)"],
      ["Goal test", "tới đúng ô food xa nhất (theo Manhattan)"],
      ["Path cost", "mỗi bước = 1 → tối ưu là đường ngắn nhất tới đích"],
    ],
    dedup: {
      key: "state_key = ô Pac-man",
      lines: [
        "Food không đổi nên state chính là ô hiện tại: ô nào đã duyệt (nằm trong",
        "explored / closed list) thì bỏ qua — đúng như trực giác \"ô đã đi thì thôi\".",
      ],
    },
    note: "Đích ở xa tạo đường dài, làm nổi bật khác biệt giữa các thuật toán.",
  },
  adversarial: {
    title: "Bài toán ĐỐI KHÁNG — Pac-man vs Ma",
    rows: [
      ["State", "vị trí Pac-man + ma + food + điểm + bộ đếm sợ"],
      ["Agents", "Pac-man là MAX, ma là MIN (hoặc ngẫu nhiên với Expectimax)"],
      ["Actions", "mỗi lượt: Pac-man đi rồi từng con ma đi"],
      ["Terminal", "thắng (ăn hết food) / thua (đụng ma)"],
      ["Đánh giá", "cắt ở độ sâu giới hạn → dùng hàm evaluate(state)"],
    ],
    dedup: {
      key: "không dùng explored set",
      lines: [
        "Ma di chuyển nên cùng ô có thể là tình huống khác nhau; cây trò chơi",
        "được duyệt tới độ sâu giới hạn thay vì loại trùng trạng thái.",
      ],
    },
    note: "Cây quá lớn để duyệt hết nên dùng depth-limited + evaluation function.",
  },
};

export function ProblemModelPanel({ mode, problem }) {
  const key = mode === "adversarial" ? "adversarial" : problem;
  const model = MODELS[key] || MODELS.eat_all;

  return (
    <div className="crt-panel p-4">
      <h2 className="crt-label mb-3" style={{ color: "var(--color-pac)" }}>
        ◢ {model.title}
      </h2>
      <dl className="font-term text-[15px] flex flex-col gap-1.5">
        {model.rows.map(([label, desc]) => (
          <div key={label} className="grid grid-cols-[92px_1fr] gap-2 items-baseline">
            <dt className="text-[color:var(--color-inky)] font-semibold">{label}</dt>
            <dd className="text-[color:var(--color-amber)] m-0">{desc}</dd>
          </div>
        ))}
      </dl>

      {model.dedup && (
        <div className="mt-3 rounded border border-[rgba(255,176,0,.3)] bg-[#07070f] p-3">
          <div className="crt-label text-[11px] mb-1" style={{ color: "var(--color-pac)" }}>
            Loại trùng trạng thái (explored / closed list)
          </div>
          <code className="block font-term text-[13px] text-[color:var(--color-inky)] mb-1">
            {model.dedup.key}
          </code>
          <p className="font-term text-[13px] text-[color:var(--color-amber)] leading-snug m-0">
            {model.dedup.lines.join(" ")}
          </p>
        </div>
      )}

      <p className="mt-3 text-[13px] text-[color:var(--color-amber-dim)] leading-snug">
        {model.note}
      </p>
    </div>
  );
}
