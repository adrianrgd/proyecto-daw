// lib/estaciones.ts

export interface Estacion {
  id_estacion: string;
  nombre_estacion: string;
}

export interface EstacionesMap {
  [key: string]: Estacion;
}

export const normalizar = (txt: string): string => txt.toLowerCase().trim();

export const deduplicarEstaciones = (estaciones: Estacion[]): EstacionesMap => {
  const map: EstacionesMap = {};
  for (const e of estaciones) {
    map[e.id_estacion] = { id_estacion: e.id_estacion, nombre_estacion: e.nombre_estacion };
  }
  return map;
};

export const buscarEstacion = (nombre: string, estaciones: EstacionesMap): Estacion | null => {
  const n = normalizar(nombre);
  for (const e of Object.values(estaciones)) {
    if (normalizar(e.nombre_estacion).includes(n)) {
      return e;
    }
  }
  return null;
};
