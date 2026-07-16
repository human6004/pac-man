# Cài đặt và chạy Pac-man A.I.

## Yêu cầu

- Python 3.12
- Node.js

## Cài đặt lần đầu

Chạy từ thư mục gốc của dự án:

```powershell
py -3.12 -m pip install -r backend/requirements.txt
cd frontend
npm install
```

## Khởi chạy

Mở hai cửa sổ terminal tại thư mục gốc của dự án.

Terminal 1 - backend:

```powershell
py -3.12 -m uvicorn backend.api.main:app --reload --port 8000
```

Terminal 2 - frontend:

```powershell
cd frontend
npm run dev
```

Mở ứng dụng: <http://localhost:5173>

Xem tài liệu API (Swagger): <http://localhost:8000/docs>
