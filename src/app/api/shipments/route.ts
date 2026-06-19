import { NextRequest, NextResponse } from "next/server";
import type { ShipmentSummary } from "@/types/shipment";

/**
 * GET /api/shipments
 *
 * Query params:
 *   - address  (optional) — filter by shipper or carrier public key
 *   - status   (optional) — filter by ShipmentStatus
 *   - page     (optional, default 1)
 *   - limit    (optional, default 20, max 100)
 *
 * In production this would query an off-chain indexer that listens to
 * cargo_registered / milestone_posted events from the Soroban contract.
 * For now it returns a typed stub so the frontend wiring compiles.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const address = searchParams.get("address");
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

  // TODO: replace stub with real indexer query
  const shipments: ShipmentSummary[] = [];

  return NextResponse.json({
    data: shipments,
    meta: {
      page,
      limit,
      total: 0,
      filters: { address, status },
    },
  });
}

/**
 * POST /api/shipments
 *
 * Used by the frontend to notify the off-chain indexer after a successful
 * register_cargo transaction so it can backfill immediately without waiting
 * for the next event poll cycle.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.txHash !== "string" || typeof body.shipmentId !== "string") {
    return NextResponse.json(
      { error: "txHash and shipmentId are required" },
      { status: 400 }
    );
  }

  // TODO: trigger indexer backfill for body.shipmentId
  return NextResponse.json({ ok: true, shipmentId: body.shipmentId }, { status: 202 });
}
