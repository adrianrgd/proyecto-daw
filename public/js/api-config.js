// ====================================
// CONFIGURACIÓN DE API - HORARIOS
// ====================================

// Detectar si estamos en desarrollo o producción
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const API_CONFIG = {
  // URL base de la API del Backend
  BASE_URL: isDev ? "http://localhost:3001/api" : "/api",

  // Endpoints
  ENDPOINTS: {
    HORARIOS: "/proximoTren", // GET /api/proximoTren?origen=XXXX&destino=YYYY
    RUTA: "/obtenerTrenes", // GET /api/obtenerTrenes?origen=XXXX&destino=YYYY
  },

  // Headers personalizados
  HEADERS: {
    "Content-Type": "application/json",
  },

  // Timeout en milisegundos
  TIMEOUT: 30000,

  // Reintentos
  RETRIES: 3,
  RETRY_DELAY: 1000,
};

// ====================================
// FUNCIÓN PARA OBTENER HORARIOS
// ====================================
export async function fetchHorarios(codigoEstacion, codigoDestino = "10001") {
  console.log(`📡 Obteniendo horarios para estación ${codigoEstacion}`);
  
  try {
    // Intentar con la API del Backend
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HORARIOS}?origen=${codigoEstacion}&destino=${codigoDestino}`;
    
    const data = await fetchWithRetry(url, API_CONFIG.TIMEOUT, API_CONFIG.RETRIES);
    
    if (!data) {
      throw new Error("No data received from API");
    }

    // Adaptar respuesta del Backend al formato esperado por el FrontEnd
    return adaptarRespuestaHorarios(data);
  } catch (error) {
    console.warn("⚠️ Error al obtener horarios de API:", error.message);
    
    // Fallback: intentar cargar desde archivo local
    return await cargarHorariosLocal(codigoEstacion);
  }
}

// ====================================
// FUNCIÓN PARA CALCULAR RUTA
// ====================================
export async function fetchRuta(origenCodigo, destinoCodigo) {
  console.log(`🛣️ Calculando ruta de ${origenCodigo} a ${destinoCodigo}`);
  
  try {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.RUTA}?origen=${origenCodigo}&destino=${destinoCodigo}`;
    
    const data = await fetchWithRetry(url, API_CONFIG.TIMEOUT, API_CONFIG.RETRIES);
    
    if (!data) {
      throw new Error("No data received from API");
    }

    // Adaptar respuesta del Backend
    return adaptarRespuestaRuta(data);
  } catch (error) {
    console.error("❌ Error al calcular ruta:", error);
    return null;
  }
}

// ====================================
// FUNCIONES AUXILIARES
// ====================================

/**
 * Realiza un fetch con reintentos automáticos
 */
async function fetchWithRetry(url, timeout = 30000, retries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Intento ${attempt}/${retries} para ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Respuesta recibida en intento ${attempt}:`, data);
      return data;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Intento ${attempt} falló:`, error.message);
      
      // Esperar antes de reintentar (excepto en el último intento)
      if (attempt < retries) {
        await delay(API_CONFIG.RETRY_DELAY * attempt);
      }
    }
  }
  
  throw lastError || new Error("All retries failed");
}

/**
 * Adapta la respuesta de la API de horarios al formato esperado
 */
function adaptarRespuestaHorarios(data) {
  if (!data) return [];

  // Si es respuesta de proximoTren (un solo tren)
  if (data.tren) {
    return [{
      destino: data.destino?.nombre_estacion || "Destino",
      minutos: calcularMinutosRestantes(data.tren.salida),
      linea: data.tren.linea || "N/A",
      horaSalida: data.tren.salida || "N/A",
      status: data.tren.tiempo_real ? "En tiempo real" : "Programado",
      train_number: data.tren.cod_tren || "N/A",
      retraso: data.tren.tiempo_real?.retraso_min || 0,
    }];
  }
  
  // Si es respuesta de obtenerTrenes (múltiples trenes)
  if (data.trenes && Array.isArray(data.trenes)) {
    return data.trenes.map((tren) => ({
      destino: data.destino?.nombre_estacion || "Destino",
      minutos: calcularMinutosRestantes(tren.salida),
      linea: tren.linea || "N/A",
      horaSalida: tren.salida || "N/A",
      status: tren.tiempo_real ? "En tiempo real" : "Programado",
      train_number: tren.cod_tren || "N/A",
      retraso: tren.tiempo_real?.retraso_min || 0,
    }));
  }

  return [];
}

/**
 * Adapta la respuesta de la API de rutas al formato esperado
 */
function adaptarRespuestaRuta(data) {
  if (!data || !data.trenes || !Array.isArray(data.trenes)) {
    return null;
  }

  try {
    // Calcular duración total
    const duracion = calcularDuracionRuta(data.trenes);
    
    return {
      duracion: duracion,
      transbordos: Math.max(0, data.trenes.length - 1),
      lineas: [...new Set(data.trenes.map(t => t.linea))],
      estaciones: construirListaEstaciones(data),
      precio: 1.70, // Precio estándar de Renfe
      trenes: data.trenes,
    };
  } catch (error) {
    console.error("Error adaptando respuesta de ruta:", error);
    return null;
  }
}

/**
 * Calcula los minutos restantes basado en la hora de salida
 */
function calcularMinutosRestantes(horaSalida) {
  if (!horaSalida) return 0;
  
  try {
    const [horas, minutos] = horaSalida.split(':').map(Number);
    const ahora = new Date();
    const salida = new Date();
    salida.setHours(horas, minutos, 0);
    
    const diferencia = salida - ahora;
    const minutosRestantes = Math.round(diferencia / 60000);
    
    return Math.max(0, minutosRestantes);
  } catch (error) {
    console.warn("Error calculando minutos:", error);
    return 0;
  }
}

/**
 * Calcula la duración total de la ruta
 */
function calcularDuracionRuta(trenes) {
  if (!trenes || trenes.length === 0) return 0;
  
  try {
    const primerTren = trenes[0];
    const ultimoTren = trenes[trenes.length - 1];
    
    const [hSalida, mSalida] = (primerTren.salida || "00:00").split(':').map(Number);
    const [hLlegada, mLlegada] = (ultimoTren.llegada || "00:00").split(':').map(Number);
    
    const salida = hSalida * 60 + mSalida;
    const llegada = hLlegada * 60 + mLlegada;
    
    let duracion = llegada - salida;
    if (duracion < 0) duracion += 24 * 60; // Si es al día siguiente
    
    return duracion;
  } catch (error) {
    console.warn("Error calculando duración:", error);
    return 0;
  }
}

/**
 * Construye la lista de estaciones de la ruta
 */
function construirListaEstaciones(data) {
  const estaciones = [];
  
  if (data.origen?.nombre_estacion) {
    estaciones.push(data.origen.nombre_estacion);
  }
  
  if (data.trenes && Array.isArray(data.trenes)) {
    data.trenes.forEach((tren, index) => {
      if (index > 0 && tren.origen_estacion) {
        estaciones.push(tren.origen_estacion);
      }
      if (tren.destino_estacion) {
        estaciones.push(tren.destino_estacion);
      }
    });
  }
  
  if (data.destino?.nombre_estacion) {
    estaciones.push(data.destino.nombre_estacion);
  }
  
  // Eliminar duplicados manteniendo orden
  return [...new Set(estaciones)];
}

/**
 * Carga horarios desde archivo local (fallback)
 */
async function cargarHorariosLocal(codigoEstacion) {
  try {
    console.log("📂 Cargando horarios desde archivo local...");
    const response = await fetch("train_schedule.json");
    
    if (!response.ok) {
      throw new Error("No se pudo cargar archivo local");
    }
    
    const data = await response.json();
    
    if (data.result && data.result.records) {
      return data.result.records.map((r) => ({
        destino: r.destination || "Destino",
        minutos: Math.floor(Math.random() * 30) + 1,
        linea: r.line || "N/A",
        horaSalida: r.departure_time || "N/A",
        status: r.status || "Programado",
        train_number: r.train_number || "N/A",
        retraso: 0,
      }));
    }
    
    return [];
  } catch (error) {
    console.error("❌ Error cargando horarios locales:", error);
    return [];
  }
}

/**
 * Utilidad para delays
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ====================================
// EXPORTAR FUNCIONES ADICIONALES
// ====================================
export { calcularMinutosRestantes, adaptarRespuestaHorarios, adaptarRespuestaRuta };
