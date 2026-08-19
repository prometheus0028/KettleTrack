'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function InviteLinkButton({ joinCode }: { joinCode: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      const url = `${window.location.origin}/join/${joinCode}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy', e)
    }
  }

  return (
    <button 
      onClick={handleCopy}
      className="w-full flex items-center justify-center gap-2 bg-[#1cc29f] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#159e80] transition-colors active:scale-95"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy Invite Link'}
    </button>
  )
}
