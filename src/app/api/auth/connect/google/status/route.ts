import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth/auth0";

const AUTH0_MGMT_DOMAIN = process.env.AUTH0_MGMT_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

/**
 * Get an access token scoped to the My Account API by exchanging the
 * user's refresh token directly at the canonical domain's token endpoint.
 *
 * The SDK's getAccessToken() can't do this because the primary auth0
 * client lives on the custom domain, which rejects the /me/ audience.
 * Both domains belong to the same tenant so the refresh token is valid
 * on either.
 */
async function getMyAccountToken(refreshToken: string): Promise<string> {
  const res = await fetch(`https://${AUTH0_MGMT_DOMAIN}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
      refresh_token: refreshToken,
      audience: `https://${AUTH0_MGMT_DOMAIN}/me/`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`My Account token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.access_token;
}

interface ConnectedAccount {
  id: string;
  connection: string;
  scopes?: string[];
  created_at?: string;
}

/**
 * GET - Check if the current user has a Token Vault connected account
 *       for google-oauth2.
 *
 * Uses the My Account API: GET /me/v1/connected-accounts/accounts
 */
export async function GET() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const refreshToken = session.tokenSet?.refreshToken;
  if (!refreshToken) {
    return NextResponse.json({ connected: false, reason: "no_refresh_token" });
  }

  try {
    const token = await getMyAccountToken(refreshToken);

    const res = await fetch(
      `https://${AUTH0_MGMT_DOMAIN}/me/v1/connected-accounts/accounts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error("[connect/status] list connected accounts failed:", res.status, body);
      return NextResponse.json({ connected: false });
    }

    const resBody = await res.json();
    console.log("[connect/status] list response:", JSON.stringify(resBody, null, 2));
    const accounts: ConnectedAccount[] = Array.isArray(resBody) ? resBody : (resBody.accounts ?? resBody.items ?? []);
    const googleAccount = accounts.find((a) => a.connection === "google-oauth2");

    return NextResponse.json({
      connected: !!googleAccount,
      accountId: googleAccount?.id ?? null,
      scopes: googleAccount?.scopes ?? null,
    });
  } catch (err) {
    console.error("[connect/status] error:", err);
    return NextResponse.json({ connected: false });
  }
}

/**
 * DELETE - Disconnect the Token Vault connected account for google-oauth2.
 *
 * Uses the My Account API:
 *   GET    /me/v1/connected-accounts/accounts              (find the account ID)
 *   DELETE /me/v1/connected-accounts/accounts/{accountId}   (remove it)
 *
 * This removes the stored Google refresh token from Token Vault so the
 * user can reconnect with a fresh consent prompt.
 */
export async function DELETE() {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const refreshToken = session.tokenSet?.refreshToken;
  if (!refreshToken) {
    return NextResponse.json({ error: "No refresh token in session" }, { status: 400 });
  }

  try {
    const token = await getMyAccountToken(refreshToken);

    // List connected accounts to find the google-oauth2 one.
    const listRes = await fetch(
      `https://${AUTH0_MGMT_DOMAIN}/me/v1/connected-accounts/accounts`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!listRes.ok) {
      const body = await listRes.text();
      console.error("[connect/status] list failed:", listRes.status, body);
      return NextResponse.json({ error: "Failed to list connected accounts" }, { status: 500 });
    }

    const listBody = await listRes.json();
    const accounts: ConnectedAccount[] = Array.isArray(listBody) ? listBody : (listBody.accounts ?? []);
    const googleAccount = accounts.find((a) => a.connection === "google-oauth2");

    if (!googleAccount) {
      return NextResponse.json({ error: "No connected Google account found." }, { status: 404 });
    }

    // Delete the connected account.
    const deleteRes = await fetch(
      `https://${AUTH0_MGMT_DOMAIN}/me/v1/connected-accounts/accounts/${googleAccount.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!deleteRes.ok) {
      const body = await deleteRes.text();
      console.error("[connect/status] delete failed:", deleteRes.status, body);
      return NextResponse.json(
        { error: `Failed to disconnect (${deleteRes.status})` },
        { status: 500 },
      );
    }

    console.log("[connect/status] disconnected google-oauth2 for", session.user.sub);
    return NextResponse.json({ disconnected: true });
  } catch (err) {
    console.error("[connect/status] error:", err);
    return NextResponse.json({ error: "Failed to disconnect Google account" }, { status: 500 });
  }
}
