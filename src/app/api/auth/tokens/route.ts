import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth/auth0";

const AUTH0_MGMT_DOMAIN = process.env.AUTH0_MGMT_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

/** Base64url decode (JWT segments don't use standard base64). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const json = Buffer.from(payload, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Exchange the user's refresh token for a Google access token via the
 * federated connection token exchange (Token Vault).
 */
async function getGoogleVaultToken(refreshToken: string): Promise<{
  token: string;
  expiresIn?: number;
} | null> {
  const params = new URLSearchParams();
  params.append("grant_type", "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token");
  params.append("client_id", AUTH0_CLIENT_ID!);
  params.append("client_secret", AUTH0_CLIENT_SECRET!);
  params.append("subject_token", refreshToken);
  params.append("subject_token_type", "urn:ietf:params:oauth:token-type:refresh_token");
  params.append("requested_token_type", "http://auth0.com/oauth/token-type/federated-connection-access-token");
  params.append("connection", "google-oauth2");

  const res = await fetch(`https://${AUTH0_MGMT_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    token: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * GET /api/auth/tokens
 *
 * Returns the current user's Auth0 session tokens and, if available,
 * the Google access token from Token Vault. JWTs are decoded for display.
 */
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { tokenSet } = session;

  // Auth0 tokens
  const accessToken = tokenSet.accessToken;
  const idToken = tokenSet.idToken;
  const refreshToken = tokenSet.refreshToken;

  const tokens: {
    label: string;
    raw: string;
    decoded: Record<string, unknown> | null;
    type: "jwt" | "opaque";
  }[] = [];

  if (accessToken) {
    tokens.push({
      label: "Access Token",
      raw: accessToken,
      decoded: decodeJwtPayload(accessToken),
      type: "jwt",
    });
  }

  if (idToken) {
    tokens.push({
      label: "ID Token",
      raw: idToken,
      decoded: decodeJwtPayload(idToken),
      type: "jwt",
    });
  }

  if (refreshToken) {
    tokens.push({
      label: "Refresh Token",
      raw: refreshToken,
      decoded: null,
      type: "opaque",
    });
  }

  // Token Vault: Google access token
  if (refreshToken) {
    const googleResult = await getGoogleVaultToken(refreshToken);
    if (googleResult) {
      tokens.push({
        label: "Google Access Token (Token Vault)",
        raw: googleResult.token,
        decoded: {
          connection: "google-oauth2",
          expires_in: googleResult.expiresIn,
          expires_at: googleResult.expiresIn
            ? new Date(Date.now() + googleResult.expiresIn * 1000).toISOString()
            : null,
          source: "Auth0 Token Vault (federated connection exchange)",
        },
        type: "opaque",
      });
    }
  }

  return NextResponse.json({ tokens });
}
