import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

let pool = null;
let useMock = false;

// Base de datos mock en memoria para desarrollo/pruebas locales inmediatas
const mockDb = {
  usuarios: [],
  actividades: [
    { id: 1, nombre: 'Ingresar a canal de WhatsApp', puntos: 150, tipo: 'captura', activa: true },
    { id: 2, nombre: 'Encuesta de satisfacción', puntos: 100, tipo: 'captura', activa: true },
    { id: 3, nombre: 'Mercado de predicciones', puntos: 200, tipo: 'captura', activa: true },
    { id: 4, nombre: 'Rayar camiseta Binance', puntos: 150, tipo: 'presencial', activa: true },
    { id: 5, nombre: 'Juego de penales', puntos: 250, tipo: 'presencial', activa: true },
    { id: 6, nombre: 'Futbolin', puntos: 300, tipo: 'presencial', activa: true },
    { id: 7, nombre: 'Juego de cabeceos', puntos: null, tipo: 'juego', activa: true },
    { id: 8, nombre: 'Adivina el jugador', puntos: 200, tipo: 'captura', activa: true }
  ],
  participaciones: [],
  userIdCounter: 1,
  partIdCounter: 1
};

if (connectionString) {
  pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('supabase') || connectionString.includes('render') || connectionString.includes('railway')
      ? { rejectUnauthorized: false }
      : false
  });
  
  pool.on('connect', () => {
    console.log('PostgreSQL Database connected successfully.');
  });
  
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });
} else {
  useMock = true;
  console.log('⚠️ DATABASE_URL no configurada. Ejecutando con base de datos MOCK en memoria.');
}

const db = {
  query: async (text, params) => {
    if (!useMock) {
      return pool.query(text, params);
    }

    const sql = text.trim().replace(/\s+/g, ' ');

    // 1. Obtener usuario por qr_token (Staff y consultas)
    if (sql.includes('FROM usuarios WHERE qr_token =')) {
      const qr_token = params[0];
      const found = mockDb.usuarios.find(u => u.qr_token === qr_token);
      return { rows: found ? [found] : [] };
    }

    // 2. Obtener usuario por BUID (Dashboard y registro check)
    if (sql.includes('FROM usuarios WHERE buid =')) {
      const buid = params[0];
      const found = mockDb.usuarios.find(u => u.buid === buid);
      return { rows: found ? [found] : [] };
    }

    // 3. Registrar nuevo usuario / STAFF / ADMIN (INSERT usuarios)
    if (sql.startsWith('INSERT INTO usuarios')) {
      let buid, es_nuevo, qr_token;
      if (params.length === 2) { // getOrCreateSystemUser (buid, qr_token)
        [buid, qr_token] = params;
        es_nuevo = false;
      } else { // Asistente register (buid, es_nuevo, qr_token)
        [buid, es_nuevo, qr_token] = params;
      }
      
      const newId = mockDb.userIdCounter++;
      const newUser = {
        id: newId,
        buid,
        es_nuevo: !!es_nuevo,
        qr_token,
        fecha_registro: new Date(),
        puntos_totales: 0,
        puntos_cabeceos: 0,
        premio_reclamado: false
      };
      mockDb.usuarios.push(newUser);
      return { rows: [newUser] };
    }

    // 4. Obtener listado de todas las actividades
    if (sql.startsWith('SELECT * FROM actividades')) {
      return { rows: mockDb.actividades };
    }

    // 5. Obtener participaciones del usuario
    if (sql.includes('FROM participaciones p WHERE p.usuario_id =')) {
      const usuario_id = params[0];
      const rows = mockDb.participaciones.filter(p => p.usuario_id == usuario_id);
      return { rows };
    }

    // 6. Obtener actividad individual
    if (sql.startsWith('SELECT id, puntos, tipo, activa FROM actividades WHERE id =')) {
      const id = params[0];
      const found = mockDb.actividades.find(a => a.id == id);
      return { rows: found ? [found] : [] };
    }

    // 7. Verificar duplicados de participación (aprobadas / pendientes)
    if (sql.includes('SELECT id FROM participaciones WHERE usuario_id =')) {
      const [usuario_id, actividad_id] = params;
      const checkPending = sql.includes('pendiente');
      if (checkPending) {
        const found = mockDb.participaciones.find(
          p => p.usuario_id == usuario_id && p.actividad_id == actividad_id && (p.estado === 'aprobado' || p.estado === 'pendiente')
        );
        return { rows: found ? [found] : [] };
      } else {
        const found = mockDb.participaciones.find(
          p => p.usuario_id == usuario_id && p.actividad_id == actividad_id && p.estado === 'aprobado'
        );
        return { rows: found ? [found] : [] };
      }
    }

    // 8. Registrar participaciones de captura (pendiente)
    if (sql.startsWith('INSERT INTO participaciones (usuario_id, actividad_id, estado, puntos_otorgados, url_captura) VALUES')) {
      const [usuario_id, actividad_id, url_captura] = params;
      const newId = mockDb.partIdCounter++;
      const newPart = {
        id: newId,
        usuario_id: parseInt(usuario_id, 10),
        actividad_id: parseInt(actividad_id, 10),
        estado: 'pendiente',
        puntos_otorgados: 0,
        url_captura,
        fecha: new Date(),
        staff_id: null,
        admin_id: null
      };
      mockDb.participaciones.push(newPart);
      return { rows: [newPart] };
    }

    // 9. Registrar participación aprobada presencial (Staff)
    if (sql.includes('staff_id) VALUES')) {
      const [usuario_id, actividad_id, puntos_otorgados, staff_id] = params;
      const newId = mockDb.partIdCounter++;
      const newPart = {
        id: newId,
        usuario_id: parseInt(usuario_id, 10),
        actividad_id: parseInt(actividad_id, 10),
        estado: 'aprobado',
        puntos_otorgados: parseInt(puntos_otorgados, 10),
        url_captura: null,
        fecha: new Date(),
        staff_id: parseInt(staff_id, 10),
        admin_id: null
      };
      mockDb.participaciones.push(newPart);
      return { rows: [newPart] };
    }

    // 10. Actualizar usuarios (puntos_totales o puntos_cabeceos)
    if (sql.startsWith('UPDATE usuarios')) {
      const isPrizeUpdate = sql.includes('premio_reclamado = $1');
      const isGameScore = sql.includes('puntos_cabeceos = $1');
      if (isPrizeUpdate) {
        const [premio_reclamado, id] = params;
        const user = mockDb.usuarios.find(u => u.id == id);
        if (user) {
          user.premio_reclamado = !!premio_reclamado;
          return { rows: [user] };
        }
      } else if (isGameScore) {
        const [score, id] = params;
        const user = mockDb.usuarios.find(u => u.id == id);
        if (user) {
          user.puntos_cabeceos = parseInt(score, 10);
          const approvedPts = mockDb.participaciones
            .filter(p => p.usuario_id == id && p.estado === 'aprobado')
            .reduce((sum, p) => sum + p.puntos_otorgados, 0);
          user.puntos_totales = approvedPts + user.puntos_cabeceos;
          return { rows: [user] };
        }
      } else {
        // Recalcular puntos totales por participación
        const id = params[0];
        const user = mockDb.usuarios.find(u => u.id == id);
        if (user) {
          const approvedPts = mockDb.participaciones
            .filter(p => p.usuario_id == id && p.estado === 'aprobado')
            .reduce((sum, p) => sum + p.puntos_otorgados, 0);
          user.puntos_totales = approvedPts + user.puntos_cabeceos;
          return { rows: [user] };
        }
      }
      return { rows: [] };
    }

    // 11. Obtener detalle de participación con puntos (para aprobar Admin)
    if (sql.includes('JOIN actividades a ON p.actividad_id = a.id WHERE p.id =')) {
      const id = parseInt(params[0], 10);
      const part = mockDb.participaciones.find(p => p.id == id);
      if (part) {
        const act = mockDb.actividades.find(a => a.id == part.actividad_id);
        return {
          rows: [{
            id: part.id,
            usuario_id: part.usuario_id,
            actividad_id: part.actividad_id,
            estado: part.estado,
            puntos: act ? act.puntos : 0
          }]
        };
      }
      return { rows: [] };
    }

    // 12. Actualizar participaciones (aprobación/rechazo Admin)
    if (sql.startsWith('UPDATE participaciones')) {
      if (sql.includes("estado = 'aprobado'")) {
        const puntos = parseInt(params[0], 10);
        const admin_id = parseInt(params[1], 10);
        const id = parseInt(params[2], 10);
        const part = mockDb.participaciones.find(p => p.id == id);
        if (part) {
          part.estado = 'aprobado';
          part.puntos_otorgados = puntos;
          part.admin_id = admin_id;
          return { rows: [part] };
        }
      } else if (sql.includes("estado = 'rechazado'")) {
        const admin_id = parseInt(params[0], 10);
        const id = parseInt(params[1], 10);
        const part = mockDb.participaciones.find(p => p.id == id);
        if (part) {
          part.estado = 'rechazado';
          part.puntos_otorgados = 0;
          part.admin_id = admin_id;
          return { rows: [part] };
        }
      }
      return { rows: [] };
    }

    // 13. Obtener cola de capturas pendientes (Admin)
    if (sql.includes("WHERE p.estado = 'pendiente' AND a.tipo = 'captura'")) {
      const pending = mockDb.participaciones.filter(p => p.estado === 'pendiente');
      const rows = pending.map(p => {
        const u = mockDb.usuarios.find(user => user.id == p.usuario_id);
        const a = mockDb.actividades.find(act => act.id == p.actividad_id);
        return {
          id: p.id,
          url_captura: p.url_captura,
          fecha: p.fecha,
          buid: u ? u.buid : 'UNKNOWN',
          actividad_nombre: a ? a.nombre : 'UNKNOWN',
          puntos_maximos: a ? a.puntos : 0
        };
      });
      return { rows };
    }

    // 14. Obtener estado de participación por ID individual (check admin)
    if (sql.startsWith('SELECT estado, usuario_id FROM participaciones WHERE id =')) {
      const id = parseInt(params[0], 10);
      const found = mockDb.participaciones.find(p => p.id == id);
      return { rows: found ? [found] : [] };
    }

    // 15. Obtener puntos_totales y puntos_cabeceos por ID
    if (sql.startsWith('SELECT puntos_totales, puntos_cabeceos FROM usuarios WHERE id =')) {
      const id = params[0];
      const user = mockDb.usuarios.find(u => u.id == id);
      return { rows: user ? [{ puntos_totales: user.puntos_totales, puntos_cabeceos: user.puntos_cabeceos }] : [] };
    }

    // 16. Obtener Top 5 (Ranking)
    if (sql.includes("CONCAT('****', RIGHT(buid, 4)) AS buid_oculto")) {
      const filtered = mockDb.usuarios.filter(u => u.buid !== 'STAFF' && u.buid !== 'ADMIN');
      const sorted = [...filtered].sort((a, b) => {
        if (b.puntos_totales !== a.puntos_totales) {
          return b.puntos_totales - a.puntos_totales;
        }
        return b.puntos_cabeceos - a.puntos_cabeceos;
      });
      const top5 = sorted.slice(0, 5).map(u => ({
        buid_oculto: `****${u.buid.slice(-4)}`,
        puntos_totales: u.puntos_totales,
        puntos_cabeceos: u.puntos_cabeceos
      }));
      return { rows: top5 };
    }

    // 17. Obtener estado activa de una actividad (Toggle)
    if (sql.startsWith('SELECT activa FROM actividades WHERE id =')) {
      const id = parseInt(params[0], 10);
      const act = mockDb.actividades.find(a => a.id == id);
      return { rows: act ? [{ activa: act.activa }] : [] };
    }

    // 18. Cambiar estado activa de una actividad (Toggle)
    if (sql.startsWith('UPDATE actividades SET activa = $1 WHERE id = $2 RETURNING *')) {
      const activa = params[0];
      const id = parseInt(params[1], 10);
      const act = mockDb.actividades.find(a => a.id == id);
      if (act) {
        act.activa = activa;
        return { rows: [act] };
      }
      return { rows: [] };
    }

    throw new Error(`Unhandled mock query: "${sql}"`);
  }
};

export default db;
