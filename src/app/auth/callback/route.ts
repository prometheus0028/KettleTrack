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
      try {
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
        
        // Use a cache-busting query param to bypass Safari BFCache and Next.js Client Router Cache
        return NextResponse.redirect(`${origin}/?t=${Date.now()}`)
      } catch (dbError: any) {
        return NextResponse.redirect(`${origin}/login?error=db-failed&msg=${encodeURIComponent(dbError.message)}`)
      }
    } else {
      return NextResponse.redirect(`${origin}/login?error=auth-failed&msg=${encodeURIComponent(error?.message || 'Unknown error')}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no-code`)
}
