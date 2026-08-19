import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      {/* Desktop Sidebar & Mobile Bottom Nav */}
      <Navigation />
      
      {/* Main Content */}
      <main className="flex-1 md:ml-56 overflow-y-auto pb-[88px] md:pb-8 relative">
        <div className="max-w-3xl mx-auto md:p-8 min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
