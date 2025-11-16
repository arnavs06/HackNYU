import axios, { AxiosInstance } from 'axios';
import { ApiScanRequest, ApiScanResponse, ScanResult } from '../types';

// Backend API URL
// For local development, use your machine's IP address (not localhost)
// Find IP: Windows: ipconfig | Mac/Linux: ifconfig
const API_BASE_URL = 'https://hacknyu-production-2d1d.up.railway.app/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 300000, // 5 minutes - for testing to see full backend processing
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for debugging
    this.client.interceptors.request.use(
      (config) => {
        console.log('API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log('API Response:', response.status, response.config.url);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Main scanning endpoint: Send BOTH tag and clothing images to backend
   * @param tagImageUri - Local file URI of the tag/label image
   * @param clothingImageUri - Local file URI of the clothing item image
   * @param userId - Optional user ID for history tracking
   */
  async scanClothingTag(
    tagImageUri: string,
    clothingImageUri: string,
    userId?: string
  ): Promise<ApiScanResponse> {
    try {
      const formData = new FormData();
      
      // Create tag image file object
      const tagFilename = tagImageUri.split('/').pop() || 'tag.jpg';
      const tagMatch = /\.(\w+)$/.exec(tagFilename);
      const tagType = tagMatch ? `image/${tagMatch[1]}` : 'image/jpeg';

      formData.append('tag_image', {
        uri: tagImageUri,
        name: tagFilename,
        type: tagType,
      } as any);

      // Create clothing image file object
      const clothingFilename = clothingImageUri.split('/').pop() || 'clothing.jpg';
      const clothingMatch = /\.(\w+)$/.exec(clothingFilename);
      const clothingType = clothingMatch ? `image/${clothingMatch[1]}` : 'image/jpeg';

      formData.append('clothing_image', {
        uri: clothingImageUri,
        name: clothingFilename,
        type: clothingType,
      } as any);

      if (userId) {
        formData.append('user_id', userId);
      }

      console.log('📤 Sending scan request with both images...');

      const response = await this.client.post<ApiScanResponse>(
        '/scan',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Scan successful!', response.data.success);
      return response.data;
    } catch (error) {
      console.error('Scan API Error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get scan history for a user
   */
  async getScanHistory(userId: string, limit: number = 20): Promise<ScanResult[]> {
    try {
      const response = await this.client.get<{ scans: ScanResult[] }>(
        `/history/${userId}`,
        { params: { limit } }
      );
      return response.data.scans;
    } catch (error) {
      console.error('History API Error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get detailed scan by ID
   */
  async getScanById(scanId: string): Promise<ScanResult> {
    try {
      const response = await this.client.get<{ scan: ScanResult }>(
        `/scan/${scanId}`
      );
      return response.data.scan;
    } catch (error) {
      console.error('Get Scan API Error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a scan from history
   */
  async deleteScan(scanId: string): Promise<void> {
    try {
      await this.client.delete(`/scan/${scanId}`);
    } catch (error) {
      console.error('Delete Scan API Error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<any> {
    try {
      const response = await this.client.get(`/stats/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Stats API Error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get personalized eco-friendly picks based on scan history
   * @param userId - User ID for tracking
   * @param scanHistory - User's scan history
   * @param referenceImageUri - Optional reference image URI (highest-scored scan)
   */
  async getPersonalizedPicks(
    userId: string,
    scanHistory: ScanResult[],
    referenceImageUri?: string
  ): Promise<any> {
    try {
      const formData = new FormData();

      // Prepare scan history data (simplified for API)
      const historyData = scanHistory.slice(0, 20).map(scan => ({
        id: scan.id,
        material: scan.material,
        country: scan.country,
        ecoScore: scan.ecoScore,
        brand: scan.brand,
        timestamp: scan.timestamp,
      }));

      // Add user_id and scan_history as form fields
      formData.append('user_id', userId);
      formData.append('scan_history', JSON.stringify(historyData));

      // Add reference image if provided
      if (referenceImageUri) {
        const filename = referenceImageUri.split('/').pop() || 'reference.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('reference_image', {
          uri: referenceImageUri,
          name: filename,
          type: type,
        } as any);
      }

      console.log('🎯 Requesting personalized picks...');
      console.log(`   User: ${userId}, History items: ${historyData.length}`);

      const response = await this.client.post('/picks', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for picks generation
      });

      console.log('✅ Picks generated successfully!');
      return response.data;
    } catch (error) {
      console.error('Picks API Error:', error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error
        const message = error.response.data?.error || error.response.statusText;
        return new Error(`Server Error: ${message}`);
      } else if (error.request) {
        // Request made but no response
        return new Error('Network Error: Unable to reach server. Please check your connection.');
      }
    }
    return new Error('An unexpected error occurred. Please try again.');
  }
}

// Export singleton instance
export const apiService = new ApiService();
