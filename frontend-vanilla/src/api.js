// Lớp giao tiếp với backend FastAPI.
// Đổi BASE_URL nếu backend chạy ở host/port khác.
const BASE_URL = "http://localhost:8000";

async function _post(path, body) {
  const res = await fetch(BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`POST ${path} → ${res.status}: ${detail}`);
  }
  return res.json();
}

async function _get(path) {
  const res = await fetch(BASE_URL + path);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

const Api = {
  getAlgorithms: () => _get("/algorithms"),
  getMaps: () => _get("/maps"),
  getMap: (name) => _get(`/maps/${name}`),
  solve: (req) => _post("/solve", req),
  compare: (req) => _post("/compare", req),
  adversarial: (req) => _post("/adversarial", req),
};
