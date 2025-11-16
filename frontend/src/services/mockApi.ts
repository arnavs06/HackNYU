import { ApiScanResponse, ScanResult, EcoScore, ImpactFlag } from '../types';

/**
 * Mock API service for testing frontend without backend
 * Simulates the backend responses with realistic data
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const mockMaterials = [
  { name: '100% Polyester', score: 42, grade: 'D' as const, flags: ['High Microplastic', 'High Carbon'] },
  { name: '100% Organic Cotton', score: 85, grade: 'A' as const, flags: ['Low Impact', 'Biodegradable'] },
  { name: '60% Cotton 40% Polyester', score: 65, grade: 'C' as const, flags: ['Medium Carbon', 'Some Microplastic'] },
  { name: '100% Linen', score: 90, grade: 'A' as const, flags: ['Very Low Impact', 'Natural Fiber'] },
  { name: '100% Viscose', score: 55, grade: 'C' as const, flags: ['High Water Usage', 'Chemical Process'] },
];

const mockCountries = [
  { name: 'Bangladesh', laborRisk: 'medium' as const },
  { name: 'Portugal', laborRisk: 'low' as const },
  { name: 'China', laborRisk: 'medium' as const },
  { name: 'India', laborRisk: 'medium' as const },
  { name: 'Italy', laborRisk: 'low' as const },
  { name: 'Vietnam', laborRisk: 'medium' as const },
];

const generateMockScanResult = (): ScanResult => {
  const material = mockMaterials[Math.floor(Math.random() * mockMaterials.length)];
  const country = mockCountries[Math.floor(Math.random() * mockCountries.length)];
  
  const flags: ImpactFlag[] = material.flags.map((label, index) => ({
    type: index === 0 ? 'microplastic' : 'carbon' as any,
    severity: material.score > 70 ? 'low' : material.score > 50 ? 'medium' : 'high' as const,
    label,
  }));

  // Add labor flag based on country
  if (country.laborRisk !== 'low') {
    flags.push({
      type: 'labor',
      severity: country.laborRisk,
      label: `${country.laborRisk === 'medium' ? 'Medium' : 'High'} Labor Risk`,
    });
  }

  const ecoScore: EcoScore = {
    score: material.score,
    grade: material.grade,
    flags,
  };

  const explanations = {
    low: `This item scores poorly (${material.score}/100) due to its material composition and production location. ${material.name} tends to have significant environmental impact, particularly in terms of ${material.flags[0].toLowerCase()}. Production in ${country.name} adds concerns about ${country.laborRisk} labor conditions.`,
    medium: `This item has a moderate environmental impact (${material.score}/100). ${material.name} is a mixed bag environmentally - while it has some benefits, there are concerns about ${material.flags[0].toLowerCase()}. Manufacturing in ${country.name} brings ${country.laborRisk} labor risk considerations.`,
    high: `Great choice! This item scores well (${material.score}/100) thanks to its sustainable material. ${material.name} is an environmentally friendly option with ${material.flags[0].toLowerCase()}. Production in ${country.name} also follows better labor standards.`,
  };

  const explanation = material.score > 70 
    ? explanations.high 
    : material.score > 50 
    ? explanations.medium 
    : explanations.low;

  const tips = material.score < 70 ? [
    'Look for organic or recycled materials next time',
    'Choose natural fibers like cotton, linen, or hemp',
    'Support brands with transparent supply chains',
  ] : [
    'Great choice! Keep choosing sustainable materials',
    'Share your eco-friendly finds with friends',
  ];

  return {
    id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    material: material.name,
    country: country.name,
    ecoScore,
    explanation,
    confidence: 0.85 + Math.random() * 0.14, // 0.85 - 0.99
    improvementTips: tips,
  };
};

export class MockApiService {
  private scans: ScanResult[] = [];

  async scanClothingTag(imageUri: string, userId: string = 'user_123'): Promise<ApiScanResponse> {
    console.log('🧪 MOCK API: Scanning image...', imageUri);
    
    // Simulate API delay
    await delay(2000 + Math.random() * 1000);

    // 90% success rate
    if (Math.random() > 0.9) {
      return {
        success: false,
        error: 'Failed to extract information from tag. Please try again with better lighting.',
      };
    }

    const scanResult = generateMockScanResult();
    scanResult.imageUri = imageUri;
    scanResult.userId = userId;
    
    // Save to Supabase (user history + global catalog)
    try {
      const { supabaseService } = await import('./supabaseService');
      await Promise.all([
        supabaseService.saveScanToHistory(scanResult, userId),
        supabaseService.addProductToCatalog(scanResult),
      ]);
      console.log('✅ Saved to Supabase!');
    } catch (error) {
      console.error('⚠️ Failed to save to Supabase (using mock only):', error);
    }
    
    // Store in mock history (fallback)
    this.scans.unshift(scanResult);
    if (this.scans.length > 50) {
      this.scans = this.scans.slice(0, 50);
    }

    return {
      success: true,
      data: scanResult,
    };
  }

  async getScanHistory(userId: string, limit: number = 20): Promise<ScanResult[]> {
    console.log('🧪 Fetching scan history from Supabase...');
    
    try {
      const { supabaseService } = await import('./supabaseService');
      const history = await supabaseService.getUserHistory(userId, limit);
      console.log(`✅ Fetched ${history.length} scans from Supabase`);
      return history;
    } catch (error) {
      console.error('⚠️ Failed to fetch from Supabase, using mock data:', error);
      
      // Fallback: Generate some mock history if empty
      if (this.scans.length === 0) {
        for (let i = 0; i < 5; i++) {
          const scan = generateMockScanResult();
          scan.timestamp = new Date(Date.now() - i * 86400000).toISOString(); // Days ago
          this.scans.push(scan);
        }
      }
      
      return this.scans.slice(0, limit);
    }
  }

  async getScanById(scanId: string): Promise<ScanResult> {
    console.log('🧪 MOCK API: Fetching scan by ID...', scanId);
    await delay(300);
    
    const scan = this.scans.find(s => s.id === scanId);
    if (!scan) {
      throw new Error('Scan not found');
    }
    return scan;
  }

  async deleteScan(scanId: string): Promise<void> {
    console.log('🧪 MOCK API: Deleting scan...', scanId);
    await delay(300);
    
    this.scans = this.scans.filter(s => s.id !== scanId);
  }

  async getUserStats(userId: string): Promise<any> {
    console.log('🧪 Fetching user stats from Supabase...');
    
    try {
      const { supabaseService } = await import('./supabaseService');
      return await supabaseService.getUserStats(userId);
    } catch (error) {
      console.error('⚠️ Failed to fetch stats from Supabase:', error);
      await delay(500);
      
      const scores = this.scans.map(s => s.ecoScore.score);
      const avgScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0;

      return {
        totalScans: this.scans.length,
        averageScore: Math.round(avgScore),
        mostCommonMaterial: '100% Cotton',
        improvementTrend: 12, // percentage
      };
    }
  }
}

// Export mock service instance
export const mockApiService = new MockApiService();
