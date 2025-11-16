// Type definitions for EcoScan app

export interface Material {
  name: string;
  carbonFootprint: number;
  waterUsage: number;
  microplasticRisk: 'low' | 'medium' | 'high';
}

export interface Country {
  name: string;
  laborRisk: 'low' | 'medium' | 'high';
  transportationImpact: number;
}

export interface ImpactFlag {
  type: 'microplastic' | 'carbon' | 'water' | 'labor';
  severity: 'low' | 'medium' | 'high';
  label: string;
}

export interface EcoScore {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  flags: ImpactFlag[];
}

export interface ScanResult {
  id: string;
  timestamp: string;
  material: string;
  country: string;
  ecoScore: EcoScore;
  explanation: string;
  confidence?: number;
  imageUri?: string;
  improvementTips?: string[];
  userId?: string; // For database storage
}

// Product metadata for search catalog (matches base.py)
export interface ProductMetadata {
  id?: string;
  title?: string;
  brand?: string;
  productName?: string;
  materials: string;
  origin: string;
  certifications?: string[];
  price?: number;
  currency?: string;
  ecoNotes?: string;
  ecoScore: EcoScore;
  scanCount?: number;
  lastUpdated?: string;
}

export interface ApiScanRequest {
  image: string; // base64 or file path
  userId?: string;
}

export interface ApiScanResponse {
  success: boolean;
  data?: ScanResult;
  error?: string;
}

export interface GeminiVisionResponse {
  material: string;
  country: string;
  confidence: number;
}

export interface HistoryStats {
  totalScans: number;
  averageScore: number;
  mostCommonMaterial: string;
  improvementTrend: number; // percentage change
}

export type RootStackParamList = {
  Home: undefined;
  Scanner: undefined;
  Results: { scanResult: ScanResult };
  History: undefined;
  ScanDetail: { scanId: string };
};

export type BottomTabParamList = {
  Search: undefined;
  Recommendations: undefined;
  ScanButton: undefined;
  History: undefined;
  Account: undefined;
};
