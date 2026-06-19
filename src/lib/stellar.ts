import {
  SorobanRpc,
  Horizon,
  Networks,
  Transaction,
  FeeBumpTransaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { SOROBAN_RPC, HORIZON_URL, NETWORK } from "./constants";

export const rpc = new SorobanRpc.Server(SOROBAN_RPC, {
  allowHttp: NETWORK === "testnet",
});

export const horizon = new Horizon.Server(HORIZON_URL, {
  allowHttp: NETWORK === "testnet",
});

export const networkPassphrase =
  NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

export async function simulate(
  tx: Transaction | FeeBumpTransaction
): Promise<SorobanRpc.Api.SimulateTransactionSuccessResponse> {
  const response = await rpc.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(response)) {
    throw new Error(`Simulation failed: ${response.error}`);
  }
  if (SorobanRpc.Api.isSimulationRestore(response)) {
    throw new Error("Ledger entry restore required before submitting.");
  }
  return response as SorobanRpc.Api.SimulateTransactionSuccessResponse;
}

/**
 * Submit a signed XDR string and poll until confirmed.
 * `signedXdr` is the base64 XDR envelope produced by Freighter.
 */
export async function submitAndWait(
  signedXdr: string
): Promise<SorobanRpc.Api.GetSuccessfulTransactionResponse> {
  const tx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase);

  const sendResponse = await rpc.sendTransaction(tx);

  if (sendResponse.status === "ERROR") {
    throw new Error(
      `Transaction rejected: ${JSON.stringify(sendResponse.errorResult)}`
    );
  }

  const { hash } = sendResponse;
  for (let i = 0; i < 30; i++) {
    const result = await rpc.getTransaction(hash);
    if (result.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return result as SorobanRpc.Api.GetSuccessfulTransactionResponse;
    }
    if (result.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed on-chain: ${JSON.stringify(result)}`);
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error("Transaction confirmation timeout after 30s");
}

export function formatUsdc(stroops: bigint | number): string {
  const amount = typeof stroops === "bigint" ? stroops : BigInt(stroops);
  const whole = amount / 10_000_000n;
  const fraction = (amount % 10_000_000n).toString().padStart(7, "0");
  return `${whole}.${fraction} USDC`;
}

export function parseUsdc(amount: string): bigint {
  const [whole = "0", fraction = "0"] = amount.split(".");
  const paddedFraction = fraction.slice(0, 7).padEnd(7, "0");
  return BigInt(whole) * 10_000_000n + BigInt(paddedFraction);
}
