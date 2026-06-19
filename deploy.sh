#!/usr/bin/env bash
# CargoTrust — testnet/mainnet deployment script
set -euo pipefail

NETWORK="${1:-testnet}"

case "$NETWORK" in
  testnet)
    RPC_URL="https://soroban-testnet.stellar.org"
    HORIZON_URL="https://horizon-testnet.stellar.org"
    NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
    ;;
  mainnet)
    RPC_URL="https://soroban-mainnet.stellar.org"
    HORIZON_URL="https://horizon.stellar.org"
    NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
    ;;
  *)
    echo "Usage: $0 [testnet|mainnet]"
    exit 1
    ;;
esac

echo "🚀 Deploying CargoTrust to $NETWORK..."

# ── 1. Configure Stellar CLI network ─────────────────────────────────────────
stellar network add "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE" 2>/dev/null || true

# ── 2. Generate deployer account ──────────────────────────────────────────────
if ! stellar keys address deployer &>/dev/null; then
  echo "🔑 Generating deployer key..."
  stellar keys generate deployer --network "$NETWORK"
fi
DEPLOYER=$(stellar keys address deployer)
echo "Deployer: $DEPLOYER"

if [[ "$NETWORK" == "testnet" ]]; then
  echo "💸 Funding deployer via Friendbot..."
  curl -s "https://friendbot.stellar.org?addr=$DEPLOYER" > /dev/null
fi

# ── 3. Build contracts ────────────────────────────────────────────────────────
echo "🔨 Building contracts..."
cd contracts
cargo build --target wasm32-unknown-unknown --release --quiet
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/cargotrust.wasm
cd ..

WASM="contracts/target/wasm32-unknown-unknown/release/cargotrust.optimized.wasm"

# ── 4. Deploy contract ────────────────────────────────────────────────────────
echo "📦 Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source deployer \
  --network "$NETWORK")
echo "Contract ID: $CONTRACT_ID"

# ── 5. Deploy mock USDC (testnet only) ───────────────────────────────────────
if [[ "$NETWORK" == "testnet" ]]; then
  echo "💵 Deploying mock USDC token..."
  USDC_ID=$(stellar contract deploy \
    --wasm "$WASM" \
    --source deployer \
    --network "$NETWORK")
  echo "Mock USDC ID: $USDC_ID"
else
  echo "Enter your mainnet USDC token contract address:"
  read -r USDC_ID
fi

# ── 6. Generate test accounts (testnet) ──────────────────────────────────────
if [[ "$NETWORK" == "testnet" ]]; then
  for ACCT in admin arbitrator shipper carrier; do
    stellar keys generate "$ACCT" --network "$NETWORK" 2>/dev/null || true
    ADDR=$(stellar keys address "$ACCT")
    curl -s "https://friendbot.stellar.org?addr=$ADDR" > /dev/null
    echo "$ACCT: $ADDR"
  done
fi

ADMIN=$(stellar keys address admin)
ARBITRATOR=$(stellar keys address arbitrator)

# ── 7. Initialize contract ────────────────────────────────────────────────────
echo "⚙️  Initializing contract..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source deployer \
  --network "$NETWORK" \
  -- initialize \
  --admin "$ADMIN" \
  --usdc_token "$USDC_ID" \
  --platform_fee_bps 100 \
  --arbitrator "$ARBITRATOR"

# ── 8. Write .env.local ───────────────────────────────────────────────────────
cat > .env.local << EOF
NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID
NEXT_PUBLIC_USDC_TOKEN=$USDC_ID
NEXT_PUBLIC_NETWORK=$NETWORK
NEXT_PUBLIC_HORIZON_URL=$HORIZON_URL
NEXT_PUBLIC_SOROBAN_RPC=$RPC_URL
NEXT_PUBLIC_API_URL=http://localhost:4000
PLATFORM_FEE_BPS=100
DISPUTE_WINDOW_LEDGERS=17280
EOF

echo ""
echo "✅ Deployment complete!"
echo "   Contract ID : $CONTRACT_ID"
echo "   USDC Token  : $USDC_ID"
echo "   Network     : $NETWORK"
echo "   .env.local written — run: npm run dev"

if [[ "$NETWORK" == "testnet" ]]; then
  echo ""
  echo "🧪 Running sample shipment flow..."
  SHIPPER=$(stellar keys address shipper)
  CARRIER=$(stellar keys address carrier)
  CONSIGNEE="$DEPLOYER"

  SHIPMENT_ID=$(stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source shipper \
    --network "$NETWORK" \
    -- register_cargo \
    --shipper "$SHIPPER" \
    --carrier "$CARRIER" \
    --consignee "$CONSIGNEE" \
    --goods_description '"Test Electronics Shipment"' \
    --freight_value 1000000 \
    --doc_hash "0000000000000000000000000000000000000000000000000000000000000001")

  echo "   Sample Shipment ID: $SHIPMENT_ID"
  echo "🎉 Testnet setup complete!"
fi
