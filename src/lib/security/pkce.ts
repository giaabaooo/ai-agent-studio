import crypto from "crypto";

/**
 * Generates a cryptographically random code_verifier for OAuth 2.0 PKCE.
 * Uses base64url characters (A-Z, a-z, 0-9, -, _, ~, .) without padding.
 * Standard RFC 7636 specifies length between 43 and 128 characters.
 */
export function generateCodeVerifier(length = 64): string {
  const byteLength = Math.ceil((length * 3) / 4);
  return crypto
    .randomBytes(byteLength)
    .toString("base64url")
    .slice(0, length);
}

/**
 * Generates an S256 code_challenge from a code_verifier according to RFC 7636.
 * code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash("sha256")
    .update(verifier, "ascii")
    .digest("base64url");
}

/**
 * Generates a cryptographically random state parameter for CSRF prevention.
 */
export function generateState(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

/**
 * Full PKCE bundle for initiating TikTok OAuth 2.0.
 */
export interface PKCEBundle {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  state: string;
}

export function generatePKCE(): PKCEBundle {
  const codeVerifier = generateCodeVerifier(64);
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState(24);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
    state,
  };
}

/**
 * Verifies if a given verifier matches the S256 challenge.
 */
export function verifyCodeChallenge(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const computed = generateCodeChallenge(verifier);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(challenge));
}
