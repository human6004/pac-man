// client.js — Communicates with the FastAPI backend.
// BASE_URL is read from a Vite environment variable, defaulting to localhost:8000.

const BASE_URL = import.meta.env?.VITE_API_BASE ?? "http://localhost:8000";

// Extract the error message from the response: prefer the `detail` field
// (FastAPI convention), fall back to raw text, and finally the status code.
async function _throwHttp(res, path) {
  let detail = await res.text();
  try {
    detail = JSON.parse(detail).detail ?? detail;
  } catch {
    // keep the raw text as is
  }
  throw new Error(detail || `${path} → ${res.status}`);
}

async function _post(path, body, { signal } = {}) {
  const res = await fetch(BASE_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) await _throwHttp(res, path);
  return res.json();
}

async function _upload(path, file, { signal } = {}) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(BASE_URL + path, { method: "POST", body, signal });
  if (!res.ok) await _throwHttp(res, path);
  return res.json();
}

async function _get(path, { signal } = {}) {
  const res = await fetch(BASE_URL + path, { signal });
  if (!res.ok) await _throwHttp(res, path);
  return res.json();
}

export const Api = {
  baseUrl: BASE_URL,
  getAlgorithms: (options) => _get("/algorithms", options),
  getMaps: (options) => _get("/maps", options),
  getMap: (name, options) => _get(`/maps/${name}`, options),
  importMap: (file, options) => _upload("/maps/import", file, options),
  solve: (req, options) => _post("/solve", req, options),
  compare: (req, options) => _post("/compare", req, options),
};
