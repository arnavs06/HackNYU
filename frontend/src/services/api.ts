import axios, { AxiosInstance } from 'axios';
import { ApiScanRequest, ApiScanResponse, ScanResult } from '../types';

// TODO: Replace with your actual backend URL when ready
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000/api' 
  : 'https://your-production-backend.com/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // 30 seconds for image processing
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
   * Step 2 of workflow: Send image to backend for scanning
   * @param imageUri - Local file URI of the captured image
   * @param userId - Optional user ID for history tracking
   */
  async scanClothingTag(imageUri: string, userId?: string): Promise<ApiScanResponse> {
    try {
      const formData = new FormData();
      
      // Create file object from URI
      const filename = imageUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      if (userId) {
        formData.append('user_id', userId);
      }

      const response = await this.client.post<ApiScanResponse>(
        '/scan',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

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
