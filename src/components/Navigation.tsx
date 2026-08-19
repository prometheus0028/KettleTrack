'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Activity, UserCircle2 } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()
  
  const navItems = [
    { href: '/', icon: Users, label: 'Groups' },
    { href: '/activity', icon: Activity, label: 'Activity' },
    { href: '/profile', icon: UserCircle2, label: 'Account' },
  ]

  // We check if the route is exact match or child
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname.startsWith('/room')
    return pathname.startsWith(href)
  }

  return (
    <>


      {/* Desktop Sidebar (Optional, keeps it usable on Desktop) */}
      <aside className="hidden md:flex flex-col w-56 border-r border-[var(--border)] bg-[var(--background)] h-full fixed top-0 left-0 pt-16">
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                prefetch={true}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active 
                    ? 'text-[#1cc29f] bg-[var(--secondary)]' 
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--background)] border-t border-[var(--border)] z-50 flex items-center justify-around min-h-[72px] pb-[env(safe-area-inset-bottom)]">
        {navItems.map(item => {
          const active = isActive(item.href)
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              prefetch={true}
              className={`flex flex-col items-center justify-center w-full h-full relative py-2 ${
                active ? 'text-[#1cc29f]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {active && (
                <div className="absolute top-0 w-12 h-0.5 bg-[#1cc29f] rounded-b-full"></div>
              )}
              <item.icon className={`w-6 h-6 ${active ? 'fill-current/20' : ''}`} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] mt-1.5 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
