from __future__ import annotations

from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .mock_data import generate_mock_scan, seed_history
from .schemas import (
    ApiScanResponse,
    DeleteResponse,
    HistoryResponse,
    ScanDetailResponse,
    StatsResponse,
)
from .store import ScanStore

DEFAULT_USER_ID = "demo-user"

app = FastAPI(title="EcoScan Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)

scan_store = ScanStore()
seed_history(scan_store, user_id=DEFAULT_USER_ID, count=5)


@app.get("/", tags=["system"])
async def root() -> dict[str, str]:
    return {"message": "EcoScan FastAPI backend is running"}


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/scan", response_model=ApiScanResponse, tags=["scans"])
async def scan_clothing_tag(
    image: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
) -> ApiScanResponse:
    # We are not processing the image yet—just consuming the file to avoid warnings.
    await image.read()

    resolved_user_id = user_id or DEFAULT_USER_ID
    scan = generate_mock_scan(resolved_user_id)
    scan_store.add_scan(scan)

    return ApiScanResponse(success=True, data=scan)


@app.get(
    "/api/history/{user_id}",
    response_model=HistoryResponse,
    tags=["scans"],
)
async def get_history(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
) -> HistoryResponse:
    scans = scan_store.get_history(user_id, limit)
    return HistoryResponse(scans=scans)


@app.get("/api/scan/{scan_id}", response_model=ScanDetailResponse, tags=["scans"])
async def get_scan(scan_id: str) -> ScanDetailResponse:
    scan = scan_store.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanDetailResponse(scan=scan)


@app.delete("/api/scan/{scan_id}", response_model=DeleteResponse, tags=["scans"])
async def delete_scan(scan_id: str) -> DeleteResponse:
    deleted = scan_store.delete_scan(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scan not found")
    return DeleteResponse(success=True, deletedId=scan_id)


@app.get("/api/stats/{user_id}", response_model=StatsResponse, tags=["analytics"])
async def get_stats(user_id: str) -> StatsResponse:
    stats = scan_store.get_stats(user_id)
    return StatsResponse(**stats)
