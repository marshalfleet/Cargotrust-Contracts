"use client";

import { useState, useCallback } from "react";
import { submitAndWait } from "@/lib/stellar";
import type { TxState } from "@/types/contract";

type BuildFn = () => Promise<string>;

/**
 * Generic hook for contract write operations.
 * Usage:
 *   const { execute, txState } = useContract();
 *   await execute(() => registerCargo(shipper, params), signTransaction);
 */
export function useContract() {
  const [txState, setTxState] = useState<TxState>({
    status: "idle",
    txHash: null,
    error: null,
  });

  const execute = useCallback(
    async (
      build: BuildFn,
      signTransaction: (xdr: string) => Promise<string>
    ): Promise<boolean> => {
      setTxState({ status: "building", txHash: null, error: null });
      try {
        const unsignedXdr = await build();

        setTxState((s) => ({ ...s, status: "signing" }));
        const signedXdr = await signTransaction(unsignedXdr);

        setTxState((s) => ({ ...s, status: "submitting" }));
        const result = await submitAndWait(signedXdr);

        setTxState({ status: "success", txHash: result.txHash ?? null, error: null });
        return true;
      } catch (e) {
        setTxState({
          status: "error",
          txHash: null,
          error: e instanceof Error ? e.message : String(e),
        });
        return false;
      }
    },
    []
  );

  const reset = useCallback(
    () => setTxState({ status: "idle", txHash: null, error: null }),
    []
  );

  return { txState, execute, reset };
}
