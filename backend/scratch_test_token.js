import { verifyQrToken } from './crypto_helper.js';

const token = '3edf00b5-cedc-43a3-8d14-5582529108df.4a4691d83805b095ae5355fa8dc259af81d64e7f2396ac47b9c376175066dba1';
console.log('HMAC_SECRET en uso:', process.env.HMAC_SECRET || 'super_secret_hmac_key_2026_binance');
console.log('¿Token verificado con éxito?:', verifyQrToken(token));
