# Quick Start

Get a full CargoTrust shipment flow running on Stellar testnet in under 5 minutes.

## 1. Prerequisites

```bash
# Rust + wasm target
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown

# Stellar CLI
cargo install --locked stellar-cli

# Node.js (≥ 20)
node --version
```

## 2. Clone & Install

```bash
git clone https://github.com/your-org/cargotrust.git
cd cargotrust
npm install
```

## 3. Deploy to Testnet (One Command)

```bash
./deploy.sh testnet
```

This will:
- Generate test accounts for admin, arbitrator, shipper, and carrier
- Fund them with testnet XLM via Friendbot
- Build and deploy the CargoTrust contract
- Deploy a mock USDC token
- Initialize the contract
- Write all addresses to `.env.local`

## 4. Run the Frontend

```bash
npm run dev
# Open http://localhost:3000
```

## 5. Try the Full Shipment Flow

With the contract deployed, invoke these functions via Stellar CLI or the UI:

```bash
# Register a shipment
stellar contract invoke --id $CONTRACT_ID --source shipper --network testnet \
  -- register_cargo \
  --shipper $(stellar keys address shipper) \
  --carrier $(stellar keys address carrier) \
  --consignee $(stellar keys address shipper) \
  --goods_description '"Test Electronics"' \
  --freight_value 1000000 \
  --doc_hash "0000000000000000000000000000000000000000000000000000000000000001"

# Fund escrow (shipment_id = 1)
stellar contract invoke --id $CONTRACT_ID --source shipper --network testnet \
  -- fund_escrow --shipment_id 1 --amount 1000000

# Carrier accepts
stellar contract invoke --id $CONTRACT_ID --source carrier --network testnet \
  -- accept_shipment --shipment_id 1

# Post pickup milestone
stellar contract invoke --id $CONTRACT_ID --source carrier --network testnet \
  -- post_milestone --shipment_id 1 --status PickedUp \
  --location '"Shanghai Port"' --doc_hash null

# Submit delivery proof
stellar contract invoke --id $CONTRACT_ID --source carrier --network testnet \
  -- submit_delivery_proof --shipment_id 1 \
  --proof_hash "0000000000000000000000000000000000000000000000000000000000000002"

# Shipper confirms delivery → escrow released
stellar contract invoke --id $CONTRACT_ID --source shipper --network testnet \
  -- confirm_delivery --shipment_id 1
```

## 6. Run Contract Tests

```bash
cd contracts && cargo test --features testutils
```

---

For full deployment options see [DEPLOYMENT.md](DEPLOYMENT.md).
For contribution guidelines see [CONTRIBUTING.md](CONTRIBUTING.md).
