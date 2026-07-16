# Pac-man A.I. — Trực quan hóa thuật toán tìm kiếm

> Đồ án Trí tuệ nhân tạo: biến trò Pac-man thành một **bài toán tìm kiếm**, cài đặt 5 thuật toán kinh điển và vẽ ra **cây tìm kiếm** để nhìn thấy máy "suy nghĩ" từng bước.

Tài liệu này viết cho người **chưa biết gì về code**. Đọc từ trên xuống là hiểu được: dự án làm gì, cấu trúc ra sao, dữ liệu chạy qua đâu, và cách trình bày khi thuyết trình.

---

## 1. Dự án này làm gì? (giải thích như cho người mới)

Bình thường Pac-man là game bạn cầm tay lái. Ở đây **không ai điều khiển** — thay vào đó máy tính phải **tự tìm đường**:

- Bài toán 1 — `eat_all`: tìm đường đi ngắn nhất để **ăn hết mọi hạt food** trên bản đồ.
- Bài toán 2 — `path_to_cell`: tìm đường từ Pac-man tới **một ô đích** cho trước.

Để tìm đường, máy dùng **thuật toán tìm kiếm** (search algorithm). Có 5 thuật toán, chia 2 nhóm:

| Nhóm | Thuật toán | Ý tưởng một câu | Có tìm ra đường ngắn nhất? |
|---|---|---|---|
| Mù (uninformed) | **BFS** | Lan ra đều mọi hướng như sóng nước | Có (khi mỗi bước tốn như nhau) |
| Mù | **DFS** | Lao sâu một hướng tới cùng rồi quay lui | Không đảm bảo |
| Mù | **UCS** | Luôn mở rộng đường **rẻ tiền nhất** trước | Có |
| Có thông tin (informed) | **Greedy** | Nhắm thẳng đích, chọn ô "trông gần đích nhất" | Không đảm bảo |
| Có thông tin | **A\*** | Kết hợp chi phí đã đi + ước lượng còn lại | Có (nếu heuristic hợp lệ) |

**"Mù" vs "có thông tin"**: thuật toán mù không biết đích nằm đâu, cứ dò. Thuật toán có thông tin được đưa thêm một **heuristic** — hàm ước lượng "từ đây tới đích còn bao xa" — để đoán khôn hơn.

Điểm đặc biệt của đồ án: web hiển thị **cây tìm kiếm** — từng ô mà máy xét, theo đúng thứ tự — nên bạn thấy rõ vì sao A\* nhanh hơn BFS, vì sao DFS đi lòng vòng.

---

## 2. Kiến trúc tổng thể

Dự án gồm **2 phần chạy độc lập**, nói chuyện với nhau qua HTTP (như trình duyệt gọi một trang web):

```
┌─────────────────────┐         HTTP (JSON)          ┌──────────────────────┐
│      FRONTEND        │  ───── POST /solve ─────►    │       BACKEND         │
│  React + Vite        │  ◄──── kết quả JSON ────     │  FastAPI (Python)     │
│  (giao diện, canvas) │                              │  (bộ não thuật toán)  │
└─────────────────────┘                              └──────────────────────┘
   Trình duyệt :5173                                     Máy chủ :8000
```

- **Backend** (thư mục `backend/`, viết bằng **Python**): chứa toàn bộ logic — mô hình bài toán, 5 thuật toán, tính điểm số (metrics). Nó **không có giao diện**, chỉ trả dữ liệu JSON.
- **Frontend** (thư mục `frontend/`, viết bằng **React**): là cái đẹp bạn nhìn thấy — bản đồ mê cung, Pac-man vàng, cây tìm kiếm, nút bấm. Nó **không tự tính toán gì**, chỉ gửi yêu cầu sang backend rồi vẽ lại kết quả.

> Tách 2 phần như vậy là mẫu **client–server** rất phổ biến: một bên lo tính toán, một bên lo hiển thị. Đổi giao diện không đụng thuật toán, và ngược lại.

---

## 3. Cấu trúc thư mục (bản đồ toàn dự án)

```text
pac-man/
├── backend/                  # ── PHẦN PYTHON: bộ não ──
│   ├── api/
│   │   ├── main.py           # Máy chủ web: định nghĩa các URL (/solve, /compare, /maps...)
│   │   └── schemas.py        # Khuôn dữ liệu đầu vào (kiểm tra request hợp lệ)
│   ├── game/                 # Mô hình hóa "thế giới" Pac-man
│   │   ├── state.py          # Các "danh từ": Maze, Position, các loại State
│   │   ├── operators.py      # Các "động từ": Pac-man được đi đâu, đi thì thành gì
│   │   ├── problem.py        # Định nghĩa bài toán (đích là gì, chi phí bao nhiêu)
│   │   └── layout.py         # Đọc file bản đồ .txt thành dữ liệu
│   ├── maps/                 # Bản đồ dạng text
│   │   ├── tiny.txt          # Bản đồ nhỏ nhất (để test/demo nhanh)
│   │   ├── small.txt         # Bản đồ nhỏ
│   │   ├── medium.txt        # Bản đồ vừa
│   │   └── classic.txt       # Bản đồ lớn kiểu cổ điển
│   ├── search/               # ── 5 THUẬT TOÁN ở đây ──
│   │   ├── base.py           # Khung chung: Node (nút cây), kết quả, bộ ghi cây
│   │   ├── uninformed.py     # BFS, DFS, UCS
│   │   ├── informed.py       # Greedy, A*
│   │   ├── heuristics.py     # Các hàm ước lượng khoảng cách
│   │   └── registry.py       # Danh bạ: tên thuật toán → hàm tương ứng
│   ├── metrics/
│   │   └── counters.py       # Đếm số node, đo thời gian chạy
│   └── requirements.txt      # Danh sách thư viện Python cần cài
│
├── frontend/                 # ── PHẦN REACT: giao diện ──
│   ├── index.html            # Trang HTML gốc (tải font, đặt theme sáng/tối)
│   ├── package.json          # Danh sách thư viện JS + các lệnh (dev/build/test)
│   ├── vite.config.js        # Cấu hình công cụ build Vite
│   └── src/
│       ├── main.jsx          # Điểm khởi động: gắn React vào trang
│       ├── App.jsx           # Màn hình chính, chứa 2 tab: Run và Compare
│       ├── api/client.js     # NƠI DUY NHẤT gọi sang backend
│       ├── hooks/            # "Bộ não trạng thái" của giao diện
│       │   ├── useMetadata.js  # Tải danh sách map & thuật toán lúc mở app
│       │   └── useRunner.js    # Điều khiển chạy/tạm dừng/từng bước
│       ├── components/       # Các mảnh giao diện (nút, bảng, biểu đồ, cây)
│       ├── game/             # Vẽ Pac-man lên canvas
│       │   ├── PacmanRenderer.js  # Lớp tự vẽ mê cung + Pac-man
│       │   └── effects.js         # Hiệu ứng hạt khi ăn food
│       ├── sound/audio.js    # Tạo tiếng "8-bit" bằng Web Audio (không dùng file)
│       └── theme.js          # Chuyển sáng/tối
│
├── tests/                    # Bài kiểm thử tự động (Python/pytest)
├── experiments/              # Script benchmark + kết quả results.csv
├── diagrams/                 # Sơ đồ kiến trúc (JSON + HTML xem được)
├── docs/                     # Đề bài (PDF) + PLAN.md
└── README.md                 # File bạn đang đọc
```

---

## 4. Backend — bộ não, giải thích từng lớp

Backend tổ chức theo tư duy AI kinh điển: một **bài toán tìm kiếm** gồm 4 thứ — *trạng thái*, *hành động*, *đích*, *chi phí*. Mỗi file lo một mảnh.

### 4.1. `game/state.py` — các "danh từ" (dữ liệu, không có logic)

Đây là các **kiểu dữ liệu bất biến** (immutable — tạo ra rồi không sửa được, giúp tránh lỗi):

- `Position` — một ô, chỉ là cặp số `(hàng, cột)`.
- `Direction` — 4 hướng UP / DOWN / LEFT / RIGHT.
- `Maze` — bản thân mê cung: tập hợp các ô tường + chiều rộng/cao. Có `is_wall(pos)` để hỏi "ô này có phải tường không?".
- `GameMap` — bản đồ vừa đọc từ file: mê cung + vị trí Pac-man khởi đầu + food ban đầu.
- `PathState` — **trạng thái** cho bài `path_to_cell`: chỉ cần biết Pac-man đang ở đâu.
- `EatAllFoodState` — **trạng thái** cho bài `eat_all`: Pac-man ở đâu **và** còn những food nào chưa ăn.

> Điểm quan trọng để hiểu tìm kiếm: "trạng thái" là **ảnh chụp toàn bộ thứ cần biết tại một thời điểm**. Với bài ăn hết food, hai lần Pac-man đứng cùng chỗ nhưng còn food khác nhau → là **hai trạng thái khác nhau**.

### 4.2. `game/operators.py` — các "động từ" (luật di chuyển)

- `pacman_legal_actions(maze, pos)` — Pac-man đứng đây thì đi được những hướng nào (không đâm tường, không ra ngoài).
- `move_pacman(maze, pos, action)` — đi một bước theo hướng đó thì tới ô nào.
- `STEP_COST = 1.0` — mỗi bước đi tốn 1 đơn vị (mọi bước như nhau).

### 4.3. `game/problem.py` — định nghĩa bài toán

Dùng khuôn chuẩn trong sách AI (AIMA): mỗi bài toán trả lời được 5 câu hỏi — *bắt đầu ở đâu?*, *đã tới đích chưa?*, *đi được đâu?*, *đi rồi thành gì?*, *tốn bao nhiêu?*.

- `EatAllFoodProblem` — đích: hết food. Đi qua ô có food thì food đó biến mất.
- `PathToPointProblem` — đích: chạm ô mục tiêu. Nếu người dùng không chọn ô đích, mặc định lấy **food xa nhất**.

### 4.4. `game/layout.py` — đọc bản đồ từ file text

Bản đồ là file `.txt`, mỗi ký tự là một ô:

```text
%%%%%
%P .%
%.  %
%.  %
%%%%%
```

| Ký tự | Ý nghĩa |
|---|---|
| `%` | Tường |
| `.` | Food (hạt cần ăn) |
| `P` | Vị trí Pac-man bắt đầu (đúng 1 cái) |
| ` ` (dấu cách) | Ô trống đi được |

`parse_layout()` đọc và **kiểm tra tính hợp lệ**: bản đồ phải hình chữ nhật, viền ngoài phải kín tường, đúng một chữ `P`.

### 4.5. `search/` — trái tim: 5 thuật toán

- `base.py` — khung chung mọi thuật toán dùng:
  - `Node` — một nút trên cây tìm kiếm (trạng thái + nút cha + hành động dẫn tới + chi phí g + độ sâu). Nhờ có "nút cha" nên truy ngược được **đường đi từ gốc**.
  - `TreeRecorder` — ghi lại từng node theo thứ tự để frontend vẽ cây. Giới hạn `TREE_LIMIT = 250` node để không gửi payload khổng lồ (thuật toán vẫn giải tiếp, chỉ dừng *ghi hình*).
  - `SearchResult` — gói kết quả trả về: tìm thấy không, đường đi, thứ tự duyệt, cây, và số liệu.
- `uninformed.py` — **BFS** (dùng hàng đợi `deque`), **DFS** (dùng ngăn xếp), **UCS** (dùng heap theo chi phí g).
- `informed.py` — **Greedy** (heap theo h — ước lượng còn lại), **A\*** (heap theo f = g + h).
- `heuristics.py` — các hàm ước lượng: `manhattan` (khoảng cách ô vuông tới đích), `nearest_food`/`farthest_food`/`food_count` (cho bài ăn hết food), `null` (luôn = 0, biến A\* thành UCS).
- `registry.py` — **danh bạ** ánh xạ tên `"bfs"`, `"astar"`... sang hàm thật, kèm thông tin nhóm/tối ưu. Nhờ nó, API chỉ cần nhận chuỗi tên là gọi đúng thuật toán.

### 4.6. `metrics/counters.py` — bảng điểm

`SearchMetrics` đếm trong lúc chạy: số node **mở rộng** (`nodes_expanded`), số node **sinh ra** (`nodes_generated`), hàng đợi lớn nhất (`max_frontier`), thời gian (`time_ms`), độ dài/chi phí đường đi. Đây chính là các con số bạn so sánh giữa các thuật toán.

### 4.7. `api/main.py` — cửa ra vào (các URL)

FastAPI dựng sẵn các đường dẫn cho frontend gọi:

| Phương thức | URL | Trả về gì |
|---|---|---|
| GET | `/algorithms` | Danh sách thuật toán + heuristic |
| GET | `/maps` | Danh sách toàn bộ bản đồ |
| GET | `/maps/{name}` | Chi tiết một bản đồ |
| POST | `/solve` | Chạy **1** thuật toán, trả đường đi + cây + số liệu |
| POST | `/compare` | Chạy **nhiều** thuật toán trên cùng bản đồ để so sánh |

---

## 5. Frontend — giao diện, giải thích từng phần

### 5.1. Luồng khởi động

`index.html` → `src/main.jsx` → `App.jsx`. `main.jsx` gắn React vào trang. `App.jsx` là màn hình chính, có **2 tab**:

- **Run** — chạy **một** thuật toán, xem Pac-man đi và cây lớn dần.
- **Compare** — chạy **nhiều** thuật toán cùng lúc, so sánh bằng bảng + biểu đồ.

### 5.2. Ba "cấp" của frontend

1. **`api/client.js`** — nơi **duy nhất** gọi sang backend (`fetch`). Mọi yêu cầu mạng đều đi qua đây, dễ kiểm soát.
2. **Hooks (`hooks/`)** — "bộ não" giữ trạng thái giao diện:
   - `useMetadata` — lúc mở app, tải sẵn danh sách map & thuật toán để đổ vào các ô chọn.
   - `useRunner` — máy trạng thái điều khiển việc chạy: gọi `/solve`, rồi **hoạt hình** Pac-man đi từng bước trên canvas; xử lý tạm dừng / từng bước / reset / so sánh.
3. **Components (`components/`)** — các mảnh giao diện: `ControlDeck` (bảng nút chọn), `SearchTreePanel` (vẽ cây SVG có kéo/zoom), `StatsPanel` (bảng số liệu), `CompareTable`/`CompareCharts` (bảng & biểu đồ so sánh)...

### 5.3. Canvas vẽ Pac-man

`game/PacmanRenderer.js` **không phải component React** — nó là một lớp tự vẽ trực tiếp lên `<canvas>`: tường, food, Pac-man há miệng, đường đi, các ô đã duyệt. Tách khỏi React để vẽ mượt (dùng `requestAnimationFrame`). `effects.js` bắn hạt khi ăn food, `audio.js` tạo tiếng bíp 8-bit.

---

## 6. Luồng dữ liệu — điều gì xảy ra khi bấm "Run"?

Đây là phần **quan trọng nhất để thuyết trình**. Bấm một nút, chuỗi sự kiện là:

```
1. Người dùng chọn map + thuật toán + bài toán, bấm Run
        │
2. Frontend (client.js) gửi:  POST /solve  {map, algorithm, heuristic, problem}
        │
3. Backend nhận (api/main.py):
     ├─ layout.py    đọc file map → GameMap
     ├─ problem.py   dựng bài toán (EatAll hoặc PathToPoint)
     ├─ registry.py  tra tên "astar" → hàm astar()
     └─ informed.py  chạy A*, dùng heuristics.py + đếm bằng counters.py
        │
4. Thuật toán trả SearchResult (đường đi, thứ tự duyệt, cây, số liệu)
        │
5. Backend đóng gói thành JSON, gửi trả frontend
        │
6. Frontend (useRunner) nhận JSON:
     ├─ PacmanRenderer  hoạt hình Pac-man đi theo đường
     ├─ SearchTreePanel vẽ cây tìm kiếm lớn dần
     └─ StatsPanel      hiện số node, thời gian, chi phí
```

Một câu tóm gọn khi thuyết trình: *"Frontend hỏi, backend tính, frontend vẽ lại."*

---

## 7. Cài đặt và chạy

Xem hướng dẫn riêng tại **[SETUP.md](SETUP.md)**.

---

## 8. Kiểm thử và benchmark

```powershell
py -3.12 -m pytest -q          # chạy test backend
py -3.12 experiments/run_benchmark.py   # đo hiệu năng, ghi experiments/results.csv
cd frontend
npm test                       # test frontend
npm run lint                   # kiểm tra chuẩn code
npm run build                  # đóng gói bản chạy thật
```

Benchmark chạy 5 thuật toán trên nhiều bài toán và bản đồ rồi ghi kết quả ra `experiments/results.csv` để so sánh.

---

## 9. Gợi ý trình bày sản phẩm

Kịch bản demo 4 bước:

1. **Mở đầu**: "Pac-man ở đây không do người chơi điều khiển. Máy phải **tự tìm đường** ăn hết food — đây là **bài toán tìm kiếm** trong AI."
2. **Tab Run**: chọn bản đồ `small`, chạy **BFS** → chỉ ra cây tìm kiếm nở đều như sóng. Rồi chạy **A\*** → cây nhỏ hơn hẳn, chỉ số `nodes_expanded` thấp hơn. Kết luận: *heuristic giúp máy đoán khôn hơn nên xét ít ô hơn.*
3. **Tab Compare**: chạy đồng thời BFS / UCS / A\* → bảng số liệu và biểu đồ cho thấy A\* thắng về số node nhưng vẫn tối ưu.
4. **Kiến trúc**: mở phần 2 và 6 của README này, giải thích tách backend/frontend và luồng "hỏi – tính – vẽ".

Ba khái niệm cần nắm chắc để trả lời câu hỏi:

- **Trạng thái (state)**: ảnh chụp toàn bộ tình huống (Pac-man ở đâu + còn food nào).
- **Heuristic**: hàm đoán "còn bao xa tới đích"; đoán tốt → tìm nhanh.
- **Tối ưu (optimal)**: BFS/UCS luôn ra đường ngắn nhất; A\* ngắn nhất nếu heuristic không phóng đại; DFS/Greedy thì không đảm bảo.
