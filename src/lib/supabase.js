// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!url || !anon) {
  console.error('[ENV MISSING]',
    'VITE_SUPABASE_URL=', url,
    'VITE_SUPABASE_ANON_KEY=', anon ? '(present)' : '(missing)'
  )
  throw new Error('Missing Supabase env. Create .env in project root with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anon)
