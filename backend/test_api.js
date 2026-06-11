// Script de prueba automatizado para la API de Binance Mundial 2026
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const API_URL = `http://localhost:${PORT}/api`;

console.log('🚀 Iniciando pruebas de API para Binance Mundial 2026...');

// Iniciar servidor en segundo plano
const serverProcess = fork(path.join(__dirname, 'server.js'), {
  env: {
    ...process.env,
    PORT: PORT.toString(),
    DATABASE_URL: '', // Forzar base de datos mock para pruebas locales limpias
    PIN_STAFF: '1234',
    PIN_ADMIN: '3412',
    JWT_SECRET: 'test_jwt_secret',
    HMAC_SECRET: 'test_hmac_secret'
  }
});

// Esperar 2 segundos a que el servidor inicialice
setTimeout(async () => {
  try {
    await runTests();
    console.log('\n🟢 ¡TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE!');
    shutdown(0);
  } catch (err) {
    console.error('\n🔴 ERROR EN LAS PRUEBAS:', err.message);
    shutdown(1);
  }
}, 2000);

function shutdown(code) {
  serverProcess.kill();
  process.exit(code);
}

async function runTests() {
  let res, data;
  let testUserQrToken = '';
  let staffToken = '';
  let adminToken = '';
  let participationId = null;

  // ----------------------------------------
  // TEST 1: Registro de Usuario
  // ----------------------------------------
  console.log('\n1. Probando Registro de Usuario...');
  res = await fetch(`${API_URL}/usuarios/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buid: 'BUID8888', es_nuevo: true })
  });
  
  if (res.status !== 201) {
    throw new Error(`Registro falló con status ${res.status}`);
  }
  
  data = await res.json();
  console.log('✅ Registro exitoso:', data);
  testUserQrToken = data.qr_token;

  // Intentar registrar el mismo BUID (Debe retornar 200 para login implícito)
  console.log('1.1. Probando duplicado de BUID (Login Implícito)...');
  res = await fetch(`${API_URL}/usuarios/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buid: 'BUID8888', es_nuevo: false })
  });
  if (res.status === 200) {
    console.log('✅ Validación de duplicado correcta (200 OK - Login Implícito)');
  } else {
    throw new Error(`Se esperaba 200 al registrar duplicado (Login Implícito), se obtuvo: ${res.status}`);
  }

  // ----------------------------------------
  // TEST 2: Login Staff y Admin por PIN
  // ----------------------------------------
  console.log('\n2. Probando Login de Staff (PIN: 1234)...');
  res = await fetch(`${API_URL}/auth/staff`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '1234' })
  });
  data = await res.json();
  if (res.status !== 200) throw new Error('Login Staff falló');
  staffToken = data.token;
  console.log('✅ Staff autenticado con éxito.');

  console.log('2.1. Probando Login de Admin (PIN: 3412)...');
  res = await fetch(`${API_URL}/auth/admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '3412' })
  });
  data = await res.json();
  if (res.status !== 200) throw new Error('Login Admin falló');
  adminToken = data.token;
  console.log('✅ Admin autenticado con éxito.');

  // ----------------------------------------
  // TEST 3: Obtener Usuario por Token QR (Usado por Staff)
  // ----------------------------------------
  console.log('\n3. Probando consulta de usuario por QR (Staff)...');
  res = await fetch(`${API_URL}/usuarios/qr/${testUserQrToken}`);
  data = await res.json();
  if (res.status !== 200) throw new Error('Búsqueda por QR falló');
  console.log('✅ Usuario encontrado por QR:', data);

  // ----------------------------------------
  // TEST 4: Asignar puntos presenciales (Staff)
  // ----------------------------------------
  console.log('\n4. Probando asignación de puntos presenciales por Staff...');
  // Asignar actividad 4: "Rayar camiseta Binance" (150 pts)
  res = await fetch(`${API_URL}/participaciones/presencial`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${staffToken}`
    },
    body: JSON.stringify({
      qr_token: testUserQrToken,
      actividad_id: 4
    })
  });
  data = await res.json();
  if (res.status !== 201) throw new Error(`Asignación presencial falló: ${data.error}`);
  console.log('✅ Puntos presenciales asignados:', data);

  // ----------------------------------------
  // TEST 5: Subir Captura (Usuario) y Aprobación (Admin)
  // ----------------------------------------
  console.log('\n5. Probando subida de captura de pantalla (Usuario)...');
  // Usar FormData simulado.
  const formData = new FormData();
  formData.append('buid', 'BUID8888');
  formData.append('actividad_id', '1'); // Actividad 1: "Seguir canales WP, TG, IG" (150 pts)
  
  // Creamos un Blob mock que represente la imagen
  const blob = new Blob(['contenido_imagen_binance_mundial'], { type: 'image/png' });
  formData.append('captura', blob, 'captura_test.png');

  res = await fetch(`${API_URL}/participaciones/captura`, {
    method: 'POST',
    body: formData
  });
  data = await res.json();
  if (res.status !== 201) throw new Error(`Subida de captura falló: ${data.error}`);
  participationId = data.id;
  console.log('✅ Captura subida y registrada como pendiente ID:', participationId);

  // 5.1. Admin aprueba captura
  console.log('5.2. Probando aprobación de captura (Admin)...');
  res = await fetch(`${API_URL}/participaciones/${participationId}/aprobar`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  data = await res.json();
  if (res.status !== 200) throw new Error('Aprobación de captura falló');
  console.log('✅ Captura aprobada.');

  // ----------------------------------------
  // TEST 6: Registrar Score del Juego (Juego de Cabeceos)
  // ----------------------------------------
  console.log('\n6. Probando registro de score del Juego de Cabeceos...');
  res = await fetch(`${API_URL}/juego/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qr_token: testUserQrToken,
      score: 55
    })
  });
  data = await res.json();
  if (res.status !== 200) throw new Error('Registro de score falló');
  console.log('✅ Score registrado. Nuevos puntos:', data);

  // ----------------------------------------
  // TEST 7: Consultar Dashboard Completo del Usuario
  // ----------------------------------------
  console.log('\n7. Probando obtención del Dashboard del usuario...');
  res = await fetch(`${API_URL}/usuarios/BUID8888/dashboard`);
  data = await res.json();
  if (res.status !== 200) throw new Error('Obtención del dashboard falló');
  console.log('✅ Dashboard del usuario consultado con éxito.');
  console.log(`- Puntos Totales: ${data.puntos_totales} (Esperados: 150 presencial + 150 captura + 55 cabeceos = 355 PTS)`);
  if (data.puntos_totales !== 355) {
    throw new Error(`Se esperaban 355 puntos totales, se obtuvo: ${data.puntos_totales}`);
  }

  // ----------------------------------------
  // TEST 8: Consultar Ranking Top 5 Público
  // ----------------------------------------
  console.log('\n8. Probando obtención de Ranking público...');
  res = await fetch(`${API_URL}/ranking`);
  data = await res.json();
  if (res.status !== 200) throw new Error('Obtención de ranking falló');
  console.log('✅ Ranking Top 5 obtenido:', data);
  console.log(`- Primer Puesto: ${data[0].buid_oculto} con ${data[0].puntos_totales} PTS`);
}
