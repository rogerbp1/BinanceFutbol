// Configuración de mundos = 6 sedes destacadas del Mundial 2026 (USA / México / Canadá)
// Cada sede sube la dificultad de forma escalonada. Estilo Binance (amarillo / negro).

export const WORLDS = [
  {
    ciudad: 'CIUDAD DE MÉXICO',
    estadio: 'Estadio Azteca',
    pais: 'MX',
    bandera: '🇲🇽',
    skyTop: 0x1b5e3a,    // verde profundo
    skyBottom: 0x0b3d24,
    standColor: 0x0f7a3d,
    standAccent: 0xF0B90B,
    fieldColor: 0x2e8b57,
    parallaxSpeed: 0.6,
    gravityBase: 820,    // gravedad inicial (la dificultad BAJA dentro del nivel)
    lateralChaos: 110,
    perfectWindow: 30,   // medio ancho de cada zona-PIE (centrada en ±footOffset). Mayor = más fácil
  },
  {
    ciudad: 'NUEVA YORK / NJ',
    estadio: 'MetLife Stadium',
    pais: 'USA',
    bandera: '🇺🇸',
    skyTop: 0x1a2a52,
    skyBottom: 0x0b1530,
    standColor: 0x24406e,
    standAccent: 0xF0B90B,
    fieldColor: 0x2f7d46,
    parallaxSpeed: 0.75,
    parallaxSpeed: 0.75,
    gravityBase: 1050, // Dificultad acelerada
    lateralChaos: 125,
    perfectWindow: 28,
  },
  {
    ciudad: 'LOS ÁNGELES',
    estadio: 'SoFi Stadium',
    pais: 'USA',
    bandera: '🇺🇸',
    skyTop: 0x5a2d82,    // atardecer LA
    skyBottom: 0x1f1033,
    standColor: 0x4a2a6e,
    standAccent: 0xFCD535,
    fieldColor: 0x2f7d46,
    parallaxSpeed: 0.9,
    parallaxSpeed: 0.9,
    gravityBase: 1400, // Dificultad nivel pro empieza
    lateralChaos: 150,
    perfectWindow: 25,
  },
  {
    ciudad: 'DALLAS',
    estadio: 'AT&T Stadium',
    pais: 'USA',
    bandera: '🇺🇸',
    skyTop: 0x8a4a1a,    // tarde texana
    skyBottom: 0x2b1505,
    standColor: 0x6e3c1a,
    standAccent: 0xF0B90B,
    fieldColor: 0x2f7d46,
    parallaxSpeed: 1.05,
    parallaxSpeed: 1.05,
    gravityBase: 1850, // Extremo
    lateralChaos: 180,
    perfectWindow: 22,
  },
  {
    ciudad: 'TORONTO',
    estadio: 'BMO Field',
    pais: 'CA',
    bandera: '🇨🇦',
    skyTop: 0x7a1f1f,    // rojo Canadá
    skyBottom: 0x2b0a0a,
    standColor: 0x6e1a1a,
    standAccent: 0xFCD535,
    fieldColor: 0x2f7d46,
    parallaxSpeed: 1.2,
    parallaxSpeed: 1.2,
    gravityBase: 2400, // Brutal
    lateralChaos: 220,
    perfectWindow: 18,
  },
  {
    ciudad: 'VANCOUVER',
    estadio: 'BC Place',
    pais: 'CA',
    bandera: '🇨🇦',
    skyTop: 0x0b3a4a,    // azul noche costera
    skyBottom: 0x041820,
    standColor: 0x12506e,
    standAccent: 0xF0B90B,
    fieldColor: 0x2f7d46,
    parallaxSpeed: 1.4,
    parallaxSpeed: 1.4,
    gravityBase: 3100, // NIVEL 6: SOLO PARA DIOSES DEL JUEGO
    lateralChaos: 270,
    perfectWindow: 14,
  },
];

// Devuelve la config de la sede. Cicla e incrementa dificultad si se pasa de la última (runner infinito).
export function getWorld(index) {
  const base = WORLDS[index % WORLDS.length];
  const loop = Math.floor(index / WORLDS.length); // cuántas vueltas completas
  if (loop === 0) return { ...base, loop };

  // Tras completar todas las sedes, se endurece progresivamente.
  // Tras completar todas las sedes, se endurece progresivamente aún más sobre la locura actual.
  return {
    ...base,
    loop,
    gravityBase: base.gravityBase + loop * 500,
    lateralChaos: base.lateralChaos + loop * 80,
    perfectWindow: Math.max(10, base.perfectWindow - loop * 3),
    parallaxSpeed: base.parallaxSpeed + loop * 0.2,
  };
}

export const TOUCHES_PER_LEVEL = 21;     // 21 toques => cambio de sede instantáneo
export const LEVEL_EASE = 0.4;           // cuánto BAJA la gravedad al acercarse a los 21 (0..1)
export const HIT_COOLDOWN_MS = 180;      // anti-ráfaga de PERFECT (más bajo = ritmo más ágil)
