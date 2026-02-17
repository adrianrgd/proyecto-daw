// app/api/obtenerTrenes/route.ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { deduplicarEstaciones, EstacionesMap } from "@/lib/estaciones";
import { formatoFechaHora, sumarMinutos } from "@/lib/fechas";

const MAX_TRENES = 3;

const URL_ESTACIONES = "https://horarioscercanias.renfe.com/estaciones/10.json";
const URL_HORARIOS = "https://epe.api.renfe.es/epe/catalogo-pro/hcr-cercanias-vav/HorariosCercanias/get";
const URL_TIEMPO_REAL = "https://tiempo-real.renfe.com/renfe-visor/flota.json";

const HEADERS_ESTACIONES = {
  accept: "application/json",
  "accept-language": "es-ES,es;q=0.9",
  "user-agent": "Mozilla/5.0",
  referer: "https://www.renfe.com/",
};

const HEADERS_HORARIOS = {
  accept: "application/json",
  "content-type": "text/plain;charset=UTF-8",
  origin: "https://www.renfe.com",
  referer: "https://www.renfe.com/",
  "user-agent": "Mozilla/5.0",
  "x-ibm-client-id": "34a20f347a218faa2781152e1d5b1d8a",
};

const HEADERS_TIEMPO_REAL = {
  accept: "application/json",
  "accept-language": "es-ES,es;q=0.9",
  "user-agent": "Mozilla/5.0",
  referer: "https://www.renfe.com/",
  origin: "https://www.renfe.com",
};

interface TrenData {
  salida: string;
  salida_real: string;
  llegada: string;
  llegada_real: string;
  duracion: string;
  cod_tren: string;
  linea: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const origen = searchParams.get("origen");
    const destino = searchParams.get("destino");

    if (!origen || !destino) {
      return NextResponse.json({ error: "Params not valid" }, { status: 400 });
    }

    // ====== ESTACIONES ======
    const estResp = await axios.get(URL_ESTACIONES, { headers: HEADERS_ESTACIONES, timeout: 20000 });
    const estaciones = deduplicarEstaciones(estResp.data.estaciones);

    const estOrigen = estaciones[origen];
    const estDestino = estaciones[destino];

    if (!estOrigen) {
      return NextResponse.json(
        { error: `Estación origen no encontrada (ID): ${origen}` },
        { status: 404 }
      );
    }
    if (!estDestino) {
      return NextResponse.json(
        { error: `Estación destino no encontrada (ID): ${destino}` },
        { status: 404 }
      );
    }

    // ====== FECHAS ======
    const now = new Date();
    const fechaViaje = formatoFechaHora(now, "YYYYMMDD");
    const horaInicioRango = formatoFechaHora(sumarMinutos(now, -30), "HH:mm");
    const horaFinRango = formatoFechaHora(sumarMinutos(now, 60), "HH:mm");

    const payload = {
      origen: estOrigen.id_estacion,
      destino: estDestino.id_estacion,
      fechaViaje,
      horaInicioRango,
      horaFinRango,
    };

    // ====== HORARIOS ======
    let horResp: any = null;
    let retries = 3;
    let lastError: any = null;

    while (retries > 0) {
      try {
        horResp = await axios.post(URL_HORARIOS, JSON.stringify(payload), {
          headers: HEADERS_HORARIOS,
          timeout: 30000, // Aumentado de 10s a 30s
        });
        break; // Si funciona, salir del loop
      } catch (error: any) {
        lastError = error;
        retries--;
        if (retries > 0) {
          console.warn(`Reintentando horarios... (${retries} intentos restantes)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1s antes de reintentar
        }
      }
    }

    if (!horResp) {
      console.error("Error después de reintentos:", lastError?.message);
      return NextResponse.json(
        { error: "Timeout al obtener horarios de Renfe", detalle: lastError?.message },
        { status: 503 }
      );
    }

    const trayectos = horResp.data.doConsultarHorariosCercaniasReturn?.trayectoHorariosCercanias;
    if (!trayectos || trayectos.length === 0) {
      return NextResponse.json({ error: "No hay trenes disponibles" }, { status: 404 });
    }

    const futuros: TrenData[] = trayectos
      .map((t: any) => {
        const h = t.horarioTrayecto;
        const tramo = t.tramos[0];
        return {
          salida: h.horaSalida,
          salida_real: h.horaSalidaReal,
          llegada: h.horaLlegada,
          llegada_real: h.horaLlegadaReal,
          duracion: h.duracionViaje,
          cod_tren: tramo.cdgoTren,
          linea: tramo.lineaOrigen,
        };
      })
      .filter((t: TrenData) => {
        const [hh, mm, ss] = t.salida.split(":").map(Number);
        const salida = new Date(now);
        salida.setHours(hh, mm, ss || 0);
        return salida >= now;
      })
      .sort((a: TrenData, b: TrenData) => a.salida.localeCompare(b.salida));

    if (futuros.length === 0) {
      return NextResponse.json({ error: "No hay trenes futuros" }, { status: 404 });
    }

    const proximos = futuros.slice(0, MAX_TRENES);

    // ====== TIEMPO REAL ======
    const trResp = await axios.get(URL_TIEMPO_REAL, { headers: HEADERS_TIEMPO_REAL, timeout: 10000 });
    const trenesTiempoReal = trResp.data.trenes;

    const traducir = (cod: string): string => estaciones[cod]?.nombre_estacion || "Desconocida";

    const trenesConTiempoReal = proximos.map((tren: TrenData) => {
      const tr = trenesTiempoReal.find((t: any) => t.codTren === tren.cod_tren);
      return {
        ...tren,
        tiempo_real: tr
          ? {
              retraso_min: tr.retrasoMin,
              estacion_actual: traducir(tr.codEstAct),
              siguiente_estacion: traducir(tr.codEstSig),
              posicion: { lat: tr.latitud, lon: tr.longitud },
            }
          : null,
      };
    });

    return NextResponse.json({
      origen: estOrigen,
      destino: estDestino,
      trenes: trenesConTiempoReal,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "Error interno", detalle: err.message },
      { status: 500 }
    );
  }
}
