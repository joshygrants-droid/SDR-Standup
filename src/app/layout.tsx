import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Daily Standup + Performance Tracker",
  description: "Outbound SDR stand-up, performance, and leaderboard tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen bg-gradient-to-br from-white via-sky-50 to-[color:var(--accent-soft)] text-slate-900">
          <header className="border-b border-[color:var(--accent-soft)] bg-white/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Daily Standup
                </p>
                <p className="text-lg font-semibold text-[color:var(--accent-strong)]">
                  Performance Tracker
                </p>
              </div>
              <nav className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
                <a
                  className="rounded-full px-3 py-1 transition hover:bg-white hover:text-[color:var(--accent-strong)]"
                  href="/"
                >
                  Home
                </a>
                <a
                  className="rounded-full px-3 py-1 transition hover:bg-white hover:text-[color:var(--accent-strong)]"
                  href="/dashboard"
                >
                  Dashboard
                </a>
                <a
                  className="rounded-full px-3 py-1 transition hover:bg-white hover:text-[color:var(--accent-strong)]"
                  href="/manager"
                >
                  Manager Hub
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
