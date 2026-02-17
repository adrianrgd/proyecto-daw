const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "database.db");
const db = new sqlite3.Database(dbPath);

console.log("🌱 Sembrando datos de prueba...");

db.serialize(() => {
  // 1. Limpiar Tablas Antiguas
  db.run("DROP TABLE IF EXISTS incidencias");
  db.run("DROP TABLE IF EXISTS usuarios");

  // 2. Crear Tabla Usuarios
  db.run(`
        CREATE TABLE usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            avatar TEXT, -- URL o nombre de icono
            tipo TEXT DEFAULT 'viajero' -- 'admin', 'viajero', 'operador'
        )
    `);

  // 3. Crear Tabla Incidencias
  db.run(`
        CREATE TABLE incidencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descripcion TEXT,
            servicio TEXT, -- 'Cercanías', 'Metro'
            linea TEXT,
            estacion TEXT,
            votos INTEGER DEFAULT 0,
            usuarioId INTEGER,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(usuarioId) REFERENCES usuarios(id)
        )
    `);

  // 4. Insertar Usuarios Mock
  const usuarios = [
    { nombre: "Admin Metro", tipo: "admin", avatar: "fas fa-user-shield" },
    {
      nombre: "Viajero Frecuente",
      tipo: "viajero",
      avatar: "fas fa-user-clock",
    },
    {
      nombre: "Turista Perdido",
      tipo: "viajero",
      avatar: "fas fa-camera-retro",
    },
    { nombre: "Operador C-5", tipo: "operador", avatar: "fas fa-headset" },
  ];

  const stmtUser = db.prepare(
    "INSERT INTO usuarios (nombre, tipo, avatar) VALUES (?, ?, ?)",
  );
  usuarios.forEach((u) => stmtUser.run(u.nombre, u.tipo, u.avatar));
  stmtUser.finalize();

  // 5. Insertar Incidencias de Prueba
  const incidencias = [
    {
      titulo: "Escalera mecánica averiada",
      desc: "La de salida a Pza Sol no funciona.",
      servicio: "Metro",
      linea: "L-1",
      estacion: "Sol",
      votos: 5,
      usuarioId: 2,
    },
    {
      titulo: "Retraso de 15 min",
      desc: "Tren parado en túnel antes de llegar.",
      servicio: "Cercanías",
      linea: "C-4",
      estacion: "Atocha",
      votos: 12,
      usuarioId: 4,
    },
    {
      titulo: "Suciedad en vagón 3",
      desc: "Alguien ha tirado un refresco.",
      servicio: "Metro",
      linea: "L-10",
      estacion: "Tribunal",
      votos: -1,
      usuarioId: 3,
    },
  ];

  const stmtInc = db.prepare(`
        INSERT INTO incidencias (titulo, descripcion, servicio, linea, estacion, votos, usuarioId) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
  incidencias.forEach((i) =>
    stmtInc.run(
      i.titulo,
      i.desc,
      i.servicio,
      i.linea,
      i.estacion,
      i.votos,
      i.usuarioId,
    ),
  );
  stmtInc.finalize();

  console.log("✅ Base de datos regenerada con éxito!");
});

db.close();
