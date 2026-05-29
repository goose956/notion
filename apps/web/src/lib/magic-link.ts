import { createHmac } from "crypto";

const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export function createMagicToken(email: string, secret: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyMagicToken(token: string, secret: string): string | null {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;
    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);
    const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
    if (sig !== expectedSig) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      email: string;
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return parsed.email;
  } catch {
    return null;
  }
}

export function buildMagicLink(email: string, secret: string, baseUrl: string, callbackUrl: string): string {
  const token = createMagicToken(email, secret);
  const params = new URLSearchParams({ token, callbackUrl });
  return `${baseUrl}/login/verified?${params.toString()}`;
}
