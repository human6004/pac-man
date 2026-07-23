# Kịch bản bảo vệ đồ án Pac-man

Tài liệu đối chiếu từ:

- Slide `TTNT_report.pdf` - 15 trang.
- Báo cáo `CT223H_Nhom10.pdf` - 37 trang.
- Source backend, frontend, tests và dữ liệu thực nghiệm hiện có trong repo.

## Việc phải xử lý trước buổi bảo vệ

1. **Slide 7 ghi sai điều kiện đích Eat-all-dots.** Đích đúng là `F = ∅`; Pac-man có thể kết thúc ở bất kỳ ô hợp lệ nào. Không có `(x_goal, y_goal)` cố định. Khi nói, sửa bằng lời. Tốt nhất sửa luôn công thức trên slide.
2. **Slide 13 thiếu cấu hình thực nghiệm.** Dòng `Map: ... | Problem: ... | Heuristic: ...` còn trống. Hai số `41.221` và `114.564` không khớp cấu hình `small/eat_all/farthest_food` trong báo cáo và source hiện tại. Báo cáo dùng `120` và `126` node; source hiện tại tái hiện đúng hai số này. Phải ghi rõ map, số food, bài toán, heuristic, goal và lần chạy tạo biểu đồ; nếu không tái hiện được, thay biểu đồ bằng kết quả `small/eat_all/farthest_food`.
3. **Slide 12 và báo cáo dùng hai trường hợp Pathfinding khác nhau.** Slide 12 khớp source hiện tại khi dùng map `small`, goal mặc định `(6,6)`: BFS `31`, DFS `28`, UCS `32` node; cost tương ứng `10`, `12`, `10`. Báo cáo ghi `26`, `20`, `26` node và cost `14`, `15`, `14`. Không trộn hai bộ số. Gắn cấu hình ngay dưới biểu đồ.
4. **Không kết luận thuật toán nhanh hơn từ chênh lệch dưới 1 ms.** `time_ms` đo bằng `time.perf_counter()` trên một lần chạy. Dùng nó để minh họa; muốn kết luận phải chạy lặp, lấy trung vị, cùng máy và cùng input.
5. **Bullet “graph search” ở slide 14 chưa chuẩn.** Code hiện tại đã tránh trạng thái trùng bằng `explored`, `frontier_keys` hoặc `best_g`, tức đã mang bản chất graph search. Nên đổi thành “Tối ưu graph search và quản lý trạng thái”.
6. **Không demo `medium`, `classic` hoặc script benchmark hiện tại.** Test backend hiện đạt `43/45`; hai lỗi do parser không hỗ trợ ký tự `o`, `G` trong hai map này. `experiments/run_benchmark.py` cũng đang lỗi vì gọi API lớp bài toán theo chữ ký cũ. Frontend test, lint và build đều đạt.

## Mô hình phải nhớ trước khi học từng slide

- **Map** là lưới. **Bài toán tìm kiếm** là đồ thị trạng thái được sinh từ lưới.
- Với Pathfinding, một state chỉ là vị trí Pac-man. Với Eat-all-dots, state là `(vị trí, tập food còn lại)`.
- **State** là cấu hình của bài toán. **Node** còn chứa đường đã đi tới state đó: `parent`, `action`, `g`, `depth`.
- **Frontier/OPEN** chứa node đã sinh nhưng chưa xử lý. Cách lấy node khỏi frontier tạo nên khác biệt giữa BFS, DFS, UCS, Greedy và A*.
- **Generated** là node vừa được tạo. **Expanded** là node được lấy khỏi frontier để sinh node con. **Max frontier** là kích thước frontier lớn nhất, chỉ là chỉ báo nhu cầu bộ nhớ, không phải số RAM thực tế.
- Frontend không chạy thuật toán từng bước. Backend giải xong, trả JSON; frontend dùng `expanded_order` và `path` để replay.

---

## Slide 1 - Trang mở đầu

### 1. Kịch bản nói

“Kính thưa thầy, nhóm em xin trình bày đồ án bài toán Pac-man trong học phần Nền tảng trí tuệ nhân tạo. [Chỉ tay vào tên đề tài] Trọng tâm của nhóm không phải làm lại trò chơi Pac-man hoàn chỉnh, mà dùng mê cung Pac-man để mô hình hóa và trực quan hóa bài toán tìm kiếm. Nhóm cài đặt năm thuật toán gồm BFS, DFS, UCS, Greedy Best-First Search và A*, sau đó so sánh cách chúng tìm lời giải trên cùng điều kiện. [Chỉ tay vào danh sách thành viên] Nhóm gồm ba thành viên như trên slide.”

Nói khoảng 20-25 giây. Không đọc mã số sinh viên quá chậm.

### 2. Giải thích cốt lõi

“AI” trong đề tài là **tìm kiếm trong không gian trạng thái**, không phải Machine Learning. Máy không học từ dữ liệu. Ta mô tả trạng thái, hành động, mục tiêu và chi phí; thuật toán tự tìm chuỗi hành động đưa trạng thái đầu tới đích.

Đóng góp thực tế của project:

- Cùng một mô hình bài toán chạy được năm chiến lược tìm kiếm.
- Có hai loại state để cho thấy độ phức tạp thay đổi mạnh theo cách mô hình hóa.
- Có giao diện replay cây tìm kiếm, đường nghiệm và metrics.

### 3. Bắt mạch giảng viên

**Hỏi:** “Đề tài này có gì là trí tuệ nhân tạo? Có học máy không?”  
**Trả lời:** “Đây là AI cổ điển, cụ thể là search. Hệ thống suy ra chuỗi hành động từ mô hình state-action-goal-cost. Project không dùng Machine Learning vì bài toán đã biết đầy đủ luật và môi trường.”

**Hỏi:** “Điểm chính của nhóm là game hay thuật toán?”  
**Trả lời:** “Thuật toán và cách mô hình hóa. Game chỉ là môi trường trực quan để nhìn được frontier, state expansion, đường nghiệm và sự đánh đổi giữa tối ưu với tốc độ.”

---

## Slide 2 - Nội dung trình bày

### 1. Kịch bản nói

“Phần trình bày gồm năm ý. [Chỉ lần lượt từ mục 1 tới 5] Đầu tiên nhóm giới hạn bài toán và mô hình hóa state. Tiếp theo là nguyên lý năm thuật toán và heuristic. Sau đó nhóm đi qua thiết kế source, kết quả thực nghiệm, cuối cùng là kết luận và hướng phát triển. Mạch chính xuyên suốt là: cùng một bài toán, chỉ thay cách chọn node trong frontier thì hành vi tìm kiếm thay đổi thế nào.”

### 2. Giải thích cốt lõi

Năm phần tạo một chuỗi nhân quả:

`Bài toán` -> `Biểu diễn state` -> `Thuật toán chọn node` -> `Code thực thi` -> `Metrics quan sát được`.

Nếu bị ngắt thời gian, ưu tiên slide 6-13. Đây là phần chứng minh nhóm hiểu bản chất, không chỉ làm UI.

### 3. Bắt mạch giảng viên

**Hỏi:** “Nếu chỉ có một câu để mô tả luồng project?”  
**Trả lời:** “Frontend gửi cấu hình; backend dựng SearchProblem, chạy thuật toán, trả cây, đường đi và metrics; frontend replay kết quả.”

---

## Slide 3 - Pac-man gốc

### 1. Kịch bản nói

“[Chỉ tay vào máy arcade bên trái] Pac-man gốc là một trò chơi có người điều khiển. [Chỉ sang ảnh giữa] Người chơi phản ứng liên tục theo tình huống trên màn hình. [Chỉ sang mê cung bên phải] Nếu giữ nguyên toàn bộ game, ta còn phải xử lý ma, va chạm, điểm số và yếu tố thay đổi theo thời gian. Để tập trung đúng nội dung tìm kiếm, nhóm lấy phần lõi là điều hướng trong mê cung rồi đơn giản hóa thành môi trường tĩnh.”

### 2. Giải thích cốt lõi

Pac-man gốc là bài toán động, có nhiều tác tử và quyết định theo thời gian. Project bỏ các yếu tố đó để có:

- Môi trường **tĩnh**: tường và food không tự thay đổi.
- **Xác định**: cùng state và action luôn cho cùng next state.
- **Quan sát đầy đủ**: thuật toán biết toàn bộ map, tường, food.
- **Một tác tử**: chỉ Pac-man ra quyết định.

Nhờ vậy, bài toán phù hợp BFS/DFS/UCS/Greedy/A*. Nếu thêm ma chủ động, mô hình phải chứa cả vị trí ma và lượt đi; thuật toán có thể chuyển sang Minimax, Alpha-Beta hoặc Expectimax.

### 3. Bắt mạch giảng viên

**Hỏi:** “Tại sao bỏ ma? Như vậy còn là Pac-man không?”  
**Trả lời:** “Nhóm dùng Pac-man làm miền bài toán, nhưng phạm vi học phần ở đây là search một tác tử. Bỏ ma giúp cô lập đúng biến cần so sánh. Nếu giữ ma, bài toán đổi thành tìm kiếm đối kháng hoặc ngẫu nhiên, không còn là phép so sánh công bằng của năm thuật toán này.”

**Hỏi:** “Môi trường của nhóm có đặc tính gì?”  
**Trả lời:** “Tĩnh, xác định, quan sát đầy đủ, rời rạc và một tác tử.”

---

## Slide 4 - Từ trò chơi sang mô hình tìm kiếm

### 1. Kịch bản nói

“[Chỉ hình Pac-man gốc bên trái] Từ trò chơi đầy đủ, nhóm trừu tượng hóa thành một lưới. [Đi theo mũi tên ở giữa] Mỗi ô đi được là một vị trí hợp lệ; tường chặn chuyển động; food là mục tiêu cần thu thập. [Chỉ hình mô phỏng bên phải] Sau bước này, hình ảnh chỉ còn nhiệm vụ minh họa. Phần thuật toán không xử lý pixel, mà xử lý các state và bốn action UP, DOWN, LEFT, RIGHT.”

### 2. Giải thích cốt lõi

Đây là bước **abstraction**. Ta bỏ chi tiết không ảnh hưởng lời giải và giữ dữ liệu đủ để quyết định:

- `Maze`: kích thước và tập ô tường.
- `Position`: cặp `(row, col)`.
- `GameMap`: maze, vị trí đầu, tập food ban đầu.
- `SearchProblem`: state đầu, goal test, actions, transition, step cost.

Thuật toán không cần biết Pac-man được vẽ màu gì. Tách biểu diễn logic khỏi renderer giúp kiểm thử search bằng dữ liệu text, không phụ thuộc giao diện.

### 3. Bắt mạch giảng viên

**Hỏi:** “Từ ma trận sang đồ thị như thế nào?”  
**Trả lời:** “Không cần dựng sẵn adjacency list. Khi mở rộng một state, chương trình thử bốn vector hướng; ô mới nằm trong biên và không phải tường thì tạo cạnh ngầm tới state kế tiếp. Đây là implicit graph.”

**Hỏi:** “Một ô có luôn tương ứng một state không?”  
**Trả lời:** “Chỉ đúng với Pathfinding. Eat-all-dots còn phụ thuộc tập food, nên cùng một ô có thể tương ứng nhiều state khác nhau.”

---

## Slide 5 - Phạm vi bài toán

### 1. Kịch bản nói

“[Chỉ vào mê cung] Nhóm dùng mê cung tĩnh kích thước `R × C`. Pac-man không xuyên tường và mỗi bước chỉ đi sang một ô kề theo bốn hướng. [Chỉ hai bullet giữa] Trên cùng map, nhóm tạo hai bài toán: Pathfinding là đi tới một ô đích; Eat-all-dots là ăn hết toàn bộ food. [Nhấn mạnh hai bullet cuối] Không có ma và không có yếu tố ngẫu nhiên, nên kết quả chỉ phản ánh chiến lược tìm kiếm, không bị nhiễu bởi tác tử khác.”

### 2. Giải thích cốt lõi

Mỗi action có `STEP_COST = 1.0`. Vì vậy:

- Độ dài đường đi bằng tổng cost.
- BFS tối ưu theo số bước.
- UCS tối ưu theo cost và trong project cho cùng cost tối ưu với BFS.
- A* tối ưu khi heuristic hợp lệ.
- DFS và Greedy vẫn có thể tìm được lời giải nhưng không bảo đảm ngắn nhất.

Map được đọc từ file text: `%` là tường, `.` là food, `P` là vị trí đầu, dấu cách là ô trống. Parser kiểm tra map hình chữ nhật, có đúng một `P` và viền kín.

### 3. Bắt mạch giảng viên

**Hỏi:** “Nếu mọi bước đều cost 1 thì cần UCS làm gì?”  
**Trả lời:** “Trong cấu hình hiện tại, UCS là đối chứng theo path cost và kết quả tối ưu tương đương BFS. Giá trị của UCS rõ hơn khi mở rộng bài toán sang địa hình có cost khác nhau; khi đó BFS chỉ tối ưu số bước, không tối ưu tổng cost.”

**Hỏi:** “Tại sao Eat-all-dots khó hơn nếu map không đổi?”  
**Trả lời:** “Vì state không chỉ là ô hiện tại. Nó còn chứa tập food còn lại; số cấu hình tập này tăng theo `2^k` với `k` food.”

---

## Slide 6 - Không gian trạng thái Pathfinding

### 1. Kịch bản nói

“[Chỉ khung trạng thái bên trái] Với Pathfinding, mọi thông tin cần cho một state chỉ là vị trí hiện tại `(row, col)` của Pac-man. Vị trí đầu trên map minh họa là `(1,1)`. Đích là một tham số cố định do người dùng chọn; nếu chưa chọn, chương trình lấy food xa nhất theo Manhattan làm đích mặc định. [Chỉ bốn action] Từ mỗi state, chương trình sinh tối đa bốn action và loại action đâm tường hoặc ra ngoài biên. [Chỉ hình bên phải và lần theo vệt vàng] Goal test đúng khi vị trí hiện tại bằng vị trí đích; vệt vàng là đường nghiệm được truy ngược từ node đích về node gốc.”

### 2. Giải thích cốt lõi

State là `PathState(pacman)`. Goal không cần nằm trong state vì nó không đổi trong suốt một lần chạy; nó là thuộc tính của `PathToPointProblem`.

Không gian trạng thái có cận trên bằng số ô đi được `P`, không phải `R × C`, vì ô tường không tạo state hợp lệ. Mỗi state là immutable dataclass nên dùng trực tiếp trong `set` hoặc `dict` để tránh duyệt lặp.

Node tìm kiếm còn có:

- `parent`: node cha.
- `action`: bước đi từ cha tới node.
- `cost`: `g(n)`.
- `depth`, `nid`.

Khi gặp đích, `reconstruct()` lần theo `parent` về gốc rồi đảo ngược danh sách để lấy path.

### 3. Bắt mạch giảng viên

**Hỏi:** “Tại sao đích không nằm trong state?”  
**Trả lời:** “Vì đích cố định trong một instance của bài toán. Đưa nó vào mỗi state làm lặp dữ liệu mà không phân biệt thêm cấu hình nào. State tối thiểu chỉ cần vị trí Pac-man.”

**Hỏi:** “Tọa độ `(1,1)` có luôn là điểm đầu không?”  
**Trả lời:** “Không. Đó là dữ liệu của map minh họa. Code đọc vị trí ký tự `P`; mọi tọa độ dùng zero-based `(row, col)`.”

---

## Slide 7 - Không gian trạng thái Eat-all-dots

### 1. Kịch bản nói

“[Chỉ công thức state bên trái] Eat-all-dots khác ở chỗ vị trí Pac-man chưa đủ. State phải là `((row,col), F)`, trong đó `F` là tập chính xác các vị trí food còn lại. [Nhấn mạnh vào `F`] Cùng đứng một ô nhưng food đã ăn khác nhau thì nhiệm vụ còn lại khác nhau, nên đó là hai state khác nhau. Khi Pac-man đi tới ô có food, transition tạo state mới và loại ô đó khỏi `F`. [Chỉ hình đường đi bên phải] Đường nghiệm phải đi qua toàn bộ food. Điều kiện đích đúng là `F` rỗng; không yêu cầu Pac-man kết thúc ở một tọa độ cố định.”

Khi nói câu cuối, chủ động sửa lỗi công thức đang có trên slide.

### 2. Giải thích cốt lõi

State là `EatAllDotState(pacman, food)`, trong đó `food` dùng `frozenset`:

- Bất biến, tránh một node vô tình sửa state của node khác.
- Hashable, dùng làm khóa cho `explored` và `best_g`.
- Phép `state.food - {pacman}` tạo tập mới khi Pac-man ăn food.

Nếu có `P` vị trí hợp lệ và `k` food, cận trên state là `P × 2^k`. Đây chỉ là cận trên; nhiều tổ hợp không thể đạt được. Thành phần `2^k` giải thích state explosion.

Không thể chỉ lưu `food_count`. Hai tập còn cùng ba viên nhưng nằm ở vị trí khác nhau dẫn tới chi phí và hành động tương lai khác nhau.

### 3. Bắt mạch giảng viên

**Hỏi:** “Trạng thái đích có phải `((x_goal,y_goal),∅)` như slide không?”  
**Trả lời:** “Không. Dòng đó trên slide cần sửa. Code kiểm `not state.food`; vị trí cuối tùy viên food được ăn sau cùng. Tập goal là mọi state `((r,c),∅)` với `(r,c)` hợp lệ.”

**Hỏi:** “Tại sao không dùng số food còn lại làm state key?”  
**Trả lời:** “Số lượng không giữ vị trí. Hai state cùng vị trí Pac-man và cùng số food nhưng food nằm khác chỗ không có cùng bài toán con; gộp chúng sẽ loại nhầm đường đi hợp lệ.”

---

## Slide 8 - BFS, DFS, UCS

### 1. Kịch bản nói

“Ba thuật toán này dùng cùng state, action và goal test; khác nhau chủ yếu ở cách lấy node khỏi frontier. [Chỉ cột BFS] BFS dùng queue FIFO nên lan theo từng lớp độ sâu. Với cost mỗi bước bằng 1, lời giải đầu tiên có ít bước nhất. [Chỉ cột DFS] DFS dùng stack LIFO nên đi sâu một nhánh trước; có thể gặp đích sớm nhưng đường chưa chắc ngắn. [Chỉ cột UCS] UCS dùng priority queue theo `g(n)`, luôn lấy đường có tổng cost nhỏ nhất. Với cost không âm, khi goal được lấy khỏi queue thì đó là lời giải tối ưu.”

### 2. Giải thích cốt lõi

**BFS trong code**

- Frontier: `collections.deque`.
- Lấy node: `popleft()`.
- `explored` được đánh dấu ngay khi state được sinh, nên state chỉ vào queue một lần.
- Goal được kiểm ngay khi sinh node con. Vì vậy goal có thể không được cộng vào `nodes_expanded`.

**DFS trong code**

- Frontier: Python `list`, lấy bằng `pop()`.
- Dùng cả `explored` và `frontier_keys` để tránh state trùng.
- Có `depth_limit` tùy chọn.
- Kết quả phụ thuộc thứ tự action. Enum sinh `UP, DOWN, LEFT, RIGHT`; do stack LIFO, action hợp lệ được đẩy sau thường được xét trước.

**UCS trong code**

- Frontier: `heapq` chứa `(g, counter, node)`.
- `counter` phá hòa khi hai node cùng cost, tránh Python phải so trực tiếp `Node`.
- `best_g[state]` lưu đường rẻ nhất đã biết.
- Node cũ còn trong heap được bỏ qua khi `g > best_g[state]`; đây là lazy deletion.

Khi mọi cost bằng 1, BFS và UCS bảo đảm cùng cost tối ưu, nhưng không nhất thiết cùng thứ tự hoặc cùng số node vì tie-breaking và thời điểm goal test khác nhau.

### 3. Bắt mạch giảng viên

**Hỏi:** “BFS và UCS đều cost 1, tại sao số node vẫn khác?”  
**Trả lời:** “Bảo đảm lý thuyết chỉ nói cùng cost tối ưu, không nói implementation phải mở rộng đúng cùng node. Code BFS kiểm goal lúc sinh; UCS kiểm lúc pop khỏi heap. Thứ tự hòa cũng khác. Vì vậy slide có BFS 31 và UCS 32.”

**Hỏi:** “DFS có đầy đủ không?”  
**Trả lời:** “Trong graph hữu hạn của project, có kiểm tra state đã xét và không đặt depth limit quá nhỏ, DFS sẽ tìm được nếu có lời giải. DFS tree search trên không gian vô hạn thì không bảo đảm.”

---

## Slide 9 - Greedy và A*

### 1. Kịch bản nói

“Hai thuật toán này được thêm thông tin định hướng qua heuristic. [Chỉ khung Greedy] Greedy chỉ nhìn `h(n)`, tức ước lượng còn bao xa. Nó thường lao nhanh về state có vẻ gần mục tiêu, nhưng bỏ qua quãng đường đã đi nên có thể chọn đường vòng. [Chỉ khung A* và lần theo công thức] A* dùng `f(n)=g(n)+h(n)`: `g` giữ trách nhiệm với chi phí đã trả, `h` định hướng phần còn lại. Vì phải cân bằng cả hai, A* có thể mở rộng nhiều node hơn Greedy nhưng đổi lại có bảo đảm tối ưu khi heuristic hợp lệ và cách quản lý state trùng đúng.”

### 2. Giải thích cốt lõi

Greedy dùng heap theo `(h, counter, node)`. Nó có `explored` và `frontier_states`, nhưng không tìm cách cải thiện `g` vì `g` không tham gia tiêu chí ưu tiên.

A* dùng heap theo `(g+h, counter, node)` và `best_g`:

1. Pop node có `f` nhỏ nhất.
2. Bỏ node stale nếu cost lớn hơn `best_g`.
3. Với mỗi successor, chỉ push nếu `new_g` tốt hơn.
4. Goal chỉ được chấp nhận khi được pop khỏi frontier.

Code cho phép một state được push lại nếu tìm thấy đường rẻ hơn. Các heuristic hiện đăng ký đều admissible; với unit cost, chúng cũng có hành vi nhất quán phù hợp.

Trường hợp đặc biệt: `h=0` làm A* trở thành UCS về tiêu chí ưu tiên.

### 3. Bắt mạch giảng viên

**Hỏi:** “Admissible nghĩa là gì?”  
**Trả lời:** “Heuristic không bao giờ lớn hơn chi phí còn lại thật: `h(n) ≤ h*(n)`. Nó được phép đánh giá thấp, không được phóng đại. Nhờ vậy A* không bỏ qua lời giải tối ưu vì một ước lượng quá cao.”

**Hỏi:** “Tại sao Greedy nhanh hơn nhưng không tối ưu?”  
**Trả lời:** “Greedy tối thiểu hóa riêng `h`. Một node có `h` nhỏ có thể đã tốn `g` rất lớn để tới đó. A* cộng cả hai nên tránh đánh đổi phần đường đã đi một cách mù quáng.”

---

## Slide 10 - Heuristic

### 1. Kịch bản nói

“[Chỉ danh sách bên trái] Giao diện cho phép chọn nhiều heuristic để quan sát ảnh hưởng. [Chỉ công thức Manhattan trên cùng] Với Pathfinding, nhóm dùng khoảng cách Manhattan tới đích. [Chỉ ba công thức dưới] Với Eat-all-dots, nhóm có khoảng cách tới food gần nhất, food xa nhất và số food còn lại. Heuristic mặc định là khoảng cách Manhattan tới viên xa nhất vì muốn ăn hết thì ít nhất cũng phải tiếp cận viên đó. [Nhấn mạnh] Các hàm này cố ý bỏ qua tường hoặc nhiều chặng, nên là cận dưới: tính rẻ, bảo toàn tối ưu của A*, nhưng chưa thật mạnh.”

### 2. Giải thích cốt lõi

**Manhattan:** `|r-rg| + |c-cg|`. Pac-man đi bốn hướng; mỗi bước chỉ thay đổi Manhattan tối đa 1. Bỏ qua tường chỉ làm khoảng cách ước lượng ngắn hơn hoặc bằng đường thật, nên admissible.

**Nearest food:** khoảng cách tới food gần nhất. Admissible nhưng yếu vì mới tính bước đầu tiên của hành trình ăn hết.

**Farthest food:** khoảng cách tới food xa nhất. Muốn hoàn tất phải tới cả viên xa nhất, nên đây là cận dưới. Nó luôn lớn hơn hoặc bằng nearest trên cùng state, nhưng vẫn bỏ qua chi phí nối nhiều food.

**Food count:** `|F|`. Mỗi bước ăn tối đa một food, nên cần ít nhất `|F|` bước nếu food tại ô hiện tại đã được loại khỏi state.

**Null:** luôn bằng 0, dùng làm baseline; A* với null suy biến thành UCS.

Mỗi heuristic food duyệt tập `F`, chi phí tính khoảng `O(|F|)`. Maze distance chặt hơn Manhattan vì xét tường, nhưng tính BFS khoảng cách nhiều lần sẽ đắt; cần cache hoặc tiền xử lý. Heuristic MST có thể ước lượng chi phí nối toàn bộ food tốt hơn, đổi lại tốn thêm chi phí tính cây khung.

API còn tự sửa lựa chọn không tương thích: Manhattan cho Eat-all-dots được đổi sang farthest food; food heuristic cho Pathfinding được đổi sang Manhattan. Mục đích là tránh Greedy/A* âm thầm nhận `h=0`.

### 3. Bắt mạch giảng viên

**Hỏi:** “Tại sao Manhattan admissible dù có tường?”  
**Trả lời:** “Manhattan giải bài toán thư giãn bỏ tường. Tường chỉ buộc đường thật dài thêm, không thể làm đường thật ngắn hơn số bước ngang cộng dọc tối thiểu.”

**Hỏi:** “Farthest food có phải chi phí ăn hết không?”  
**Trả lời:** “Không. Nó chỉ là cận dưới tới một viên xa nhất, chưa cộng hành trình qua các viên khác. Vì vậy nó an toàn cho A* nhưng còn yếu; MST cộng cấu trúc nối nhiều food sẽ mạnh hơn.”

---

## Slide 11 - Thiết kế và cài đặt

### 1. Kịch bản nói

“[Chỉ từng hàng của bảng từ trên xuống] Source được tách theo đúng các thành phần của SearchProblem. Map text được parse thành `Maze` và tọa độ. Hai lớp state phục vụ Pathfinding và Eat-all-dots. Problem định nghĩa state đầu, goal test, action, transition và step cost. Năm thuật toán chỉ phụ thuộc giao diện chung này, nên không cần biết chi tiết map được vẽ thế nào. [Chỉ hàng đánh giá] Mọi thuật toán trả cùng một `SearchResult`, gồm path, cây tìm kiếm và các metrics. [Nhấn mạnh luồng] Frontend React gửi `POST /solve` hoặc `/compare`; backend FastAPI tính xong rồi trả JSON để frontend replay.”

### 2. Giải thích cốt lõi

Luồng thật khi bấm Run:

1. `App.jsx` và `useRunner.js` lấy cấu hình map, problem, algorithm, heuristic, goal.
2. `api/client.js` gửi JSON tới FastAPI.
3. `layout.py` đọc map thành `GameMap`.
4. `api/main.py` dựng `PathToPointProblem` hoặc `EatAllDotProblem`.
5. `registry.py` ánh xạ tên thuật toán sang hàm.
6. Search chạy, `SearchMetrics` đếm và `TreeRecorder` ghi node.
7. Backend trả `path`, `tree`, `stats`.
8. Frontend Canvas vẽ map/path; SVG vẽ cây; UI replay theo `expanded_order`.

Tách lớp giúp kiểm thử độc lập. Thuật toán chỉ cần `initial_state`, `is_goal`, `actions`, `result`, `step_cost`; muốn thêm problem mới không cần sửa năm thuật toán.

`TreeRecorder` hiện cap **500 node được ghi**, nhưng search vẫn tiếp tục. Cap bảo vệ payload và UI, không thay đổi lời giải. Vì recorder ưu tiên node được tạo sớm, cây hiển thị có thể bị cắt trước khi chứa goal ở bài lớn; UI phải hiện `tree_truncated`.

### 3. Bắt mạch giảng viên

**Hỏi:** “Frontend có chạy thuật toán từng bước không?”  
**Trả lời:** “Không. Backend giải toàn bộ trước. Frontend chỉ replay dữ liệu node theo `expanded_order` và sau đó animate `path`. Cách này đơn giản và giữ logic thuật toán ở một nơi.”

**Hỏi:** “Tại sao cần `frozen=True` và `frozenset`?”  
**Trả lời:** “State phải bất biến và hashable để làm khóa trong `set`/`dict`. Nếu sửa state sau khi đã đưa vào hash table, duplicate detection và `best_g` có thể sai.”

---

## Slide 12 - So sánh tìm kiếm mù

### 1. Kịch bản nói

“Biểu đồ này là một lần chạy trên map `small`, bài toán Pathfinding, goal mặc định là food xa nhất tại `(6,6)`. [Chỉ biểu đồ node phía trên] DFS mở rộng 28 node, ít hơn BFS 31 và UCS 32. Tuy nhiên số node ít chưa có nghĩa lời giải tốt hơn. Trong cấu hình này, DFS cho đường 12 bước; BFS và UCS đều cho đường tối ưu 10 bước. [Chỉ biểu đồ thời gian phía dưới] Ba thời gian đều dưới 1 ms và chênh lệch rất nhỏ, nên nhóm chỉ xem đây là số tham khảo trên máy chạy, không dùng để khẳng định thuật toán nào nhanh hơn nói chung. [Nhấn mạnh phần kết luận bên phải] Kết quả phù hợp lý thuyết: DFS có thể gặp đích sớm nhưng không bảo đảm tối ưu; BFS và UCS tối ưu khi cost mỗi bước bằng 1.”

### 2. Giải thích cốt lõi

Source hiện tại tái hiện:

- BFS: expanded `31`, cost `10`, path length `10`.
- DFS: expanded `28`, cost `12`, path length `12`.
- UCS: expanded `32`, cost `10`, path length `10`.

BFS và UCS lệch đúng một expanded node vì metrics không hoàn toàn cùng điểm dừng:

- BFS kiểm goal khi **sinh** child, nên trả về trước khi gọi `metrics.expand()` cho goal.
- UCS kiểm goal khi **pop** node, nên goal được tính là expanded.

Vì vậy không được diễn giải chênh lệch 31/32 là ưu thế bản chất của BFS. So sánh cost vẫn hợp lệ; so sánh expanded cần chuẩn hóa goal-test convention nếu làm thực nghiệm nghiêm ngặt.

Thời gian dưới 1 ms chịu nhiễu mạnh từ scheduler, cache và overhead Python. Chỉ số node ổn định hơn thời gian trên bài nhỏ.

### 3. Bắt mạch giảng viên

**Hỏi:** “DFS ít node nhất, tại sao không chọn DFS?”  
**Trả lời:** “Vì mục tiêu không chỉ là tìm thấy mà còn là tối ưu. Ở run này DFS tiết kiệm ba node nhưng đường dài hơn hai bước. Trên map khác, thứ tự action có thể làm DFS đi vòng lớn hơn nhiều.”

**Hỏi:** “BFS và UCS cùng cost 1, vì sao 31 với 32?”  
**Trả lời:** “BFS dừng lúc sinh goal, UCS dừng lúc pop goal. Goal vì thế không được tính expanded ở BFS nhưng được tính ở UCS. Đây là khác biệt đo lường của implementation, không phải khác biệt tối ưu.”

---

## Slide 13 - So sánh tìm kiếm có thông tin

### 1. Kịch bản nói

Chỉ dùng kịch bản sau sau khi đã điền đúng metadata và xác nhận lại số liệu:

“Cả hai thuật toán chạy trên cùng map, cùng state đầu, cùng tập food và cùng heuristic farthest food. [Chỉ biểu đồ node] Greedy mở rộng ít state hơn vì chỉ đuổi theo `h` thấp. [Chỉ biểu đồ thời gian] Trong lần chạy này, lượng công việc ít hơn cũng làm Greedy hoàn thành sớm hơn. A* phải xét cả chi phí đã đi `g` và ước lượng `h`, nên mở rộng nhiều state hơn để bảo vệ chất lượng lời giải. [Nhấn mạnh bullet bên phải] Kết luận đúng phạm vi là: Greedy ưu tiên tốc độ nhưng không bảo đảm tối ưu; A* bảo đảm tối ưu vì heuristic đang dùng là admissible. Không kết luận tỷ lệ nhanh hơn này đúng cho mọi map.”

Nếu giữ cấu hình khớp báo cáo/source hiện tại, nói số:

“Trên `small`, Eat-all-dots, `farthest_food`, Greedy mở rộng 120 state và cho cost 20; A* mở rộng 126 state nhưng cho cost tối ưu 14.”

Không đọc số `41.221/114.564` nếu chưa có map và log tái hiện.

### 2. Giải thích cốt lõi

Greedy và A* dùng cùng heuristic nhưng tối ưu hai tiêu chí khác nhau:

- Greedy chọn `min h`; nó có thể giảm `h` nhanh bằng một đường đã tốn nhiều `g`.
- A* chọn `min(g+h)`; nó giữ nhiều lựa chọn cạnh tranh hơn, nên thường tốn thêm node nhưng có cơ sở tối ưu.

Số liệu báo cáo/current source với map `small` và 5 food:

- Greedy: expanded `120`, path cost `20`.
- A*: expanded `126`, path cost `14`.

Slide đang hiển thị một run lớn hơn nhiều: Greedy `41.221`, A* `114.564`. Với source hiện tại, UI chỉ expose `tiny` 3 food và `small` 5 food; hai số này không thể đến từ hai map đang expose vì cận trên state quá nhỏ. Có thể đây là map cũ/custom có khoảng 15 food. Phải giữ bằng chứng cấu hình hoặc thay chart.

Chart expanded/time không tự chứng minh A* tối ưu. Bằng chứng đến từ điều kiện lý thuyết và việc kiểm cost với một baseline tối ưu như BFS/UCS trên input đủ nhỏ.

### 3. Bắt mạch giảng viên

**Hỏi:** “Tại sao A* thông minh hơn mà lại mở rộng nhiều node hơn Greedy?”  
**Trả lời:** “Thông minh ở đây không đồng nghĩa luôn ít node hơn. A* giải bài toán khó hơn: tìm lời giải tối ưu. Greedy chấp nhận đường bất kỳ có vẻ gần đích, nên có thể dừng sớm hơn nhưng cost cao hơn.”

**Hỏi:** “Số 41.221 và 114.564 đến từ cấu hình nào?”  
**Trả lời an toàn chỉ khi có log:** “Map ..., `k=...` food, problem `eat_all`, heuristic `farthest_food`, cùng máy và cùng lần chạy.”  
Nếu chưa có log, phải sửa slide trước buổi bảo vệ; không bịa cấu hình.

---

## Slide 14 - Kết luận và hướng phát triển

### 1. Kịch bản nói

“[Chỉ khung Đạt được] Nhóm đã hoàn thành hai bài toán trên cùng nền tảng, cài đặt năm thuật toán và expose hai map demo là `tiny` và `small`. Chương trình trả đường nghiệm, replay thứ tự mở rộng, vẽ cây và đo cost, node, max frontier cùng thời gian. [Chỉ khung Hướng phát triển] Hướng gần nhất là heuristic mạnh hơn như maze distance hoặc MST để giảm state expansion trong Eat-all-dots. Map editor cần đi kèm validation. Nếu thêm ma và đa tác tử, nhóm phải mở rộng state và chuyển sang tìm kiếm đối kháng; đây không chỉ là thêm một hình ma vào giao diện. [Nhấn mạnh] Core hiện tại đã có duplicate-state detection; phần graph search tương lai nên hiểu là tối ưu lưu trữ và trực quan hóa OPEN/CLOSED.”

### 2. Giải thích cốt lõi

Những gì thực sự đã có:

- Hai problem: `path_to_cell`, `eat_all`.
- Năm thuật toán: BFS, DFS, UCS, Greedy, A*.
- Heuristic registry: null, Manhattan, nearest, farthest, food count.
- API: `/algorithms`, `/maps`, `/maps/{name}`, `/solve`, `/compare`.
- Metrics: expanded, generated, max frontier, time, path length, cost, search depth.
- Replay cây bị cap 500 node ghi hình; search không bị cap theo 500.

Hướng phát triển và bản chất:

- **Maze distance:** dùng shortest-path distance thật giữa hai ô tĩnh; chặt hơn Manhattan nhưng cần cache.
- **MST heuristic:** nối toàn bộ food bằng cây khung nhỏ nhất rồi cộng khoảng cách Pac-man tới tập food; phản ánh bài toán nhiều mục tiêu tốt hơn.
- **Map editor/import:** cần kiểm kích thước, ký tự, một Pac-man, viền, tính reachable và số food an toàn.
- **Ghost/multi-agent:** state tăng thêm vị trí ma và lượt; goal/cost thay đổi; dùng Minimax/Alpha-Beta/Expectimax hoặc planning dưới bất định.
- **Scaling:** có timeout/cancel ở backend, memory profiling, benchmark lặp và heuristic cache.

### 3. Bắt mạch giảng viên

**Hỏi:** “Project đã là graph search chưa?”  
**Trả lời:** “Về thuật toán, có. BFS/DFS dùng tập state đã xét; UCS/A* dùng `best_g` và bỏ node stale. Bullet tương lai nên gọi chính xác là tối ưu graph search, quản lý OPEN/CLOSED và bộ nhớ.”

**Hỏi:** “Thêm ma có dùng tiếp A* được không?”  
**Trả lời:** “Nếu quỹ đạo ma biết trước, có thể đưa thời gian/vị trí ma vào state rồi planning. Nếu ma ra quyết định đối kháng hoặc ngẫu nhiên, A* đơn tác tử không đủ; cần mô hình game tree như Minimax, Alpha-Beta hoặc Expectimax.”

---

## Slide 15 - Cảm ơn

### 1. Kịch bản nói

“Phần trình bày của nhóm em xin kết thúc. Nếu tóm tắt trong một câu: cùng một mô hình Pac-man, cách tổ chức frontier và chất lượng heuristic quyết định sự đánh đổi giữa lượng tìm kiếm và độ tối ưu của lời giải. Nhóm em cảm ơn thầy và xin nhận câu hỏi.”

Sau câu cuối, dừng. Không tiếp tục tự giải thích khi chưa có câu hỏi.

### 2. Giải thích cốt lõi

Ba câu neo trí nhớ trước Q&A:

1. Pathfinding state là vị trí; Eat-all-dots state là vị trí cộng tập food.
2. Năm thuật toán khác chủ yếu ở tiêu chí lấy node khỏi frontier.
3. Greedy thường làm ít việc hơn nhưng không bảo đảm tối ưu; A* dùng `g+h`, tối ưu với heuristic admissible.

### 3. Bắt mạch giảng viên

**Hỏi:** “Nếu chỉ được chọn một thuật toán cho project?”  
**Trả lời:** “Không có lựa chọn đúng cho mọi yêu cầu. Pathfinding unit-cost nhỏ dùng BFS đơn giản và tối ưu. Eat-all-dots cần tối ưu thì A* với heuristic tốt; ưu tiên tốc độ và chấp nhận đường dài hơn thì Greedy.”

**Hỏi:** “Hạn chế lớn nhất hiện tại?”  
**Trả lời:** “Heuristic Eat-all-dots còn yếu và thực nghiệm chưa được chuẩn hóa nhiều lần trên nhiều map. State explosion vẫn là nút thắt; UI cap cây chỉ giảm tải hiển thị, không giảm chi phí search.”

---

## Bộ câu hỏi kỹ thuật tổng hợp dễ bị hỏi bất ngờ

### “Search tree khác state graph thế nào?”

State graph có một đỉnh cho mỗi cấu hình. Search node còn ghi một đường cụ thể tới state qua `parent`, `action`, `g`. Nhiều node có thể đại diện cùng state qua các đường khác nhau; `explored` hoặc `best_g` giúp graph search loại hoặc cập nhật chúng.

### “Tại sao A* phải kiểm goal lúc pop, không phải lúc generate?”

Node goal vừa sinh chưa chắc có `g` tốt nhất; frontier có thể còn đường rẻ hơn chưa được pop. Khi goal được pop với ưu tiên nhỏ nhất dưới điều kiện heuristic phù hợp, mới có cơ sở kết luận tối ưu.

### “Heuristic càng lớn càng tốt?”

Không vô điều kiện. Trong nhóm heuristic admissible, giá trị chặt hơn thường giảm expansion. Nếu lớn do overestimate, A* có thể mất bảo đảm tối ưu. Còn phải tính chi phí tính heuristic; heuristic giảm node nhưng quá đắt vẫn có thể chạy chậm.

### “Max frontier có phải RAM không?”

Không. Nó là số node chờ lớn nhất, chỉ phản ánh xu hướng bộ nhớ. RAM thật còn phụ thuộc kích thước state, node, Python object, tree recorder và response JSON. Project chưa đo peak RAM.

### “Vì sao TreeRecorder cap 500 nhưng chart có hàng chục nghìn expanded?”

Metrics đếm toàn bộ search; recorder chỉ lưu tối đa 500 node để gửi UI. Khi cap, search vẫn tiếp tục và `tree_truncated=true`. Vì vậy chart có thể lớn hơn nhiều cây nhìn thấy.

### “Kết quả thời gian có tái lập không?”

Chỉ tái lập tương đối nếu cùng input, source, máy và tải hệ thống. Muốn báo cáo định lượng: warm-up, chạy ít nhất 5 lần, dùng median, ghi Python/CPU và tắt tree recording nếu muốn đo riêng thuật toán.

## Kịch bản demo 3 phút nếu giảng viên yêu cầu chạy chương trình

1. Chọn `small`, `path_to_cell`, goal `(6,6)`. Chạy BFS rồi DFS. Chỉ cost `10` và `12`; nói “ít node không đồng nghĩa tối ưu”.
2. Chuyển `small`, `eat_all`, `farthest_food`. So sánh Greedy với A*. Chỉ cost `20` và `14`; nói “Greedy ưu tiên h, A* cân bằng g+h”.
3. Mở search tree. Chỉ OPEN/CURRENT/CLOSED, `g/h/f`, sau đó nói rõ đây là replay từ JSON backend.
4. Không demo `medium`, `classic` hoặc chạy benchmark cho tới khi hai phần này được sửa.

