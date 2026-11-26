import { describe, it, expect } from "vitest";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  generatePKCE,
  verifyCodeChallenge,
} from "@/lib/security/pkce";

describe("TikTok PKCE & CSRF Security Module", () => {
  it("should generate a code verifier conforming to RFC 7636 (length between 43 and 128)", () => {
    const verifier = generateCodeVerifier(64);
    expect(verifier).toBeDefined();
    expect(verifier.length).toBe(64);
    // Base64url characters only
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("should generate an S256 code challenge from code verifier", () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = generateCodeChallenge(verifier);

    expect(challenge).toBeDefined();
    expect(challenge.length).toBeGreaterThan(0);
    // RFC 7636 challenge for dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk is E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("should verify code challenge matching correctly", () => {
    const verifier = generateCodeVerifier(64);
    const challenge = generateCodeChallenge(verifier);

    expect(verifyCodeChallenge(verifier, challenge)).toBe(true);
    expect(verifyCodeChallenge("tampered_verifier_12345", challenge)).toBe(false);
    expect(verifyCodeChallenge("", challenge)).toBe(false);
  });

  it("should generate random CSRF state string with high entropy", () => {
    const state1 = generateState(16);
    const state2 = generateState(16);

    expect(state1).toBeDefined();
    expect(state1.length).toBe(32); // 16 bytes = 32 hex chars
    expect(state1).not.toBe(state2);
  });

  it("should generate complete PKCE bundle ready for TikTok OAuth", () => {
    const bundle = generatePKCE();

    expect(bundle.codeVerifier).toBeDefined();
    expect(bundle.codeChallenge).toBeDefined();
    expect(bundle.codeChallengeMethod).toBe("S256");
    expect(bundle.state).toBeDefined();
    expect(bundle.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(verifyCodeChallenge(bundle.codeVerifier, bundle.codeChallenge)).toBe(true);
  });
});
