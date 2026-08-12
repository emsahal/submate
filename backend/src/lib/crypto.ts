import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { config } from "../config.js";

/**
 * AES-256-GCM encryption for sensitive access delivery records.
 * Key derived from CREDENTIALS_ENCRYPTION_KEY via SHA-256 (32 bytes).
 */
const KEY_VERSION = 1;

function deriveKey(): Buffer {
  if (!config.credentialsEncryptionKey) {
    throw new Error("CREDENTIALS_ENCRYPTION_KEY is not configured.");
  }
  return createHash("sha256").update(config.credentialsEncryptionKey).digest();
}

export function encryptPayload(plaintext: string): { ciphertext: string; iv: string; keyVersion: number } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString("base64"),
    iv: iv.toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

export function decryptPayload(ciphertextB64: string, ivB64: string, _keyVersion = KEY_VERSION): string {
  const iv = Buffer.from(ivB64, "base64");
  const combined = Buffer.from(ciphertextB64, "base64");
  const tag = combined.subarray(combined.length - 16);
  const data = combined.subarray(0, combined.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}