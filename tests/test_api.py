"""Kiểm thử API FastAPI bằng TestClient (không cần chạy server thật).

Chạy: py -3.12 -m pytest tests/test_api.py -v
"""
from fastapi.testclient import TestClient

from backend.api.main import app

client = TestClient(app)


def test_get_algorithms():
    r = client.get("/algorithms")
    assert r.status_code == 200
    data = r.json()
    keys = {a["key"] for a in data["algorithms"]}
    assert keys == {"bfs", "dfs", "ucs", "greedy", "astar"}
    assert "manhattan" in data["heuristics"]


def test_get_maps():
    r = client.get("/maps")
    assert r.status_code == 200
    names = {m["name"] for m in r.json()["maps"]}
    assert names == {"tiny", "small"}


def test_get_single_map():
    r = client.get("/maps/small")
    assert r.status_code == 200
    m = r.json()
    assert m["width"] > 0 and m["height"] > 0
    assert len(m["walls"]) > 0
    assert len(m["pacman_start"]) == 2


def test_get_unknown_map_404():
    r = client.get("/maps/khong_ton_tai")
    assert r.status_code == 404


def test_solve_bfs_path_to_farthest():
    r = client.post(
        "/solve",
        json={"map": "small", "algorithm": "bfs", "problem": "path_to_cell"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["found"] is True
    assert len(data["path"]) >= 1
    assert data["stats"]["nodes_expanded"] >= 1


def test_solve_path_to_cell_with_clicked_goal():
    # Ô đích do người dùng "click": lấy chính ô xuất phát Pac-man (chắc chắn đi được).
    m = client.get("/maps/small").json()
    goal = m["pacman_start"]
    r = client.post(
        "/solve",
        json={"map": "small", "algorithm": "bfs", "problem": "path_to_cell", "goal": goal},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["found"] is True
    # Đích = ô xuất phát -> đường đi chỉ gồm 1 ô.
    assert data["path"][-1] == goal


def test_solve_path_to_cell_goal_on_wall_400():
    m = client.get("/maps/small").json()
    wall = m["walls"][0]
    r = client.post(
        "/solve",
        json={"map": "small", "algorithm": "bfs", "problem": "path_to_cell", "goal": wall},
    )
    assert r.status_code == 400


def test_solve_path_to_cell_goal_out_of_bounds_400():
    r = client.post(
        "/solve",
        json={"map": "small", "algorithm": "bfs", "problem": "path_to_cell", "goal": [999, 999]},
    )
    assert r.status_code == 400


def test_solve_astar_eat_all():
    r = client.post(
        "/solve",
        json={
            "map": "small",
            "algorithm": "astar",
            "heuristic": "farthest_food",
            "problem": "eat_all",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["found"] is True
    assert data["heuristic"] == "farthest_food"


def test_solve_invalid_algorithm_400():
    r = client.post("/solve", json={"map": "small", "algorithm": "khongco"})
    assert r.status_code == 400


def test_compare_returns_rows():
    r = client.post(
        "/compare",
        json={
            "map": "small",
            "algorithms": ["bfs", "astar"],
            "heuristic": "farthest_food",
            "problem": "eat_all",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "map" not in data
    rows = data["results"]
    assert len(rows) == 2
    for row in rows:
        assert row["found"] is True
        assert row["stats"]["path_length"] >= 1
        assert "path" not in row and "visited_order" not in row
        assert "optimal" in row
        assert "memory_kb" not in row["stats"]


def test_solve_path_to_farthest_returns_tree():
    r = client.post(
        "/solve",
        json={"map": "small", "algorithm": "astar", "problem": "path_to_cell"},
    )
    assert r.status_code == 200
    tree = r.json()["tree"]
    assert len(tree) >= 1
    assert tree[0]["parent"] is None
    for node in tree:
        assert {"id", "parent", "pos", "food_left", "food", "power_pellets", "g", "h", "f"} <= set(node)


def test_solve_eat_all_returns_capped_tree():
    r = client.post(
        "/solve",
        json={
            "map": "small",
            "algorithm": "astar",
            "heuristic": "farthest_food",
            "problem": "eat_all",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert 0 < len(data["tree"]) <= data["tree_limit"]
    assert isinstance(data["tree_truncated"], bool)
    for node in data["tree"]:
        assert {"created_order", "expanded_order", "action"} <= set(node)


def test_compare_path_to_farthest_has_tree_and_optimal():
    r = client.post(
        "/compare",
        json={
            "map": "small",
            "algorithms": ["astar", "greedy", "bfs"],
            "problem": "path_to_cell",
        },
    )
    assert r.status_code == 200
    rows = {row["algorithm"]: row for row in r.json()["results"]}
    assert len(rows["astar"]["tree"]) >= 1
    assert rows["astar"]["tree_limit"] >= len(rows["astar"]["tree"])
    # bfs tối ưu, greedy thì không.
    assert rows["bfs"]["optimal"] is True
    assert rows["greedy"]["optimal"] is False


def test_adversarial_endpoint_removed():
    assert client.post("/adversarial", json={}).status_code == 404
