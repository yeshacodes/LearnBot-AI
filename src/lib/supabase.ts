import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local, then restart `npm run dev`."
    );

    // Return a harmless placeholder so the app doesn't white-screen.
    // Any auth calls will fail gracefully.
    return createClient("http://localhost:54321", "public-anon-key");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
})();

