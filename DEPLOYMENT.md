# Deployment Guide

Full deployment reference for CargoTrust on Stellar testnet and mainnet.

## Prerequisites

- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/stellar-cli) ≥ 0.9
- Rust toolchain with `wasm32-unknown-unknown` target
- Node.js ≥ 20

```bash
rustup target add wasm32-unknown-unknown
```

## Automated Deployment (Recommended)

The deploy scripts handle everything: key generation, funding, build, deploy, initialize, and `.env.local` generation.

**Linux/macOS:**
```bash
chmod +x deploy.sh
./deploy.sh testnet      # or mainnet
```

**Windows (PowerShell):**
```powershell
.\deploy.ps1 -Network testnet
```

## Manual Deployment

### 1. Configure Stellar CLI

```bash
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

### 2. Create and Fund Deployer

```bash
stellar keys generate deployer --network testnet
# Fund via Friendbot (testnet only)
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

### 3. Build and Optimize

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/cargotrust.wasm
```

### 4. Deploy Contract

```bash
CONTRACT_ID=$(stellar contract deploy \
  --wasm contracts/target/wasm32-unknown-unknown/release/cargotrust.optimized.wasm \
  --source deployer \
  --network testnet)
echo $CONTRACT_ID
```

### 5. Initialize Contract

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <ADMIN_ADDRESS> \
  --usdc_token <USDC_CONTRACT_ADDRESS> \
  --platform_fee_bps 100 \
  --arbitrator <ARBITRATOR_ADDRESS>
```

### 6. Verify Deployment

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- health
# Expected: true
```

### 7. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with CONTRACT_ID, USDC_TOKEN, etc.
npm run dev
```

## Contract Parameters

| Parameter          | Default | Description                                        |
|--------------------|---------|----------------------------------------------------|
| `platform_fee_bps` | 100     | Platform fee: 100 bps = 1%                        |
| `arbitrator`       | —       | Stellar address authorized to resolve disputes     |

## Upgrading

Soroban contracts are immutable once deployed. To upgrade:
1. Deploy the new WASM as a new contract
2. Update `NEXT_PUBLIC_CONTRACT_ID` in `.env.local`
3. Migrate any off-chain state to the new contract address

## Mainnet Checklist

- [ ] Audit completed
- [ ] `platform_fee_bps` reviewed and set correctly
- [ ] Arbitrator is a multi-sig or governance account
- [ ] Admin is a multi-sig wallet
- [ ] USDC token address verified for mainnet
- [ ] Contract ID saved and documented
- [ ] CI passing on `main`
