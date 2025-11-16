# EcoScan FastAPI Backend

A lightweight FastAPI service that mirrors the endpoints expected by the Expo app (`src/services/api.ts`). It currently returns realistic mock data (same logic as the frontend mock service) so you can test the full flow without the old `mockApiService`.

## Endpoints

Base URL: `http://localhost:8000`

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/scan` | Accepts `multipart/form-data` with an `image` file and optional `user_id`. Returns an `ApiScanResponse` containing a generated scan result. |
| `GET` | `/api/history/{user_id}` | Returns `{ scans: ScanResult[] }` for the specified user. Supports `?limit=` (default 20). |
| `GET` | `/api/scan/{scan_id}` | Returns `{ scan: ScanResult }` for a specific scan. |
| `DELETE` | `/api/scan/{scan_id}` | Removes a scan from the in-memory history. |
| `GET` | `/api/stats/{user_id}` | Returns `{ totalScans, averageScore, mostCommonMaterial, improvementTrend }`. |
| `GET` | `/health` | Simple health probe. |

All response shapes match the TypeScript interfaces used in the mobile app, so no frontend changes are needed—just switch the base URL to `http://localhost:8000/api`.

## Running Locally

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # PowerShell on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then, in the Expo app, update `API_BASE_URL` in `frontend/src/services/api.ts` to `http://localhost:8000/api` (the file already uses this for `__DEV__`). Start Expo with `npm start`, run the mobile client, and the scanner/history/stats screens will call the FastAPI service.

> Note: this backend still uses in-memory storage and mock logic. Replacing `ScanStore` with Supabase/Postgres and wiring Gemini Vision/Text would be the next iteration.
