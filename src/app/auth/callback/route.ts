import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/utils/prisma'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && session?.user) {
      const { user } = session
      // Sync user to Prisma
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.user_metadata?.full_name,
          avatarUrl: user.user_metadata?.avatar_url,
        },
        create: {
          id: user.id, // Keep Supabase user ID and Prisma ID in sync
          email: user.email!,
          name: user.user_metadata?.full_name,
          avatarUrl: user.user_metadata?.avatar_url,
        }
      })
      
      return NextResponse.redirect(`${origin}/`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`)
}
