const MODELS = {
  eat_all: {
    rows: [
      ["Trạng thái đầu", "((1,1), F₀)"],
      ["Trạng thái đích", "((x,y), ∅)"],
      ["Hành động", "Đi lên, xuống, trái, phải nếu không có tường"],
      ["Chi phí", "Mỗi bước tốn 1; tối ưu nghĩa là ít bước nhất"],
    ],
    key: "state_key = ((x,y), F)",
    dedup: "Chỉ loại trạng thái khi toàn bộ state_key đã xuất hiện. Cùng vị trí p nhưng tập thức ăn F khác nhau vẫn là hai trạng thái khác nhau.",
    note: "p là ô Pac-Man; F₀ là tập thức ăn ban đầu; ∅ nghĩa là không còn thức ăn.",
  },
  path_to_cell: {
    rows: [
      ["Trạng thái đầu", "p = (1,1)"],
      ["Trạng thái đích", "p = (x_goal, y_goal)"],
      ["Hành động", "Đi lên, xuống, trái, phải nếu không có tường"],
      ["Chi phí", "Mỗi bước tốn 1; tối ưu nghĩa là đường ngắn nhất"],
    ],
    key: "state_key = p = (x,y)",
    dedup: "Loại trạng thái con khi vị trí p đã xuất hiện trong explored hoặc closed list.",
    note: "Nếu chưa chọn đích, backend dùng ô hợp lệ xa nhất làm mặc định.",
  },
};

export function ProblemModelPanel({ problem }) {
  const model = MODELS[problem] || MODELS.eat_all;
  return (
    <details className="lab-panel model-details">
      <summary>Cách mô hình hóa bài toán</summary>
      <div className="model-body">
        <dl>
          {model.rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="model-dedup">
          <strong>Loại trạng thái trùng</strong>
          <code>{model.key}</code>
          <p>{model.dedup}</p>
        </div>
        <p>{model.note}</p>
      </div>
    </details>
  );
}
