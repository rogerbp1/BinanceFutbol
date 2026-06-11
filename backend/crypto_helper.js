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

/**
 * Verifica si un token QR es válido y no ha sido alterado.
 * Retorna true si es válido, de lo contrario false.
 */
export function verifyQrToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const [uuid, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', HMAC_SECRET).update(uuid).digest('hex');
  
  try {
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    // Comparación en tiempo constante para evitar ataques de temporización
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (err) {
    return false;
  }
}
