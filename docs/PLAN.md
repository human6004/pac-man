# Kế hoạch đồ án: Phân tích không gian trạng thái Pac-man & các thuật toán tìm kiếm

## Context (Bối cảnh)

Đây là đồ án môn **Trí tuệ nhân tạo**. Đề bài yêu cầu: *phân tích không gian trạng thái bài toán Pac-man, dùng các giải thuật tìm kiếm mù và tìm kiếm có thông tin để giải, có so sánh ưu/khuyết điểm; không giới hạn ngôn ngữ.* Tài liệu kèm theo về Adversarial Search (Minimax, Alpha-Beta, Depth-limited, Evaluation function) cho phép mở rộng sang nhóm thuật toán đối kháng — đây là điểm cộng học thuật.

- **Mục tiêu kép:** vừa có **demo chạy được, trực quan** (để demo cho giảng viên), vừa có **nội dung học thuật đầy đủ** (để viết báo cáo).
- **Ràng buộc:** nhóm 2-3 người, thời gian ~1-2 tháng, ưu tiên **Python backend + web frontend**, kiến trúc tách backend/frontend.
- **Stack đã chọn:** Python (FastAPI) backend + Web frontend (HTML5 Canvas thuần).

---

## 1. Phân tích bài toán Pac-man theo không gian trạng thái

### 1.1. State (Trạng thái)
| Thành phần | Mô tả | Kiểu dữ liệu |
|---|---|---|
| `pacman_pos` | Vị trí Pac-man trên lưới | `(row, col)` |
| `ghosts` | Vị trí + hướng từng con ma | `list[(row, col, dir)]` |
| `walls` | Tường (cố định theo bản đồ) | grid bất biến |
| `food` | Tập ô còn thức ăn | `frozenset[(r,c)]` |
| `power_pellets` | Tập viên năng lượng còn lại | `frozenset[(r,c)]` |
| `scared_timer` | Số bước ma còn "sợ" | `int` |
| `score` | Điểm hiện tại | `int` |
| `status` | `playing / win / lose` | enum |

> **2 chế độ bài toán:**
>
> - **Tĩnh (single-agent search):** không có ma di chuyển. State rút gọn `(pacman_pos, food còn lại)`. Dùng BFS/DFS/UCS/IDS/Greedy/A*.
> - **Đối kháng (adversarial):** có ma di chuyển. Dùng Minimax/Alpha-Beta/Expectimax.

### 1.2. Initial state
Nạp từ file layout: Pac-man ở vị trí xuất phát, food + power pellet còn nguyên, ma ở vị trí ban đầu, `score = 0`, `scared_timer = 0`, `status = playing`.

### 1.3. Actions
`{UP, DOWN, LEFT, RIGHT}` + tùy chọn `STOP`. Chỉ action không đâm tường mới hợp lệ (`getLegalActions(s)`).

### 1.4. Transition model `result(s, a) -> s'`

- Pac-man di chuyển 1 ô theo `a`.
- Ô mới có food → bỏ khỏi `food`, `score += 10`.
- Ô mới có power pellet → bỏ khỏi `power_pellets`, `scared_timer = N`, `score += 50`.
- (Đối kháng) ma di chuyển; trùng ô ma: ma sợ → ăn ma (+200); ma thường → `lose`.
- Giảm `scared_timer` mỗi bước.

### 1.5. Goal test / Terminal test
- **Tĩnh:** goal = `food` rỗng. Biến thể đơn giản: tới 1 điểm đích / food gần nhất.
- **Đối kháng:** terminal = win (hết food) / lose (bị ăn) / đạt depth-limit.

### 1.6. Path cost / Score / Utility
- **Path cost (UCS/A*):** mỗi bước = 1 (hoặc cao hơn cho ô nguy hiểm).
- **Score:** cộng điểm food/pellet/ma.
- **Utility (Minimax):** thắng = điểm lớn, thua = điểm âm lớn; nút bị cắt sâu dùng **evaluation function**.

### 1.7. Kích thước không gian trạng thái & độ khó
- Tổng ≈ `P × 2^F × P^k` (P ô đi được, F ô food, k con ma).
- Bản đồ 20×11 ~80 food → `2^80` ≈ 10^24 → không thể duyệt toàn bộ.
- Khó vì: bùng nổ tổ hợp food; ma là tác nhân động; cân bằng ăn điểm vs tránh chết.

---

## 2. Các thuật toán cần triển khai

### A. Tìm kiếm mù
| Thuật toán | Vai trò |
|---|---|
| **BFS** | Đường ngắn nhất theo số bước |
| **DFS** | Duyệt sâu, không tối ưu, ít bộ nhớ |
| **UCS** | Tối ưu theo path cost |
| **IDS** | BFS tối ưu + DFS ít bộ nhớ |

### B. Tìm kiếm có thông tin
| Thuật toán | Heuristic |
|---|---|
| **Greedy** | Manhattan tới food gần nhất |
| **A\*** | `f = g + h` |

Heuristic: Manhattan tới đích; tới food gần nhất; số food còn lại; khoảng cách tới ma (phạt); Manhattan tới food xa nhất (admissible cho bài "ăn hết food").

### C. Tìm kiếm đối kháng
| Thuật toán | Mô tả |
|---|---|
| **Minimax** | Pac-man=MAX, ma=MIN |
| **Alpha-Beta** | Minimax + cắt tỉa |
| **Depth-limited** | Giới hạn độ sâu + eval (resource limits) |
| **Expectimax** | Ma đi ngẫu nhiên → chance node |

`eval(s) = score - w1·dist_food_gần - w2·số_food + w3·dist_ma(nếu không sợ) + w4·số_ma_sợ_trong_tầm`

---

## 3. Bảng so sánh ưu/khuyết điểm

| Thuật toán | Complete? | Optimal? | Time | Space | Heuristic? | Phù hợp |
|---|---|---|---|---|---|---|
| BFS | Có | Có (cost đều) | O(b^d) | O(b^d) | Không | Pac-man tĩnh |
| DFS | Không | Không | O(b^m) | O(b·m) | Không | Minh họa, ít bộ nhớ |
| UCS | Có | Có | O(b^(1+C*/ε)) | Lớn | Không | Cost ô khác nhau |
| IDS | Có | Có (cost đều) | O(b^d) | O(b·d) | Không | Tối ưu + ít bộ nhớ |
| Greedy | Không | Không | O(b^m) | O(b^m) | Có | Nhanh, chấp nhận không tối ưu |
| A\* | Có | Có (h admissible) | Phụ thuộc h | Lớn | Có | Tốt nhất cho Pac-man tĩnh |
| Minimax | Có (cây hữu hạn) | Tối ưu nếu ma tối ưu | O(b^m) | O(b·m) | (eval) | Ma đối kháng, cây nhỏ |
| Alpha-Beta | Như Minimax | Như Minimax | O(b^(m/2)) tốt nhất | O(b·m) | (eval) | Ma đối kháng, sâu hơn |
| Depth-limited | Không | Không | O(b^limit) | O(b·limit) | Có | Real-time |
| Expectimax | Có | Tối ưu kỳ vọng | O(b^m) | O(b·m) | (eval) | Ma ngẫu nhiên |

---

## 4. Công nghệ: Python (FastAPI) + Web Canvas
Thuật toán Python rõ ràng dễ chấm điểm; `pytest` đơn giản; FastAPI tự sinh Swagger `/docs`; Canvas cho animation Pac-man và dễ trình chiếu.

---

## 5. Kiến trúc hệ thống

### Backend (Python/FastAPI)
- `game/` — `state.py`, `layout.py`, `rules.py`, `problem.py`
- `search/` — `uninformed.py`, `informed.py`, `adversarial.py`, `heuristics.py`, `evaluation.py`
- `metrics/` — đếm node, thời gian, độ dài path, score
- `api/` — FastAPI routes

### Frontend
- Canvas maze + Pac-man + ma + food
- Panel: chọn thuật toán/bản đồ, Start/Pause/Reset/Step
- Panel thống kê: nodes expanded, time, path length, score
- Chế độ so sánh

### API
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/algorithms` | Danh sách thuật toán |
| GET | `/maps` | Danh sách bản đồ |
| POST | `/solve` | Chạy 1 thuật toán, trả path + stats |
| POST | `/compare` | Chạy nhiều thuật toán, bảng so sánh |

Request `/solve`: `{ "map": "small", "algorithm": "astar", "heuristic": "manhattan", "mode": "static" }`

Response: `{ "path": [...], "visited_order": [...], "stats": {...}, "status": "win" }`

---

## 6. UI Pac-man
Maze grid, tường xanh dương; Pac-man animation mở miệng; ma 4 màu; food chấm nhỏ, pellet chấm lớn; tô màu ô đã expand để minh họa tìm kiếm; panel điều khiển + thống kê + so sánh.

---

## 7. Timeline (~6-7 tuần)
| GĐ | Tuần | Việc | Kết quả |
|---|---|---|---|
| 1 | T1 | Lý thuyết + state space | Phân tích + SearchProblem |
| 2 | T2-3 | Backend thuật toán | Thuật toán + metrics |
| 3 | T3-4 | Frontend Pac-man | UI + animate |
| 4 | T5 | Tích hợp BE/FE | Demo e2e |
| 5 | T6 | Thực nghiệm + so sánh | Bảng + biểu đồ |
| 6 | T7 | Báo cáo + demo | Báo cáo hoàn chỉnh |

Chia việc: A=backend+test, B=frontend+animation, C=tích hợp+thực nghiệm+báo cáo.

---

## 8. Cấu trúc thư mục
```
pacman/
├── backend/
│   ├── game/          # state.py, layout.py, rules.py, problem.py
│   ├── search/        # uninformed.py, informed.py, adversarial.py, heuristics.py, evaluation.py
│   ├── metrics/       # counters.py
│   ├── api/           # main.py, schemas.py
│   ├── maps/          # small.txt, medium.txt, classic.txt
│   └── requirements.txt
├── frontend/          # index.html, src/, assets/
├── experiments/       # run_benchmark.py, results.csv
├── docs/              # PLAN.md, report/
├── tests/             # test_search.py, test_rules.py
└── README.md
```

---

## 9. Cấu trúc báo cáo
1. Giới thiệu Pac-man 2. Cơ sở lý thuyết AI search 3. Mô hình hóa state space 4. Tìm kiếm mù 5. Tìm kiếm có thông tin 6. Tìm kiếm đối kháng 7. Thiết kế hệ thống 8. Kết quả thực nghiệm 9. Bảng so sánh 10. Kết luận & hướng phát triển

---

## 10. Phạm vi thực tế
- 2-3 bản đồ nhỏ/vừa.
- Bài tĩnh: "tới food gần nhất" + "ăn hết food".
- Đối kháng: 1-2 ma, depth-limit 2-4.
- Ưu tiên demo ổn + minh họa tìm kiếm rõ ràng.

---

## Verification
1. `pytest tests/` — kiểm `legal_actions`, `result`, đáp án BFS/A* trên bản đồ nhỏ.
2. `uvicorn backend.api.main:app --reload` → mở `/docs` test `/solve`, `/compare`.
3. A* với h admissible cho path length = BFS.
4. UI: animate đúng path, tô ô expand, hiển thị stats.
5. `experiments/run_benchmark.py` → `results.csv`.
