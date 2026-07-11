# Pac-man A.I. — Phân tích không gian trạng thái & các thuật toán tìm kiếm

Đồ án môn **Trí tuệ nhân tạo**: mô hình hóa bài toán Pac-man theo **không gian trạng thái**, cài đặt và **so sánh** ba nhóm thuật toán tìm kiếm, kèm giao diện web trực quan hóa từng bước để demo và giải thích khái niệm.

- **Tìm kiếm mù (uninformed):** BFS, DFS, UCS, IDS
- **Tìm kiếm có thông tin (informed):** Greedy Best-First, A\* (nhiều heuristic)
- **Tìm kiếm đối kháng (adversarial):** Minimax, Alpha-Beta, Expectimax + evaluation function

**Backend** Python (FastAPI) chứa toàn bộ logic game + thuật toán. **Frontend** React + Vite + Tailwind (phong cách arcade CRT 80s) trực quan hóa maze, quá trình *expand* node, cây tìm kiếm từng bước với g/h/f, đường đi tìm được, và bảng/biểu đồ so sánh — kèm hiệu ứng CRT (scanline, power-on, particle) và âm thanh arcade.

---

## ⚠️ Lưu ý quan trọng về Python (đọc trước khi chạy)

Máy có **2 bản Python**: 3.14 và 3.12. Các package (FastAPI, uvicorn, pytest...) được cài cho **Python 3.12**. Nếu gõ `python` (thường trỏ tới 3.14) sẽ bị `ModuleNotFoundError: No module named 'fastapi'`.

**Luôn chạy backend/test/benchmark bằng `py -3.12`** (không dùng `python` trực tiếp).

---

## Cài đặt

```bash
# tại thư mục gốc project
py -3.12 -m pip install -r backend/requirements.txt   # backend (Python 3.12)
cd frontend && npm install                            # frontend (Node.js), chỉ cần lần đầu
```

## Chạy (cần cả HAI tiến trình song song)

**Terminal 1 — backend (FastAPI, cổng 8000):**

```bash
py -3.12 -m uvicorn backend.api.main:app --reload --port 8000
```

- Swagger docs để test tay: <http://localhost:8000/docs>

**Terminal 2 — frontend (Vite, cổng 5173):**

```bash
cd frontend
npm run dev
```

- Mở trình duyệt: <http://localhost:5173>
- Backend mặc định `http://localhost:8000`. Chạy cổng khác thì tạo `frontend/.env` với `VITE_API_BASE=http://localhost:<cổng>`.
- Build bản tĩnh: `npm run build` → `frontend/dist/` (xem thử bằng `npm run preview`).

> Bản frontend HTML/JS thuần cũ được giữ ở `frontend-vanilla/` làm dự phòng demo (mở `index.html`, cấu hình backend trong `src/api.js`).

---

## Sử dụng giao diện

Giao diện có 2 tab:

### Tab ▶ Chạy thuật toán
Bố cục: **maze (trái) + cây duyệt từng bước (phải)** cạnh nhau, cấu hình và số liệu ở hàng dưới.

1. Ở khối **Cấu hình**: chọn **Bản đồ** (small / medium / classic), **Chế độ** (Tĩnh / Đối kháng), **Bài toán** (ăn hết food / đi tới food xa nhất), **Thuật toán** và **Heuristic** (cho A\*/Greedy).
2. Panel **Mô hình bài toán** tự giải thích State / Actions / Goal / Path cost và cách **loại trùng trạng thái** (explored set) cho bài đang chọn.
3. Chọn **Tự động** hoặc **Từng bước**, rồi bấm **Chạy** / **Bước tiếp** / **Quay lại** / **Đặt lại**.
4. Cây duyệt hiển thị OPEN / CURRENT / CLOSED và g/h/f từng node, đồng bộ với chuyển động của Pac-man; bảng **Score Panel** đổ số liệu khi chạy xong.

### Tab ⊞ So sánh thuật toán
Chạy nhiều thuật toán tĩnh trên cùng bản đồ, hiển thị: bảng so sánh (đánh dấu giá trị tốt nhất + cột Optimal), biểu đồ số node / thời gian / bộ nhớ, so sánh cây duyệt và đường đi trên maze. Bấm 1 dòng trong bảng để xem biểu đồ f/g/h của thuật toán đó.

---

## Kiểm thử & thực nghiệm

```bash
py -3.12 -m pytest -v                    # 32 test
py -3.12 experiments/run_benchmark.py    # sinh experiments/results.csv
```

**32 test** phủ: luật chơi (parse layout, legal actions, ăn food/pellet, đâm tường, goal test), tính đúng/tối ưu của thuật toán (BFS/UCS/IDS/A\* nhất quán độ dài đường đi, A\* + null heuristic = UCS, A\* admissible expand ít hơn BFS, DFS không cần tối ưu, không expand lại 1 state), và API (mọi endpoint kể cả input lỗi 400/404).

**Benchmark** chạy 6 thuật toán tĩnh trên các bản đồ, in bảng ra console và ghi `experiments/results.csv` với các cột: `map, problem, algorithm, heuristic, found, path_length, cost, nodes_expanded, nodes_generated, max_frontier, time_ms`.

---

## Thuật toán & heuristic

| Nhóm | Key | Tên | Tối ưu? |
|---|---|---|---|
| Mù | `bfs` | Breadth-First Search | ✓ (khi mọi bước cùng chi phí) |
| Mù | `dfs` | Depth-First Search | ✗ |
| Mù | `ucs` | Uniform-Cost Search | ✓ |
| Mù | `ids` | Iterative Deepening Search | ✓ |
| Có thông tin | `greedy` | Greedy Best-First Search | ✗ |
| Có thông tin | `astar` | A\* Search | ✓ khi heuristic admissible |
| Đối kháng | `minimax` | Minimax (depth-limited) | — |
| Đối kháng | `alphabeta` | Alpha-Beta Pruning | — |
| Đối kháng | `expectimax` | Expectimax | — |

**Heuristic** (cho A\*/Greedy): `null`, `manhattan`, `nearest_food`, `farthest_food`, `food_count`. Tất cả đều admissible trên các bài toán hiện có — nên A\* luôn tối ưu (xem `search/registry.py`).

## API endpoints (FastAPI)

| Method | Path | Mô tả |
|---|---|---|
| GET | `/algorithms` | Danh sách thuật toán + heuristic |
| GET | `/maps` | Mọi bản đồ (tường, food, pellet, vị trí Pac-man/ma) |
| GET | `/maps/{name}` | Một bản đồ (404 nếu không có) |
| POST | `/solve` | Giải 1 thuật toán tĩnh → `found, actions, path, visited_order, tree, stats` |
| POST | `/compare` | So sánh nhiều thuật toán → `results[]` (mỗi cái có `optimal`, `stats`, `tree`) |
| POST | `/adversarial` | Mô phỏng trận Pac-man vs ma → `frames[], stats` |

---

## Cấu trúc thư mục

```
pac-man/
├── backend/                    # Python (FastAPI) — logic + thuật toán
│   ├── game/                   # state.py, layout.py, rules.py, problem.py
│   ├── search/                 # uninformed.py, informed.py, adversarial.py,
│   │                           # heuristics.py, evaluation.py, base.py, registry.py
│   ├── metrics/                # counters.py (node expand, time, path length, memory...)
│   ├── api/                    # main.py (FastAPI), schemas.py
│   ├── maps/                   # small.txt, medium.txt, classic.txt
│   └── requirements.txt        # fastapi, uvicorn, pydantic, pytest, httpx
├── frontend/                   # React 19 + Vite + Tailwind v4 (bản chính)
│   ├── index.html
│   └── src/
│       ├── App.jsx             # 2 tab: Chạy / So sánh
│       ├── index.css           # theme CRT arcade (@theme Tailwind v4)
│       ├── api/client.js       # gọi backend
│       ├── hooks/              # useRunner.js (điều phối chạy), useMetadata.js
│       ├── game/               # PacmanRenderer.js (canvas), effects.js
│       ├── sound/audio.js
│       └── components/         # ControlDeck, CRTScreen, Cabinet, ProblemModelPanel,
│                               # SearchTreePanel, StatsPanel, CompareTable,
│                               # CompareCharts, ComparisonView, FghChart
├── frontend-vanilla/           # bản HTML/JS thuần (dự phòng demo)
├── experiments/                # run_benchmark.py → results.csv
├── tests/                      # test_rules.py, test_search.py,
│                               # test_search_algorithms.py, test_api.py
├── diagrams/                   # sơ đồ kiến trúc / luồng dữ liệu (HTML + JSON)
├── docs/                       # PLAN.md + đề bài (PDF)
└── README.md
```

## Mô hình hóa bài toán (tóm tắt)

| Thành phần | Mô tả |
|---|---|
| **State** | đầy đủ: `(pacman, food, power_pellets, ghosts, score, scared_timer, status)`. Bài tĩnh rút gọn về `(pacman, food còn lại)` |
| **Initial state** | nạp từ file layout trong `backend/maps/` |
| **Actions** | UP / DOWN / LEFT / RIGHT (lọc bỏ nước đâm tường) |
| **Transition** | `move_pacman` (tĩnh) / Pac-man + ma di chuyển (đối kháng) |
| **Goal / Terminal** | ăn hết food hoặc tới ô đích (tĩnh); win / lose / đạt depth-limit (đối kháng) |
| **Path cost** | mỗi bước = 1 (cho UCS/A\*) |

**Loại trùng trạng thái (explored set) tùy bài toán:**
- **Ăn hết food:** `state_key = (ô Pac-man, tập food còn lại)`. Cùng đứng 1 ô nhưng khác tập food ⇒ **2 state khác nhau, đều phải duyệt** — nếu loại chỉ theo ô sẽ cắt nhầm và không bao giờ ăn hết.
- **Đi tới ô đích:** `state_key = ô Pac-man` (food không đổi) — "ô đã duyệt thì bỏ qua", đúng trực giác thông thường.

Chi tiết phân tích, bảng ưu/khuyết và kế hoạch: [docs/PLAN.md](docs/PLAN.md). Sơ đồ kiến trúc & luồng dữ liệu: mở các file HTML trong [diagrams/](diagrams/).

## Quy ước ký tự bản đồ

`%` tường · `.` food · `o` power pellet · `P` Pac-man · `G` ma · (khoảng trắng) ô trống.
