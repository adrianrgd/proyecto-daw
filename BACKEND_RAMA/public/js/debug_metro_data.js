const fs = require("fs");
const file =
  "C:\\Users\\Alumno.DESKTOP-DI5KTUG\\Documents\\Proyecto Intermodular Daw\\geojson\\metro.geojson";

try {
  const data = fs.readFileSync(file, "utf8");
  const json = JSON.parse(data);

  const stats = {
    total: json.features.length,
    types: {},
    ids: new Set(),
    duplicateIds: 0,
    propertyMismatch: 0, // Line features missing NUMEROLINEAUSUARIO
    stationNameExists: 0, // Point features with DENOMINACIONESTACION
  };

  json.features.forEach((f) => {
    const type = f.geometry.type;
    stats.types[type] = (stats.types[type] || 0) + 1;

    if (f.id !== undefined) {
      if (stats.ids.has(f.id)) {
        stats.duplicateIds++;
      }
      stats.ids.add(f.id);
    }

    if (type === "LineString" || type === "MultiLineString") {
      if (!f.properties || !f.properties.NUMEROLINEAUSUARIO) {
        stats.propertyMismatch++;
      }
    }
    if (type === "Point") {
      if (f.properties && f.properties.DENOMINACIONESTACION) {
        stats.stationNameExists++;
      }
    }
  });

  console.log("Stats:", {
    total: stats.total,
    types: stats.types,
    duplicateIds: stats.duplicateIds,
    linesMissingNumber: stats.propertyMismatch,
    stationsWithName: stats.stationsWithName,
  });

  // Sample properties of a line
  const lineFeature = json.features.find(
    (f) => f.geometry.type === "LineString"
  );
  if (lineFeature) {
    console.log("Sample Line Properties:", lineFeature.properties);
  }
} catch (err) {
  console.error(err);
}
