'use client'

import { useFormStatus } from 'react-dom'
import { useState, useEffect, useRef } from 'react'

export function SubmitButton({
  defaultText,
  pendingText,
  successText,
  className,
  icon
}: {
  defaultText: string
  pendingText?: string
  successText?: string
  className?: string
  icon?: React.ReactNode
}) {
  const { pending } = useFormStatus()
  const [showSuccess, setShowSuccess] = useState(false)
  const prevPending = useRef(pending)

  useEffect(() => {
    if (pending) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSuccess(false)
    } else if (prevPending.current && !pending) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 2000)
      prevPending.current = pending
      return () => clearTimeout(timer)
    }
    prevPending.current = pending
  }, [pending])

  return (
    <button 
      type="submit" 
      disabled={pending || showSuccess}
      className={`${className} flex items-center justify-center gap-2`}
    >
      {pending ? (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          {pendingText || defaultText}
        </>
      ) : showSuccess && successText ? (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {successText}
        </>
      ) : (
        <>
          {icon}
          {defaultText}
        </>
      )}
    </button>
  )
}
