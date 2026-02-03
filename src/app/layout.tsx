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
        <div className="app-shell min-h-screen text-slate-900">
          <header className="app-header">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Daily Standup
                </p>
                <p className="accent-text text-lg font-semibold">
                  Performance Tracker
                </p>
              </div>
              <nav className="accent-nav flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600">
                <a href="/">
                  Home
                </a>
                <a href="/dashboard">
                  Dashboard
                </a>
                <a href="/manager">
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
