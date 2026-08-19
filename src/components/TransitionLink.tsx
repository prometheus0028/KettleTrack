'use client'

import Link, { LinkProps } from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition, ReactNode } from 'react'

interface TransitionLinkProps extends Omit<LinkProps, 'href'> {
  href: string
  children: ReactNode
  className?: string
}

export function TransitionLink({ href, children, className, ...props }: TransitionLinkProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <Link
      href={href}
      className={`${className} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
      onClick={(e) => {
        e.preventDefault()
        startTransition(() => {
          router.push(href)
        })
      }}
      {...props}
    >
      {isPending ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--card)]/50 rounded-2xl">
          <div className="w-6 h-6 border-2 border-[#1cc29f]/30 border-t-[#1cc29f] rounded-full animate-spin"></div>
        </div>
      ) : null}
      {children}
    </Link>
  )
}
