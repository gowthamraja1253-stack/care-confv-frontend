/**
 * Web Crypto API based Encryption for Offline Records
 * Compliant with W3C Web Cryptography API standards.
 * Requires Secure Context (HTTPS or localhost).
 */

export const isWebCryptoSupported = () => {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.crypto) &&
    Boolean(window.crypto.subtle) &&
    typeof window.crypto.subtle.importKey === 'function' &&
    typeof window.crypto.getRandomValues === 'function'
  );
};

export const generateKeyFromToken = async (token) => {
  if (!isWebCryptoSupported()) {
    console.warn('[WebCrypto] window.crypto.subtle is unavailable. Ensure HTTPS is enabled.');
    return null;
  }

  // Extract stable user identity from JWT payload to prevent key volatility on refresh
  let stableIdentity = token;
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    stableIdentity = payload.id || payload._id || payload.userId || payload.email || token;
  } catch (e) {
    console.warn('[WebCrypto] Could not extract stable identity from token, using raw token string');
  }

  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(stableIdentity),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('rural-health-offline-salt-v2'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptData = async (data, token) => {
  if (!data) return data;
  if (!isWebCryptoSupported()) {
    // If Web Crypto is unavailable due to insecure HTTP context, return JSON encoded string
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  }

  try {
    const key = await generateKeyFromToken(token);
    if (!key) return null;

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedData
    );

    const encryptedArray = new Uint8Array(encryptedContent);
    const payload = new Uint8Array(iv.length + encryptedArray.length);
    payload.set(iv, 0);
    payload.set(encryptedArray, iv.length);
    
    // Prefix with v1: to differentiate ciphertext from plain base64 fallback
    return 'v1:' + btoa(String.fromCharCode.apply(null, payload));
  } catch (e) {
    console.warn('[WebCrypto] Encryption failed:', e);
    return null;
  }
};

export const decryptData = async (encryptedBase64, token) => {
  if (!encryptedBase64) return null;

  // Handle fallback unencrypted base64
  if (!encryptedBase64.startsWith('v1:')) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(encryptedBase64))));
    } catch (e) {
      return null;
    }
  }

  if (!isWebCryptoSupported()) {
    console.warn('[WebCrypto] Decryption skipped: Web Crypto requires HTTPS.');
    return null;
  }

  try {
    const rawCipher = encryptedBase64.slice(3); // strip 'v1:'
    const key = await generateKeyFromToken(token);
    if (!key) return null;

    const payloadString = atob(rawCipher);
    const payload = new Uint8Array(payloadString.length);
    for (let i = 0; i < payloadString.length; i++) {
      payload[i] = payloadString.charCodeAt(i);
    }
    
    const iv = payload.slice(0, 12);
    const encryptedContent = payload.slice(12);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedContent
    );
    
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedContent));
  } catch (e) {
    console.warn('[WebCrypto] Decryption failed, possibly different user token:', e.message);
    return null;
  }
};

export default {
  isWebCryptoSupported,
  generateKeyFromToken,
  encryptData,
  decryptData,
};
