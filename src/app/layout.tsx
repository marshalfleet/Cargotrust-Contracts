import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CargoTrust — Decentralized Freight Platform",
  description:
    "On-chain cargo registration, automated USDC escrow, and transparent dispute resolution on Stellar.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
      <nav
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between"
        aria-label="Primary"
      >
        <a href="/" className="flex items-center gap-2 font-bold text-slate-900 text-lg">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <rect width="28" height="28" rx="6" fill="#2563eb" />
            <path d="M7 14h14M14 7l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          CargoTrust
        </a>
        <div className="flex items-center gap-6 text-sm text-slate-600">
          <a href="/dashboard" className="hover:text-slate-900 transition-colors">
            Dashboard
          </a>
          <a href="/shipments" className="hover:text-slate-900 transition-colors">
            Shipments
          </a>
          {/* WalletConnect rendered client-side */}
          <div id="wallet-connect-portal" />
        </div>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <p>© {new Date().getFullYear()} CargoTrust. Built on Stellar.</p>
        <div className="flex gap-4">
          <a href="https://developers.stellar.org" className="hover:text-slate-800" target="_blank" rel="noopener noreferrer">
            Stellar Docs
          </a>
          <a href="https://discord.gg/stellar" className="hover:text-slate-800" target="_blank" rel="noopener noreferrer">
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
