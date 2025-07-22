// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js'

export const serverSupabase = createClient(
  'https://dckycsszywpcnkqpjxes.supabase.co', // 직접 문자열로 작성
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRja3ljc3N6eXdwY25rcXBqeGVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk2NjQ1NCwiZXhwIjoyMDYzNTQyNDU0fQ.hGzgvswuBQ9x-jdbE3-v0QcLQBfJWD-idARNL4NKIXU' // 안전하게 관리 필요
)
