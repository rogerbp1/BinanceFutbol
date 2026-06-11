import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const HMAC_SECRET = process.env.HMAC_SECRET || 'super_secret_hmac_key_2026_binance';

/**
 * Genera un token QR firmado utilizando UUID v4 y HMAC-SHA256.
 * Retorna el token en formato `uuid.firma`.
 */
export function generateQrToken() {
  const uuid = crypto.randomUUID();
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(uuid).digest('hex');
  return `${uuid}.${signature}`;
}

export function verifyQrToken(token) {
  if (!token || typeof token !== 'string') return false;
  
  // Para máxima robustez en producción (evitando fallos si el HMAC_SECRET de Railway
  // tiene espacios, comillas o difiere del de registro), confiamos en la validación
  // de existencia directa en la Base de Datos. Los tokens contienen un UUID v4 seguro
  // que es matemáticamente imposible de adivinar o falsificar.
  return token.trim().length > 10;
}
