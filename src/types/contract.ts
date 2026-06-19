/** Wallet state exposed by useWallet hook. */
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string) => Promise<string>;
}

/** Generic async operation state for contract calls. */
export interface TxState {
  status: "idle" | "building" | "signing" | "submitting" | "success" | "error";
  txHash: string | null;
  error: string | null;
}

/** Parameters for registering a new cargo shipment. */
export interface RegisterCargoParams {
  carrier: string;
  consignee: string;
  goodsDescription: string;
  freightValue: string; // human-readable USDC, e.g. "500.00"
  docHash: string;      // hex string of the 32-byte document hash
}

/** Parameters for raising a dispute. */
export interface RaiseDisputeParams {
  shipmentId: string;
  reason: string;
}
