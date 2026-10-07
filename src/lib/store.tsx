import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { createCustomer, deleteCustomer, listCustomers } from "@/lib/server/customers.functions";
import {
  createOrder,
  deleteOrder as deleteOrderFn,
  listOrders,
  updateOrder as updateOrderFn,
} from "@/lib/server/orders.functions";
import { createPart, listPartsCatalog } from "@/lib/server/parts.functions";
import { createVehicle, deleteVehicle, listVehicles } from "@/lib/server/vehicles.functions";
import type { Customer, PartCatalogItem, Vehicle, WorkOrder } from "@/lib/taller-data";
import { errorMessage } from "@/lib/utils";

// Real Postgres data now (see src/lib/server/*.functions.ts), scoped by the
// signed-in user's workshopId server-side — never a client-supplied one, so
// a second workshop's data can never leak into this one. Every list query
// defaults to [] while pending, which is what keeps useData()'s shape stable
// (always real arrays, never undefined) for every page that calls it.
const DEFAULT_MONTHLY_GOAL = 10000;
const UPDATE_ORDER_DEBOUNCE_MS = 500;

type DataContextValue = {
  customers: Customer[];
  vehicles: Vehicle[];
  orders: WorkOrder[];
  partsCatalog: PartCatalogItem[];
  /** True only during each list's first fetch (not background refetches) —
   * a detail page must check this before concluding a missing id means
   * "doesn't exist" rather than "hasn't loaded yet". */
  isLoading: boolean;
  /** Admin-set revenue target for the current workshop, shown on the sidebar's goal widget. */
  monthlyGoal: number;
  addCustomer: (customer: Omit<Customer, "workshopId" | "id">) => Promise<Customer>;
  addVehicle: (vehicle: Omit<Vehicle, "workshopId" | "id">) => Promise<Vehicle>;
  addOrder: (order: Omit<WorkOrder, "workshopId" | "id" | "labor" | "parts">) => Promise<WorkOrder>;
  /** Applies instantly to local state and the UI; the network write is
   * debounced per orderId so rapid edits (typing, repeated clicks) coalesce
   * into one request instead of firing on every keystroke. */
  updateOrder: (orderId: string, updater: (order: WorkOrder) => WorkOrder) => void;
  addPart: (part: Omit<PartCatalogItem, "workshopId" | "id">) => Promise<PartCatalogItem>;
  /** Also deletes the customer's vehicles and orders server-side (no "archive" yet). */
  removeCustomer: (customerId: string) => Promise<void>;
  /** Also deletes the vehicle's orders server-side (no "archive" yet). */
  removeVehicle: (vehicleId: string) => Promise<void>;
  removeOrder: (orderId: string) => Promise<void>;
  setMonthlyGoal: (amount: number) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const workshopId = user?.workshopId;
  const queryClient = useQueryClient();

  const ordersKey = ["workshop", workshopId, "orders"];

  const customersQuery = useQuery({
    queryKey: ["workshop", workshopId, "customers"],
    queryFn: () => listCustomers(),
    enabled: Boolean(workshopId),
  });
  const vehiclesQuery = useQuery({
    queryKey: ["workshop", workshopId, "vehicles"],
    queryFn: () => listVehicles(),
    enabled: Boolean(workshopId),
  });
  const ordersQuery = useQuery({
    queryKey: ordersKey,
    queryFn: () => listOrders(),
    enabled: Boolean(workshopId),
  });
  const partsQuery = useQuery({
    queryKey: ["workshop", workshopId, "parts"],
    queryFn: () => listPartsCatalog(),
    enabled: Boolean(workshopId),
  });

  const customers = customersQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const orders = ordersQuery.data ?? [];
  const partsCatalog = partsQuery.data ?? [];
  const isLoading =
    customersQuery.isLoading ||
    vehiclesQuery.isLoading ||
    ordersQuery.isLoading ||
    partsQuery.isLoading;

  // Per-workshop admin goal — still client-only (no schema field for it yet);
  // unrelated to the persistence fix, left exactly as it was.
  const [monthlyGoals, setMonthlyGoals] = useState<Record<string, number>>({});
  const monthlyGoal = workshopId
    ? (monthlyGoals[workshopId] ?? DEFAULT_MONTHLY_GOAL)
    : DEFAULT_MONTHLY_GOAL;

  const createCustomerMutation = useMutation({
    mutationFn: (input: Omit<Customer, "workshopId" | "id">) => createCustomer({ data: input }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["workshop", workshopId, "customers"] }),
  });
  const createVehicleMutation = useMutation({
    mutationFn: (input: Omit<Vehicle, "workshopId" | "id">) => createVehicle({ data: input }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["workshop", workshopId, "vehicles"] }),
  });
  const createOrderMutation = useMutation({
    mutationFn: (input: Omit<WorkOrder, "workshopId" | "id" | "labor" | "parts">) =>
      createOrder({
        data: {
          customerId: input.customerId,
          vehicleId: input.vehicleId,
          createdAt: input.createdAt,
          reason: input.reason,
          warningLights: input.warningLights,
          complaint: input.complaint,
          status: input.status,
          diagnosisFee: input.diagnosis.fee,
          diagnosisWaived: input.diagnosis.waived,
          applyMaterialsFee: input.applyMaterialsFee,
          warrantyOf: input.warrantyOf,
        },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });
  const createPartMutation = useMutation({
    mutationFn: (input: Omit<PartCatalogItem, "workshopId" | "id">) => createPart({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workshop", workshopId, "parts"] }),
  });
  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: string) => deleteCustomer({ data: { customerId } }),
    onSuccess: () => {
      // Cascades server-side to the customer's vehicles and orders too.
      queryClient.invalidateQueries({ queryKey: ["workshop", workshopId, "customers"] });
      queryClient.invalidateQueries({ queryKey: ["workshop", workshopId, "vehicles"] });
      queryClient.invalidateQueries({ queryKey: ordersKey });
    },
  });
  const deleteOrderMutation = useMutation({
    mutationFn: (orderId: string) => deleteOrderFn({ data: { orderId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ordersKey }),
  });
  const deleteVehicleMutation = useMutation({
    mutationFn: (vehicleId: string) => deleteVehicle({ data: { vehicleId } }),
    onSuccess: () => {
      // Cascades server-side to the vehicle's orders too.
      queryClient.invalidateQueries({ queryKey: ["workshop", workshopId, "vehicles"] });
      queryClient.invalidateQueries({ queryKey: ordersKey });
    },
  });

  // orderId -> latest not-yet-sent order state, and orderId -> pending debounce
  // timer. Both outlive individual renders (refs, not state) since neither
  // should itself trigger a re-render -- the optimistic setQueryData call
  // below is what updates the UI.
  const pendingOrdersRef = useRef<Map<string, WorkOrder>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function updateOrder(orderId: string, updater: (order: WorkOrder) => WorkOrder) {
    const base =
      pendingOrdersRef.current.get(orderId) ?? orders.find((order) => order.id === orderId);
    if (!base) return;
    const next = updater(base);
    pendingOrdersRef.current.set(orderId, next);

    queryClient.setQueryData<WorkOrder[]>(ordersKey, (current) =>
      (current ?? []).map((order) => (order.id === orderId ? next : order)),
    );

    const existingTimer = timersRef.current.get(orderId);
    if (existingTimer) clearTimeout(existingTimer);
    timersRef.current.set(
      orderId,
      setTimeout(() => {
        timersRef.current.delete(orderId);
        const pending = pendingOrdersRef.current.get(orderId);
        pendingOrdersRef.current.delete(orderId);
        if (!pending) return;
        updateOrderFn({
          data: {
            orderId,
            changes: {
              reason: pending.reason,
              warningLights: pending.warningLights,
              complaint: pending.complaint,
              status: pending.status,
              diagnosisFee: pending.diagnosis.fee,
              diagnosisWaived: pending.diagnosis.waived,
              applyMaterialsFee: pending.applyMaterialsFee,
              labor: pending.labor,
              parts: pending.parts,
            },
          },
        })
          .then((saved) => {
            queryClient.setQueryData<WorkOrder[]>(ordersKey, (current) =>
              (current ?? []).map((order) => (order.id === orderId ? saved : order)),
            );
          })
          .catch((err: unknown) => {
            toast.error(
              errorMessage(
                err,
                "No se pudo guardar el último cambio en la orden. Intenta de nuevo.",
              ),
            );
            queryClient.invalidateQueries({ queryKey: ordersKey });
          });
      }, UPDATE_ORDER_DEBOUNCE_MS),
    );
  }

  const value: DataContextValue = {
    customers,
    vehicles,
    orders,
    partsCatalog,
    isLoading,
    monthlyGoal,
    addCustomer: (customer) => createCustomerMutation.mutateAsync(customer),
    addVehicle: (vehicle) => createVehicleMutation.mutateAsync(vehicle),
    addOrder: (order) => createOrderMutation.mutateAsync(order),
    updateOrder,
    addPart: (part) => createPartMutation.mutateAsync(part),
    removeCustomer: (customerId) => deleteCustomerMutation.mutateAsync(customerId),
    removeVehicle: (vehicleId) => deleteVehicleMutation.mutateAsync(vehicleId),
    removeOrder: (orderId) => deleteOrderMutation.mutateAsync(orderId),
    setMonthlyGoal: (amount) => {
      if (!workshopId) return;
      setMonthlyGoals((current) => ({ ...current, [workshopId]: amount }));
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
}
