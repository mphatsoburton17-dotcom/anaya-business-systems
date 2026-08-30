import { createClient } from "@supabase/supabase-js";

// This is Anaya's real Supabase project. The key below is the PUBLISHABLE
// (anon) key — it's meant to be visible in client-side code like this; it
// can't read or write anything Row Level Security doesn't allow. Never put
// the secret/service_role key here.
const SUPABASE_URL = "https://uayzxovdmkvblcixpgll.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_1jrp1w6swajXMF_MO7Z7nQ_I-yG1Fdg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
