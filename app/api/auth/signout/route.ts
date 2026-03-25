import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}

export async function GET() {
  return signOut()
}

export async function POST() {
  return signOut()
}
