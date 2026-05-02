import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.DBOFICIAL1_SUPABASE_URL;
const supabaseKey = process.env.DBOFICIAL1_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Faltan DBOFICIAL1_SUPABASE_URL o DBOFICIAL1_SUPABASE_KEY en el archivo .env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});