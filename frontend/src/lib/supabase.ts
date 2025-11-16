import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vpkhkvipfhjfztxzmyoc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwa2hrdmlwZmhqZnp0eHpteW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNDgwOTMsImV4cCI6MjA3ODgyNDA5M30.1Gj21G2YEgMzJYesO1JXiOouVKBWvP65_o3iJwcp82Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface UserScan {
  id?: string;
  user_id: string;
  timestamp?: string;
  material: string;
  country: string;
  image_uri?: string;
  confidence?: number;
  eco_score: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    flags: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      label: string;
    }>;
  };
  explanation?: string;
  improvement_tips?: string[];
  created_at?: string;
}

export interface ProductCatalog {
  id?: string;
  title?: string;
  brand?: string;
  product_name?: string;
  materials: string;
  origin: string;
  certifications?: string[];
  price?: number;
  currency?: string;
  eco_notes?: string;
  eco_score: {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    flags: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      label: string;
    }>;
  };
  scan_count?: number;
  last_updated?: string;
  created_at?: string;
}
