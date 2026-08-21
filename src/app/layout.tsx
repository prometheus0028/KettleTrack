import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KettleTrack",
  description: "Manage your kettle wash cycle",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KettleTrack",
  },
  icons: {
    icon: [
      { url: '/api/icon?theme=light', media: '(prefers-color-scheme: light)' },
      { url: '/api/icon?theme=dark', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [
      { url: '/api/apple-icon?theme=light', media: '(prefers-color-scheme: light)' },
      { url: '/api/apple-icon?theme=dark', media: '(prefers-color-scheme: dark)' },
    ]
  }
};

export const viewport = {
  themeColor: "#1cc29f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        
        <Script
          id="pwa-sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Service Worker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('Service Worker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
