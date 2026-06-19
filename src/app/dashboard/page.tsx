"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WalletConnect } from "@/components/WalletConnect";
import { RegisterCargoForm } from "@/components/RegisterCargoForm";
import { useWallet } from "@/hooks/useWallet";

export default function DashboardPage() {
  const { isConnected, address } = useWallet();
  const router = useRouter();
  const [tab, setTab] = useState<"register" | "shipments">("register");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-header">Shipper Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Register new cargo shipments and track your active bookings.
          </p>
        </div>
        <WalletConnect />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-slate-200">
        {(["register", "shipments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 px-1 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            aria-selected={tab === t}
          >
            {t === "register" ? "Register Cargo" : "My Shipments"}
          </button>
        ))}
      </div>

      {tab === "register" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">
              New Shipment
            </h2>
            {isConnected ? (
              <RegisterCargoForm
                onSuccess={(hash) => router.push(`/shipments?tx=${hash}`)}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="text-4xl" aria-hidden>🔗</div>
                <p className="text-slate-600 text-sm max-w-xs">
                  Connect your Freighter wallet to register a cargo shipment on
                  Stellar.
                </p>
                <WalletConnect />
              </div>
            )}
          </div>

          {/* Info panel */}
          <div className="space-y-4">
            <div className="card bg-brand-50 border-brand-200">
              <h3 className="font-semibold text-brand-900 mb-2">
                How escrow works
              </h3>
              <p className="text-sm text-brand-800 leading-relaxed">
                After registering, you fund USDC escrow equal to the agreed
                freight value. Funds are locked until the carrier confirms
                delivery or a dispute is resolved by an arbitrator.
              </p>
            </div>
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-3">
                What you'll need
              </h3>
              <ul className="space-y-2 text-sm text-slate-600">
                {[
                  "Freighter wallet installed with USDC balance",
                  "Carrier's Stellar public key",
                  "Consignee's Stellar public key",
                  "Shipping documents uploaded to IPFS (get the hash)",
                  "Agreed freight value in USDC",
                ].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-emerald-500 shrink-0" aria-hidden>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tab === "shipments" && (
        <ShipmentsTable address={address} />
      )}
    </div>
  );
}

function ShipmentsTable({ address }: { address: string | null }) {
  if (!address) {
    return (
      <p className="text-center text-slate-500 py-16 text-sm">
        Connect your wallet to see your shipments.
      </p>
    );
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Active Shipments</h2>
        <span className="text-xs text-slate-500">Wallet: {address.slice(0, 8)}…</span>
      </div>
      {/* Populated via SWR / React Query in a real implementation */}
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm gap-2">
        <span className="text-3xl" aria-hidden>📭</span>
        No shipments found for this wallet.
      </div>
    </div>
  );
}
