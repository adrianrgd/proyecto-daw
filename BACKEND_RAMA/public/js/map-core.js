import { lineStyle } from "./map-styles.js";

// Estilo de las estaciones con el icono cercanias.svg
const stationStyle = (feature, resolution) => {
  const zoom = 20 - Math.log2(resolution);
  let scale = 0.8 + (zoom - 11) * 0.15;
  scale = Math.max(0.7, Math.min(scale, 1.5));

  const styles = [
    new ol.style.Style({
      image: new ol.style.Icon({
        src: "img/cercanias.svg",
        scale: scale,
        anchor: [0.5, 0.5],
      }),
      zIndex: 100,
    }),
  ];

  // Mostrar nombres desde zoom 15.5
  if (zoom >= 15.5) {
    const nombre = feature.get("NOMBRE_ESTACION") || "";
    styles.push(
      new ol.style.Style({
        text: new ol.style.Text({
          text: nombre,
          font: "bold 11px Montserrat, sans-serif",
          fill: new ol.style.Fill({ color: "#333" }),
          stroke: new ol.style.Stroke({ color: "#fff", width: 3 }),
          offsetY: 18,
          textAlign: "center",
        }),
        zIndex: 99,
      })
    );
  }

  return styles;
};

const metroColors = {
  1: "#009BD5", // L1
  2: "#EF0000", // L2
  3: "#FFCC00", // L3
  4: "#A55D35", // L4
  5: "#93C01F", // L5
  "6-1": "#989898", // L6
  "7a": "#F58F00", // L7
  "7b": "#F58F00", // L7b
  8: "#FF66CC", // L8
  "9A": "#A900A9", // L9
  "9B": "#A900A9", // L9b
  "10b": "#001A94", // L10
  11: "#006633", // L11
  "12-1": "#A39300", // L12
  R: "#6E98C3", // Ramal
};

// Estilo para líneas de Metro
const metroLineStyle = (feature, resolution) => {
  const lineId = feature.get("NUMEROLINEAUSUARIO");
  const color = metroColors[lineId] || "#e3001b"; // Default red
  const zoom = 20 - Math.log2(resolution);

  return new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: color,
      width: zoom > 12 ? 5 : 3,
    }),
  });
};

// Estilo para estaciones de Metro
const metroStationStyle = (feature, resolution) => {
  const zoom = 20 - Math.log2(resolution);
  // Nuevo SVG (viewBox 1200x750). Escala pequeña para 24px aprox.
  let scale = 0.02 + (zoom - 11) * 0.005;
  scale = Math.max(0.015, Math.min(scale, 0.04));

  const styles = [
    new ol.style.Style({
      image: new ol.style.Icon({
        src: "img/metro.svg",
        scale: scale,
        anchor: [0.5, 0.5],
      }),
      zIndex: 100,
    }),
  ];

  if (zoom >= 15.5) {
    const nombre =
      feature.get("ROTULO") || feature.get("DENOMINACIONESTACION") || "";
    styles.push(
      new ol.style.Style({
        text: new ol.style.Text({
          text: nombre,
          font: "bold 11px Montserrat, sans-serif",
          fill: new ol.style.Fill({ color: "#fff" }),
          stroke: new ol.style.Stroke({ color: "#e3001b", width: 3 }),
          offsetY: 18,
          textAlign: "center",
        }),
        zIndex: 99,
      })
    );
  }
  return styles;
};

export const lineLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "geojson/madridlineas.geojson",
    format: new ol.format.GeoJSON({
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }),
  }),
  style: lineStyle,
});

export const stationLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "geojson/estaciones.geojson",
    format: new ol.format.GeoJSON({
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }),
  }),
  style: stationStyle,
  minZoom: 1,
  zIndex: 100,
});

// Capas de Metro (ahora en archivos separados como Cercanías)
export const metroLineLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "geojson/metrolineas.geojson",
    format: new ol.format.GeoJSON({
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }),
  }),
  style: metroLineStyle,
  visible: false, // Oculto por defecto
});

export const metroStationLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: "geojson/metroestaciones.geojson",
    format: new ol.format.GeoJSON({
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }),
  }),
  style: metroStationStyle,
  minZoom: 11,
  zIndex: 100,
  visible: false, // Oculto por defecto
});

// Evento para verificar carga de estaciones
stationLayer.getSource().on("change", function () {
  const state = stationLayer.getSource().getState();
  if (state === "ready") {
    const features = stationLayer.getSource().getFeatures();
    console.log(`✅ Estaciones cargadas: ${features.length}`);
  } else if (state === "error") {
    console.error("❌ Error al cargar estaciones");
  }
});

export const map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.XYZ({
        url: "https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      }),
    }),
    lineLayer,
    stationLayer,
    metroLineLayer,
    metroStationLayer,
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([-3.7037, 40.4167]),
    zoom: 11,
  }),
});

console.log("🗺️ Mapa inicializado");
