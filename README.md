# Pac-man AI — Phân tích không gian trạng thái & các thuật toán tìm kiếm

Đồ án môn Trí tuệ nhân tạo: mô hình hóa bài toán Pac-man theo **không gian trạng thái**, cài đặt và **so sánh** các nhóm thuật toán tìm kiếm:

- **Tìm kiếm mù (uninformed):** BFS, DFS, UCS, IDS
- **Tìm kiếm có thông tin (informed):** Greedy Best-First, A\* (với nhiều heuristic)
- **Tìm kiếm đối kháng (adversarial):** Minimax, Alpha-Beta, Expectimax + evaluation function

Backend **Python (FastAPI)** xử lý logic + thuật toán, frontend **React + Vite + Tailwind** (phong cách arcade CRT 80s) trực quan hóa maze, Pac-man, ma, quá trình expand node và đường đi — kèm hiệu ứng game (scanline, power-on, particle) và âm thanh arcade.

---

## ⚠️ Lưu ý quan trọng về Python (đọc trước khi chạy)

Máy có **2 bản Python**: 3.14 và 3.12. Các package (FastAPI, uvicorn, pytest...) được cài cho **Python 3.12**. Nếu gõ `python` (trỏ tới 3.14) sẽ bị `ModuleNotFoundError: No module named 'fastapi'` → đây là lỗi server gặp phải.

**Luôn chạy bằng `py -3.12`** (không dùng `python` trực tiếp).

---

## Cài đặt

```bash
cd "d:/study/dự án làm chơi/pacman"
py -3.12 -m pip install -r backend/requirements.txt
```

## Chạy backend (API)

```bash
py -3.12 -m uvicorn backend.api.main:app --reload --port 8000
```

- API docs (Swagger) để test thủ công: <http://localhost:8000/docs>
- Đổi cổng backend thì sửa biến môi trường `VITE_API_BASE` (xem dưới) thay vì sửa code.

## Chạy frontend (React + Vite)

Frontend dùng **Node.js**. Mở terminal khác:

```bash
cd "d:/study/dự án làm chơi/pacman/frontend"
npm install        # chỉ cần lần đầu
npm run dev
```

Mở trình duyệt: <http://localhost:5173>

- Backend mặc định ở `http://localhost:8000`. Nếu chạy cổng khác, tạo file `frontend/.env` với `VITE_API_BASE=http://localhost:<cổng>`.
- Build bản tĩnh để nộp/deploy: `npm run build` → thư mục `frontend/dist/` (xem thử bằng `npm run preview`).

> Cần **cả hai** tiến trình chạy song song: backend (FastAPI, cổng 8000) + frontend (Vite, cổng 5173).
>
> Bản frontend HTML/JS thuần cũ được giữ tại `frontend-vanilla/` (chạy bằng `py -3.12 -m http.server`) làm dự phòng demo.

---

## Sử dụng giao diện

1. Chọn **Bản đồ** (small / medium / classic).
2. Chọn **Chế độ**:
   - **Tĩnh** — chọn bài toán (*ăn hết food* / *đi tới food gần nhất*), thuật toán và heuristic.
   - **Đối kháng** — chọn Minimax / Alpha-Beta / Expectimax và độ sâu.
3. Bấm **Chạy**: với chế độ tĩnh, các ô được *expand* tô màu dần (minh họa quá trình tìm kiếm), sau đó Pac-man đi theo đường tìm được.
4. **Từng bước / Tạm dừng / Đặt lại** để trình bày khi demo.
5. **So sánh tất cả thuật toán**: chạy mọi thuật toán tĩnh trên cùng bản đồ, đổ bảng số liệu (node expand / time / path / cost).

---

## Kiểm thử

```bash
py -3.12 -m pytest -v
```

23 test phủ: luật chơi (legal actions, transition, ăn food/pellet, va chạm ma), tính đúng/tối ưu của thuật toán (BFS/UCS/IDS/A\* nhất quán path length, A\* với null heuristic = UCS), và API (`/algorithms`, `/maps`, `/solve`, `/compare`, `/adversarial`).

## Thực nghiệm (sinh số liệu cho báo cáo)

```bash
py -3.12 experiments/run_benchmark.py
```

Chạy mọi thuật toán trên các bản đồ, in bảng + ghi `experiments/results.csv` để đưa vào báo cáo.

---

## Cấu trúc thư mục

```
pacman/
├── backend/
│   ├── game/          # state.py, layout.py, rules.py, problem.py
│   ├── search/        # uninformed.py, informed.py, adversarial.py,
│   │                  # heuristics.py, evaluation.py, base.py, registry.py
│   ├── metrics/       # counters.py (đếm node expand, time, path length)
│   ├── api/           # main.py (FastAPI), schemas.py
│   ├── maps/          # small.txt, medium.txt, classic.txt
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── src/           # api.js, render.js, controls.js, game.js
├── experiments/       # run_benchmark.py -> results.csv
├── tests/             # test_rules.py, test_search.py, test_api.py
├── docs/              # PLAN.md (kế hoạch + phân tích state space)
└── README.md
```

## Mô hình hóa bài toán (tóm tắt)

| Thành phần | Mô tả |
|---|---|
| **State** | `(pacman_pos, food còn lại, power_pellets, ghosts, score, scared_timer, status)`; bài tĩnh rút gọn về `(pacman, food)` |
| **Initial state** | nạp từ file layout trong `backend/maps/` |
| **Actions** | UP / DOWN / LEFT / RIGHT (lọc bỏ nước đâm tường) |
| **Transition** | `move_pacman` (tĩnh) / `result_pacman` + `result_ghost` (đối kháng) |
| **Goal test** | ăn hết food (tĩnh) hoặc tới ô đích; terminal = win/lose (đối kháng) |
| **Path cost** | mỗi bước = 1 (cho UCS/A\*) |

Chi tiết phân tích, bảng so sánh ưu/khuyết và kế hoạch xem [docs/PLAN.md](docs/PLAN.md).

## Quy ước ký tự bản đồ

`%` tường · `.` food · `o` power pellet · `P` Pac-man · `G` ma · (khoảng trắng) ô trống.
