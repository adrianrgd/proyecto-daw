// lib/fechas.ts

export const pad = (n: number): string => n.toString().padStart(2, "0");

export type FormatoFecha = "YYYYMMDD" | "HH:mm" | "default";

export const formatoFechaHora = (date: Date, formato: FormatoFecha): string => {
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const HH = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  switch (formato) {
    case "YYYYMMDD":
      return `${YYYY}${MM}${DD}`;
    case "HH:mm":
      return `${HH}:${mm}`;
    default:
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
  }
};

export const sumarMinutos = (date: Date, mins: number): Date =>
  new Date(date.getTime() + mins * 60000);