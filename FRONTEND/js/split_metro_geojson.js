const fs = require("fs");
const path = require("path");

const srcFile =
  "C:\\Users\\Alumno.DESKTOP-DI5KTUG\\Documents\\Proyecto Intermodular Daw\\geojson\\metro.geojson";
const outputDir =
  "C:\\Users\\Alumno.DESKTOP-DI5KTUG\\Documents\\Proyecto Intermodular Daw\\geojson";

try {
  const data = fs.readFileSync(srcFile, "utf8");
  const json = JSON.parse(data);

  const stations = {
    type: "FeatureCollection",
    name: "METRO_ESTACIONES",
    features: [],
  };

  const lines = {
    type: "FeatureCollection",
    name: "METRO_LINEAS",
    features: [],
  };

  json.features.forEach((f, index) => {
    const type = f.geometry.type;
    // Clean up: delete shared ids to avoid conflicts
    delete f.id;

    if (type === "Point") {
      stations.features.push(f);
    } else if (type === "LineString" || type === "MultiLineString") {
      // Map NUMEROLINEAUSUARIO to CODIGO to match Renfe pattern if we want
      if (f.properties && f.properties.NUMEROLINEAUSUARIO) {
        f.properties.CODIGO = "L" + f.properties.NUMEROLINEAUSUARIO;
        f.properties.NOMBRE = "Línea " + f.properties.NUMEROLINEAUSUARIO;
      }
      lines.features.push(f);
    }
  });

  fs.writeFileSync(
    path.join(outputDir, "metroestaciones.geojson"),
    JSON.stringify(stations, null, 2)
  );
  fs.writeFileSync(
    path.join(outputDir, "metrolineas.geojson"),
    JSON.stringify(lines, null, 2)
  );

  console.log(
    `✅ Extracted ${stations.features.length} stations and ${lines.features.length} line segments.`
  );
} catch (err) {
  console.error(err);
}
