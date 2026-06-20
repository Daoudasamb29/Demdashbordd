import { createClient } from '@supabase/supabase-js';

// Cast import.meta to any to read vite environment securely across custom TS setups
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Initialisation sécurisée du client Supabase
// Évite un crash de l'interface en local ou en production si les valeurs de configuration ne sont pas encore renseignées.
export const supabase = (
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project-id.supabase.co' && 
  supabaseAnonKey !== 'your-anon-role-key-here'
)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Vérifie si le client Supabase est correctement configuré et prêt à l'emploi.
 */
export function isSupabaseConfigured(): boolean {
  return !!supabase;
}
