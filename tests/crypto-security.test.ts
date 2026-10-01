import { describe, it, expect } from "vitest";
import {
  encryptToken,
  decryptToken,
  hashPassword,
  verifyPassword,
} from "@/lib/security/crypto";

describe("Security & Crypto Engine", () => {
  it("should encrypt and decrypt a sensitive token with AES-256-GCM", () => {
    const rawToken = "tiktok_oauth_access_token_secret_123456";
    const encrypted = encryptToken(rawToken);

    expect(encrypted).not.toBe(rawToken);
    expect(encrypted.split(":").length).toBe(3); // iv:authTag:data

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("should hash password with scrypt and verify correctly", () => {
    const plain = "mySecretPassword2026!";
    const hashed = hashPassword(plain);

    expect(hashed).toContain(":");
    expect(verifyPassword(plain, hashed)).toBe(true);
    expect(verifyPassword("wrongPassword", hashed)).toBe(false);
  });
});
