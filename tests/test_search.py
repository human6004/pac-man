"""Kiểm thử thuật toán tìm kiếm tĩnh: tính đúng, tính tối ưu, nhất quán.

Chạy: py -3.12 -m pytest tests/test_search.py -v
"""
from backend.game.layout import parse_layout
from backend.game.problem import EatAllFoodProblem, PathToPointProblem, nearest_food
from backend.search.heuristics import (
    farthest_food_dist,
    goal_manhattan,
    nearest_food_dist,
    null_heuristic,
)
from backend.search.informed import astar, greedy
from backend.search.uninformed import bfs, dfs, ids, ucs

# Hành lang thẳng: P tại (1,1), food tại (1,5). Đường tối ưu = 4 bước.
CORRIDOR = """
%%%%%%%
%P...o%
%%%%%%%
"""

# Bản đồ nhỏ có nhiều food để so tính tối ưu giữa các thuật toán.
SMALL = """
%%%%%
%P..%
%.%.%
%..o%
%%%%%
"""


def _corridor_problem():
    s = parse_layout(CORRIDOR)
    goal = (1, 5)
    return PathToPointProblem(s, goal)


def test_bfs_finds_shortest_path_corridor():
    r = bfs(_corridor_problem())
    assert r.found
    assert r.metrics.path_length == 4  # (1,1)->(1,5)


def test_astar_matches_bfs_optimal_corridor():
    p = _corridor_problem()
    rb = bfs(p)
    ra = astar(_corridor_problem(), goal_manhattan)
    assert ra.found
    # A* với heuristic admissible phải cho cùng độ dài tối ưu như BFS.
    assert ra.metrics.path_length == rb.metrics.path_length


def test_astar_expands_fewer_than_bfs_eat_all():
    # Trên bài "ăn hết food", heuristic admissible giúp A* expand ÍT HƠN BFS.
    # (So trên hành lang thẳng không phản ánh được vì BFS goal-test sớm còn A*
    # goal-test muộn -> A* expand thêm đúng 1 node đích; cả hai đều chuẩn AIMA.)
    rb = bfs(EatAllFoodProblem(parse_layout(SMALL)))
    ra = astar(EatAllFoodProblem(parse_layout(SMALL)), farthest_food_dist)
    assert ra.found and rb.found
    assert ra.metrics.path_length == rb.metrics.path_length  # cùng tối ưu
    assert ra.metrics.nodes_expanded <= rb.metrics.nodes_expanded


def test_all_algorithms_consistent_eat_all():
    # BFS, UCS, IDS, A* đều tối ưu -> cùng path_length cho bài ăn hết food.
    lengths = []
    for algo, args in [
        (bfs, ()),
        (ucs, ()),
        (ids, ()),
        (astar, (farthest_food_dist,)),
    ]:
        r = algo(EatAllFoodProblem(parse_layout(SMALL)), *args)
        assert r.found, f"{algo.__name__} không tìm được lời giải"
        lengths.append(r.metrics.path_length)
    assert len(set(lengths)) == 1, f"path_length không nhất quán: {lengths}"


def test_dfs_finds_solution_not_necessarily_optimal():
    r = dfs(EatAllFoodProblem(parse_layout(SMALL)))
    assert r.found
    # DFS không đảm bảo tối ưu -> chỉ yêu cầu tìm được.
    assert r.metrics.path_length >= 1


def test_astar_with_null_heuristic_equals_ucs_cost():
    p1 = EatAllFoodProblem(parse_layout(SMALL))
    p2 = EatAllFoodProblem(parse_layout(SMALL))
    ra = astar(p1, null_heuristic)
    ru = ucs(p2)
    assert ra.metrics.path_length == ru.metrics.path_length


def test_greedy_finds_path_to_nearest():
    s = parse_layout(SMALL)
    goal = nearest_food(s)
    r = greedy(PathToPointProblem(s, goal), goal_manhattan)
    assert r.found


def test_nearest_food_picks_closest():
    s = parse_layout(SMALL)
    # P=(1,1); food gần nhất phải là (1,2) (cách 1) chứ không phải ô xa hơn.
    assert nearest_food(s) == (1, 2)
