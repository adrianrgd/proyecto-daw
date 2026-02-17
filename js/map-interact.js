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
  liveArea.innerHTML = '<div class="loading-text">Buscando trenes...</div>';

  try {
    const data = await fetchHorarios(codigoEstacion);

    if (!data || data.length === 0) {
      liveArea.innerHTML =
        '<div class="loading-text">Sin servicio disponible actualmente.</div>';
      return;
    }

    let html = "";
    // Mostramos máx 4 trenes
    data.slice(0, 4).forEach((tren) => {
      html += `
        <div class="train-row" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">
          <span class="train-dest">${tren.destino}</span>
          <span class="train-time">${tren.minutos} min</span>
        </div>
        <div class="train-details">
           <div class="train-detail-row">
              <span class="train-detail-label">Línea:</span>
              <span>${tren.linea}</span>
           </div>
           <div class="train-detail-row">
              <span class="train-detail-label">Hora:</span>
              <span>${tren.horaSalida}</span>
           </div>
           <div class="train-detail-row">
              <span class="train-detail-label">Tren:</span>
              <span>${tren.train_number || "N/A"}</span>
           </div>
           <div class="train-detail-row">
              <span class="train-detail-label">Estado:</span>
              <span>${tren.status}</span>
           </div>
        </div>
      `;
    });
    html +=
      '<button class="btn-see-more" onclick="alert(\'Funcionalidad no implementada aún\')">Ver más</button>';
    liveArea.innerHTML = html;
  } catch (error) {
    console.error("Error al cargar horarios:", error);
    liveArea.innerHTML =
      '<div class="loading-text" style="color:#d00">Error de conexión con la API</div>';
  }
}

// Función para parsear las líneas de Metro (igual que en el código viejo)
function parseMetroLogos(str) {
  if (!str) return [];
  const files = new Set();
  const text = str.toLowerCase();

  if (text.includes("ramal")) files.add("R");
  if (text.includes("metrosur")) files.add("L12");

  const numbers = text.match(/\d+/g) || [];
  numbers.forEach((num) => {
    const n = parseInt(num);
    if (n > 0 && n < 15) {
      if (text.includes("ligero")) files.add("ML" + n);
      else files.add("L" + n);
    }
  });

  return Array.from(files);
}

// Estilo hover para estaciones
function getHoverStationStyle(feature, resolution) {
  const zoom = 20 - Math.log2(resolution);
  // Ajustar escala según si es Metro (PNG grande) o Cercanías (SVG)
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
        src:
          feature.get("DENOMINACIONESTACION") || feature.get("ROTULO")
            ? "img/metro.svg"
            : "img/cercanias.svg",
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
        fill: new ol.style.Fill({ color: "#e60000" }),
        stroke: new ol.style.Stroke({ color: "#fff", width: 4 }),
        offsetY: 20,
        textAlign: "center",
      }),
      zIndex: 199,
    })
  );

  return styles;
}

// Hover sobre estaciones
map.on("pointermove", (evt) => {
  if (evt.dragging) return;

  const pixel = evt.pixel;
  let foundStation = false;

  map.forEachFeatureAtPixel(
    pixel,
    (feature, layer) => {
      if (layer === stationLayer || layer === metroStationLayer) {
        foundStation = true;

        // Si es una nueva feature
        if (hoveredFeature !== feature) {
          // Restaurar estilo anterior
          if (hoveredFeature) {
            hoveredFeature.setStyle(undefined);
          }

          // Aplicar nuevo estilo hover
          hoveredFeature = feature;
          feature.setStyle(
            getHoverStationStyle(feature, map.getView().getResolution())
          );

          // Cambiar cursor
          map.getTargetElement().style.cursor = "pointer";
        }
        return true;
      }
    },
    {
      hitTolerance: 10,
    }
  );

  // Si no hay estación, restaurar
  if (!foundStation && hoveredFeature) {
    hoveredFeature.setStyle(undefined);
    hoveredFeature = null;
    map.getTargetElement().style.cursor = "";
  }
});

// Listener para toggle y filtros
window.addEventListener("message", (e) => {
  console.log("📨 Mensaje recibido en iframe:", e.data);

  if (e.data.type === "TOGGLE_LAYER") {
    const visible = e.data.visible;
    console.log("👁️ Cambiando visibilidad de capas a:", visible);

    lineLayer.setVisible(visible);
    stationLayer.setVisible(visible);

    console.log(
      "✅ Visibilidad actualizada - Líneas:",
      lineLayer.getVisible(),
      "Estaciones:",
      stationLayer.getVisible()
    );
  }

  if (e.data.type === "TOGGLE_METRO") {
    const visible = e.data.visible;
    console.log("👁️ Cambiando visibilidad de Metro a:", visible);

    metroLineLayer.setVisible(visible);
    metroStationLayer.setVisible(visible);
  }

  if (e.data.type === "FILTER_METRO") {
    const lineCodes = e.data.lineCodes;
    const lineSource = metroLineLayer.getSource();
    const stationSource = metroStationLayer.getSource();

    console.log("Filtrando líneas Metro:", lineCodes);

    lineSource.getFeatures().forEach((feature) => {
      const codigo = feature.get("NUMEROLINEAUSUARIO") || "";
      const shouldShow = lineCodes.some((lc) => String(lc) === String(codigo));

      if (shouldShow) {
        feature.setStyle(undefined);
      } else {
        feature.setStyle(new ol.style.Style({}));
      }
    });

    stationSource.getFeatures().forEach((feature) => {
      const denom =
        feature.get("DENOMINACIONESTACION") || feature.get("ROTULO") || "";
      const lineas = feature.get("LINEAS") || ""; // En Metro geojson, a veces viene en LINEAS

      const shouldShow = lineCodes.some((lc) => {
        const regex = new RegExp(`\\b${lc}\\b`, "i");
        return regex.test(lineas) || regex.test(denom); // Fallback to denom if lineas is empty?
      });

      if (shouldShow) {
        feature.setStyle(undefined);
      } else {
        feature.setStyle(new ol.style.Style({}));
      }
    });

    metroLineLayer.changed();
    metroStationLayer.changed();
  }

  if (e.data.type === "RESET_METRO_FILTER") {
    metroLineLayer
      .getSource()
      .getFeatures()
      .forEach((f) => f.setStyle(undefined));
    metroStationLayer
      .getSource()
      .getFeatures()
      .forEach((f) => f.setStyle(undefined));
    metroLineLayer.changed();
    metroStationLayer.changed();
  }

  if (e.data.type === "FILTER_LINES") {
    const lineCodes = e.data.lineCodes; // Array de líneas seleccionadas
    const lineSource = lineLayer.getSource();
    const stationSource = stationLayer.getSource();

    console.log("Filtrando líneas:", lineCodes);

    // Filtrar líneas: mostrar solo las seleccionadas
    lineSource.getFeatures().forEach((feature) => {
      const codigo = feature.get("CODIGO") || "";
      const lineas = feature.get("LINEAS") || "";

      // Verificar si alguna de las líneas seleccionadas coincide EXACTAMENTE
      const shouldShow = lineCodes.some((lineCode) => {
        // Buscar coincidencia exacta: C1 NO debe coincidir con C10
        const regex = new RegExp(`\\b${lineCode}\\b`, "i");
        return regex.test(codigo) || regex.test(lineas);
      });

      if (shouldShow) {
        feature.setStyle(undefined); // Mostrar con estilo normal
      } else {
        feature.setStyle(new ol.style.Style({})); // Ocultar completamente
      }
    });

    // Filtrar estaciones: mostrar solo las de las líneas seleccionadas
    stationSource.getFeatures().forEach((feature) => {
      const lineas = feature.get("LINEAS") || "";

      const shouldShow = lineCodes.some((lineCode) => {
        const regex = new RegExp(`\\b${lineCode}\\b`, "i");
        return regex.test(lineas);
      });

      if (shouldShow) {
        feature.setStyle(undefined); // Mostrar con estilo normal
      } else {
        feature.setStyle(new ol.style.Style({})); // Ocultar completamente
      }
    });

    lineLayer.changed();
    stationLayer.changed();
  }

  if (e.data.type === "RESET_FILTER") {
    const lineSource = lineLayer.getSource();
    const stationSource = stationLayer.getSource();

    console.log("Restaurando todas las líneas");

    // Restaurar todas las líneas
    lineSource.getFeatures().forEach((feature) => {
      feature.setStyle(undefined);
    });

    // Restaurar todas las estaciones
    stationSource.getFeatures().forEach((feature) => {
      feature.setStyle(undefined);
    });

    lineLayer.changed();
    stationLayer.changed();
  }
});

// Click en estaciones
map.on("singleclick", (evt) => {
  const pixel = evt.pixel;
  let foundStation = false;

  map.forEachFeatureAtPixel(
    pixel,
    (feature, layer) => {
      if (layer === stationLayer || layer === metroStationLayer) {
        foundStation = true;
        const p = feature.getProperties();
        const coords = feature.getGeometry().getCoordinates();

        // Título
        contentTitle.innerText =
          p.NOMBRE_ESTACION || p.DENOMINACIONESTACION || "Estación";

        // Accesibilidad (como en el código viejo)
        if (accArea) {
          accArea.innerHTML = p.ACCESIBILIDAD?.toLowerCase().includes(
            "accesible"
          )
            ? `<div class="acc-box"><img src="img/accessible.svg"> <span>ACCESIBLE</span></div>`
            : "";
        }

        // Detectar tipo de estación
        const isMetro = !!(p.DENOMINACIONESTACION || p.ROTULO);

        // Referencia a secciones
        const cSection = document.getElementById("c-section");
        const mSection = document.getElementById("m-section");
        const cLabel = cSection.querySelector(".section-label");
        const mLabel = mSection.querySelector(".section-label");

        // Líneas Cercanías
        const lineasRaw = (p.LINEAS || "").split(",");
        const lineasClean = [...new Set(lineasRaw.map((l) => l.trim()))].filter(
          (l) => l
        );

        if (isMetro) {
          // Si es Metro, Cercanías son Correspondencias
          cLabel.innerHTML =
            '<i class="fas fa-train"></i> Correspondencias Cercanías';
          // En Metro, buscamos si tiene correspondencia (a veces en COR_METRO dice Renfe)
          const hasRenfe =
            (p.COR_METRO || "").toLowerCase().includes("renfe") ||
            (p.OBSERVACIONES || "").toLowerCase().includes("renfe") ||
            p.COR_RENFE;

          if (hasRenfe) {
            cSection.style.display = "block";
            contentC.innerHTML = `<span class="c-badge" style="background:#868584">Cercanías</span>`;
          } else {
            cSection.style.display = "none";
          }
        } else {
          // Si es Cercanías, son sus propias líneas
          cLabel.innerHTML = '<i class="fas fa-train"></i> Líneas Cercanías';
          if (lineasClean.length > 0) {
            cSection.style.display = "block";
            contentC.innerHTML = lineasClean
              .map((lId) => {
                const feat = lineLayer
                  .getSource()
                  .getFeatures()
                  .find((lf) => lf.get("CODIGO")?.startsWith(lId.trim()));
                const col = feat ? feat.get("COLOR") || "#e60000" : "#e60000";
                return `<span class="c-badge" style="background:${col}">${lId
                  .trim()
                  .replace("C", "C-")}</span>`;
              })
              .join("");
          } else {
            cSection.style.display = "none";
          }
        }

        // Metro Section
        let logosMetro = [];
        if (isMetro) {
          mLabel.innerHTML = '<i class="fas fa-subway"></i> Líneas Metro';
          // Usar la propiedad enriquecida
          const lMetro = p.LINEAS_METRO || "";
          logosMetro = lMetro
            .split(",")
            .filter((l) => l)
            .map((l) => (l === "R" ? "R" : "L" + l));
        } else {
          mLabel.innerHTML =
            '<i class="fas fa-subway"></i> Correspondencias Metro';
          logosMetro = parseMetroLogos(p.COR_METRO || "");
        }

        if (logosMetro.length > 0) {
          mSection.style.display = "block";
          metroLogos.innerHTML = logosMetro
            .map(
              (m) =>
                `<img src="img/${m}.svg" class="m-logo" onerror="this.src='img/metro.svg'; this.onerror=null;">`
            )
            .join("");
        } else {
          mSection.style.display = "none";
        }

        // Reordenar: Primero las líneas propias, luego correspondencias
        const contentArea = document.querySelector(".popup-content");
        if (isMetro) {
          contentArea.insertBefore(mSection, cSection);
        } else {
          contentArea.insertBefore(cSection, mSection);
        }

        // Cargar horarios (solo Cercanías o si tiene código)
        if (p.CODIGO_ESTACION) {
          cargarHorarios(p.CODIGO_ESTACION);
        } else {
          liveArea.innerHTML =
            '<div class="loading-text">No hay información de tiempos reales.</div>';
        }

        // Abrir popup
        map.getView().animate({ center: coords, duration: 500 });
        overlay.setPosition(coords);
        container.style.display = "block";

        return true;
      }
    },
    {
      hitTolerance: 10,
    }
  );

  if (!foundStation) {
    container.style.display = "none";
    overlay.setPosition(undefined);
  }
});

// Cerrar popup
closer.onclick = () => {
  container.style.display = "none";
  overlay.setPosition(undefined);
};

console.log("🎯 Interacciones del mapa cargadas");
