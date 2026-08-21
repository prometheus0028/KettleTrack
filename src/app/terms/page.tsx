import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function TermsOfService() {
  return (
    <div className="min-h-screen p-6 bg-[var(--background)] text-[var(--foreground)] max-w-3xl mx-auto">
      <Link href="/" className="text-[#1cc29f] flex items-center mb-8 hover:underline">
        <ChevronLeft className="w-5 h-5 -ml-1" />
        <span className="font-medium text-[15px]">Back</span>
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-[var(--muted-foreground)] mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using KettleTrack, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p>
            KettleTrack is a utility app designed to help groups track turns for washing a shared kettle. We provide this service &quot;as is&quot; and reserve the right to modify or discontinue it at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account (which is tied to your email or Google account) and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Push Notifications</h2>
          <p>
            If you choose to enable Push Notifications, we may send you alerts when it is your turn to wash the kettle or when a group member nudges you. You can turn these off at any time in your device settings or profile.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
          <p>
            In no event shall KettleTrack, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the Service. (Especially arguments about whose turn it is to wash the kettle!)
          </p>
        </section>
      </div>
    </div>
  )
}
