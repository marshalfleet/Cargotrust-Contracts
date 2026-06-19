# CargoTrust — testnet/mainnet deployment script (PowerShell)
param(
    [ValidateSet("testnet", "mainnet")]
    [string]$Network = "testnet"
)
$ErrorActionPreference = "Stop"

switch ($Network) {
    "testnet" {
        $RpcUrl = "https://soroban-testnet.stellar.org"
        $HorizonUrl = "https://horizon-testnet.stellar.org"
        $Passphrase = "Test SDF Network ; September 2015"
    }
    "mainnet" {
        $RpcUrl = "https://soroban-mainnet.stellar.org"
        $HorizonUrl = "https://horizon.stellar.org"
        $Passphrase = "Public Global Stellar Network ; September 2015"
    }
}

Write-Host "🚀 Deploying CargoTrust to $Network..." -ForegroundColor Cyan

# ── 1. Configure network ──────────────────────────────────────────────────────
stellar network add $Network `
    --rpc-url $RpcUrl `
    --network-passphrase $Passphrase 2>$null

# ── 2. Deployer account ───────────────────────────────────────────────────────
stellar keys generate deployer --network $Network 2>$null
$Deployer = (stellar keys address deployer).Trim()
Write-Host "Deployer: $Deployer"

if ($Network -eq "testnet") {
    Write-Host "💸 Funding deployer..." -ForegroundColor Yellow
    Invoke-RestMethod "https://friendbot.stellar.org?addr=$Deployer" | Out-Null
}

# ── 3. Build ──────────────────────────────────────────────────────────────────
Write-Host "🔨 Building contracts..." -ForegroundColor Yellow
Push-Location contracts
cargo build --target wasm32-unknown-unknown --release --quiet
stellar contract optimize --wasm target/wasm32-unknown-unknown/release/cargotrust.wasm
Pop-Location

$Wasm = "contracts/target/wasm32-unknown-unknown/release/cargotrust.optimized.wasm"

# ── 4. Deploy ─────────────────────────────────────────────────────────────────
Write-Host "📦 Deploying contract..." -ForegroundColor Yellow
$ContractId = (stellar contract deploy --wasm $Wasm --source deployer --network $Network).Trim()
Write-Host "Contract ID: $ContractId"

# ── 5. USDC token ─────────────────────────────────────────────────────────────
if ($Network -eq "testnet") {
    $UsdcId = (stellar contract deploy --wasm $Wasm --source deployer --network $Network).Trim()
    Write-Host "Mock USDC ID: $UsdcId"
} else {
    $UsdcId = Read-Host "Enter mainnet USDC token contract address"
}

# ── 6. Test accounts ──────────────────────────────────────────────────────────
if ($Network -eq "testnet") {
    foreach ($Acct in @("admin", "arbitrator", "shipper", "carrier")) {
        stellar keys generate $Acct --network $Network 2>$null
        $Addr = (stellar keys address $Acct).Trim()
        Invoke-RestMethod "https://friendbot.stellar.org?addr=$Addr" | Out-Null
        Write-Host "${Acct}: $Addr"
    }
}

$Admin = (stellar keys address admin).Trim()
$Arbitrator = (stellar keys address arbitrator).Trim()

# ── 7. Initialize ─────────────────────────────────────────────────────────────
Write-Host "⚙️  Initializing contract..." -ForegroundColor Yellow
stellar contract invoke `
    --id $ContractId `
    --source deployer `
    --network $Network `
    -- initialize `
    --admin $Admin `
    --usdc_token $UsdcId `
    --platform_fee_bps 100 `
    --arbitrator $Arbitrator

# ── 8. Write .env.local ───────────────────────────────────────────────────────
@"
NEXT_PUBLIC_CONTRACT_ID=$ContractId
NEXT_PUBLIC_USDC_TOKEN=$UsdcId
NEXT_PUBLIC_NETWORK=$Network
NEXT_PUBLIC_HORIZON_URL=$HorizonUrl
NEXT_PUBLIC_SOROBAN_RPC=$RpcUrl
NEXT_PUBLIC_API_URL=http://localhost:4000
PLATFORM_FEE_BPS=100
DISPUTE_WINDOW_LEDGERS=17280
"@ | Set-Content .env.local

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "   Contract ID : $ContractId"
Write-Host "   USDC Token  : $UsdcId"
Write-Host "   Network     : $Network"
Write-Host "   .env.local written — run: npm run dev"
