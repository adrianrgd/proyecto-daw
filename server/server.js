const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const multer = require("multer"); // Para subida de archivos (futuro)

const app = express();
const PORT = 3000;

// Configuración de Base de Datos
const dbPath = path.resolve(__dirname, "database.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error al conectar con la base de datos:", err.message);
  } else {
    console.log("Conectado a la base de datos SQLite.");
  }
});

// Middleware
app.use(express.json()); // Para entender JSON en peticiones POST
app.use(express.static(path.join(__dirname, "../public"))); // Servir Frontend

// --- API ROUTES ---

// 1. Obtener Incidencias
app.get("/api/incidencias", (req, res) => {
  const query = `
        SELECT incidencias.*, usuarios.nombre as usuarioNombre, usuarios.avatar as usuarioAvatar, usuarios.tipo as usuarioTipo
        FROM incidencias
        JOIN usuarios ON incidencias.usuarioId = usuarios.id
        ORDER BY fecha DESC
    `;
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 2. Crear Incidencia
app.post("/api/incidencias", (req, res) => {
  const { titulo, descripcion, servicio, linea, estacion, usuarioId } =
    req.body;

  // Validación básica
  if (!titulo || !usuarioId) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  const query = `
        INSERT INTO incidencias (titulo, descripcion, servicio, linea, estacion, usuarioId)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

  db.run(
    query,
    [titulo, descripcion, servicio, linea, estacion, usuarioId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        id: this.lastID,
        message: "Incidencia creada correctamente",
      });
    },
  );
});

// 3. Obtener Usuarios (Para el selector de Simulación)
app.get("/api/usuarios", (req, res) => {
  db.all("SELECT * FROM usuarios", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 4. Validar/Votar Incidencia (Simulado)
app.post("/api/incidencias/:id/votar", (req, res) => {
  const { id } = req.params;
  const { tipo } = req.body; // 'positivo' o 'negativo'

  const incremento = tipo === "positivo" ? 1 : -1;

  db.run(
    "UPDATE incidencias SET votos = votos + ? WHERE id = ?",
    [incremento, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: "Voto registrado" });
    },
  );
});

// Arrancar Servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor escuchando en http://localhost:${PORT}`);
  console.log(`   - Mapa: http://localhost:${PORT}/index.html`);
  console.log(`   - API:  http://localhost:${PORT}/api/incidencias\n`);
});
