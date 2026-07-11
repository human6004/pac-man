// client.js — Giao tiếp với backend FastAPI.
// BASE_URL đọc từ biến môi trường Vite, mặc định localhost:8000.

const BASE_URL = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

// Trích thông báo lỗi từ response: ưu tiên field `detail` (chuẩn FastAPI),
// fallback text thô, cuối cùng là mã lỗi.
async function _throwHttp(res, path) {
  let detail = await res.text();
  try {
    detail = JSON.parse(detail).detail ?? detail;
  } catch {
    // giữ nguyên text
  }
  throw new Error(detail || `${path} → ${res.status}`);
}

async function _post(path, body) {
  const res = await fetch(BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) await _throwHttp(res, path);
  return res.json();
}

async function _get(path) {
  const res = await fetch(BASE_URL + path);
  if (!res.ok) await _throwHttp(res, path);
  return res.json();
}

export const Api = {
  baseUrl: BASE_URL,
  getAlgorithms: () => _get("/algorithms"),
  getMaps: () => _get("/maps"),
  getMap: (name) => _get(`/maps/${name}`),
  solve: (req) => _post("/solve", req),
  compare: (req) => _post("/compare", req),
  adversarial: (req) => _post("/adversarial", req),
};
