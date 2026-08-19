'use client'

import * as React from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { PushToggle } from './PushToggle'
import { SubmitButton } from '@/components/SubmitButton'

const PIXEL_AVATARS = [
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Felix',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Aneka',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Jasper',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Brian',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Aiden',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=King',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Oliver',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Jack',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Liam',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Noah',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Sophia',
  'https://api.dicebear.com/9.x/pixel-art/svg?seed=Emma'
]

export function ProfileClientView({ user, updateProfileAction }: { user: any, updateProfileAction: any }) {
  const [selectedAvatar, setSelectedAvatar] = React.useState(user?.avatarUrl || null)

  return (
    <>
      <header className="px-4 py-6 text-center">
        <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-[var(--secondary)] border-2 border-[#1cc29f] mb-4">
          {selectedAvatar ? (
            <img src={selectedAvatar} alt="" className="w-full h-full object-cover p-1 rounded-full" />
          ) : (
            <span className="text-2xl font-bold text-[var(--muted-foreground)] flex items-center justify-center h-full">
              {user?.name ? user.name.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{user?.name || 'Account'}</h1>
        <p className="text-[var(--muted-foreground)] text-sm">{user?.email}</p>
      </header>

      <div className="px-4">
        <h2 className="text-[13px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">Settings</h2>
        <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl">
          <form action={updateProfileAction} className="space-y-6">
            
            <div>
              <label className="block text-sm font-semibold text-[var(--card-foreground)] mb-2">Display Name</label>
              <input 
                name="name" 
                defaultValue={user?.name || ''}
                placeholder="How others see you" 
                className="w-full bg-input-bg border border-[var(--border)] rounded-lg p-3 text-[15px] focus:outline-none focus:border-[#1cc29f] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--card-foreground)] mb-3">Choose your Avatar</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {PIXEL_AVATARS.map((url, i) => (
                  <label key={i} className="cursor-pointer group relative block" onClick={() => setSelectedAvatar(url)}>
                    <input 
                      type="radio" 
                      name="avatarUrl" 
                      value={url} 
                      defaultChecked={user?.avatarUrl === url}
                      className="peer sr-only"
                    />
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-[var(--background)] border-2 border-[var(--border)] peer-checked:border-[#1cc29f] transition-all">
                      <img src={url} alt={`Avatar option ${i+1}`} className="w-full h-full object-cover p-1" />
                    </div>
                  </label>
                ))}
              </div>
              {user?.avatarUrl && !PIXEL_AVATARS.includes(user.avatarUrl) && (
                <div className="mt-4 p-3 bg-[var(--secondary)] rounded border border-[var(--border)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={user.avatarUrl} className="w-8 h-8 rounded bg-[var(--background)]" />
                    <span className="text-sm text-[var(--muted-foreground)]">Custom avatar active</span>
                  </div>
                  <label className="text-xs text-[#1cc29f] hover:underline cursor-pointer" onClick={() => setSelectedAvatar(null)}>
                    <input type="radio" name="avatarUrl" value="" className="sr-only" />
                    Remove
                  </label>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[var(--border)]">
              <label className="block text-sm font-semibold text-[var(--card-foreground)] mb-3">Appearance</label>
              <ThemeToggle />
            </div>

            <div className="pt-6 border-t border-[var(--border)]">
              <PushToggle user={user} />
            </div>

            <SubmitButton 
              defaultText="Save Changes"
              successText="Saved!"
              className="w-full bg-[#1cc29f] hover:bg-[#159e80] active:scale-[0.98] text-white py-3 rounded-lg text-[15px] font-semibold transition-all mt-8"
            />
          </form>
        </div>
      </div>
    </>
  )
}
