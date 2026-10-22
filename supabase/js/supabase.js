
const SUPABASE_URL = "https://uwfhrrgongmtkvefdepj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_hO45ohZd8d665td3xz0vKw_2n_s_bQ3";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


async function testSupabaseConnection() {
  const { data, error } = await supabaseClient
    .from("portfolio_content")
    .select("key")
    .limit(1);

  if (error) {
    console.error("Supabase connection/query failed:", error.message);
    return;
  }

  console.log("Supabase connected!", data);
}

testSupabaseConnection();