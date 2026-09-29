// Demo data only — kept in frontend modules until the Postgres backend (src/lib/db/)
// is fully wired up. Shapes are relational (workshopId / customerId / vehicleId) on
// purpose, so this can move to the real multi-tenant backend without changing the
// UI's data contracts — see src/lib/db/schema.ts, which mirrors these types.

export type BusinessType = "mechanical_workshop";

export type Workshop = {
  id: string;
  name: string;
  businessType: BusinessType;
  /** A system_admin can deactivate a workshop (e.g. non-payment) without deleting its data. */
  isActive: boolean;
};

export const demoWorkshop: Workshop = {
  id: "w1",
  name: "Ferro Taller",
  businessType: "mechanical_workshop",
  isActive: true,
};

/**
 * system_admin is platform-level: creates workshops and their first admin, never
 * belongs to one itself (see AppUser.workshopId below). It has no demo account or
 * UI yet — it's reflected here so the shape matches src/lib/db/schema.ts ahead of
 * the real backend, not because it's reachable in the current demo.
 */
export type Role = "system_admin" | "admin" | "worker";

export type AppUser = {
  id: string;
  /** Absent only for role = "system_admin" — every admin/worker belongs to exactly one workshop. */
  workshopId?: string;
  name: string;
  title: string;
  role: Role;
  /** Workers can't edit data by default; this is the one permission the client asked for. */
  canChangeOrderStatus: boolean;
};

export const demoUsers: AppUser[] = [
  {
    id: "u1",
    workshopId: "w1",
    name: "Andrea Ruiz",
    title: "Administradora",
    role: "admin",
    canChangeOrderStatus: true,
  },
  {
    id: "u2",
    workshopId: "w1",
    name: "Jorge Herrera",
    title: "Mecánico jefe",
    role: "worker",
    canChangeOrderStatus: true,
  },
];

export type Customer = {
  id: string;
  workshopId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export const customers: Customer[] = [
  {
    id: "c1",
    workshopId: "w1",
    name: "Lucía Ríos",
    phone: "+34 612 440 218",
    email: "lucia.rios@correo.es",
  },
  {
    id: "c2",
    workshopId: "w1",
    name: "Miguel Torres",
    phone: "+34 655 902 347",
    email: "m.torres@correo.es",
  },
  {
    id: "c3",
    workshopId: "w1",
    name: "Carla Delgado",
    phone: "+34 600 318 552",
    email: "carla.d@correo.es",
  },
  {
    id: "c4",
    workshopId: "w1",
    name: "Andrés Fuentes",
    phone: "+34 699 741 063",
    email: "a.fuentes@correo.es",
    notes: "Prefiere que lo llamen antes de pedir repuestos.",
  },
  {
    id: "c5",
    workshopId: "w1",
    name: "Sofía Medina",
    phone: "+34 622 508 194",
    email: "sofia.medina@correo.es",
  },
  {
    id: "c6",
    workshopId: "w1",
    name: "Raúl Campos",
    phone: "+34 677 215 830",
    email: "raul.campos@correo.es",
  },
];

export type Vehicle = {
  id: string;
  workshopId: string;
  customerId: string;
  vin?: string;
  plate?: string;
  make: string;
  model: string;
  year: number;
  color?: string;
  notes?: string;
};

export const vehicles: Vehicle[] = [
  {
    id: "v1",
    workshopId: "w1",
    customerId: "c1",
    plate: "LKM-482",
    vin: "3N1CN7AP8ML123456",
    make: "Nissan",
    model: "Versa",
    year: 2021,
    color: "Gris plata",
  },
  {
    id: "v2",
    workshopId: "w1",
    customerId: "c2",
    plate: "JPR-109",
    make: "Chevrolet",
    model: "Aveo",
    year: 2019,
    color: "Blanco",
  },
  {
    id: "v3",
    workshopId: "w1",
    customerId: "c2",
    plate: "GTH-884",
    make: "Toyota",
    model: "Hilux",
    year: 2016,
    color: "Azul",
  },
  {
    id: "v4",
    workshopId: "w1",
    customerId: "c3",
    plate: "NVD-736",
    vin: "JF2SJAWC5NH123456",
    make: "Subaru",
    model: "Forester",
    year: 2022,
    color: "Negro",
  },
  {
    id: "v5",
    workshopId: "w1",
    customerId: "c4",
    plate: "KZS-513",
    make: "Kia",
    model: "Sorento",
    year: 2020,
    color: "Rojo",
  },
  {
    id: "v6",
    workshopId: "w1",
    customerId: "c4",
    plate: "RDF-220",
    make: "Nissan",
    model: "Frontier",
    year: 2015,
    color: "Gris",
  },
  {
    id: "v7",
    workshopId: "w1",
    customerId: "c5",
    plate: "MZT-204",
    make: "Mazda",
    model: "3",
    year: 2023,
    color: "Blanco perla",
  },
  {
    id: "v8",
    workshopId: "w1",
    customerId: "c6",
    plate: "HGT-771",
    make: "Honda",
    model: "CR-V",
    year: 2018,
    color: "Plata",
  },
];

export const warningLightOptions = [
  "Check Engine",
  "Presión de llantas",
  "ABS",
  "Batería",
  "Aceite",
  "Otro",
] as const;
export type WarningLight = (typeof warningLightOptions)[number];

export type OrderStatus =
  | "Pendiente inspección"
  | "Esperando repuesto"
  | "En proceso"
  | "Completado"
  | "Entregado"
  | "Garantía";

/** The normal forward path. "Garantía" is a side-state reached from a follow-up order, not a step in this flow. */
export const orderStatusFlow: OrderStatus[] = [
  "Pendiente inspección",
  "Esperando repuesto",
  "En proceso",
  "Completado",
  "Entregado",
];

export type LaborItem = {
  id: string;
  description: string;
  price: number;
};

export type PartLine = {
  id: string;
  /** Set when the line was added from the parts catalog, so the catalog can be updated later. */
  partId?: string;
  name: string;
  workshopCost: number;
  customerPrice: number;
  warranty: boolean;
  qty: number;
};

export type WorkOrder = {
  id: string;
  workshopId: string;
  customerId: string;
  vehicleId: string;
  createdAt: string; // ISO date
  reason: string;
  warningLights: WarningLight[];
  complaint?: string;
  status: OrderStatus;
  diagnosis: { fee: number; waived: boolean };
  labor: LaborItem[];
  parts: PartLine[];
  /** Optional 3.5% fee for liquids/materials — the client applies it per job, not automatically. */
  applyMaterialsFee: boolean;
  /** Id of the original order this warranty visit is covering, if status is "Garantía". */
  warrantyOf?: string;
};

export const initialOrders: WorkOrder[] = [
  {
    id: "FT-2049",
    workshopId: "w1",
    customerId: "c1",
    vehicleId: "v1",
    createdAt: "2026-09-28",
    reason: "Diagnóstico y batería",
    warningLights: ["Batería"],
    complaint: "El vehículo no enciende algunas mañanas.",
    status: "En proceso",
    diagnosis: { fee: 80, waived: true },
    labor: [
      {
        id: "l1",
        description: "Reemplazo de batería — mano de obra",
        price: 40,
      },
    ],
    parts: [
      {
        id: "p-l1",
        partId: "pc3",
        name: "Batería 12V 60Ah",
        workshopCost: 70,
        customerPrice: 112,
        warranty: true,
        qty: 1,
      },
    ],
    applyMaterialsFee: false,
  },
  {
    id: "FT-2050",
    workshopId: "w1",
    customerId: "c2",
    vehicleId: "v2",
    createdAt: "2026-09-29",
    reason: "Cambio de transmisión",
    warningLights: ["Check Engine"],
    complaint: "Cambios bruscos y ruido en la caja.",
    status: "Esperando repuesto",
    diagnosis: { fee: 80, waived: true },
    labor: [
      {
        id: "l2",
        description: "Mano de obra — cambio de transmisión",
        price: 450,
      },
    ],
    parts: [
      {
        id: "p-l2a",
        partId: "pc7",
        name: "Transmisión automática reacondicionada",
        workshopCost: 1200,
        customerPrice: 1850,
        warranty: true,
        qty: 1,
      },
      {
        id: "p-l2b",
        partId: "pc8",
        name: "Kit de líquido de transmisión",
        workshopCost: 35,
        customerPrice: 60,
        warranty: false,
        qty: 2,
      },
    ],
    applyMaterialsFee: true,
  },
  {
    id: "FT-2051",
    workshopId: "w1",
    customerId: "c5",
    vehicleId: "v7",
    createdAt: "2026-09-28",
    reason: "Alineación de dirección",
    warningLights: [],
    complaint: "El volante vibra en carretera.",
    status: "En proceso",
    diagnosis: { fee: 50, waived: true },
    labor: [{ id: "l3", description: "Alineación y balanceo", price: 65 }],
    parts: [],
    applyMaterialsFee: false,
  },
  {
    id: "FT-2052",
    workshopId: "w1",
    customerId: "c3",
    vehicleId: "v4",
    createdAt: "2026-09-30",
    reason: "Suspensión completa",
    warningLights: ["Otro"],
    complaint: "Ruido fuerte en la suspensión trasera al pasar baches.",
    status: "Pendiente inspección",
    diagnosis: { fee: 80, waived: false },
    labor: [],
    parts: [],
    applyMaterialsFee: false,
  },
  {
    id: "FT-2053",
    workshopId: "w1",
    customerId: "c6",
    vehicleId: "v8",
    createdAt: "2026-09-12",
    reason: "Caja automática",
    warningLights: ["Check Engine"],
    complaint: "Caja automática patina en tercera velocidad.",
    status: "Entregado",
    diagnosis: { fee: 90, waived: true },
    labor: [{ id: "l4", description: "Reparación de caja automática", price: 520 }],
    parts: [
      {
        id: "p-l4",
        partId: "pc9",
        name: "Kit de sellos y filtro de caja",
        workshopCost: 140,
        customerPrice: 210,
        warranty: true,
        qty: 1,
      },
    ],
    applyMaterialsFee: true,
  },
  {
    id: "FT-2054",
    workshopId: "w1",
    customerId: "c4",
    vehicleId: "v5",
    createdAt: "2026-09-18",
    reason: "Embrague dual",
    warningLights: [],
    complaint: "Vibración al embragar y olor a quemado.",
    status: "Completado",
    diagnosis: { fee: 80, waived: true },
    labor: [
      {
        id: "l5",
        description: "Mano de obra — cambio de embrague",
        price: 380,
      },
    ],
    parts: [
      {
        id: "p-l5",
        partId: "pc4",
        name: "Kit de embrague completo",
        workshopCost: 285,
        customerPrice: 420,
        warranty: true,
        qty: 1,
      },
    ],
    applyMaterialsFee: false,
  },
  {
    id: "FT-2055",
    workshopId: "w1",
    customerId: "c6",
    vehicleId: "v8",
    createdAt: "2026-10-02",
    reason: "Check Engine encendido",
    warningLights: ["Check Engine"],
    complaint: "Testigo de check engine encendido desde ayer.",
    status: "Pendiente inspección",
    diagnosis: { fee: 70, waived: false },
    labor: [],
    parts: [],
    applyMaterialsFee: false,
  },
  {
    id: "FT-2056",
    workshopId: "w1",
    customerId: "c4",
    vehicleId: "v5",
    createdAt: "2026-10-01",
    reason: "Retorno por ruido en embrague (garantía)",
    warningLights: [],
    complaint: "El cliente reporta un ruido similar al original diez días después de la entrega.",
    status: "Garantía",
    warrantyOf: "FT-2054",
    diagnosis: { fee: 0, waived: true },
    labor: [{ id: "l6", description: "Revisión bajo garantía", price: 0 }],
    parts: [],
    applyMaterialsFee: false,
  },
  {
    id: "FT-2057",
    workshopId: "w1",
    customerId: "c6",
    vehicleId: "v8",
    createdAt: "2026-09-28",
    reason: "Cambio de aceite",
    warningLights: [],
    complaint: "Mantenimiento programado.",
    status: "Completado",
    diagnosis: { fee: 0, waived: true },
    labor: [{ id: "l7", description: "Mano de obra — cambio de aceite", price: 35 }],
    parts: [
      {
        id: "p-l7",
        partId: "pc2",
        name: "Aceite sintético 5W-30 (4L)",
        workshopCost: 39,
        customerPrice: 65,
        warranty: false,
        qty: 1,
      },
    ],
    applyMaterialsFee: false,
  },
  {
    id: "FT-2058",
    workshopId: "w1",
    customerId: "c4",
    vehicleId: "v6",
    createdAt: "2026-09-29",
    reason: "Revisión de frenos",
    warningLights: [],
    complaint: "Ruido al frenar en frío.",
    status: "Entregado",
    diagnosis: { fee: 60, waived: true },
    labor: [
      {
        id: "l8",
        description: "Mano de obra — cambio de pastillas",
        price: 70,
      },
    ],
    parts: [
      {
        id: "p-l8",
        partId: "pc1",
        name: "Pastillas de freno delanteras",
        workshopCost: 48,
        customerPrice: 85,
        warranty: true,
        qty: 1,
      },
    ],
    applyMaterialsFee: false,
  },
];

export type PartCatalogItem = {
  id: string;
  workshopId: string;
  sku?: string;
  name: string;
  workshopCost: number;
  customerPrice: number;
  warranty: boolean;
};

export const partsCatalog: PartCatalogItem[] = [
  {
    id: "pc1",
    workshopId: "w1",
    sku: "FR-1102",
    name: "Pastillas de freno delanteras",
    workshopCost: 48,
    customerPrice: 85,
    warranty: true,
  },
  {
    id: "pc2",
    workshopId: "w1",
    sku: "AC-2205",
    name: "Aceite sintético 5W-30 (4L)",
    workshopCost: 39,
    customerPrice: 65,
    warranty: false,
  },
  {
    id: "pc3",
    workshopId: "w1",
    sku: "BT-3301",
    name: "Batería 12V 60Ah",
    workshopCost: 70,
    customerPrice: 112,
    warranty: true,
  },
  {
    id: "pc4",
    workshopId: "w1",
    sku: "EM-4410",
    name: "Kit de embrague completo",
    workshopCost: 285,
    customerPrice: 420,
    warranty: true,
  },
  {
    id: "pc5",
    workshopId: "w1",
    sku: "FL-5508",
    name: "Filtro de aire",
    workshopCost: 16,
    customerPrice: 28,
    warranty: false,
  },
  {
    id: "pc6",
    workshopId: "w1",
    sku: "AM-6612",
    name: "Amortiguador trasero",
    workshopCost: 96,
    customerPrice: 150,
    warranty: true,
  },
  {
    id: "pc7",
    workshopId: "w1",
    sku: "TR-7001",
    name: "Transmisión automática reacondicionada",
    workshopCost: 1200,
    customerPrice: 1850,
    warranty: true,
  },
  {
    id: "pc8",
    workshopId: "w1",
    sku: "TR-7002",
    name: "Kit de líquido de transmisión",
    workshopCost: 35,
    customerPrice: 60,
    warranty: false,
  },
  {
    id: "pc9",
    workshopId: "w1",
    sku: "CJ-8801",
    name: "Kit de sellos y filtro de caja",
    workshopCost: 140,
    customerPrice: 210,
    warranty: true,
  },
];

export const statusStyles: Record<OrderStatus, string> = {
  "Pendiente inspección": "bg-status-info/10 text-status-info ring-status-info/30",
  "Esperando repuesto": "bg-status-waiting/10 text-status-waiting ring-status-waiting/30",
  "En proceso": "bg-primary/10 text-primary ring-primary/30",
  Completado: "bg-status-success/10 text-status-success ring-status-success/30",
  Entregado: "bg-status-delivered/10 text-status-delivered ring-status-delivered/30",
  Garantía: "bg-status-warranty/10 text-status-warranty ring-status-warranty/30",
};

/** Solid-fill accent for compact contexts (calendar chips) — same mapping as statusStyles. */
export const statusAccent: Record<OrderStatus, string> = {
  "Pendiente inspección": "border-l-status-info",
  "Esperando repuesto": "border-l-status-waiting",
  "En proceso": "border-l-primary",
  Completado: "border-l-status-success",
  Entregado: "border-l-status-delivered",
  Garantía: "border-l-status-warranty",
};

/** Solid dot for legends/summaries — same mapping as statusStyles/statusAccent. */
export const statusDot: Record<OrderStatus, string> = {
  "Pendiente inspección": "bg-status-info",
  "Esperando repuesto": "bg-status-waiting",
  "En proceso": "bg-primary",
  Completado: "bg-status-success",
  Entregado: "bg-status-delivered",
  Garantía: "bg-status-warranty",
};

export function formatMoney(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return `$${amount.toLocaleString("es-ES", { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 })}`;
}
