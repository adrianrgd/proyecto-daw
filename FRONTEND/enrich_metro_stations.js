const fs = require("fs");
const path = require("path");

const stationsFile =
  "C:\\Users\\Alumno.DESKTOP-DI5KTUG\\Documents\\Proyecto Intermodular Daw\\geojson\\metroestaciones.geojson";
const linesFile =
  "C:\\Users\\Alumno.DESKTOP-DI5KTUG\\Documents\\Proyecto Intermodular Daw\\geojson\\metrolineas.geojson";

try {
  const stationsData = JSON.parse(fs.readFileSync(stationsFile, "utf8"));
  const linesData = JSON.parse(fs.readFileSync(linesFile, "utf8"));

  // Map of Station Name to Set of cleaned line numbers
  const nameToLines = {};

  linesData.features.forEach((f) => {
    const name = (
      f.properties.DENOMINACION ||
      f.properties.DENOMINACIONESTACION ||
      ""
    )
      .toUpperCase()
      .trim();
    const lineRaw = f.properties.NUMEROLINEAUSUARIO;
    if (name && lineRaw) {
      // Clean line: "10a" -> "10", "6-1" -> "6", "R" -> "R"
      let line = lineRaw === "R" ? "R" : lineRaw.match(/\d+/)?.[0];
      if (line) {
        if (!nameToLines[name]) nameToLines[name] = new Set();
        nameToLines[name].add(line);
      }
    }
  });

  stationsData.features.forEach((f) => {
    const name = (
      f.properties.DENOMINACIONESTACION ||
      f.properties.DENOMINACION ||
      f.properties.ROTULO ||
      ""
    )
      .toUpperCase()
      .trim();
    if (name && nameToLines[name]) {
      f.properties.LINEAS_METRO = Array.from(nameToLines[name])
        .sort((a, b) => {
          if (a === "R") return 1;
          if (b === "R") return -1;
          return parseInt(a) - parseInt(b);
        })
        .join(",");
    }

    // Ensure some basic Renfe detection
    if (
      f.properties.OBSERVACIONES &&
      f.properties.OBSERVACIONES.toLowerCase().includes("renfe")
    ) {
      f.properties.COR_RENFE = "Cercanias";
    }
  });

  fs.writeFileSync(stationsFile, JSON.stringify(stationsData, null, 2));
  console.log(
    "✅ Robustly enriched metroestaciones.geojson with cleaned line data."
  );
} catch (err) {
  console.error(err);
}
