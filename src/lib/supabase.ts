import { createClient } from '@supabase/supabase-js';

// Automatically inject https:// if the user forgot it in their Vercel ENV
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for use in the browser (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin client for server-side operations
 * WARNING: Bypasses RLS. Use only in secure server-side environments.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
