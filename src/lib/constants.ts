export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK ?? "testnet") as
  | "testnet"
  | "mainnet";

export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
export const USDC_TOKEN = process.env.NEXT_PUBLIC_USDC_TOKEN ?? "";

export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ??
  "https://horizon-testnet.stellar.org";

export const SOROBAN_RPC =
  process.env.NEXT_PUBLIC_SOROBAN_RPC ??
  "https://soroban-testnet.stellar.org";

export const NETWORK_PASSPHRASE: Record<"testnet" | "mainnet", string> = {
  testnet: "Test SDF Network ; September 2015",
  mainnet: "Public Global Stellar Network ; September 2015",
};

export const USDC_DECIMALS = 7; // Stellar USDC uses 7 decimal places
export const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? 100);
export const DISPUTE_WINDOW_LEDGERS = Number(
  process.env.DISPUTE_WINDOW_LEDGERS ?? 17_280
);
