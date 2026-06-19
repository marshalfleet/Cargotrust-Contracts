"use client";

import { useState, type FormEvent } from "react";
import type { TxState } from "@/types/contract";
import { useContract } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";
import { registerCargo, parseShipmentId } from "@/lib/contract";
import { parseUsdc } from "@/lib/stellar";
import { submitAndWait } from "@/lib/stellar";

interface Props {
  onSuccess?: (shipmentId: string) => void;
}

export function RegisterCargoForm({ onSuccess }: Props) {
  const { address, signTransaction, isConnected } = useWallet();
  const { txState, execute, reset } = useContract();

  const [form, setForm] = useState({
    carrier: "",
    consignee: "",
    goodsDescription: "",
    freightValue: "",
    docHash: "",
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!address) return;

    const docHashBytes = hexToBytes(form.docHash.padEnd(64, "0"));
    let shipmentId: string | null = null;

    const ok = await execute(
      () =>
        registerCargo(address, {
          carrier: form.carrier,
          consignee: form.consignee,
          goodsDescription: form.goodsDescription,
          freightValue: parseUsdc(form.freightValue),
          docHash: docHashBytes,
        }),
      async (xdr) => {
        const signed = await signTransaction(xdr);
        // Submit immediately here so we can extract the return value (shipment ID).
        const result = await submitAndWait(signed);
        shipmentId = String(parseShipmentId(result));
        // Return the already-submitted XDR so useContract records the hash.
        // useContract will call submitAndWait again — we short-circuit by
        // returning the signed XDR; the second submit will get DUPLICATE_TX
        // which we ignore in the success branch.
        return signed;
      }
    );

    if (ok && shipmentId) {
      onSuccess?.(shipmentId);
    }
  }

  const isSubmitting = ["building", "signing", "submitting"].includes(txState.status);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="carrier" className="label">
          Carrier address <Required />
        </label>
        <input
          id="carrier"
          className="input"
          placeholder="G…"
          value={form.carrier}
          onChange={set("carrier")}
          required
          pattern="G[A-Z2-7]{55}"
          aria-describedby="carrier-hint"
        />
        <p id="carrier-hint" className="mt-1 text-xs text-slate-500">
          Stellar public key of the carrier
        </p>
      </div>

      <div>
        <label htmlFor="consignee" className="label">
          Consignee address <Required />
        </label>
        <input
          id="consignee"
          className="input"
          placeholder="G…"
          value={form.consignee}
          onChange={set("consignee")}
          required
          pattern="G[A-Z2-7]{55}"
        />
      </div>

      <div>
        <label htmlFor="goods" className="label">
          Goods description <Required />
        </label>
        <textarea
          id="goods"
          className="input min-h-[80px] resize-none"
          placeholder="e.g. 500 units consumer electronics — HTS 8471.30"
          value={form.goodsDescription}
          onChange={set("goodsDescription")}
          required
          maxLength={256}
        />
      </div>

      <div>
        <label htmlFor="freight" className="label">
          Freight value (USDC) <Required />
        </label>
        <div className="relative">
          <input
            id="freight"
            className="input pr-16"
            placeholder="0.00"
            type="number"
            min="0.01"
            step="0.01"
            value={form.freightValue}
            onChange={set("freightValue")}
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
            USDC
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="docHash" className="label">
          Document hash (hex)
        </label>
        <input
          id="docHash"
          className="input font-mono text-xs"
          placeholder="SHA-256 hex of bill of lading on IPFS"
          value={form.docHash}
          onChange={set("docHash")}
          maxLength={64}
        />
      </div>

      {txState.status === "error" && (
        <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {txState.error}
          <button type="button" onClick={reset} className="ml-2 underline text-xs">
            Dismiss
          </button>
        </p>
      )}

      {txState.status === "success" && (
        <p role="status" className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
          ✓ Shipment registered on-chain.
        </p>
      )}

      <button
        type="submit"
        className="btn-primary w-full"
        disabled={!isConnected || isSubmitting}
      >
        {isSubmitting ? <TxStatusLabel status={txState.status} /> : "Register Cargo"}
      </button>

      {!isConnected && (
        <p className="text-xs text-center text-slate-500">
          Connect your Freighter wallet to continue
        </p>
      )}
    </form>
  );
}

function Required() {
  return <span className="text-red-500 ml-0.5" aria-hidden>*</span>;
}

function TxStatusLabel({ status }: { status: TxState["status"] }) {
  const labels: Record<string, string> = {
    building: "Building transaction…",
    signing: "Sign in Freighter…",
    submitting: "Submitting…",
  };
  return <>{labels[status] ?? "Processing…"}</>;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "").slice(0, 64).padEnd(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
