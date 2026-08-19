'use client'

import { useState, useEffect } from 'react'

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushToggle({ user }: { user: any }) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      checkSubscription()
    } else {
      setLoading(false)
    }
  }, [])

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const subscribeButtonOnClick = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (isSubscribed && subscription) {
        // Unsubscribe
        await subscription.unsubscribe()
        // Here we could also call an API to delete it from DB, but we'll let it fail silently when pushing
        setIsSubscribed(false)
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert('Notification permission denied. Please enable them in your browser settings.')
          setLoading(false)
          return
        }

        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          alert('Push notifications are not configured on this server (Missing VAPID key).')
          setLoading(false)
          return
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
        })

        await fetch('/api/push', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: { 'Content-Type': 'application/json' }
        })
        setIsSubscribed(true)
      }
    } catch (e: any) {
      console.error('Error toggling push subscription', e)
      alert(`Error toggling push: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="text-sm text-[var(--muted-foreground)]">
        Push notifications are not supported on this device/browser.
      </div>
    )
  }

  const handleTogglePref = async (pref: string, value: boolean) => {
    try {
      await fetch('/api/user/prefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [pref]: value })
      })
    } catch (e) {
      console.error(e)
    }
  }

  const ToggleItem = ({ label, desc, prefKey, initial }: { label: string, desc: string, prefKey: string, initial: boolean }) => {
    const [checked, setChecked] = useState(initial)
    return (
      <div className="flex items-center justify-between py-2 pl-4">
        <div className="flex flex-col">
          <span className="text-[14px] text-[var(--foreground)]">{label}</span>
          <span className="text-[12px] text-[var(--muted-foreground)]">{desc}</span>
        </div>
        <button 
          type="button"
          onClick={() => {
            const next = !checked
            setChecked(next)
            handleTogglePref(prefKey, next)
          }}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? 'bg-[#1cc29f]' : 'bg-[var(--secondary)]'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between py-2">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-[var(--foreground)]">Push Notifications</span>
          <span className="text-[13px] text-[var(--muted-foreground)]">Enable push notifications for this device.</span>
        </div>
        <button 
          type="button"
          onClick={subscribeButtonOnClick}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${isSubscribed ? 'bg-[#1cc29f]' : 'bg-[var(--secondary)]'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSubscribed ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {isSubscribed && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-1">
          <ToggleItem label="Nudges" desc="When someone nudges you" prefKey="notifyNudge" initial={user?.notifyNudge ?? true} />
          <ToggleItem label="Next Turn" desc="When it becomes your turn" prefKey="notifyNextTurn" initial={user?.notifyNextTurn ?? true} />
          <ToggleItem label="Override (Owe Favor)" desc="When someone washes for you" prefKey="notifyOverride" initial={user?.notifyOverride ?? true} />
          <ToggleItem label="Owed Favor" desc="When it's your turn, but someone owes you" prefKey="notifyNextTurnFavor" initial={user?.notifyNextTurnFavor ?? true} />
          <ToggleItem label="Favor Fulfilled" desc="When a debt to you is settled" prefKey="notifyFavorFulfilled" initial={user?.notifyFavorFulfilled ?? true} />
        </div>
      )}
    </div>
  )
}
