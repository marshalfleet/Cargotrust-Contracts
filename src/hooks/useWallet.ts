"use client";

import { useState, useCallback, useEffect } from "react";
import type { WalletState } from "@/types/contract";

declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
      signTransaction: (
        xdr: string,
        opts: { network: string; networkPassphrase: string }
      ) => Promise<string>;
    };
  }
}

export function useWallet(): WalletState {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Restore session on mount
  useEffect(() => {
    if (typeof window === "undefined" || !window.freighter) return;
    window.freighter.isConnected().then((connected) => {
      if (connected) {
        window.freighter!.getPublicKey().then(setAddress).catch(() => {});
      }
    });
  }, []);

  const connect = useCallback(async () => {
    if (!window.freighter) {
      window.open("https://www.freighter.app/", "_blank");
      return;
    }
    setIsConnecting(true);
    try {
      const key = await window.freighter.getPublicKey();
      setAddress(key);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  const signTransaction = useCallback(
    async (xdr: string): Promise<string> => {
      if (!window.freighter) throw new Error("Freighter not installed");
      const { NETWORK, NETWORK_PASSPHRASE } = await import("@/lib/constants");
      return window.freighter.signTransaction(xdr, {
        network: NETWORK,
        networkPassphrase: NETWORK_PASSPHRASE[NETWORK],
      });
    },
    []
  );

  return {
    address,
    isConnected: !!address,
    isConnecting,
    connect,
    disconnect,
    signTransaction,
  };
}
