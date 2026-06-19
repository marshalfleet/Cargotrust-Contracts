import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
        <span className="inline-block mb-4 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-inset ring-brand-500/20">
          Built on Stellar · Powered by Soroban
        </span>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          Freight you can{" "}
          <span className="text-brand-600">trust</span>.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600 leading-relaxed">
          Register cargo on-chain, lock USDC in escrow, and release payment
          automatically on confirmed delivery — all for $0.00001 per transaction.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/dashboard" className="btn-primary text-base px-6 py-3">
            Ship Cargo →
          </Link>
          <a
            href="https://github.com/your-org/cargotrust"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-base px-6 py-3"
          >
            View on GitHub
          </a>
        </div>
      </section>

      {/* Feature grid */}
      <section className="bg-slate-50 border-y border-slate-200 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900 mb-14">
            Everything a freight platform should be
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div className="text-2xl mb-3" aria-hidden>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lifecycle steps */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">
          How it works
        </h2>
        <ol className="relative border-l border-slate-200 space-y-10 ml-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="ml-8">
              <span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white text-sm font-bold ring-4 ring-white">
                {i + 1}
              </span>
              <h3 className="font-semibold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    icon: "📦",
    title: "On-Chain Registration",
    body: "Every shipment is an immutable on-chain record with goods description, parties, and an IPFS document hash.",
  },
  {
    icon: "🔒",
    title: "Automated Escrow",
    body: "USDC freight payment is locked in contract escrow and released automatically when delivery is confirmed.",
  },
  {
    icon: "📍",
    title: "Milestone Tracking",
    body: "Carriers post pickup, in-transit, and delivery milestones on-chain — tamper-proof and visible to all parties.",
  },
  {
    icon: "⚖️",
    title: "Dispute Resolution",
    body: "Either party can raise a dispute. An on-chain arbitrator adjudicates and distributes escrow per outcome.",
  },
  {
    icon: "⭐",
    title: "Carrier Reputation",
    body: "On-chain delivery completion records build a verifiable carrier reputation score over time.",
  },
  {
    icon: "💸",
    title: "$0.00001 Fees",
    body: "Stellar's near-zero fees make micro-freight economically viable for small shippers worldwide.",
  },
] as const;

const STEPS = [
  {
    title: "Register Cargo",
    body: "Shipper connects Freighter wallet, fills in cargo details, uploads shipping documents to IPFS, and calls register_cargo.",
  },
  {
    title: "Fund Escrow",
    body: "Shipper approves USDC transfer and locks freight value in contract escrow. Carrier accepts the booking.",
  },
  {
    title: "Transit Milestones",
    body: "Carrier posts pickup, in-transit, and delivery milestones on-chain. Each milestone is an immutable log entry.",
  },
  {
    title: "Confirm Delivery",
    body: "Shipper confirms receipt. Contract atomically releases USDC to carrier (minus 1% platform fee). No invoice cycle.",
  },
] as const;
