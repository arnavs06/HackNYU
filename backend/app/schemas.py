from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ImpactFlag(BaseModel):
    type: Literal["microplastic", "carbon", "water", "labor", "other"]
    severity: Literal["low", "medium", "high"]
    label: str


class EcoScore(BaseModel):
    score: int = Field(ge=0, le=100)
    grade: Literal["A", "B", "C", "D", "F"]
    flags: List[ImpactFlag] = Field(default_factory=list)


class ScanResult(BaseModel):
    id: str
    timestamp: datetime
    material: str
    country: str
    ecoScore: EcoScore
    explanation: str
    improvementTips: List[str] = Field(default_factory=list)
    confidence: Optional[float] = None
    imageUri: Optional[str] = None
    userId: Optional[str] = None


class ApiScanResponse(BaseModel):
    success: bool
    data: Optional[ScanResult] = None
    error: Optional[str] = None


class HistoryResponse(BaseModel):
    scans: List[ScanResult]


class ScanDetailResponse(BaseModel):
    scan: ScanResult


class DeleteResponse(BaseModel):
    success: bool
    deletedId: Optional[str] = None


class StatsResponse(BaseModel):
    totalScans: int
    averageScore: int
    mostCommonMaterial: str
    improvementTrend: int
