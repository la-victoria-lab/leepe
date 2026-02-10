import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Use localStorage instead of cookies for better iOS PWA compatibility
        const keys = Object.keys(localStorage)
        return keys
          .filter(key => key.startsWith('sb-'))
          .map(key => ({
            name: key,
            value: localStorage.getItem(key) || ''
          }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          if (value) {
            localStorage.setItem(name, value)
          } else {
            localStorage.removeItem(name)
          }
        })
      },
    },
  })
}


