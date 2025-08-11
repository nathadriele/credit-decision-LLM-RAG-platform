// =============================================================================
// CRYPTO UTILITIES - CREDIT DECISION LLM RAG PLATFORM
// =============================================================================

import crypto from 'crypto';

export const CryptoUtils = {
  // Generate random UUID
  generateUUID: (): string => {
    return crypto.randomUUID();
  },

  // Generate random string
  generateRandomString: (length = 32): string => {
    return crypto.randomBytes(length).toString('hex');
  },

  // Hash password with salt
  hashPassword: (password: string, salt?: string): { hash: string; salt: string } => {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, actualSalt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  },

  // Verify password
  verifyPassword: (password: string, hash: string, salt: string): boolean => {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  },

  // Encrypt data
  encrypt: (text: string, key: string): string => {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  },

  // Decrypt data
  decrypt: (encryptedText: string, key: string): string => {
    const algorithm = 'aes-256-gcm';
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  },

  // Generate hash
  generateHash: (data: string, algorithm = 'sha256'): string => {
    return crypto.createHash(algorithm).update(data).digest('hex');
  },

  // Generate HMAC
  generateHMAC: (data: string, key: string, algorithm = 'sha256'): string => {
    return crypto.createHmac(algorithm, key).update(data).digest('hex');
  },
};
