// In ra cặp khoá VAPID để dán vào cài đặt của Cloudflare (chỉ cần tạo 1 lần, không đổi về sau)
import { webcrypto as c } from 'node:crypto';
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const pair = await c.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = b64u(await c.subtle.exportKey('raw', pair.publicKey));
const priv = (await c.subtle.exportKey('jwk', pair.privateKey)).d;
console.log('VAPID_PUBLIC_KEY  =', pub);
console.log('VAPID_PRIVATE_KEY =', priv);
