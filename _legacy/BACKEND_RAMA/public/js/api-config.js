// ====================================
// CONFIGURACIÓN DE API - HORARIOS
// ====================================

export const API_CONFIG = {
  // URL base de tu API
  BASE_URL: "https://tu-api.com/api",

  // Endpoints
  ENDPOINTS: {
    HORARIOS: "/horarios", // GET /horarios?estacion=18000
    RUTA: "/ruta", // GET /ruta?origen=18000&destino=18001
  },

  // Headers personalizados (si tu API lo requiere)
  HEADERS: {
    "Content-Type": "application/json",
    // "Authorization": "Bearer TU_TOKEN_AQUI", // Descomenta si necesitas auth
  },

  // Timeout en milisegundos
  TIMEOUT: 10000,
};

// ====================================
// FUNCIÓN PARA OBTENER HORARIOS
// ====================================
export async function fetchHorarios(codigoEstacion) {
  try {
    // CAMBIO: Usar archivo local en lugar de API
    const url = "train_schedule.json";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    // Adaptar respuesta CKAN a formato interno
    // La estructura es data.result.records
    if (data.result && data.result.records) {
      return data.result.records.map((r) => ({
        destino: r.destination, // Mapear campos
        minutos: calculateMinutes(r.departure_time), // Calcular tiempo restante simulado
        linea: r.line,
        horaSalida: r.departure_time,
        status: r.status,
        train_number: r.train_number, // Added train_number mapping
      }));
    }

    return [];
  } catch (error) {
    console.error("Error al obtener horarios:", error);
    return [];
  }
}

// Función auxiliar para simular minutos restantes basado en la hora
function calculateMinutes(timeStr) {
  if (!timeStr) return 0;
  // Simplemente devolvemos un aleatorio o parsed para demo
  return Math.floor(Math.random() * 30) + 1;
}

// ====================================
// FUNCIÓN PARA CALCULAR RUTA
// ====================================
export async function fetchRuta(origenCodigo, destinoCodigo) {
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RUTA}?origen=${origenCodigo}&destino=${destinoCodigo}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    const response = await fetch(url, {
      method: "GET",
      headers: API_CONFIG.HEADERS,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();

    // IMPORTANTE: Adapta esto según el formato de tu API
    // Ejemplo de formato esperado:
    // {
    //   duracion: 25,                // minutos
    //   transbordos: 0,              // número de transbordos
    //   lineas: ["C-1"],             // líneas a usar
    //   estaciones: ["Sol", "Atocha", "Chamartín"], // ruta
    //   precio: 1.70                 // euros (opcional)
    // }

    return data;
  } catch (error) {
    console.error("Error al calcular ruta:", error);
    return null;
  }
}
