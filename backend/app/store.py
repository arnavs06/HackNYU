from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Dict, List, Optional

from .schemas import ScanResult


class ScanStore:
    """In-memory store for scans. Replace with Supabase/Postgres later."""

    def __init__(self) -> None:
        self._scans: List[ScanResult] = []

    def add_scan(self, scan: ScanResult) -> None:
        self._scans.insert(0, scan)

    def get_scan(self, scan_id: str) -> Optional[ScanResult]:
        return next((scan for scan in self._scans if scan.id == scan_id), None)

    def delete_scan(self, scan_id: str) -> bool:
        for idx, scan in enumerate(self._scans):
            if scan.id == scan_id:
                del self._scans[idx]
                return True
        return False

    def get_history(self, user_id: Optional[str], limit: int) -> List[ScanResult]:
        scans = [scan for scan in self._scans if scan.userId == user_id or user_id is None]
        scans.sort(key=lambda item: item.timestamp, reverse=True)
        return scans[:limit]

    def get_stats(self, user_id: Optional[str]) -> Dict[str, int | str]:
        user_scans = self.get_history(user_id, limit=len(self._scans))
        if not user_scans:
            return {
                "totalScans": 0,
                "averageScore": 0,
                "mostCommonMaterial": "N/A",
                "improvementTrend": 0,
            }

        total_scans = len(user_scans)
        avg_score = round(
            sum(scan.ecoScore.score for scan in user_scans) / max(total_scans, 1)
        )

        material_counts = Counter(scan.material for scan in user_scans)
        most_common_material, _ = material_counts.most_common(1)[0]

        trend = self._calculate_trend(user_scans)

        return {
            "totalScans": total_scans,
            "averageScore": avg_score,
            "mostCommonMaterial": most_common_material,
            "improvementTrend": trend,
        }

    @staticmethod
    def _calculate_trend(scans: List[ScanResult]) -> int:
        if len(scans) < 2:
            return 0

        midpoint = len(scans) // 2
        recent = scans[:midpoint]
        older = scans[midpoint:]

        if not recent or not older:
            return 0

        recent_avg = sum(scan.ecoScore.score for scan in recent) / len(recent)
        older_avg = sum(scan.ecoScore.score for scan in older) / len(older)
        return round(recent_avg - older_avg)
