// Algoritmo de desplazamiento lateral (Offset)
export function getOffsetCoords(coords, offset) {
  const offsetCoords = [];
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
}

export const lineStyle = (feature, resolution) => {
  const props = feature.getProperties();
  const zoom = 20 - Math.log2(resolution);

  const color = props.COLOR || "#e60000";
  const offset = (props.OFFSET || 0) * resolution * 0.8;

  return new ol.style.Style({
    geometry: (f) => {
      const coords = f.getGeometry().getCoordinates();
      return offset !== 0 && zoom > 10.5
        ? new ol.geom.LineString(getOffsetCoords(coords, offset))
        : f.getGeometry();
    },
    stroke: new ol.style.Stroke({
      color: color,
      width: zoom > 12 ? 6 : 4,
      lineCap: "round",
      lineJoin: "round",
    }),
  });
};
