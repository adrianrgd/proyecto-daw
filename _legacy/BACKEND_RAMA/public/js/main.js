import { fetchRuta, fetchHorarios } from "./api-config.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnCercanias = document.getElementById("btnCercanias");
  const btnMetro = document.getElementById("btnMetro");
  const mapFrame = document.getElementById("mapFrame");
  const legend = document.getElementById("cercanias-legend");
  const btnResetFilter = document.getElementById("btnResetFilter");

  // Elementos del planificador de rutas
  const selectOrigen = document.getElementById("selectOrigen");
  const selectDestino = document.getElementById("selectDestino");
  const btnSwap = document.getElementById("btnSwapStations");
  const btnCalcular = document.getElementById("btnCalcularRuta");
  const routeResult = document.getElementById("routeResult");

  // Arrays para mantener las líneas seleccionadas
  let selectedLines = [];
  let selectedMetroLines = [];
  let estaciones = [];
  let iframeReady = false;

  const metroLegend = document.getElementById("metro-legend");
  const btnResetMetroFilter = document.getElementById("btnResetMetroFilter");

  // --- ESPERAR A QUE EL IFRAME ESTÉ LISTO ---
  if (mapFrame) {
    mapFrame.addEventListener("load", () => {
      console.log("✅ Iframe del mapa cargado");
      iframeReady = true;
    });
  }

  // --- 1. BOTÓN TOGGLE CERCANÍAS ---
  if (btnCercanias && mapFrame) {
    btnCercanias.addEventListener("click", () => {
      console.log("🖱️ Click en botón Cercanías");

      const isActive = btnCercanias.classList.toggle("active");
      console.log("Estado activo:", isActive);

      // Actualizar UI
      if (legend) legend.style.display = isActive ? "block" : "none";
      if (isActive && metroLegend) {
        metroLegend.style.display = "none";
        btnMetro.classList.remove("active");
        btnMetro.style.filter = "grayscale(1)";
      }
      btnCercanias.style.filter = isActive ? "none" : "grayscale(1)";

      // Enviar mensaje al iframe
      if (iframeReady && mapFrame.contentWindow) {
        console.log("📤 Enviando mensaje TOGGLE_LAYER al iframe:", isActive);
        mapFrame.contentWindow.postMessage(
          { type: "TOGGLE_LAYER", visible: isActive },
          "*"
        );
      }
    });
  }

  // --- 1B. BOTÓN TOGGLE METRO ---
  if (btnMetro && mapFrame) {
    btnMetro.addEventListener("click", () => {
      console.log("🖱️ Click en botón Metro");

      const isActive = btnMetro.classList.toggle("active");

      // Actualizar UI
      if (metroLegend) metroLegend.style.display = isActive ? "block" : "none";
      if (isActive && legend) {
        legend.style.display = "none";
        btnCercanias.classList.remove("active");
        btnCercanias.style.filter = "grayscale(1)";
      }
      btnMetro.style.filter = isActive ? "none" : "grayscale(1)";

      // Enviar mensaje al iframe
      if (iframeReady && mapFrame.contentWindow) {
        console.log("📤 Enviando mensaje TOGGLE_METRO al iframe:", isActive);
        mapFrame.contentWindow.postMessage(
          { type: "TOGGLE_METRO", visible: isActive },
          "*"
        );
      }
    });
  }

  // --- 2. CARGAR ESTACIONES EN SELECTS ---
  async function cargarEstaciones() {
    try {
      const response = await fetch("geojson/estaciones.geojson");
      const data = await response.json();

      estaciones = data.features
        .filter((f) => f.properties.NUCLEO == 10)
        .map((f) => ({
          nombre: f.properties.NOMBRE_ESTACION,
          codigo: f.properties.CODIGO_ESTACION,
          lineas: f.properties.LINEAS,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      [selectOrigen, selectDestino].forEach((select) => {
        estaciones.forEach((est) => {
          const option = document.createElement("option");
          option.value = est.codigo;
          option.textContent = est.nombre;
          select.appendChild(option);
        });
      });
    } catch (error) {
      console.error("Error al cargar estaciones:", error);
    }
  }

  cargarEstaciones();

  // --- 3. INTERCAMBIAR ESTACIONES ---
  if (btnSwap) {
    btnSwap.addEventListener("click", () => {
      const temp = selectOrigen.value;
      selectOrigen.value = selectDestino.value;
      selectDestino.value = temp;
    });
  }

  // --- 3B. MOSTRAR HORARIOS EN TIEMPO REAL ---
  if (selectOrigen) {
    selectOrigen.addEventListener("change", async () => {
      const stationCode = selectOrigen.value;
      if (!stationCode) return;

      // Crear o limpiar contenedor de horarios
      let scheduleContainer = document.getElementById("schedule-container");
      if (!scheduleContainer) {
        scheduleContainer = document.createElement("div");
        scheduleContainer.id = "schedule-container";
        scheduleContainer.className = "schedule-container";
        // Insertar después del grupo de inputs de ruta
        const routeGroup = document.querySelector(".route-input-group");
        if (routeGroup) {
          routeGroup.parentNode.insertBefore(
            scheduleContainer,
            routeGroup.nextSibling
          );
        }
      }

      scheduleContainer.innerHTML =
        '<div class="spinner"></div> Cargando horarios...';
      scheduleContainer.style.display = "block";

      const horarios = await fetchHorarios(stationCode);

      if (horarios.length === 0) {
        scheduleContainer.innerHTML =
          '<p class="no-data">No hay trenes próximos disponibles.</p>';
        return;
      }

      const listHtml = horarios
        .map(
          (h) => `
        <div class="schedule-item" onclick="this.querySelector('.schedule-details').classList.toggle('expanded')">
          <div class="schedule-summary">
            <span class="schedule-line badge-${h.linea
              .replace("-", "")
              .toLowerCase()}">${h.linea}</span>
            <span class="schedule-dest">${h.destino}</span>
            <span class="schedule-time ${
              h.status.includes("Delayed") ? "delayed" : ""
            }">${h.horaSalida}</span>
          </div>
          <div class="schedule-details">
             <div class="schedule-detail-row">
                <span class="schedule-detail-label">Tren:</span>
                <span>${h.train_number || "N/A"}</span>
             </div>
             <div class="schedule-detail-row">
                <span class="schedule-detail-label">Estado:</span>
                <span class="${
                  h.status.includes("Delayed") ? "delayed" : ""
                }">${h.status}</span>
             </div>
          </div>
        </div>
      `
        )
        .join("");

      scheduleContainer.innerHTML = `
        <div class="schedule-header">PRÓXIMAS SALIDAS</div>
        <div class="schedule-list">${listHtml}</div>
        <button class="btn-see-more" onclick="alert('Funcionalidad no implementada aún')">Ver más</button>
      `;
    });
  }

  // --- 4. CALCULAR RUTA ---
  if (btnCalcular) {
    btnCalcular.addEventListener("click", async () => {
      const origen = selectOrigen.value;
      const destino = selectDestino.value;

      if (!origen || !destino) {
        routeResult.style.display = "block";
        routeResult.innerHTML = `
          <div class="route-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Selecciona origen y destino</span>
          </div>
        `;
        return;
      }

      if (origen === destino) {
        routeResult.style.display = "block";
        routeResult.innerHTML = `
          <div class="route-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Origen y destino no pueden ser iguales</span>
          </div>
        `;
        return;
      }

      routeResult.style.display = "block";
      routeResult.innerHTML = `
        <div class="route-loading">
          <div class="spinner"></div>
          <p>Calculando ruta...</p>
        </div>
      `;

      const ruta = await fetchRuta(origen, destino);

      if (!ruta) {
        routeResult.innerHTML = `
          <div class="route-error">
            <i class="fas fa-times-circle"></i>
            <span>No se pudo calcular la ruta. Verifica la conexión con la API.</span>
          </div>
        `;
        return;
      }

      routeResult.innerHTML = `
        <div class="route-success">
          <div class="route-header">
            <i class="fas fa-check-circle route-icon"></i>
            <span class="route-title">Ruta encontrada</span>
          </div>
          
          <div class="route-info">
            <div class="route-info-item">
              <span class="route-info-label"><i class="far fa-clock"></i> Duración:</span>
              <span class="route-info-value">${ruta.duracion} min</span>
            </div>
            <div class="route-info-item">
              <span class="route-info-label"><i class="fas fa-exchange-alt"></i> Transbordos:</span>
              <span class="route-info-value">${ruta.transbordos}</span>
            </div>
            ${
              ruta.precio
                ? `
            <div class="route-info-item">
              <span class="route-info-label"><i class="fas fa-euro-sign"></i> Precio:</span>
              <span class="route-info-value">${ruta.precio.toFixed(2)}€</span>
            </div>
            `
                : ""
            }
          </div>
          
          <div class="route-lines">
            <span class="route-lines-label"><i class="fas fa-train"></i> Líneas:</span>
            ${ruta.lineas
              .map((l) => `<span class="route-line-badge">${l}</span>`)
              .join("")}
          </div>
          
          <div class="route-path">
            ${ruta.estaciones
              .map(
                (est, i) => `
              <div class="route-station">
                <span class="route-station-dot ${
                  i === 0
                    ? "origin"
                    : i === ruta.estaciones.length - 1
                    ? "destination"
                    : ""
                }"></span>
                <span class="route-station-name">${est}</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      `;
    });
  }

  // --- 5. FILTRADO POR LÍNEA ---
  document.addEventListener("click", (e) => {
    const item = e.target.closest(".legend-line-item");
    if (!item || !mapFrame || !iframeReady) return;

    const isMetro = item.closest("#metro-legend");
    const lineCode = item.dataset.line;

    if (isMetro) {
      if (selectedMetroLines.includes(lineCode)) {
        selectedMetroLines = selectedMetroLines.filter((l) => l !== lineCode);
        item.classList.remove("selected");
      } else {
        selectedMetroLines.push(lineCode);
        item.classList.add("selected");
      }

      const hasFilters = selectedMetroLines.length > 0;
      mapFrame.contentWindow.postMessage(
        {
          type: hasFilters ? "FILTER_METRO" : "RESET_METRO_FILTER",
          lineCodes: selectedMetroLines,
        },
        "*"
      );
      btnResetMetroFilter.style.display = hasFilters ? "inline-block" : "none";
    } else {
      // Cercanías
      if (selectedLines.includes(lineCode)) {
        selectedLines = selectedLines.filter((l) => l !== lineCode);
        item.classList.remove("selected");
      } else {
        selectedLines.push(lineCode);
        item.classList.add("selected");
      }

      const hasFilters = selectedLines.length > 0;
      mapFrame.contentWindow.postMessage(
        {
          type: hasFilters ? "FILTER_LINES" : "RESET_FILTER",
          lineCodes: selectedLines,
        },
        "*"
      );
      btnResetFilter.style.display = hasFilters ? "inline-block" : "none";
    }
  });

  // --- 6. BOTONES RESTAURAR ---
  if (btnResetFilter) {
    btnResetFilter.addEventListener("click", () => {
      selectedLines = [];
      if (iframeReady)
        mapFrame.contentWindow.postMessage({ type: "RESET_FILTER" }, "*");
      document
        .querySelectorAll("#cercanias-legend .legend-line-item")
        .forEach((el) => el.classList.remove("selected"));
      btnResetFilter.style.display = "none";
    });
  }

  if (btnResetMetroFilter) {
    btnResetMetroFilter.addEventListener("click", () => {
      selectedMetroLines = [];
      if (iframeReady)
        mapFrame.contentWindow.postMessage({ type: "RESET_METRO_FILTER" }, "*");
      document
        .querySelectorAll("#metro-legend .legend-line-item")
        .forEach((el) => el.classList.remove("selected"));
      btnResetMetroFilter.style.display = "none";
    });
  }
});
