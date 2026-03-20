export interface Employee {
  id: string;
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  puesto: string;
  empresa: string;
  sucursal: string;
  fechaIngreso: string;
  cct: string;
  estado: "Activo" | "Licencia" | "Baja";
  email: string;
  telefono: string;
  categoria: string;
  avatar?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: "ingreso" | "promocion" | "sancion" | "licencia" | "cambio";
  title: string;
  description: string;
}

export const employees: Employee[] = [
  {
    id: "1", legajo: "L-0421", nombre: "Martín", apellido: "Fernández", dni: "32.456.789",
    cuil: "20-32456789-4", puesto: "Supervisor de Planta", empresa: "Industrial SA",
    sucursal: "Planta Pacheco", fechaIngreso: "2018-03-15", cct: "CCT 260/75",
    estado: "Activo", email: "m.fernandez@grupo.com", telefono: "11-4523-8976",
    categoria: "Categoría 8",
  },
  {
    id: "2", legajo: "L-0388", nombre: "Carolina", apellido: "Méndez", dni: "35.112.678",
    cuil: "27-35112678-1", puesto: "Analista de Compras", empresa: "Comercial SRL",
    sucursal: "Oficina Central", fechaIngreso: "2019-07-01", cct: "CCT 130/75",
    estado: "Activo", email: "c.mendez@grupo.com", telefono: "11-5567-3421",
    categoria: "Categoría 5",
  },
  {
    id: "3", legajo: "L-0512", nombre: "Ricardo", apellido: "Gómez", dni: "28.934.521",
    cuil: "20-28934521-7", puesto: "Chofer de Larga Distancia", empresa: "Logística SA",
    sucursal: "Base Avellaneda", fechaIngreso: "2015-11-20", cct: "CCT 40/89",
    estado: "Licencia", email: "r.gomez@grupo.com", telefono: "11-6789-1234",
    categoria: "Categoría 3",
  },
  {
    id: "4", legajo: "L-0601", nombre: "Lucía", apellido: "Torres", dni: "37.445.912",
    cuil: "27-37445912-3", puesto: "Coordinadora de RR.HH.", empresa: "Servicios SAS",
    sucursal: "Oficina Central", fechaIngreso: "2021-02-10", cct: "Fuera de Convenio",
    estado: "Activo", email: "l.torres@grupo.com", telefono: "11-2345-6789",
    categoria: "Jefatura",
  },
  {
    id: "5", legajo: "L-0299", nombre: "Pablo", apellido: "Ruiz", dni: "30.567.234",
    cuil: "20-30567234-5", puesto: "Operario de Producción", empresa: "Industrial SA",
    sucursal: "Planta Pilar", fechaIngreso: "2016-08-03", cct: "CCT 260/75",
    estado: "Activo", email: "p.ruiz@grupo.com", telefono: "11-7890-5678",
    categoria: "Categoría 4",
  },
  {
    id: "6", legajo: "L-0734", nombre: "Ana", apellido: "Peralta", dni: "39.001.456",
    cuil: "27-39001456-8", puesto: "Asistente Contable", empresa: "Comercial SRL",
    sucursal: "Sucursal Córdoba", fechaIngreso: "2023-01-15", cct: "CCT 130/75",
    estado: "Activo", email: "a.peralta@grupo.com", telefono: "351-456-7890",
    categoria: "Categoría 3",
  },
  {
    id: "7", legajo: "L-0155", nombre: "Diego", apellido: "Sánchez", dni: "26.789.012",
    cuil: "20-26789012-9", puesto: "Jefe de Depósito", empresa: "Logística SA",
    sucursal: "Centro Distribución Ezeiza", fechaIngreso: "2012-04-22", cct: "CCT 40/89",
    estado: "Baja", email: "d.sanchez@grupo.com", telefono: "11-3456-7890",
    categoria: "Categoría 6",
  },
];

export const timelineEvents: Record<string, TimelineEvent[]> = {
  "1": [
    { id: "t1", date: "2024-11-01", type: "promocion", title: "Promoción a Supervisor", description: "Ascenso de Operario Calificado a Supervisor de Planta." },
    { id: "t2", date: "2023-06-15", type: "cambio", title: "Cambio de Sucursal", description: "Transferido de Planta Pilar a Planta Pacheco." },
    { id: "t3", date: "2022-01-10", type: "licencia", title: "Licencia por Paternidad", description: "5 días hábiles según CCT." },
    { id: "t4", date: "2018-03-15", type: "ingreso", title: "Ingreso", description: "Alta como Operario de Producción Cat. 4." },
  ],
  "3": [
    { id: "t5", date: "2025-02-01", type: "licencia", title: "Licencia por Enfermedad", description: "Reposo por intervención quirúrgica. Plazo estimado: 45 días." },
    { id: "t6", date: "2020-09-10", type: "sancion", title: "Apercibimiento", description: "Llegada tarde reiterada (3 eventos en 30 días)." },
    { id: "t7", date: "2015-11-20", type: "ingreso", title: "Ingreso", description: "Alta como Chofer de Larga Distancia Cat. 3." },
  ],
};
