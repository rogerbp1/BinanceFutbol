-- Binance Mundial 2026 — Schema Setup & Seed

-- Tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  buid VARCHAR UNIQUE NOT NULL,        -- Binance User ID, identificador principal
  es_nuevo BOOLEAN DEFAULT FALSE,      -- autodeclarado al registro
  qr_token VARCHAR UNIQUE NOT NULL,    -- token firmado generado al registrarse
  fecha_registro TIMESTAMP DEFAULT NOW(),
  puntos_totales INTEGER DEFAULT 0,    -- se recalcula cada vez que se aprueba una participación
  puntos_cabeceos INTEGER DEFAULT 0,   -- puntaje del juego, usado para desempate
  intentos_cabeceos INTEGER DEFAULT 0  -- número de intentos del juego (máximo 3)
);

-- Tabla actividades
CREATE TABLE IF NOT EXISTS actividades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR UNIQUE NOT NULL,       -- Agregado UNIQUE para prevenir duplicados en seeds
  puntos INTEGER,                      -- NULL si es variable (juego de cabeceos)
  tipo VARCHAR CHECK (tipo IN ('captura', 'presencial', 'juego')),
  activa BOOLEAN DEFAULT TRUE
);

-- Tabla participaciones
CREATE TABLE IF NOT EXISTS participaciones (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
  actividad_id INTEGER REFERENCES actividades(id) ON DELETE CASCADE,
  estado VARCHAR CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')) DEFAULT 'pendiente',
  puntos_otorgados INTEGER DEFAULT 0,
  url_captura VARCHAR,                 -- NULL si es actividad presencial
  fecha TIMESTAMP DEFAULT NOW(),
  staff_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL, -- NULL si es captura
  admin_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL  -- NULL si es presencial
);

-- Migración de nombres existentes
UPDATE actividades SET nombre = 'Futbolin' WHERE nombre = 'Futbolito en equipos';

-- Seed inicial de actividades
INSERT INTO actividades (nombre, puntos, tipo) VALUES
('Seguir canales (WP, TG, IG)', 150, 'captura'),
('Encuesta de satisfacción', 100, 'captura'),
('Mercado de predicciones', 200, 'captura'),
('Rayar camiseta Binance', 150, 'presencial'),
('Juego de penales', 250, 'presencial'),
('Futbolin', 300, 'presencial'),
('Adivina el jugador', 300, 'presencial'),
('Juego de cabeceos', NULL, 'juego')
ON CONFLICT (nombre) DO NOTHING;

-- Índices de optimización de consultas
CREATE INDEX IF NOT EXISTS idx_participaciones_usuario_id ON participaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_participaciones_actividad_id ON participaciones(actividad_id);
CREATE INDEX IF NOT EXISTS idx_participaciones_usuario_actividad ON participaciones(usuario_id, actividad_id);
CREATE INDEX IF NOT EXISTS idx_participaciones_estado_pendiente ON participaciones(estado) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_participaciones_usuario_estado ON participaciones(usuario_id, estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_ranking ON usuarios (puntos_totales DESC, puntos_cabeceos DESC);
