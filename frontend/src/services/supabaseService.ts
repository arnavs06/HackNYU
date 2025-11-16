import { supabase } from '../lib/supabase';
import { ScanResult, ProductMetadata, EcoScore } from '../types';

// Helper: Convert ScanResult to database format
function scanResultToUserScan(scan: ScanResult, userId: string) {
  return {
    user_id: userId,
    material: scan.material,
    country: scan.country,
    image_uri: scan.imageUri,
    confidence: scan.confidence,
    eco_score: {
      score: scan.ecoScore.score,
      grade: scan.ecoScore.grade,
      flags: scan.ecoScore.flags,
    },
    explanation: scan.explanation,
    improvement_tips: scan.improvementTips || [],
  };
}

// Helper: Convert database row to ScanResult
function userScanToScanResult(row: any): ScanResult {
  return {
    id: row.id,
    timestamp: row.timestamp || row.created_at,
    material: row.material,
    country: row.country,
    imageUri: row.image_uri,
    confidence: row.confidence,
    ecoScore: row.eco_score,
    explanation: row.explanation,
    improvementTips: row.improvement_tips || [],
    userId: row.user_id,
  };
}

// Helper: Convert ScanResult to ProductCatalog
function scanResultToProduct(scan: ScanResult): any {
  return {
    materials: scan.material,
    origin: scan.country,
    eco_score: {
      score: scan.ecoScore.score,
      grade: scan.ecoScore.grade,
      flags: scan.ecoScore.flags,
    },
    scan_count: 1,
  };
}

// Helper: Convert database row to ProductMetadata
function productRowToMetadata(row: any): ProductMetadata {
  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    productName: row.product_name,
    materials: row.materials,
    origin: row.origin,
    certifications: row.certifications || [],
    price: row.price,
    currency: row.currency,
    ecoNotes: row.eco_notes,
    ecoScore: row.eco_score,
    scanCount: row.scan_count,
    lastUpdated: row.last_updated,
  };
}

export class SupabaseService {
  /**
   * Save a scan to user's history
   */
  async saveScanToHistory(scan: ScanResult, userId: string): Promise<void> {
    const scanData = scanResultToUserScan(scan, userId);
    
    const { error } = await supabase
      .from('user_scans')
      .insert(scanData);

    if (error) {
      console.error('Error saving scan to history:', error);
      throw new Error('Failed to save scan to history');
    }
  }

  /**
   * Add or update product in global catalog
   */
  async addProductToCatalog(scan: ScanResult): Promise<void> {
    // Check if product with same material + origin exists
    const { data: existing, error: searchError } = await supabase
      .from('products_catalog')
      .select('*')
      .eq('materials', scan.material)
      .eq('origin', scan.country)
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK
      console.error('Error checking product catalog:', searchError);
    }

    if (existing) {
      // Update scan count
      const { error } = await supabase
        .from('products_catalog')
        .update({
          scan_count: (existing.scan_count || 0) + 1,
          last_updated: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating product catalog:', error);
      }
    } else {
      // Insert new product
      const productData = scanResultToProduct(scan);
      const { error } = await supabase
        .from('products_catalog')
        .insert(productData);

      if (error) {
        console.error('Error adding to product catalog:', error);
      }
    }
  }

  /**
   * Get user's scan history
   */
  async getUserHistory(userId: string, limit: number = 50): Promise<ScanResult[]> {
    const { data, error } = await supabase
      .from('user_scans')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user history:', error);
      throw new Error('Failed to fetch scan history');
    }

    return (data || []).map(userScanToScanResult);
  }

  /**
   * Search products in global catalog
   */
  async searchProducts(query: string): Promise<ProductMetadata[]> {
    if (!query || query.trim().length === 0) {
      // Return recent products if no query
      const { data, error } = await supabase
        .from('products_catalog')
        .select('*')
        .order('last_updated', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching products:', error);
        return [];
      }

      return (data || []).map(productRowToMetadata);
    }

    // Text search
    const { data, error } = await supabase
      .from('products_catalog')
      .select('*')
      .or(`materials.ilike.%${query}%,brand.ilike.%${query}%,origin.ilike.%${query}%`)
      .order('scan_count', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error searching products:', error);
      return [];
    }

    return (data || []).map(productRowToMetadata);
  }

  /**
   * Get all products from catalog (for search screen)
   */
  async getAllProducts(limit: number = 50): Promise<ProductMetadata[]> {
    const { data, error } = await supabase
      .from('products_catalog')
      .select('*')
      .order('scan_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching all products:', error);
      return [];
    }

    return (data || []).map(productRowToMetadata);
  }

  /**
   * Get user stats for history screen
   */
  async getUserStats(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('user_scans')
      .select('eco_score, material')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return {
        totalScans: 0,
        averageScore: 0,
        mostCommonMaterial: 'N/A',
        improvementTrend: 0,
      };
    }

    const totalScans = data.length;
    const averageScore = data.reduce((sum, row) => sum + row.eco_score.score, 0) / totalScans;
    
    // Find most common material
    const materialCounts: { [key: string]: number } = {};
    data.forEach(row => {
      materialCounts[row.material] = (materialCounts[row.material] || 0) + 1;
    });
    const mostCommonMaterial = Object.keys(materialCounts).reduce((a, b) =>
      materialCounts[a] > materialCounts[b] ? a : b
    );

    return {
      totalScans,
      averageScore: Math.round(averageScore),
      mostCommonMaterial,
      improvementTrend: 0, // TODO: Calculate trend
    };
  }
}

export const supabaseService = new SupabaseService();
