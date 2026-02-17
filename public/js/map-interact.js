import {
  map,
  stationLayer,
  lineLayer,
  metroStationLayer,
  metroLineLayer,
} from "./map-core.js";
import { fetchHorarios } from "./api-config.js";

const container = document.getElementById("popup");
const contentTitle = document.getElementById("popup-title");
const contentC = document.getElementById("c-logos");
const liveArea = document.getElementById("live-times-area");
const accArea = document.getElementById("acc-area");
const metroSection = document.getElementById("m-section");
const metroLogos = document.getElementById("m-logos");
const closer = document.getElementById("popup-closer");

const overlay = new ol.Overlay({
  element: container,
  autoPan: { animation: { duration: 250 } },
});
map.addOverlay(overlay);

// Variable para mantener la feature en hover
let hoveredFeature = null;

// Función para cargar horarios desde la API
async function cargarHorarios(codigoEstacion) {
  if (!liveArea) return;
  liveArea.innerHTML = '<div class="loading-text">🔄 Buscando trenes...</div>';

  try {
    const data = await fetchHorarios(codigoEstacion);

    if (!data || data.length === 0) {
      liveArea.innerHTML =
        '<div class="loading-text">⚠️ Sin servicio disponible actualmente.</div>';
      return;
    }

    let html = "";
    // Mostramos máx 6 trenes para Metro
    const maxTrenes = 6;
    data.slice(0, maxTrenes).forEach((tren, index) => {
      const retrasoClass = tren.retraso > 0 ? "train-row-delayed" : "";
      const retrasoText = tren.retraso > 0 ? ` (+${tren.retraso}min)` : "";

      html += `
        <div class="train-row ${retrasoClass}" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">
          <div class="train-row-header">
            <span class="train-dest">${tren.destino}</span>
            <span class="train-time">${tren.minutos}${retrasoText}</span>
          </div>
        </div>
        <div class="train-details" style="display: none;">
           <div class="train-detail-row">
              <span class="train-detail-label">Línea:</span>
              <span class="train-detail-value">${tren.linea}</span>
           </div>
           <div class="train-detail-row">
              <span class="train-detail-label">Salida:</span>
              <span class="train-detail-value">${tren.horaSalida}</span>
           </div>
           <div class="train-detail-row">
              <span class="train-detail-label">Tren:</span>
              <span class="train-detail-value">${tren.train_number}</span>
           </div>
           <div class="train-detail-row">
              <span class="train-detail-label">Estado:</span>
              <span class="train-detail-value status-${tren.status.toLowerCase().replace(/\\s+/g, "-")}">${tren.status}</span>
           </div>
        </div>
      `;
    });

    if (data.length > maxTrenes) {
      html += `<div class="train-info-text">+${data.length - maxTrenes} trenes más</div>`;
    }

    liveArea.innerHTML = html;
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    liveArea.innerHTML =
      '<div class="loading-text" style="color:#d00">❌ Error de conexión con la API</div>';
  }
}

// Función para parsear las líneas de Metro (mejorada)
function parseMetroLogos(str) {
  if (!str) return [];
  const files = new Set();
  const text = str.toLowerCase();

  // Ramal
  if (text.includes("ramal")) files.add("R");

  // MetroSur (Línea 12)
  if (text.includes("metrosur")) files.add("L12");

  // Líneas numeradas (L-1 a L-12)
  const numbers = text.match(/\d+/g) || [];
  numbers.forEach((num) => {
    const n = parseInt(num);
    if (n > 0 && n <= 12) {
      if (text.includes("ligero")) {
        files.add("ML" + n); // Línea Ligera
      } else {
        files.add("L" + n);
      }
    }
  });

  return Array.from(files).sort();
}

// Estilo hover para estaciones (mejorado)
function getHoverStationStyle(feature, resolution) {
  const zoom = 20 - Math.log2(resolution);

  // Detectar si es Metro o Cercanías
  const isMetro = feature.get("DENOMINACIONESTACION") || feature.get("ROTULO");

  let baseScale = isMetro ? 0.04 : 0.8;
  let multiplier = isMetro ? 0.01 : 0.15;

  let scale = baseScale + (zoom - 11) * multiplier;
  if (isMetro) {
    scale = Math.max(0.03, Math.min(scale, 0.08));
  } else {
    scale = Math.max(0.7, Math.min(scale, 1.5));
  }

  // Aumentar escala en hover
  const hoverScale = scale * 1.5;

  const styles = [
    new ol.style.Style({
      image: new ol.style.Icon({
        src: isMetro ? "img/metro.svg" : "img/cercanias.svg",
        scale: hoverScale,
        anchor: [0.5, 0.5],
      }),
      zIndex: 200,
    }),
  ];

  // Mostrar nombre en hover siempre
  const nombre =
    feature.get("NOMBRE_ESTACION") ||
    feature.get("DENOMINACIONESTACION") ||
    feature.get("ROTULO") ||
    "";

  styles.push(
    new ol.style.Style({
      text: new ol.style.Text({
        text: nombre,
        font: "bold 12px Montserrat, sans-serif",
        fill: new ol.style.Fill({ color: isMetro ? "#009bd5" : "#e60000" }),
        stroke: new ol.style.Stroke({ color: "#fff", width: 4 }),
        offsetY: 20,
        textAlign: "center",
      }),
      zIndex: 199,
    }),
  );

  return styles;
}

// Función para mostrar detalles de estación
// --- LAYER TOGGLING & MESSAGES ---
window.addEventListener("message", (event) => {
  const data = event.data;

  if (data.type === "SHOW_INCIDENTS") {
    showIncidents(data.incidents);
  }

  if (data.type === "TOGGLE_LAYER") {
    const mode = data.mode; // 'cercanias' or 'metro'

    if (mode === "cercanias") {
      if (stationLayer) stationLayer.setVisible(true);
      if (lineLayer) lineLayer.setVisible(true);
      if (metroStationLayer) metroStationLayer.setVisible(false);
      if (metroLineLayer) metroLineLayer.setVisible(false);
    } else if (mode === "metro") {
      if (stationLayer) stationLayer.setVisible(false);
      if (lineLayer) lineLayer.setVisible(false);
      if (metroStationLayer) metroStationLayer.setVisible(true);
      if (metroLineLayer) metroLineLayer.setVisible(true);
    }
  }
});

// --- LAYER TOGGLING ---
const btnCercanias = document.getElementById("btnCercanias");
const btnMetro = document.getElementById("btnMetro");

if (btnCercanias && btnMetro) {
  btnCercanias.addEventListener("click", () => {
    // Activar Cercanías
    btnCercanias.classList.add("active");
    btnMetro.classList.remove("active");

    // Toggle Layers
    if (stationLayer) stationLayer.setVisible(true);
    if (lineLayer) lineLayer.setVisible(true);
    if (metroStationLayer) metroStationLayer.setVisible(false);
    if (metroLineLayer) metroLineLayer.setVisible(false);

    // Ocultar leyenda metro, mostrar cercanías
    document.getElementById("cercanias-legend").style.display = "block";
    document.getElementById("metro-legend").style.display = "none";
  });

  btnMetro.addEventListener("click", () => {
    // Activar Metro
    btnCercanias.classList.remove("active");
    btnMetro.classList.add("active");

    // Toggle Layers
    if (stationLayer) stationLayer.setVisible(false);
    if (lineLayer) lineLayer.setVisible(false);
    if (metroStationLayer) metroStationLayer.setVisible(true);
    if (metroLineLayer) metroLineLayer.setVisible(true);

    // Ocultar leyenda cercanías, mostrar metro
    document.getElementById("cercanias-legend").style.display = "none";
    document.getElementById("metro-legend").style.display = "block";
  });
}

// Almacén de incidencias para consultar en popup
let currentIncidents = [];

// Función para mostrar detalles de estación
function mostrarDetallesEstacion(feature, coordinate) {
  const props = feature.getProperties();
  console.log("📍 Estación:", props);

  // 1. Identificar Estación
  const nombre =
    props.NOMBRE_ESTACION ||
    props.DENOMINACIONESTACION ||
    props.ROTULO ||
    "Estación";

  // 2. Buscar Incidencias Activas
  const incidencia = currentIncidents.find(
    (inc) =>
      inc.estacion && nombre.toLowerCase().includes(inc.estacion.toLowerCase()),
  );

  // 3. Construir Contenido Popup
  let html = "";

  // HEADER (Con indicador de incidencia si hay)
  if (incidencia) {
    html += `
        <div class="popup-alert">
            <div class="popup-alert-header">
                <i class="fas fa-exclamation-triangle"></i> INCIDENCIA ACTIVA
            </div>
            <div class="popup-alert-body">
                <strong>${incidencia.titulo}</strong><br>
                ${incidencia.descripcion}
            </div>
        </div>
      `;
  }

  html += `<h3 id="popup-title">${nombre}</h3>`;

  // LÍNEAS (Logos SVG)
  html += `<div class="popup-lines">`;

  // Cercanías (Texto/Badge por ahora, no hay SVGs)
  const lineasC = props.LINEAS;
  if (lineasC) {
    lineasC.split(",").forEach((l) => {
      const lClean = l.trim();
      // Intentar colores específicos o default
      let color = "#E60000"; // Default Cercanías Red
      if (lClean === "C1") color = "#0095FF";
      if (lClean === "C2") color = "#00943D";
      if (lClean === "C3") color = "#952585";
      if (lClean === "C4a" || lClean === "C4b") color = "#2C2A86";
      if (lClean === "C5") color = "#FECB00";
      if (lClean === "C7") color = "#E60000";
      if (lClean === "C8" || lClean === "C8a" || lClean === "C8b")
        color = "#868584";
      if (lClean === "C9") color = "#936037";
      if (lClean === "C10") color = "#BCCF00";

      html += `<span class="badge-cercanias" style="background:${color}">${lClean}</span>`;
    });
  }

  // Metro (SVG Iconos)
  const lineasM = props.LINEAS_METRO;
  if (lineasM) {
    const logos = parseMetroLogos(lineasM);
    logos.forEach((logo) => {
      // logo es "L1", "L10", "R", etc.
      // Mapear a nombre de archivo: L1 -> L1.svg
      const fileName = `${logo}.svg`;
      html += `<img src="img/${fileName}" class="line-logo-svg" alt="${logo}" title="Metro ${logo}">`;
    });
  }
  html += `</div>`;

  // ACCESIBILIDAD
  const accesibilidad = props.ACCESIBILIDAD || "No especificada";
  // Convertir 0/1 a Icono si es necesario, o usar texto
  if (
    accesibilidad === "1" ||
    accesibilidad === 1 ||
    accesibilidad === "Si" ||
    accesibilidad.includes("Si")
  ) {
    html += `<div class="popup-info"><i class="fas fa-wheelchair" title="Accesible"></i> Estación Accesible</div>`;
  }

  // CONTENEDOR DE HORARIOS
  html += `<div id="live-times-area" class="live-times-area"></div>`;

  container.innerHTML = html;

  // Re-capturar referencia para cargar horarios
  const liveAreaRef = document.getElementById("live-times-area");

  // Cargar horarios
  const codigoEstacion = props.CODIGO_ESTACION;
  if (codigoEstacion) {
    cargarHorariosEnElemento(codigoEstacion, liveAreaRef);
  } else {
    // Si es metro, no tenemos API real de horarios en este demo
    if (props.DENOMINACIONESTACION) {
      liveAreaRef.innerHTML =
        '<small style="color:#aaa;">Horarios en tiempo real no disponibles para Metro.</small>';
    }
  }

  overlay.setPosition(coordinate);
}

// Nueva función que acepta el elemento donde renderizar
async function cargarHorariosEnElemento(codigoEstacion, element) {
  if (!element) return;
  element.innerHTML =
    '<div class="loading-text"><i class="fas fa-sync fa-spin"></i> Cargando trenes...</div>';

  try {
    const data = await fetchHorarios(codigoEstacion);
    if (!data || data.length === 0) {
      element.innerHTML = '<div class="no-data">Sin servicio inminente.</div>';
      return;
    }

    let html = '<div class="train-list">';
    data.slice(0, 4).forEach((tren) => {
      const mins = tren.minutos;
      const isNow = mins === 0 || mins === "0";
      html += `
                <div class="train-item">
                    <div class="train-dest">${tren.destino}</div>
                    <div class="train-time ${isNow ? "now" : ""}">${isNow ? "AHORA" : mins + " min"}</div>
                </div>
             `;
    });
    html += "</div>";
    element.innerHTML = html;
  } catch (e) {
    element.innerHTML = '<div class="error-text">Error de conexión</div>';
  }
}

function showIncidents(incidents) {
  currentIncidents = incidents || []; // Guardar para uso en popup

  if (!incidents || incidents.length === 0) return;

  if (!incidentLayer) {
    incidentLayer = new ol.layer.Vector({
      source: new ol.source.Vector(),
      style: new ol.style.Style({
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({ color: "#ff4444" }),
          stroke: new ol.style.Stroke({ color: "white", width: 2 }),
        }),
      }),
      zIndex: 1000,
    });
    map.addLayer(incidentLayer);
  }

  const source = incidentLayer.getSource();
  source.clear();

  // Buscar coordenadas
  const featuresGeneradas = [];
  const todasEstaciones = [
    ...(stationLayer ? stationLayer.getSource().getFeatures() : []),
    ...(metroStationLayer ? metroStationLayer.getSource().getFeatures() : []),
  ];

  incidents.forEach((inc) => {
    const nombreBusqueda = inc.estacion.toLowerCase().trim();
    const estacionFeature = todasEstaciones.find((f) => {
      const nombre = (
        f.get("NOMBRE_ESTACION") ||
        f.get("DENOMINACIONESTACION") ||
        ""
      ).toLowerCase();
      return nombre.includes(nombreBusqueda);
    });

    if (estacionFeature) {
      const coords = estacionFeature.getGeometry().getCoordinates();
      // Marcador visual simple para indicar que hay algo
      const incFeature = new ol.Feature({
        geometry: new ol.geom.Point(coords),
        originalIncident: inc,
      });
      featuresGeneradas.push(incFeature);
    }
  });

  source.addFeatures(featuresGeneradas);
}

// Inicialización de Listeners básicos
function setupLayerInteractions() {
  map.on("pointermove", function (evt) {
    if (evt.dragging) return;
    const pixel = map.getEventPixel(evt.originalEvent);
    const hit = map.hasFeatureAtPixel(pixel);
    map.getTarget().style.cursor = hit ? "pointer" : "";
  });

  map.on("click", function (evt) {
    // Prioridad: Incidencias -> Metro -> Cercanías
    const feature = map.forEachFeatureAtPixel(
      evt.pixel,
      function (feature, layer) {
        // Si tocamos un marcador de incidencia, queremos ver la estación subyacente
        // O mostrar la incidencia directamente.
        // En este diseño, la incidencia se muestra DENTRO del popup de la estación.
        return feature;
      },
    );

    if (feature) {
      // Si es un feature de incidencia (punto rojo), buscamos la estación debajo o mostramos el popup de la estación
      // Para simplificar, asumimos que el usuario hace click en la estación o cerca.

      // Hack: si es feature de incidencia, no tiene propiedades de estación.
      // Pero como están en la misma coordenada, el click debería pillar también la estación si ajustamos capas.
      // Vamos a filtrar para obtener la feature de ESTACIÓN si existe.

      const features = map.getFeaturesAtPixel(evt.pixel);
      const stationFeature = features.find(
        (f) => f.get("NOMBRE_ESTACION") || f.get("DENOMINACIONESTACION"),
      );

      if (stationFeature) {
        mostrarDetallesEstacion(stationFeature, evt.coordinate);
      } else {
        overlay.setPosition(undefined);
      }
    } else {
      overlay.setPosition(undefined);
    }
  });

  // Cerrar popup
  const closer = document.getElementById("popup-closer");
  if (closer) {
    closer.onclick = function () {
      overlay.setPosition(undefined);
      closer.blur();
      return false;
    };
  }
}

setupLayerInteractions();
export { cargarHorarios, parseMetroLogos, mostrarDetallesEstacion };

// Escuchar mensajes (Manejado arriba)
// window.addEventListener("message", ... );
