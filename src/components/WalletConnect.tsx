"use client";

import { useWallet } from "@/hooks/useWallet";

/** Truncate a Stellar public key for display. */
function truncate(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function WalletConnect() {
  const { address, isConnected, isConnecting, connect, disconnect } =
    useWallet();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-mono font-medium text-emerald-700 ring-1 ring-emerald-200">
          {truncate(address)}
        </span>
        <button
          onClick={disconnect}
          className="btn-secondary text-xs px-3 py-1.5"
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      disabled={isConnecting}
      className="btn-primary text-sm"
      aria-label="Connect Freighter wallet"
    >
      {isConnecting ? (
        <>
          <Spinner /> Connecting…
        </>
      ) : (
        "Connect Wallet"
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
