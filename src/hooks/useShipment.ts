"use client";

import { useState, useEffect, useCallback } from "react";
import { getShipment, getMilestones, getEscrowBalance } from "@/lib/contract";
import type { Shipment, Milestone } from "@/types/shipment";

interface ShipmentState {
  shipment: Shipment | null;
  milestones: Milestone[];
  escrowBalance: bigint;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useShipment(shipmentId: string | null): ShipmentState {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [escrowBalance, setEscrowBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!shipmentId) return;
    const id = BigInt(shipmentId);
    setIsLoading(true);
    setError(null);

    Promise.all([getShipment(id), getMilestones(id), getEscrowBalance(id)])
      .then(([s, m, b]) => {
        setShipment(s);
        setMilestones(m);
        setEscrowBalance(b);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setIsLoading(false));
  }, [shipmentId, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { shipment, milestones, escrowBalance, isLoading, error, refetch };
}
