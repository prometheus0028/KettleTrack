import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen p-6 bg-[var(--background)] text-[var(--foreground)] max-w-3xl mx-auto">
      <Link href="/" className="text-[#1cc29f] flex items-center mb-8 hover:underline">
        <ChevronLeft className="w-5 h-5 -ml-1" />
        <span className="font-medium text-[15px]">Back</span>
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-[var(--muted-foreground)] mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
          <p>
            When you use KettleTrack, we collect your email address and basic profile information (such as your name and profile picture if you log in with Google). This information is used solely to identify you within your KettleTrack groups.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
          <p>
            We use your information to provide and maintain the Service, to notify you about changes to our Service, and to allow you to participate in interactive features when you choose to do so.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Data Security</h2>
          <p>
            The security of your data is important to us. We use Supabase, a secure backend-as-a-service, to store your data safely. We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Push Notifications</h2>
          <p>
            If you enable push notifications, we generate a unique device token (Push Subscription) to send alerts directly to your device. This token is securely stored in our database and is used solely for delivering KettleTrack notifications (e.g., when it is your turn or when nudged). You can revoke this permission at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact the developer at <a href="mailto:sarthak.05v@gmail.com" className="text-[#1cc29f] hover:underline">sarthak.05v@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  )
}
