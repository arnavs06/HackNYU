/**
 * Local storage service for managing scan history
 * Uses AsyncStorage to persist data on device
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanResult, HistoryStats } from '../types';

const SCANS_STORAGE_KEY = '@ecoscan_scans';
const USER_ID_KEY = '@ecoscan_user_id';

class StorageService {
  /**
   * Get or create a user ID
   */
  async getUserId(): Promise<string> {
    try {
      let userId = await AsyncStorage.getItem(USER_ID_KEY);
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(USER_ID_KEY, userId);
      }
      return userId;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return 'default_user';
    }
  }

  /**
   * Save a scan result to local storage
   */
  async saveScan(scan: ScanResult): Promise<void> {
    try {
      const scans = await this.getAllScans();
      scans.unshift(scan); // Add to beginning
      await AsyncStorage.setItem(SCANS_STORAGE_KEY, JSON.stringify(scans));
      console.log('💾 Scan saved to local storage:', scan.id);
    } catch (error) {
      console.error('Error saving scan:', error);
      throw new Error('Failed to save scan to storage');
    }
  }

  /**
   * Get all scans from local storage
   */
  async getAllScans(): Promise<ScanResult[]> {
    try {
      const scansJson = await AsyncStorage.getItem(SCANS_STORAGE_KEY);
      if (!scansJson) {
        return [];
      }
      return JSON.parse(scansJson);
    } catch (error) {
      console.error('Error loading scans:', error);
      return [];
    }
  }

  /**
   * Get scan history with limit
   */
  async getScanHistory(limit: number = 20): Promise<ScanResult[]> {
    try {
      const scans = await this.getAllScans();
      return scans.slice(0, limit);
    } catch (error) {
      console.error('Error getting scan history:', error);
      return [];
    }
  }

  /**
   * Get a specific scan by ID
   */
  async getScanById(scanId: string): Promise<ScanResult | null> {
    try {
      const scans = await this.getAllScans();
      return scans.find(scan => scan.id === scanId) || null;
    } catch (error) {
      console.error('Error getting scan by ID:', error);
      return null;
    }
  }

  /**
   * Delete a scan from storage
   */
  async deleteScan(scanId: string): Promise<void> {
    try {
      const scans = await this.getAllScans();
      const filtered = scans.filter(scan => scan.id !== scanId);
      await AsyncStorage.setItem(SCANS_STORAGE_KEY, JSON.stringify(filtered));
      console.log('🗑️ Scan deleted:', scanId);
    } catch (error) {
      console.error('Error deleting scan:', error);
      throw new Error('Failed to delete scan');
    }
  }

  /**
   * Calculate user statistics from scan history
   */
  async getUserStats(): Promise<HistoryStats> {
    try {
      const scans = await this.getAllScans();
      
      if (scans.length === 0) {
        return {
          totalScans: 0,
          averageScore: 0,
          mostCommonMaterial: 'N/A',
          improvementTrend: 0,
        };
      }

      // Calculate average score
      const totalScore = scans.reduce((sum, scan) => sum + scan.ecoScore.score, 0);
      const averageScore = Math.round(totalScore / scans.length);

      // Find most common material
      const materialCounts: { [key: string]: number } = {};
      scans.forEach(scan => {
        materialCounts[scan.material] = (materialCounts[scan.material] || 0) + 1;
      });
      const mostCommonMaterial = Object.entries(materialCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      // Calculate improvement trend (compare first half vs second half of scans)
      const midPoint = Math.floor(scans.length / 2);
      if (midPoint > 0) {
        const recentScans = scans.slice(0, midPoint);
        const olderScans = scans.slice(midPoint);
        
        const recentAvg = recentScans.reduce((sum, s) => sum + s.ecoScore.score, 0) / recentScans.length;
        const olderAvg = olderScans.reduce((sum, s) => sum + s.ecoScore.score, 0) / olderScans.length;
        
        const improvementTrend = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
        
        return {
          totalScans: scans.length,
          averageScore,
          mostCommonMaterial,
          improvementTrend,
        };
      }

      return {
        totalScans: scans.length,
        averageScore,
        mostCommonMaterial,
        improvementTrend: 0,
      };
    } catch (error) {
      console.error('Error calculating user stats:', error);
      return {
        totalScans: 0,
        averageScore: 0,
        mostCommonMaterial: 'N/A',
        improvementTrend: 0,
      };
    }
  }

  /**
   * Clear all scan history (use with caution!)
   */
  async clearAllScans(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SCANS_STORAGE_KEY);
      console.log('🧹 All scans cleared');
    } catch (error) {
      console.error('Error clearing scans:', error);
      throw new Error('Failed to clear scans');
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();
