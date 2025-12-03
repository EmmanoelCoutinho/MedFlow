import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseClientKey = import.meta.env.VITE_SUPABASE_CLIENT_KEY as string;

if (!supabaseUrl) {
  throw new Error("Missing env: VITE_SUPABASE_URL");
}

if (!supabaseClientKey) {
  throw new Error("Missing env: VITE_SUPABASE_CLIENT_KEY");
}

export const supabase = createClient(supabaseUrl, supabaseClientKey);
