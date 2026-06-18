/**
 * @file At-rest encryption utilities (AES-256-GCM)
 * @author Russell Feldhausen <russfeld@ksu.edu>
 * @exports encrypt Encrypt a plaintext string
 * @exports decrypt Decrypt a previously encrypted string
 */

// Import libraries
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // bytes, recommended length for GCM

/**
 * Encrypt a plaintext string using AES-256-GCM
 *
 * @param {string} plaintext the value to encrypt
 * @param {Buffer} key 32-byte AES-256 key
 * @returns {string} the encrypted value, encoded as "iv:authTag:ciphertext" (hex)
 */
function encrypt(plaintext, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":");
}

/**
 * Decrypt a string previously encrypted with encrypt()
 *
 * @param {string} payload the encrypted value, encoded as "iv:authTag:ciphertext" (hex)
 * @param {Buffer} key 32-byte AES-256 key
 * @returns {string} the decrypted plaintext value
 */
function decrypt(payload, key) {
  const [ivHex, authTagHex, ciphertextHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

export { encrypt, decrypt };
