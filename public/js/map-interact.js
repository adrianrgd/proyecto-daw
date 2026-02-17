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
      const retrasoClass = tren.retraso > 0 ? 'train-row-delayed' : '';
      const retrasoText = tren.retraso > 0 ? ` (+${tren.retraso}min)` : '';
      
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
              <span class="train-detail-value status-${tren.status.toLowerCase().replace(/\\s+/g, '-')}">${tren.status}</span>
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
    })
  );

  return styles;
}

// Función para mostrar detalles de estación
function mostrarDetallesEstacion(feature, coordinate) {
  console.log("📍 Estación seleccionada:", feature.getProperties());

  // Título
  const nombre =
    feature.get("NOMBRE_ESTACION") ||
    feature.get("DENOMINACIONESTACION") ||
    feature.get("ROTULO") ||
    "Estación desconocida";
  contentTitle.textContent = nombre;

  // Accesibilidad
  const accesibilidad = feature.get("ACCESIBILIDAD") || "No especificada";
  if (accArea) {
    accArea.innerHTML = `<div class="accessibility-info">♿ ${accesibilidad}</div>`;
  }

  // Líneas de Cercanías
  const lineasC = feature.get("LINEAS");
  if (lineasC) {
    contentC.innerHTML = "";
    lineasC.split(",").forEach((linea) => {
      const lineaLimpia = linea.trim();
      const logo = document.createElement("span");
      logo.className = "line-logo";
      logo.textContent = lineaLimpia;
      logo.title = `Línea ${lineaLimpia}`;
      contentC.appendChild(logo);
    });
  }

  // Líneas de Metro
  const lineasM = feature.get("LINEAS_METRO");
  if (lineasM && metroSection) {
    const logos = parseMetroLogos(lineasM);
    metroSection.style.display = logos.length > 0 ? "block" : "none";
    metroLogos.innerHTML = "";
    logos.forEach((logo) => {
      const span = document.createElement("span");
      span.className = "line-logo metro-logo";
      span.textContent = logo;
      span.title = `Línea ${logo}`;
      metroLogos.appendChild(span);
    });
  }

  // Cargar horarios
  const codigoEstacion = feature.get("CODIGO_ESTACION");
  if (codigoEstacion) {
    cargarHorarios(codigoEstacion);
  }

  // Mostrar popup
  overlay.setPosition(coordinate);
}

// Event listeners para capas
function setupLayerInteractions() {
  // Cercanías
  if (stationLayer) {
    map.on("click", function (evt) {
      const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
      }, { layers: [stationLayer] });

      if (feature) {
        mostrarDetallesEstacion(feature, evt.coordinate);
      } else {
        overlay.setPosition(undefined);
      }
    });
  }

  // Metro
  if (metroStationLayer) {
    map.on("click", function (evt) {
      const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
        return feature;
      }, { layers: [metroStationLayer] });

      if (feature) {
        mostrarDetallesEstacion(feature, evt.coordinate);
      }
    });
  }

  // Hover effects
  map.on("pointermove", function (evt) {
    const pixel = map.getEventPixel(evt.originalEvent);
    const hit = map.hasFeatureAtPixel(pixel, {
      layers: [stationLayer, metroStationLayer],
    });
    map.getTarget().style.cursor = hit ? "pointer" : "";
  });
}

// Cerrar popup
if (closer) {
  closer.addEventListener("click", function () {
    overlay.setPosition(undefined);
  });
}

// Inicializar
setupLayerInteractions();

// Exportar para uso externo
export { cargarHorarios, parseMetroLogos, mostrarDetallesEstacion };
