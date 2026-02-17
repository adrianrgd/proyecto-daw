'use client';

import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { fromLonLat } from 'ol/proj';
import Layer from 'ol/layer/Layer';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import GeoJSON from 'ol/format/GeoJSON';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import Text from 'ol/style/Text';
import Overlay from 'ol/Overlay';
import { LineString } from 'ol/geom';

interface Horario {
  linea: string;
  destino: string;
  horaSalida: string;
  minutos: number;
  status: string;
}

interface MapComponentProps {
  onStationClick?: (station: any) => void;
  activeLayers?: {
    cercanias: boolean;
    metro: boolean;
  };
  selectedLines?: string[];
  selectedMetroLines?: string[];
}

const MapComponent: React.FC<MapComponentProps> = ({
  onStationClick,
  activeLayers = { cercanias: true, metro: false },
  selectedLines = [],
  selectedMetroLines = [],
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<Map | null>(null);
  const layersRef = useRef<{
    stationLayer: VectorLayer<VectorSource> | null;
    lineLayer: VectorLayer<VectorSource> | null;
    metroStationLayer: VectorLayer<VectorSource> | null;
    metroLineLayer: VectorLayer<VectorSource> | null;
  }>({
    stationLayer: null,
    lineLayer: null,
    metroStationLayer: null,
    metroLineLayer: null,
  });

  // Función para obtener horarios desde la API
  const fetchHorarios = async (codigoEstacion: string): Promise<Horario[]> => {
    try {
      const response = await fetch(`/api/proximoTren?estacion=${codigoEstacion}`);
      if (!response.ok) throw new Error('Error fetching horarios');
      
      const data = await response.json();
      
      // Calcular minutos desde la hora actual
      const now = new Date();
      const horarios: Horario[] = [];
      
      if (data.tren) {
        const [hh, mm] = data.tren.salida.split(':').map(Number);
        const salidaTime = new Date();
        salidaTime.setHours(hh, mm, 0);
        
        const minutosFaltantes = Math.max(0, Math.floor((salidaTime.getTime() - now.getTime()) / 60000));
        
        horarios.push({
          linea: data.tren.linea || 'N/A',
          destino: data.destino?.nombre_estacion || 'Desconocido',
          horaSalida: data.tren.salida,
          minutos: minutosFaltantes,
          status: data.tren.tiempo_real?.retraso_min ? `Retrasado ${data.tren.tiempo_real.retraso_min} min` : 'A tiempo',
        });
      }
      
      return horarios;
    } catch (error) {
      console.error('Error al obtener horarios:', error);
      return [];
    }
  };

  // Función para obtener rutas por línea desde obtenerTrenes
  const fetchRutasPorLinea = async (codigoEstacion: string, lineas: string): Promise<Horario[]> => {
    try {
      // Obtener final-lineas.json
      const finalLineasResponse = await fetch('/geojson/final-lineas.json');
      const finalLineas: any[] = await finalLineasResponse.json();

      // Parsear las líneas de la estación
      const lineasArray = lineas.split(',').map((l: string) => l.trim()).filter((l: string) => l);
      
      const horarios: Horario[] = [];

      // Para cada línea, obtener tanto el inicio como el final y hacer dos requests
      for (const linea of lineasArray) {
        const finalLineaData = finalLineas.find((fl: any) => fl.linea === linea);
        
        if (finalLineaData) {
          // Request 1: origen → final
          try {
            const response1 = await fetch(
              `/api/obtenerTrenes?origen=${codigoEstacion}&destino=${finalLineaData.codEstacionFinal}`
            );
            
            if (response1.ok) {
              const data1 = await response1.json();
              
              // Procesar cada tren devuelto
              if (data1.trenes && data1.trenes.length > 0) {
                const tren = data1.trenes[0]; // Tomar el primer tren
                const now = new Date();
                const [hh, mm] = tren.salida.split(':').map(Number);
                const salidaTime = new Date();
                salidaTime.setHours(hh, mm, 0);
                
                const minutosFaltantes = Math.max(0, Math.floor((salidaTime.getTime() - now.getTime()) / 60000));
                
                horarios.push({
                  linea: tren.linea || linea,
                  destino: data1.destino?.nombre_estacion || 'Desconocido (Final)',
                  horaSalida: tren.salida,
                  minutos: minutosFaltantes,
                  status: tren.tiempo_real?.retraso_min ? `Retrasado ${tren.tiempo_real.retraso_min} min` : 'A tiempo',
                });
              }
            }
          } catch (error) {
            console.error(`Error al obtener ruta final para línea ${linea}:`, error);
          }

          // Request 2: principio → origen
          try {
            const response2 = await fetch(
              `/api/obtenerTrenes?origen=${finalLineaData.codEstacionOrigen}&destino=${codigoEstacion}`
            );
            
            if (response2.ok) {
              const data2 = await response2.json();
              
              // Procesar cada tren devuelto
              if (data2.trenes && data2.trenes.length > 0) {
                const tren = data2.trenes[0]; // Tomar el primer tren
                const now = new Date();
                const [hh, mm] = tren.salida.split(':').map(Number);
                const salidaTime = new Date();
                salidaTime.setHours(hh, mm, 0);
                
                const minutosFaltantes = Math.max(0, Math.floor((salidaTime.getTime() - now.getTime()) / 60000));
                
                horarios.push({
                  linea: tren.linea || linea,
                  destino: data2.destino?.nombre_estacion || 'Desconocido (Principio)',
                  horaSalida: tren.salida,
                  minutos: minutosFaltantes,
                  status: tren.tiempo_real?.retraso_min ? `Retrasado ${tren.tiempo_real.retraso_min} min` : 'A tiempo',
                });
              }
            }
          } catch (error) {
            console.error(`Error al obtener ruta principio para línea ${linea}:`, error);
          }
        }
      }

      // Ordenar por minutos (menor a mayor)
      horarios.sort((a, b) => a.minutos - b.minutos);

      return horarios;
    } catch (error) {
      console.error('Error al obtener rutas por línea:', error);
      return [];
    }
  };

  const metroColors: { [key: string]: string } = {
    '1': '#009BD5',
    '2': '#EF0000',
    '3': '#FFCC00',
    '4': '#A55D35',
    '5': '#93C01F',
    '6-1': '#989898',
    '7a': '#F58F00',
    '7b': '#F58F00',
    '8': '#FF66CC',
    '9A': '#A900A9',
    '9B': '#A900A9',
    '10b': '#001A94',
    '11': '#006633',
    '12-1': '#A39300',
    'R': '#6E98C3',
  };

  const cercaniasLineColors: { [key: string]: string } = {
    'C1': '#0095ff',
    'C2': '#00943d',
    'C3': '#952585',
    'C4': '#2c2a86',
    'C5': '#fecb00',
    'C7': '#e5202a',
    'C8': '#868584',
    'C9': '#936037',
    'C10': '#bccf00',
  };

  // Función para obtener el color de la línea de cercanías
  const getCercaniasLineColor = (lineName: string): string => {
    for (const [key, value] of Object.entries(cercaniasLineColors)) {
      if (lineName.includes(key)) {
        return value;
      }
    }
    return '#e60000';
  };

  // Función para desplazar coords (offset)
  const getOffsetCoords = (coords: any[], offset: number): any[] => {
    const offsetCoords: any[] = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const [x1, y1] = coords[i];
      const [x2, y2] = coords[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) continue;
      const nx = -dy / len;
      const ny = dx / len;
      offsetCoords.push([x1 + nx * offset, y1 + ny * offset]);
      if (i === coords.length - 2)
        offsetCoords.push([x2 + nx * offset, y2 + ny * offset]);
    }
    return offsetCoords;
  };

  // Estilo para estaciones de Cercanías
  const stationStyle = (feature: any, resolution: number) => {
    const zoom = 20 - Math.log2(resolution);
    let scale = 0.8 + (zoom - 11) * 0.15;
    scale = Math.max(0.7, Math.min(scale, 1.5));

    const styles = [
      new Style({
        image: new Icon({
          src: '/img/cercanias.svg',
          scale: scale,
          anchor: [0.5, 0.5],
        }),
        zIndex: 100,
      }),
    ];

    if (zoom >= 15.5) {
      const nombre = feature.get('NOMBRE_ESTACION') || '';
      styles.push(
        new Style({
          text: new Text({
            text: nombre,
            font: 'bold 11px Montserrat, sans-serif',
            fill: new Fill({ color: '#333' }),
            stroke: new Stroke({ color: '#fff', width: 3 }),
            offsetY: 18,
            textAlign: 'center',
          }),
          zIndex: 99,
        })
      );
    }

    return styles;
  };

  // Estilo para líneas de Cercanías
  const lineStyle = (feature: any, resolution: number) => {
    const props = feature.getProperties();
    const zoom = 20 - Math.log2(resolution);
    const color = props.COLOR || getCercaniasLineColor(props.LINEA || '') || '#e60000';
    const offset = (props.OFFSET || 0) * resolution * 0.8;

    return new Style({
      geometry: (f: any) => {
        const coords = f.getGeometry()?.getCoordinates();
        if (!coords) return f.getGeometry();
        return offset !== 0 && zoom > 10.5
          ? new LineString(getOffsetCoords(coords, offset))
          : f.getGeometry();
      },
      stroke: new Stroke({
        color: color,
        width: zoom > 12 ? 6 : 4,
        lineCap: 'round',
        lineJoin: 'round',
      }),
    });
  };

  // Estilo para líneas de Metro
  const metroLineStyle = (feature: any, resolution: number) => {
    const lineId = feature.get('NUMEROLINEAUSUARIO');
    const color = metroColors[lineId] || '#e3001b';
    const zoom = 20 - Math.log2(resolution);

    return new Style({
      stroke: new Stroke({
        color: color,
        width: zoom > 12 ? 5 : 3,
      }),
    });
  };

  // Estilo para estaciones de Metro
  const metroStationStyle = (feature: any, resolution: number) => {
    const zoom = 20 - Math.log2(resolution);
    let scale = 0.02 + (zoom - 11) * 0.005;
    scale = Math.max(0.015, Math.min(scale, 0.04));

    const styles = [
      new Style({
        image: new Icon({
          src: '/img/metro.svg',
          scale: scale,
          anchor: [0.5, 0.5],
        }),
        zIndex: 100,
      }),
    ];

    if (zoom >= 15.5) {
      const nombre = feature.get('ROTULO') || feature.get('DENOMINACIONESTACION') || '';
      styles.push(
        new Style({
          text: new Text({
            text: nombre,
            font: 'bold 11px Montserrat, sans-serif',
            fill: new Fill({ color: '#fff' }),
            stroke: new Stroke({ color: '#e3001b', width: 3 }),
            offsetY: 18,
            textAlign: 'center',
          }),
          zIndex: 99,
        })
      );
    }

    return styles;
  };

  // Inicializar el mapa
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    // Crear capas
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: 'https://{a-c}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      }),
    });

    // Capa de líneas de Cercanías
    const lineLayer = new VectorLayer({
      source: new VectorSource({
        url: '/geojson/madridlineas.geojson',
        format: new GeoJSON({
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: lineStyle,
      zIndex: 50,
    });

    // Capa de estaciones de Cercanías
    const stationLayer = new VectorLayer({
      source: new VectorSource({
        url: '/geojson/estaciones.geojson',
        format: new GeoJSON({
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: stationStyle,
      minZoom: 1,
      zIndex: 100,
    });

    // Capa de líneas de Metro
    const metroLineLayer = new VectorLayer({
      source: new VectorSource({
        url: '/geojson/metrolineas.geojson',
        format: new GeoJSON({
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: metroLineStyle,
      visible: activeLayers.metro,
      zIndex: 50,
    });

    // Capa de estaciones de Metro
    const metroStationLayer = new VectorLayer({
      source: new VectorSource({
        url: '/geojson/metroestaciones.geojson',
        format: new GeoJSON({
          dataProjection: 'EPSG:4326',
          featureProjection: 'EPSG:3857',
        }),
      }),
      style: metroStationStyle,
      visible: activeLayers.metro,
      minZoom: 11,
      zIndex: 100,
    });

    // Crear overlay para popup
    const popupElement = document.createElement('div');
    popupElement.className = 'ol-popup';
    popupElement.innerHTML = `
      <a id="popup-closer" class="popup-closer">×</a>
      <div class="popup-header">
        <div id="popup-title" class="st-name"></div>
      </div>
      <div class="popup-content">
        <div id="acc-area"></div>
        <div id="c-section">
          <div class="section-label"><i class="fas fa-train"></i> Líneas Cercanías</div>
          <div id="c-logos" class="logo-flex"></div>
        </div>
        <div id="m-section" style="display: none">
          <div class="section-label"><i class="fas fa-subway"></i> Metro</div>
          <div id="m-logos" class="logo-flex"></div>
        </div>
        <div class="times-section">
          <div class="times-header">
            <span>Próximos Trenes</span>
            <span><i class="far fa-clock"></i> Real</span>
          </div>
          <div id="live-times-area"></div>
        </div>
      </div>
    `;
    
    // Agregar popup al contenedor del mapa
    if (mapContainer.current) {
      mapContainer.current.appendChild(popupElement);
    }

    const popupOverlay = new Overlay({
      element: popupElement,
      autoPan: { animation: { duration: 250 } },
    });

    // Crear el mapa
    const map = new Map({
      target: mapContainer.current,
      layers: [baseLayer, lineLayer, stationLayer, metroLineLayer, metroStationLayer],
      view: new View({
        center: fromLonLat([-3.7037, 40.4167]),
        zoom: 11,
      }),
      overlays: [popupOverlay],
    });

    mapInstance.current = map;
    layersRef.current = {
      stationLayer,
      lineLayer,
      metroStationLayer,
      metroLineLayer,
    };

    // Manejar click en estaciones
    map.on('click', async (evt: any) => {
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f: any) => f);

      if (feature) {
        const nombre =
          feature.get('NOMBRE_ESTACION') ||
          feature.get('ROTULO') ||
          feature.get('DENOMINACIONESTACION') ||
          '';
        
        const codigo = feature.get('CODIGO_ESTACION');
        
        if (nombre) {
          popupElement.style.display = 'block';
          const coordinate = evt.coordinate;
          popupOverlay.setPosition(coordinate);

          const contentTitle = popupElement.querySelector('#popup-title');
          if (contentTitle) {
            contentTitle.textContent = nombre;
          }

          // Cargar horarios si es una estación de cercanías
          if (codigo) {
            const liveTimesArea = popupElement.querySelector('#live-times-area');
            if (liveTimesArea) {
              liveTimesArea.innerHTML = '<div class="loading-text">Cargando horarios...</div>';
            }
            
            // Obtener las líneas de la estación
            const lineas = feature.get('LINEAS') || '';
            
            // Obtener rutas por línea
            const horarios = await fetchRutasPorLinea(codigo, lineas);
            
            if (liveTimesArea) {
              if (horarios.length > 0) {
                let html = '';
                horarios.forEach((h) => {
                  html += `
                    <div class="train-row">
                      <span class="train-dest">${h.linea}: ${h.destino}</span>
                      <span class="train-time">${h.minutos} min</span>
                    </div>
                  `;
                });
                liveTimesArea.innerHTML = html;
              } else {
                liveTimesArea.innerHTML = '<div class="loading-text">Sin horarios disponibles</div>';
              }
            }
          }

          onStationClick?.(feature);
        }
      } else {
        popupElement.style.display = 'none';
        popupOverlay.setPosition(undefined);
      }
    });

    // Cerrar popup al hacer click en la X
    const closer = popupElement.querySelector('#popup-closer');
    if (closer) {
      closer.addEventListener('click', () => {
        popupElement.style.display = 'none';
        popupOverlay.setPosition(undefined);
      });
    }

    return () => {
      map.dispose();
      mapInstance.current = null;
    };
  }, [onStationClick]);

  // Actualizar visibilidad de capas
  useEffect(() => {
    if (!layersRef.current.lineLayer || !layersRef.current.stationLayer) return;

    layersRef.current.lineLayer.setVisible(activeLayers.cercanias);
    layersRef.current.stationLayer.setVisible(activeLayers.cercanias);
    layersRef.current.metroLineLayer?.setVisible(activeLayers.metro);
    layersRef.current.metroStationLayer?.setVisible(activeLayers.metro);
  }, [activeLayers]);

  // Filtrar líneas de Cercanías
  useEffect(() => {
    if (!layersRef.current.lineLayer) return;

    const source = layersRef.current.lineLayer.getSource();
    if (!source) return;

    source.getFeatures().forEach((feature: any) => {
      if (selectedLines.length === 0) {
        feature.setStyle(lineStyle(feature, 100));
      } else {
        const linea = feature.get('LINEA') || '';
        const isSelected = selectedLines.some((line) => linea.includes(line));
        
        if (isSelected) {
          feature.setStyle(lineStyle(feature, 100));
        } else {
          feature.setStyle(
            new Style({
              stroke: new Stroke({
                color: getCercaniasLineColor(linea),
                width: 2,
                lineDash: [5, 5],
              }),
            })
          );
        }
      }
    });
  }, [selectedLines]);

  // Filtrar líneas de Metro
  useEffect(() => {
    if (!layersRef.current.metroLineLayer) return;

    const source = layersRef.current.metroLineLayer.getSource();
    if (!source) return;

    source.getFeatures().forEach((feature: any) => {
      if (selectedMetroLines.length === 0) {
        feature.setStyle(metroLineStyle(feature, 100));
      } else {
        const lineId = feature.get('NUMEROLINEAUSUARIO');
        const isSelected = selectedMetroLines.includes(String(lineId));
        
        if (isSelected) {
          feature.setStyle(metroLineStyle(feature, 100));
        } else {
          const color = metroColors[lineId] || '#e3001b';
          feature.setStyle(
            new Style({
              stroke: new Stroke({
                color: color,
                width: 2,
                lineDash: [5, 5],
              }),
            })
          );
        }
      }
    });
  }, [selectedMetroLines]);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
};

export default MapComponent;
