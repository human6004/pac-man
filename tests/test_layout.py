from pathlib import Path

import pytest

from backend.game.layout import load_layout, parse_layout
from backend.game.state import GameMap, Maze


MAPS_DIR = Path(__file__).parents[1] / "backend" / "maps"


def test_layout_returns_game_map_with_static_maze():
    game_map = load_layout("tiny")

    assert isinstance(game_map, GameMap)
    assert isinstance(game_map.maze, Maze)
    assert game_map.maze.width > 0
    assert game_map.maze.height > 0
    assert game_map.initial_food
    assert game_map.pacman_start not in game_map.maze.walls


def test_demo_maps_keep_eat_all_search_small():
    assert len(load_layout("tiny").initial_food) == 3
    assert len(load_layout("small").initial_food) == 5


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("%%%%%\n%P.%\n%%%%%", "cùng chiều rộng"),
        ("%%%%%\n%...%\n%%%%%", "đúng một ký tự 'P'"),
        ("%%%%%\n%PP.%\n%%%%%", "đúng một ký tự 'P'"),
        ("%%%%%\n%P..%\n%%.%%", "Viền ngoài phải kín"),
        ("\n\n", "không được rỗng"),
        ("%%%%%\n%PX.%\n%%%%%", "không hợp lệ"),
    ],
)
def test_parse_layout_rejects_invalid_layout(text, message):
    with pytest.raises(ValueError, match=message):
        parse_layout(text)


@pytest.mark.parametrize("name", ["tiny", "small", "medium", "classic"])
def test_bundled_maps_are_rectangular_and_parseable(name):
    game_map = load_layout(name)
    assert game_map.maze.width > 0
    assert game_map.maze.height > 0
