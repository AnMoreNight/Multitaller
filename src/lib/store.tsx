import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/lib/auth";
import {
  customers as seedCustomers,
  vehicles as seedVehicles,
  initialOrders as seedOrders,
  partsCatalog as seedPartsCatalog,
  demoWorkshop,
  type Customer,
  type PartCatalogItem,
  type Vehicle,
  type WorkOrder,
} from "@/lib/taller-data";

// A single in-memory store shared across routes for this session. Replaces the old
// per-page `useState(initialOrders)` copies now that pages link to each other
// (dashboard -> order detail, vehicle/customer history, etc.) and need to see the
// same data. Still resets on reload — real persistence is in progress, see DEPLOY.md.
//
// Every row is tenant-scoped by workshopId. The provider reads and writes are scoped
// to the signed-in user's own workshop rather than trusting a workshopId a caller
// might pass in, so a second workshop's data can never leak into this one (or vice
// versa) even though callers no longer need to think about tenancy at all.
type DataContextValue = {
  customers: Customer[];
  vehicles: Vehicle[];
  orders: WorkOrder[];
  partsCatalog: PartCatalogItem[];
  addCustomer: (customer: Omit<Customer, "workshopId">) => void;
  addVehicle: (vehicle: Omit<Vehicle, "workshopId">) => void;
  addOrder: (order: Omit<WorkOrder, "workshopId">) => void;
  updateOrder: (orderId: string, updater: (order: WorkOrder) => WorkOrder) => void;
  addPart: (part: Omit<PartCatalogItem, "workshopId">) => void;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const workshopId = user?.workshopId ?? demoWorkshop.id;

  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [vehicles, setVehicles] = useState<Vehicle[]>(seedVehicles);
  const [orders, setOrders] = useState<WorkOrder[]>(seedOrders);
  const [partsCatalog, setPartsCatalog] = useState<PartCatalogItem[]>(seedPartsCatalog);

  const value = useMemo<DataContextValue>(() => {
    const scoped = <T extends { workshopId: string }>(rows: T[]) =>
      rows.filter((row) => row.workshopId === workshopId);

    return {
      customers: scoped(customers),
      vehicles: scoped(vehicles),
      orders: scoped(orders),
      partsCatalog: scoped(partsCatalog),
      addCustomer: (customer) =>
        setCustomers((current) => [{ ...customer, workshopId }, ...current]),
      addVehicle: (vehicle) => setVehicles((current) => [{ ...vehicle, workshopId }, ...current]),
      addOrder: (order) => setOrders((current) => [{ ...order, workshopId }, ...current]),
      updateOrder: (orderId, updater) =>
        setOrders((current) =>
          current.map((order) => (order.id === orderId ? updater(order) : order)),
        ),
      addPart: (part) => setPartsCatalog((current) => [{ ...part, workshopId }, ...current]),
    };
  }, [customers, vehicles, orders, partsCatalog, workshopId]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider");
  return context;
}
