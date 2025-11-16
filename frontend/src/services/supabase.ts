/**
 * Supabase client configuration
 * Connects to cloud database for scan history and product catalog
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vpkhkvipfhjfztxzmyoc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwa2hrdmlwZmhqZnp0eHpteW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNDgwOTMsImV4cCI6MjA3ODgyNDA5M30.1Gj21G2YEgMzJYesO1JXiOouVKBWvP65_o3iJwcp82Q';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
