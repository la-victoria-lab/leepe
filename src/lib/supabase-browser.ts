import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let client: SupabaseClient | null = null

export function createSupabaseBrowserClient() {
  if (client) return client

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      storage: localStorage,
      detectSessionInUrl: false,
    },
  })

  return client
}


