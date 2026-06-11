import pg from 'pg';

const { Client } = pg;
const connectionString = 'postgresql://postgres.xzgwavnlixrkvxanabpy:wLg358hPGdzScZzi@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

async function checkParts() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Conectado a la base de datos.');
    
    const res = await client.query(`
      SELECT p.*, a.nombre as actividad_nombre, a.puntos as actividad_puntos
      FROM participaciones p
      JOIN actividades a ON p.actividad_id = a.id
      WHERE p.usuario_id = 2
    `);
    
    console.log('Participaciones de usuario ID 2 (333333):');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkParts();
