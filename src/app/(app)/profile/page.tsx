import { prisma } from '@/utils/prisma'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SubmitButton } from '@/components/SubmitButton'
import { updateProfile, logOut } from './actions'
import { LogOut, Mail } from 'lucide-react'
import { ProfileClientView } from './ProfileClientView'
import Link from 'next/link'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  // Calculate Stats
  const totalWashes = await prisma.washLog.count({
    where: { washedById: userId }
  })

  const favorsOwedToMe = await prisma.favor.findMany({
    where: { coveredByUserId: userId, settled: false },
    include: { owedByUser: true }
  })

  const favorsIOwe = await prisma.favor.findMany({
    where: { owedByUserId: userId, settled: false },
    include: { coveredByUser: true }
  })

  // Group the favors by user
  const owedToMeSummary: Record<string, { count: number, name: string }> = {}
  let totalFavorsOwedToMe = 0
  favorsOwedToMe.forEach(f => {
    totalFavorsOwedToMe++
    if (!owedToMeSummary[f.owedByUserId]) {
      owedToMeSummary[f.owedByUserId] = { count: 0, name: f.owedByUser.name || f.owedByUser.email.split('@')[0] }
    }
    owedToMeSummary[f.owedByUserId].count++
  })

  const iOweSummary: Record<string, { count: number, name: string }> = {}
  let totalFavorsIOwe = 0
  favorsIOwe.forEach(f => {
    totalFavorsIOwe++
    if (!iOweSummary[f.coveredByUserId]) {
      iOweSummary[f.coveredByUserId] = { count: 0, name: f.coveredByUser.name || f.coveredByUser.email.split('@')[0] }
    }
    iOweSummary[f.coveredByUserId].count++
  })

  return (
    <div className="space-y-6 max-w-xl mx-auto pb-20">
      <ProfileClientView user={user} updateProfileAction={updateProfile} />

      {/* Stats Section */}
      <div className="px-4">
        <h2 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Your Stats</h2>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)]">
          <div className="p-4 flex items-center justify-between">
            <span className="text-[15px] text-[var(--foreground)] font-medium">Total Lifetime Washes</span>
            <span className="text-[17px] font-bold text-[#1cc29f]">{totalWashes}</span>
          </div>
          
          <div className="p-4">
            <span className="text-[15px] text-[var(--foreground)] font-medium block mb-2">You are owed {Math.round(totalFavorsOwedToMe * 10) / 10} washes</span>
            {Object.values(owedToMeSummary).length > 0 ? (
              <div className="space-y-1">
                {Object.values(owedToMeSummary).map((s, i) => (
                  <p key={i} className="text-[13px] text-[var(--muted-foreground)] flex justify-between">
                    <span>From {s.name}</span>
                    <span className="text-[#1cc29f] font-medium">{Math.round(s.count * 10) / 10} wash{Math.round(s.count * 10) / 10 !== 1 ? 'es' : ''}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--muted-foreground)]">No one owes you a wash right now.</p>
            )}
          </div>

          <div className="p-4">
            <span className="text-[15px] text-[var(--foreground)] font-medium block mb-2">You owe {Math.round(totalFavorsIOwe * 10) / 10} washes</span>
            {Object.values(iOweSummary).length > 0 ? (
              <div className="space-y-1">
                {Object.values(iOweSummary).map((s, i) => (
                  <p key={i} className="text-[13px] text-[var(--muted-foreground)] flex justify-between">
                    <span>To {s.name}</span>
                    <span className="text-[#ff652f] font-medium">{Math.round(s.count * 10) / 10} wash{Math.round(s.count * 10) / 10 !== 1 ? 'es' : ''}</span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--muted-foreground)]">You don't owe any washes right now.</p>
            )}
          </div>
        </div>
      </div>

      <div className="px-4">
        <form action={logOut}>
          <SubmitButton
            defaultText="Log out"
            pendingText="Logging out..."
            icon={<LogOut className="w-5 h-5" />}
            className="w-full bg-[var(--card)] border border-[var(--border)] text-[#ff652f] py-3.5 rounded-xl font-semibold hover:bg-[var(--secondary)] transition-colors flex items-center justify-center gap-2"
          />
        </form>

        <div className="mt-8 pt-8 border-t border-[var(--border)] text-center text-[12px] text-[var(--muted-foreground)]">
          <p className="mb-4 italic">made to stop fighting :)</p>
          <div className="flex items-center justify-center gap-6 mb-4">
            <a href="https://github.com/prometheus0028" target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors" aria-label="GitHub">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/sarthakvashisht2005/" target="_blank" rel="noopener noreferrer" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors" aria-label="LinkedIn">
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
            <a href="mailto:sarthak.05v@gmail.com" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors" aria-label="Email">
              <Mail className="w-5 h-5" />
            </a>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Link href="/terms" className="hover:text-[var(--foreground)] underline underline-offset-2 transition-colors">
              Terms of Service
            </Link>
            <span>&</span>
            <Link href="/privacy" className="hover:text-[var(--foreground)] underline underline-offset-2 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}
