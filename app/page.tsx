'use client';

import { useEffect, useState } from 'react';
import MapComponent from './components/Map';
import './page.css';
import './map.css';

interface Estacion {
  nombre: string;
  codigo: string;
  lineas: string;
}

interface Horario {
  linea: string;
  destino: string;
  horaSalida: string;
  status: string;
  train_number?: string;
}

interface Ruta {
  duracion: number;
  transbordos: number;
  precio?: number;
  lineas: string[];
  estaciones: string[];
}

async function fetchHorarios(codigoEstacion: string): Promise<Horario[]> {
  try {
    const response = await fetch(`/api/proximoTren?estacion=${codigoEstacion}`);
    if (!response.ok) throw new Error('Error fetching horarios');
    return await response.json();
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    return [];
  }
}

async function fetchRuta(origen: string, destino: string): Promise<Ruta | null> {
  try {
    const response = await fetch(`/api/obtenerTrenes?origen=${origen}&destino=${destino}`);
    if (!response.ok) throw new Error('Error fetching ruta');
    return await response.json();
  } catch (error) {
    console.error('Error al obtener ruta:', error);
    return null;
  }
}

export default function Home() {
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [selectedOrigen, setSelectedOrigen] = useState('');
  const [selectedDestino, setSelectedDestino] = useState('');
  const [selectedLines, setSelectedLines] = useState<string[]>([]);
  const [selectedMetroLines, setSelectedMetroLines] = useState<string[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<Ruta | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [cercaniasActive, setCercaniasActive] = useState(true);
  const [metroActive, setMetroActive] = useState(false);

  // Cargar estaciones
  useEffect(() => {
    const cargarEstaciones = async () => {
      try {
        const response = await fetch('/geojson/estaciones.geojson');
        const data = await response.json();

        const estacionesFiltradas = data.features
          .filter((f: any) => f.properties.NUCLEO == 10)
          .map((f: any) => ({
            nombre: f.properties.NOMBRE_ESTACION,
            codigo: f.properties.CODIGO_ESTACION,
            lineas: f.properties.LINEAS,
          }))
          .sort((a: Estacion, b: Estacion) => a.nombre.localeCompare(b.nombre));

        setEstaciones(estacionesFiltradas);
      } catch (error) {
        console.error('Error al cargar estaciones:', error);
      }
    };

    cargarEstaciones();
  }, []);

  // Manejar toggle de Cercanías
  const handleToggleCercanias = () => {
    const newState = !cercaniasActive;
    setCercaniasActive(newState);

    if (metroActive) {
      setMetroActive(false);
    }
  };

  // Manejar toggle de Metro
  const handleToggleMetro = () => {
    const newState = !metroActive;
    setMetroActive(newState);

    if (cercaniasActive) {
      setCercaniasActive(false);
    }
  };

  // Manejar intercambio de estaciones
  const handleSwapStations = () => {
    const temp = selectedOrigen;
    setSelectedOrigen(selectedDestino);
    setSelectedDestino(temp);
  };

  // Cargar horarios al cambiar origen
  const handleOrigenChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const codigo = e.target.value;
    setSelectedOrigen(codigo);

    if (!codigo) {
      setShowSchedule(false);
      return;
    }

    setScheduleLoading(true);
    setShowSchedule(true);

    const data = await fetchHorarios(codigo);
    setHorarios(data);
    setScheduleLoading(false);
  };

  // Calcular ruta
  const handleCalcularRuta = async () => {
    if (!selectedOrigen || !selectedDestino) {
      setRouteResult(null);
      return;
    }

    if (selectedOrigen === selectedDestino) {
      setRouteResult(null);
      return;
    }

    setRouteLoading(true);

    const ruta = await fetchRuta(selectedOrigen, selectedDestino);
    setRouteResult(ruta);
    setRouteLoading(false);
  };

  // Manejar filtrado de líneas
  const handleLineClick = (lineCode: string, isMetro: boolean) => {
    if (isMetro) {
      const newLines = selectedMetroLines.includes(lineCode)
        ? selectedMetroLines.filter((l) => l !== lineCode)
        : [...selectedMetroLines, lineCode];

      setSelectedMetroLines(newLines);
    } else {
      const newLines = selectedLines.includes(lineCode)
        ? selectedLines.filter((l) => l !== lineCode)
        : [...selectedLines, lineCode];

      setSelectedLines(newLines);
    }
  };

  // Restaurar filtros
  const handleResetFilter = () => {
    setSelectedLines([]);
  };

  const handleResetMetroFilter = () => {
    setSelectedMetroLines([]);
  };

  const cercaniasLines = [
    { code: 'C1', color: '#0095ff' },
    { code: 'C2', color: '#00943d' },
    { code: 'C3', color: '#952585' },
    { code: 'C4a', color: '#2c2a86' },
    { code: 'C4b', color: '#2c2a86' },
    { code: 'C5', color: '#fecb00' },
    { code: 'C7', color: '#e5202a' },
    { code: 'C8a', color: '#868584' },
    { code: 'C8b', color: '#868584' },
    { code: 'C9', color: '#936037' },
    { code: 'C10', color: '#bccf00' },
  ];

  const metroLines = [
    { code: '1', color: '#009bd5' },
    { code: '2', color: '#ef0000' },
    { code: '3', color: '#ffcc00' },
    { code: '4', color: '#a55d35' },
    { code: '5', color: '#93c01f' },
    { code: '6', color: '#989898' },
    { code: '7', color: '#f58f00' },
    { code: '8', color: '#ff66cc' },
    { code: '9', color: '#a900a9' },
    { code: '10', color: '#001a94' },
    { code: '11', color: '#006633' },
    { code: '12', color: '#a39300' },
    { code: 'R', color: '#6e98c3' },
  ];

  return (
    <div className="dashboard">
      <header className="header">
        <div className="logo-section">
          <img src="/img/cercanias.svg" alt="Renfe" className="header-logo" />
          <div className="logo-text">
            <h1>Madrid Movilidad</h1>
            <p>Gestión de Transporte Multimodal</p>
          </div>
        </div>
      </header>

      <main className="main-content">
        <aside className="sidebar">
          <p className="sidebar-label">CAPAS ACTIVAS</p>

          <button
            className={`nav-button ${cercaniasActive ? 'active' : ''}`}
            onClick={handleToggleCercanias}
            style={{ filter: cercaniasActive ? 'none' : 'grayscale(1)' }}
          >
            <img src="/img/cercanias.svg" className="nav-logo" />
            <span>Cercanías Madrid</span>
          </button>

          <button
            className={`nav-button ${metroActive ? 'active' : ''}`}
            onClick={handleToggleMetro}
            style={{ filter: metroActive ? 'none' : 'grayscale(1)' }}
          >
            <img src="/img/metro.svg" className="nav-logo" />
            <span>Metro Madrid</span>
          </button>

          {/* PLANIFICADOR DE RUTAS */}
          <div className="route-planner">
            <p className="sidebar-label">PLANIFICAR VIAJE</p>

            <div className="route-input-group">
              <div className="route-input-wrapper">
                <label className="route-label">
                  <i className="fas fa-map-marker-alt" style={{ color: '#0095ff' }}></i>
                  Origen
                </label>
                <select
                  className="route-select"
                  value={selectedOrigen}
                  onChange={handleOrigenChange}
                >
                  <option value="">Selecciona estación...</option>
                  {estaciones.map((est) => (
                    <option key={est.codigo} value={est.codigo}>
                      {est.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-swap" title="Intercambiar" onClick={handleSwapStations}>
                <i className="fas fa-exchange-alt"></i>
              </button>

              <div className="route-input-wrapper">
                <label className="route-label">
                  <i className="fas fa-map-marker-alt" style={{ color: '#e60000' }}></i>
                  Destino
                </label>
                <select
                  className="route-select"
                  value={selectedDestino}
                  onChange={(e) => setSelectedDestino(e.target.value)}
                >
                  <option value="">Selecciona estación...</option>
                  {estaciones.map((est) => (
                    <option key={est.codigo} value={est.codigo}>
                      {est.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button className="btn-calculate-route" onClick={handleCalcularRuta}>
              <i className="fas fa-route"></i> Calcular Ruta
            </button>

            {showSchedule && (
              <div className="route-result">
                {scheduleLoading ? (
                  <div className="route-loading">
                    <div className="spinner"></div>
                    <p>Cargando horarios...</p>
                  </div>
                ) : horarios.length > 0 ? (
                  <div>
                    <div className="schedule-header">PRÓXIMAS SALIDAS</div>
                    <div className="schedule-list">
                      {horarios.map((h, i) => (
                        <div key={i} className="schedule-item">
                          <div className="schedule-summary">
                            <span className={`schedule-line badge-${h.linea.replace('-', '').toLowerCase()}`}>
                              {h.linea}
                            </span>
                            <span className="schedule-dest">{h.destino}</span>
                            <span
                              className={`schedule-time ${h.status.includes('Delayed') ? 'delayed' : ''}`}
                            >
                              {h.horaSalida}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="no-data">No hay trenes próximos disponibles.</p>
                )}
              </div>
            )}

            {routeLoading && (
              <div className="route-result">
                <div className="route-loading">
                  <div className="spinner"></div>
                  <p>Calculando ruta...</p>
                </div>
              </div>
            )}

            {routeResult && !routeLoading && (
              <div className="route-result">
                <div className="route-success">
                  <div className="route-header">
                    <i className="fas fa-check-circle route-icon"></i>
                    <span className="route-title">Ruta encontrada</span>
                  </div>

                  <div className="route-info">
                    <div className="route-info-item">
                      <span className="route-info-label">
                        <i className="far fa-clock"></i> Duración:
                      </span>
                      <span className="route-info-value">{routeResult.duracion} min</span>
                    </div>
                    <div className="route-info-item">
                      <span className="route-info-label">
                        <i className="fas fa-exchange-alt"></i> Transbordos:
                      </span>
                      <span className="route-info-value">{routeResult.transbordos}</span>
                    </div>
                    {routeResult.precio && (
                      <div className="route-info-item">
                        <span className="route-info-label">
                          <i className="fas fa-euro-sign"></i> Precio:
                        </span>
                        <span className="route-info-value">{routeResult.precio.toFixed(2)}€</span>
                      </div>
                    )}
                  </div>

                  <div className="route-lines">
                    <span className="route-lines-label">
                      <i className="fas fa-train"></i> Líneas:
                    </span>
                    {routeResult.lineas.map((l) => (
                      <span key={l} className="route-line-badge">
                        {l}
                      </span>
                    ))}
                  </div>

                  <div className="route-path">
                    {routeResult.estaciones.map((est, i) => (
                      <div key={i} className="route-station">
                        <span
                          className={`route-station-dot ${
                            i === 0
                              ? 'origin'
                              : i === routeResult.estaciones.length - 1
                              ? 'destination'
                              : ''
                          }`}
                        ></span>
                        <span className="route-station-name">{est}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LEYENDA CERCANÍAS */}
          {cercaniasActive && (
            <div className="legend-container">
              <div className="legend-header">
                <p className="sidebar-label">LÍNEAS CERCANÍAS</p>
                {selectedLines.length > 0 && (
                  <button className="btn-reset-filter" onClick={handleResetFilter}>
                    Ver todas
                  </button>
                )}
              </div>
              <div className="legend-grid">
                {cercaniasLines.map((line) => (
                  <div
                    key={line.code}
                    className={`legend-line-item ${selectedLines.includes(line.code) ? 'selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleLineClick(line.code, false)}
                  >
                    <span className="line-color" style={{ background: line.color }}></span>
                    <span className="line-name">{line.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LEYENDA METRO */}
          {metroActive && (
            <div className="legend-container">
              <div className="legend-header">
                <p className="sidebar-label">LÍNEAS METRO</p>
                {selectedMetroLines.length > 0 && (
                  <button className="btn-reset-filter" onClick={handleResetMetroFilter}>
                    Ver todas
                  </button>
                )}
              </div>
              <div className="legend-grid">
                {metroLines.map((line) => (
                  <div
                    key={line.code}
                    className={`legend-line-item ${selectedMetroLines.includes(line.code) ? 'selected' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleLineClick(line.code, true)}
                  >
                    <span className="line-color" style={{ background: line.color }}></span>
                    <span className="line-name">L-{line.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sidebar-footer">
            <p>Haz clic en las estaciones para ver detalles.</p>
          </div>
        </aside>

        <section className="map-section">
          <MapComponent
            activeLayers={{ cercanias: cercaniasActive, metro: metroActive }}
            selectedLines={selectedLines}
            selectedMetroLines={selectedMetroLines}
          />
        </section>
      </main>
    </div>
  );
}
