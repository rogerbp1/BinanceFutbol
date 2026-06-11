import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';
import pool from './db.js';
import { generateQrToken, verifyQrToken } from './crypto_helper.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar directorio local de subida
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Configurar Supabase (si está disponible)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  console.log('Cliente de Supabase inicializado correctamente.');
} else {
  console.log('⚠️ Advertencia: SUPABASE_URL o SUPABASE_KEY no configurados. Las subidas fallarán si no hay Cloudinary.');
}

// Configurar Cloudinary (si está disponible)
const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
                             process.env.CLOUDINARY_API_KEY &&
                             process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('Cloudinary configurado exitosamente.');
} else {
  console.log('⚠️ Advertencia: Cloudinary no está configurado. Se guardarán las capturas localmente si no hay Supabase.');
}

// Configurar Multer para procesamiento de archivos en memoria (buffers)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Claves secretas y PINs desde variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2026_binance';
const PIN_STAFF = process.env.PIN_STAFF || '1234';
const PIN_ADMIN = process.env.PIN_ADMIN || '3412';

// Middleware de autenticación JWT
function authenticateRole(allowedRoles) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado.' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido o expirado.' });
      }
      if (allowedRoles && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Permisos insuficientes para realizar esta acción.' });
      }
      req.user = decoded;
      next();
    });
  };
}

// Obtener o crear ID de usuario del sistema (Staff / Admin) para cumplir la llave foránea
async function getOrCreateSystemUser(buid) {
  const selectRes = await pool.query('SELECT id FROM usuarios WHERE buid = $1', [buid]);
  if (selectRes.rows.length > 0) {
    return selectRes.rows[0].id;
  }
  const placeholderQr = `${buid.toLowerCase()}_token_placeholder`;
  const insertRes = await pool.query(
    'INSERT INTO usuarios (buid, qr_token, puntos_totales, puntos_cabeceos) VALUES ($1, $2, 0, 0) RETURNING id',
    [buid, placeholderQr]
  );
  return insertRes.rows[0].id;
}

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================

// Login Staff
app.post('/api/auth/staff', async (req, res) => {
  const { pin } = req.body;
  if (pin === PIN_STAFF) {
    try {
      const userId = await getOrCreateSystemUser('STAFF');
      const token = jwt.sign({ userId, role: 'staff' }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, role: 'staff' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error interno del servidor al autenticar.' });
    }
  }
  return res.status(401).json({ error: 'PIN de Staff incorrecto.' });
});

// Login Admin
app.post('/api/auth/admin', async (req, res) => {
  const { pin } = req.body;
  if (pin === PIN_ADMIN) {
    try {
      const userId = await getOrCreateSystemUser('ADMIN');
      const token = jwt.sign({ userId, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
      return res.json({ token, role: 'admin' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error interno del servidor al autenticar.' });
    }
  }
  return res.status(401).json({ error: 'PIN de Administrador incorrecto.' });
});

// ==========================================
// ENDPOINTS DE USUARIOS
// ==========================================

// Registro de usuario
app.post('/api/usuarios/registro', async (req, res) => {
  const { buid, es_nuevo } = req.body;
  
  if (!buid || buid.trim().length === 0) {
    return res.status(400).json({ error: 'El BUID es requerido.' });
  }

  try {
    // Validar si el BUID ya existe en la base de datos
    const checkUser = await pool.query('SELECT qr_token, buid FROM usuarios WHERE buid = $1', [buid]);
    if (checkUser.rows.length > 0) {
      // Si el BUID ya existe, retornamos sus datos con 200 OK para iniciar sesión implícitamente
      return res.status(200).json(checkUser.rows[0]);
    }

    // Generar token QR firmado
    const qr_token = generateQrToken();

    // Guardar usuario en la base de datos
    const newUser = await pool.query(
      'INSERT INTO usuarios (buid, es_nuevo, qr_token, puntos_totales, puntos_cabeceos) VALUES ($1, $2, $3, 0, 0) RETURNING qr_token, buid',
      [buid, !!es_nuevo, qr_token]
    );

    return res.status(201).json(newUser.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar el usuario en base de datos.' });
  }
});

// Obtener usuario por qr_token (Staff)
app.get('/api/usuarios/qr/:token', async (req, res) => {
  const { token } = req.params;

  // Verificar la firma del token para evitar manipulaciones
  if (!verifyQrToken(token)) {
    return res.status(400).json({ error: 'Token QR inválido o alterado.' });
  }

  try {
    const userRes = await pool.query(
      'SELECT id, buid, puntos_totales, puntos_cabeceos FROM usuarios WHERE qr_token = $1',
      [token]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    return res.json(userRes.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al consultar el usuario.' });
  }
});

// Dashboard del usuario
app.get('/api/usuarios/:buid/dashboard', async (req, res) => {
  const { buid } = req.params;

  try {
    const userRes = await pool.query(
      'SELECT id, buid, puntos_totales, puntos_cabeceos, qr_token FROM usuarios WHERE buid = $1',
      [buid]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const usuario = userRes.rows[0];

    // Obtener actividades
    const actRes = await pool.query('SELECT * FROM actividades ORDER BY id ASC');
    const actividades = actRes.rows;

    // Obtener participaciones aprobadas, pendientes y rechazadas del usuario
    const partRes = await pool.query(
      `SELECT p.id, p.actividad_id, p.estado, p.puntos_otorgados, p.url_captura
       FROM participaciones p
       WHERE p.usuario_id = $1`,
      [usuario.id]
    );
    const participaciones = partRes.rows;

    // Mapear el estado individual de cada actividad para el usuario
    const actividadesMapeadas = actividades.map(act => {
      // Filtrar participaciones para esta actividad
      const partsAct = participaciones.filter(p => p.actividad_id === act.id);
      
      // Priorizar el estado: aprobado > pendiente > rechazado > no realizada
      const aprobado = partsAct.find(p => p.estado === 'aprobado');
      const pendiente = partsAct.find(p => p.estado === 'pendiente');
      const rechazado = partsAct.find(p => p.estado === 'rechazado');

      let estado = 'no realizada';
      let url_captura = null;
      let puntos_obtenidos = 0;
      let participacion_id = null;

      if (aprobado) {
        estado = 'aprobado';
        url_captura = aprobado.url_captura;
        puntos_obtenidos = aprobado.puntos_otorgados;
        participacion_id = aprobado.id;
      } else if (pendiente) {
        estado = 'pendiente';
        url_captura = pendiente.url_captura;
        puntos_obtenidos = 0;
        participacion_id = pendiente.id;
      } else if (rechazado) {
        estado = 'rechazado';
        url_captura = rechazado.url_captura;
        puntos_obtenidos = 0;
        participacion_id = rechazado.id;
      }

      return {
        id: act.id,
        nombre: act.nombre,
        puntos_maximos: act.puntos,
        tipo: act.tipo,
        activa: act.activa,
        estado,
        url_captura,
        puntos_obtenidos,
        participacion_id
      };
    });

    return res.json({
      buid: usuario.buid,
      puntos_totales: usuario.puntos_totales,
      puntos_cabeceos: usuario.puntos_cabeceos,
      qr_token: usuario.qr_token,
      actividades: actividadesMapeadas
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al consultar el dashboard del usuario.' });
  }
});

// ==========================================
// ENDPOINTS DE PARTICIPACIONES
// ==========================================

// Registrar participación por captura (Usuario)
app.post('/api/participaciones/captura', upload.single('captura'), async (req, res) => {
  const { buid, actividad_id } = req.body;
  const file = req.file;

  if (!buid || !actividad_id || !file) {
    return res.status(400).json({ error: 'BUID, actividad_id y captura (imagen) son requeridos.' });
  }

  try {
    // Buscar ID del usuario
    const userRes = await pool.query('SELECT id FROM usuarios WHERE buid = $1', [buid]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const usuario_id = userRes.rows[0].id;

    // Buscar actividad y verificar tipo y si está activa
    const actRes = await pool.query('SELECT id, puntos, tipo, activa FROM actividades WHERE id = $1', [actividad_id]);
    if (actRes.rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada.' });
    }
    const actividad = actRes.rows[0];

    if (!actividad.activa) {
      return res.status(400).json({ error: 'Esta actividad no está activa actualmente.' });
    }

    if (actividad.tipo !== 'captura') {
      return res.status(400).json({ error: 'Esta actividad no requiere subir captura.' });
    }

    // Verificar si ya tiene una participación aprobada o pendiente para esta actividad
    const checkApproved = await pool.query(
      "SELECT id FROM participaciones WHERE usuario_id = $1 AND actividad_id = $2 AND estado IN ('aprobado', 'pendiente')",
      [usuario_id, actividad_id]
    );
    if (checkApproved.rows.length > 0) {
      return res.status(400).json({ error: 'Ya tienes una participación pendiente o aprobada para esta actividad.' });
    }

    // Subir imagen (a Supabase Storage si está disponible, luego a Cloudinary, sino guardar local)
    let url_captura = '';
    if (supabase) {
      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${buid}-${uniqueSuffix}${path.extname(file.originalname)}`;
        
        const { data, error } = await supabase.storage
          .from('capturas')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true
          });

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('capturas')
          .getPublicUrl(fileName);

        url_captura = urlData.publicUrl;
      } catch (err) {
        console.error('Error cargando imagen a Supabase Storage:', err);
        return res.status(500).json({ error: 'Error al subir la captura a Supabase Storage.' });
      }
    } else if (isCloudinaryConfigured) {
      try {
        const uploadFromBuffer = (fileBuffer) => {
          return new Promise((resolve, reject) => {
            let stream = cloudinary.uploader.upload_stream(
              { folder: 'binance_mundial_2026' },
              (error, result) => {
                if (result) {
                  resolve(result);
                } else {
                  reject(error);
                }
              }
            );
            stream.write(fileBuffer);
            stream.end();
          });
        };
        const result = await uploadFromBuffer(file.buffer);
        url_captura = result.secure_url;
      } catch (err) {
        console.error('Error cargando imagen a Cloudinary:', err);
        return res.status(500).json({ error: 'Error al subir la captura a Cloudinary.' });
      }
    } else {
      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        url_captura = `/uploads/${fileName}`;
      } catch (err) {
        console.error('Error guardando imagen localmente:', err);
        return res.status(500).json({ error: 'Error al guardar la captura localmente.' });
      }
    }

    // Insertar participación con estado 'pendiente'
    const newPart = await pool.query(
      'INSERT INTO participaciones (usuario_id, actividad_id, estado, puntos_otorgados, url_captura) VALUES ($1, $2, \'pendiente\', 0, $3) RETURNING *',
      [usuario_id, actividad_id, url_captura]
    );

    return res.status(201).json(newPart.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al registrar la participación.' });
  }
});

// Registrar participación presencial (Staff)
app.post('/api/participaciones/presencial', authenticateRole(['staff']), async (req, res) => {
  const { qr_token, actividad_id, puntos } = req.body;
  const staff_id = req.user.userId;

  if (!qr_token || !actividad_id) {
    return res.status(400).json({ error: 'qr_token y actividad_id son requeridos.' });
  }

  // Validar token QR
  if (!verifyQrToken(qr_token)) {
    return res.status(400).json({ error: 'Token QR inválido o alterado.' });
  }

  try {
    // Buscar ID del usuario
    const userRes = await pool.query('SELECT id FROM usuarios WHERE qr_token = $1', [qr_token]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const usuario_id = userRes.rows[0].id;

    // Buscar actividad y verificar tipo y estado activo
    const actRes = await pool.query('SELECT id, puntos, tipo, activa FROM actividades WHERE id = $1', [actividad_id]);
    if (actRes.rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada.' });
    }
    const actividad = actRes.rows[0];

    if (!actividad.activa) {
      return res.status(400).json({ error: 'Esta actividad no está activa actualmente.' });
    }

    if (actividad.tipo !== 'presencial') {
      return res.status(400).json({ error: 'Esta actividad no es de tipo presencial.' });
    }

    // Verificar si ya tiene una participación aprobada
    const checkApproved = await pool.query(
      "SELECT id FROM participaciones WHERE usuario_id = $1 AND actividad_id = $2 AND estado = 'aprobado'",
      [usuario_id, actividad_id]
    );
    if (checkApproved.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya completó esta actividad presencial.' });
    }

    // Usar los puntos recibidos, o el valor por defecto de la actividad
    const puntosAcreditados = (puntos !== undefined && puntos !== null) ? parseInt(puntos, 10) : actividad.puntos;

    // Insertar participación presencial como aprobada inmediatamente
    await pool.query(
      'INSERT INTO participaciones (usuario_id, actividad_id, estado, puntos_otorgados, staff_id) VALUES ($1, $2, \'aprobado\', $3, $4)',
      [usuario_id, actividad_id, puntosAcreditados, staff_id]
    );

    // Recalcular puntos totales del usuario
    const updateRes = await pool.query(
      `UPDATE usuarios
       SET puntos_totales = (
         SELECT COALESCE(SUM(puntos_otorgados), 0)
         FROM participaciones
         WHERE usuario_id = usuarios.id AND estado = 'aprobado'
       ) + puntos_cabeceos
       WHERE id = $1
       RETURNING id, buid, puntos_totales`,
      [usuario_id]
    );

    return res.status(201).json({
      message: 'Puntos asignados exitosamente.',
      usuario: updateRes.rows[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al registrar la participación presencial.' });
  }
});

// Aprobación de capturas (Admin)
app.patch('/api/participaciones/:id/aprobar', authenticateRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user.userId;

  try {
    // Obtener la participación y validar que exista
    const partRes = await pool.query(
      `SELECT p.id, p.usuario_id, p.actividad_id, p.estado, a.puntos
       FROM participaciones p
       JOIN actividades a ON p.actividad_id = a.id
       WHERE p.id = $1`,
      [id]
    );
    if (partRes.rows.length === 0) {
      return res.status(404).json({ error: 'Participación no encontrada.' });
    }
    const part = partRes.rows[0];

    if (part.estado === 'aprobado') {
      return res.status(400).json({ error: 'Esta participación ya ha sido aprobada.' });
    }

    // Verificar que el usuario no tenga ya otra participación aprobada para esta actividad
    const checkApproved = await pool.query(
      "SELECT id FROM participaciones WHERE usuario_id = $1 AND actividad_id = $2 AND estado = 'aprobado'",
      [part.usuario_id, part.actividad_id]
    );
    if (checkApproved.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya cuenta con otra participación aprobada para esta actividad.' });
    }

    // Actualizar participación a aprobada y asignar puntos
    await pool.query(
      'UPDATE participaciones SET estado = \'aprobado\', puntos_otorgados = $1, admin_id = $2 WHERE id = $3',
      [part.puntos, admin_id, id]
    );

    // Recalcular puntos_totales del usuario
    await pool.query(
      `UPDATE usuarios
       SET puntos_totales = (
         SELECT COALESCE(SUM(puntos_otorgados), 0)
         FROM participaciones
         WHERE usuario_id = usuarios.id AND estado = 'aprobado'
       ) + puntos_cabeceos
       WHERE id = $1`,
      [part.usuario_id]
    );

    return res.json({ message: 'Participación aprobada y puntos acreditados.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al aprobar la participación.' });
  }
});

// Rechazo de capturas (Admin)
app.patch('/api/participaciones/:id/rechazar', authenticateRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const admin_id = req.user.userId;

  try {
    const checkRes = await pool.query('SELECT estado, usuario_id FROM participaciones WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Participación no encontrada.' });
    }
    const part = checkRes.rows[0];

    if (part.estado === 'aprobado') {
      return res.status(400).json({ error: 'No se puede rechazar una participación que ya fue aprobada.' });
    }

    await pool.query(
      'UPDATE participaciones SET estado = \'rechazado\', puntos_otorgados = 0, admin_id = $1 WHERE id = $2',
      [admin_id, id]
    );

    return res.json({ message: 'Participación rechazada.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al rechazar la participación.' });
  }
});

// Listado de capturas pendientes (Admin)
app.get('/api/participaciones/pendientes', authenticateRole(['admin']), async (req, res) => {
  try {
    const pendingRes = await pool.query(
      `SELECT p.id, p.url_captura, p.fecha, u.buid, a.nombre as actividad_nombre, a.puntos as puntos_maximos
       FROM participaciones p
       JOIN usuarios u ON p.usuario_id = u.id
       JOIN actividades a ON p.actividad_id = a.id
       WHERE p.estado = 'pendiente' AND a.tipo = 'captura'
       ORDER BY p.fecha ASC`
    );
    return res.json(pendingRes.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener capturas pendientes.' });
  }
});

// ==========================================
// ENDPOINT DE JUEGO (CABECEOS)
// ==========================================

// Guardar score del juego de cabeceos
app.post('/api/juego/score', async (req, res) => {
  const { qr_token, score } = req.body;

  if (!qr_token || score === undefined) {
    return res.status(400).json({ error: 'qr_token y score son requeridos.' });
  }

  // Validar token QR
  if (!verifyQrToken(qr_token)) {
    return res.status(400).json({ error: 'Token QR inválido o alterado.' });
  }

  const parsedScore = parseInt(score, 10);
  if (isNaN(parsedScore) || parsedScore < 0) {
    return res.status(400).json({ error: 'El score debe ser un número entero positivo.' });
  }

  try {
    // Buscar ID del usuario
    const userRes = await pool.query('SELECT id, puntos_cabeceos FROM usuarios WHERE qr_token = $1', [qr_token]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const usuario = userRes.rows[0];

    // Verificar si el score recibido es más alto que el registrado (guardar el score más alto, no acumular)
    if (parsedScore > usuario.puntos_cabeceos) {
      // Registrar participación del juego si no existe (opcional, para auditar, o simplemente actualizar la tabla usuarios)
      // La tabla usuarios tiene 'puntos_cabeceos'. Actualizaremos este campo y recalcularemos 'puntos_totales'
      const updateRes = await pool.query(
        `UPDATE usuarios
         SET 
           puntos_cabeceos = $1,
           puntos_totales = (
             SELECT COALESCE(SUM(puntos_otorgados), 0)
             FROM participaciones
             WHERE usuario_id = usuarios.id AND estado = 'aprobado'
           ) + $1
         WHERE id = $2
         RETURNING puntos_totales, puntos_cabeceos`,
        [parsedScore, usuario.id]
      );
      
      return res.json({
        updated: true,
        puntos_totales: updateRes.rows[0].puntos_totales,
        puntos_cabeceos: updateRes.rows[0].puntos_cabeceos
      });
    }

    // Si el score no fue superado, simplemente retornar el actual
    const currentTotalRes = await pool.query('SELECT puntos_totales, puntos_cabeceos FROM usuarios WHERE id = $1', [usuario.id]);
    return res.json({
      updated: false,
      puntos_totales: currentTotalRes.rows[0].puntos_totales,
      puntos_cabeceos: currentTotalRes.rows[0].puntos_cabeceos
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al registrar el puntaje del juego.' });
  }
});

// ==========================================
// ENDPOINT DE RANKING
// ==========================================

// Obtener Top 5 Ranking Público
app.get('/api/ranking', async (req, res) => {
  try {
    const rankingRes = await pool.query(
      `SELECT
         CONCAT('****', RIGHT(buid, 4)) AS buid_oculto,
         puntos_totales,
         puntos_cabeceos
       FROM usuarios
       WHERE buid NOT IN ('STAFF', 'ADMIN')
       ORDER BY puntos_totales DESC, puntos_cabeceos DESC
       LIMIT 5`
    );
    return res.json(rankingRes.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al consultar el ranking público.' });
  }
});

// ==========================================
// GESTIÓN DE ACTIVIDADES (ADMIN / STAFF)
// ==========================================

// Listar todas las actividades
app.get('/api/actividades', authenticateRole(['admin', 'staff']), async (req, res) => {
  try {
    const activities = await pool.query('SELECT * FROM actividades ORDER BY id ASC');
    return res.json(activities.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al obtener las actividades.' });
  }
});

// Activar/Desactivar actividad (Admin)
app.patch('/api/actividades/:id/toggle', authenticateRole(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const currentRes = await pool.query('SELECT activa FROM actividades WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada.' });
    }
    const newStatus = !currentRes.rows[0].activa;

    const updateRes = await pool.query(
      'UPDATE actividades SET activa = $1 WHERE id = $2 RETURNING *',
      [newStatus, id]
    );

    return res.json({
      message: `Actividad ${newStatus ? 'activada' : 'desactivada'} con éxito.`,
      actividad: updateRes.rows[0]
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error al alternar estado de la actividad.' });
  }
});

// Servir archivos estáticos del frontend en producción
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log('Servidor configurado para servir el Frontend estáticamente desde:', frontendDist);
} else {
  console.log('⚠️ Advertencia: No se encontró la carpeta frontend/dist. Recuerda ejecutar "npm run build" en frontend.');
}

// Iniciar Servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor HTTP de Puntos corriendo en el puerto ${PORT}`);
});
