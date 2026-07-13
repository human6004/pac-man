from pathlib import Path

import pytest

from backend.game.layout import load_layout, parse_layout


MAPS_DIR = Path(__file__).parents[1] / "backend" / "maps"


def test_tiny_is_an_open_closed_demo_map():
    text = (MAPS_DIR / "tiny.txt").read_text(encoding="utf-8")
    lines = text.splitlines()

    # Bản đồ mở, ít tường: các dòng cùng width, viền kín, chỉ dùng ký tự hợp lệ.
    assert len({len(line) for line in lines}) == 1
    assert set(text) <= {"%", "P", ".", "o", " ", "\n"}
    assert text.count("P") == 1

    state = load_layout("tiny")
    assert state.width > 0 and state.height > 0
    # Food thưa: có food nhưng không phải ô nào cũng có.
    assert state.food
    interior = (state.width - 2) * (state.height - 2)
    assert len(state.food) < interior


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("%%%%%\n%P.%\n%%%%%", "cùng chiều rộng"),
        ("%%%%%\n%...%\n%%%%%", "đúng một ký tự 'P'"),
        ("%%%%%\n%PP.%\n%%%%%", "đúng một ký tự 'P'"),
        ("%%%%%\n%P..%\n%%.%%", "Viền ngoài phải kín"),
    ],
)
def test_parse_layout_rejects_invalid_layout(text, message):
    with pytest.raises(ValueError, match=message):
        parse_layout(text)


@pytest.mark.parametrize("name", ["tiny", "small", "medium", "classic"])
def test_bundled_maps_are_rectangular_and_parseable(name):
    state = load_layout(name)
    assert state.width > 0 and state.height > 0
