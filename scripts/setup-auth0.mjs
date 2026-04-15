#!/usr/bin/env node

/**
 * Auth0 Tenant Setup Script for RetailZero A4AA
 *
 * Creates all Auth0 resources needed by the RetailZero sample app:
 *   - Regular Web Application (with CIBA grant type)
 *   - Machine-to-Machine Application + Management API grant
 *   - Resource Server (API)
 *   - Google OAuth2 social connection
 *   - FGA authorization model deployment
 *   - .env.local file generation
 *
 * Usage:
 *   node scripts/setup-auth0.mjs
 *
 * Bootstrap requirement:
 *   You need an existing M2M application with Management API access,
 *   or a Management API token. The script uses this to create everything else.
 *
 * All prompts can be pre-filled via environment variables for CI/CD use.
 */

import { createInterface } from "node:readline";
import { randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

function log(level, message) {
  const prefix = {
    info: `${COLORS.blue}[INFO]${COLORS.reset}`,
    success: `${COLORS.green}[OK]${COLORS.reset}`,
    warn: `${COLORS.yellow}[WARN]${COLORS.reset}`,
    error: `${COLORS.red}[ERROR]${COLORS.reset}`,
    step: `${COLORS.cyan}[STEP]${COLORS.reset}`,
  };
  console.log(`${prefix[level] || ""} ${message}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function generateSecret(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

// readline helper
const rl = createInterface({ input: process.stdin, output: process.stdout });

function prompt(question, defaultVal = "") {
  const suffix = defaultVal ? ` ${COLORS.dim}(${defaultVal})${COLORS.reset}` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultVal);
    });
  });
}

function promptSecret(question) {
  return new Promise((resolve) => {
    rl.question(`${question}: `, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ─────────────────────────────────────────────
// API call wrapper with retry + rate-limit handling
// ─────────────────────────────────────────────

let mgmtDomain = "";
let mgmtToken = "";

async function apiCall(method, path, body = null, { baseUrl = null, token = null, contentType = "application/json" } = {}) {
  const url = baseUrl ? `${baseUrl}${path}` : `https://${mgmtDomain}${path}`;
  const headers = {
    "Content-Type": contentType,
  };
  if (token || mgmtToken) {
    headers["Authorization"] = `Bearer ${token || mgmtToken}`;
  }

  const options = { method, headers };
  if (body && method !== "GET") {
    options.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Rate limit
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
        log("warn", `Rate limited. Waiting ${retryAfter}s before retry...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        log("warn", `Network error (attempt ${attempt}/${maxRetries}): ${err.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        return { ok: false, status: 0, data: { error: err.message } };
      }
    }
  }
}

// ─────────────────────────────────────────────
// Auth0 Management API functions
// ─────────────────────────────────────────────

async function getManagementToken(domain, clientId, clientSecret) {
  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get management token (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function listClients() {
  const result = await apiCall("GET", "/api/v2/clients?per_page=100&include_totals=true");
  if (!result.ok) throw new Error(`Failed to list clients: ${JSON.stringify(result.data)}`);
  return result.data.clients || result.data;
}

async function createClient(payload) {
  const result = await apiCall("POST", "/api/v2/clients", payload);
  if (!result.ok) throw new Error(`Failed to create client: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function updateClient(clientId, payload) {
  const result = await apiCall("PATCH", `/api/v2/clients/${clientId}`, payload);
  if (!result.ok) throw new Error(`Failed to update client ${clientId}: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function listResourceServers() {
  const result = await apiCall("GET", "/api/v2/resource-servers?per_page=100&include_totals=true");
  if (!result.ok) throw new Error(`Failed to list resource servers: ${JSON.stringify(result.data)}`);
  return result.data.resource_servers || result.data;
}

async function createResourceServer(payload) {
  const result = await apiCall("POST", "/api/v2/resource-servers", payload);
  if (!result.ok) throw new Error(`Failed to create resource server: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function listConnections(strategy = null) {
  const query = strategy ? `?strategy=${strategy}&per_page=100` : "?per_page=100";
  const result = await apiCall("GET", `/api/v2/connections${query}`);
  if (!result.ok) throw new Error(`Failed to list connections: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function createConnection(payload) {
  const result = await apiCall("POST", "/api/v2/connections", payload);
  if (!result.ok) throw new Error(`Failed to create connection: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function updateConnection(connectionId, payload) {
  const result = await apiCall("PATCH", `/api/v2/connections/${connectionId}`, payload);
  if (!result.ok) throw new Error(`Failed to update connection: ${JSON.stringify(result.data)}`);
  return result.data;
}

async function createClientGrant(clientId, audience, scope) {
  const result = await apiCall("POST", "/api/v2/client-grants", {
    client_id: clientId,
    audience,
    scope,
  });
  if (!result.ok) {
    // 409 = grant already exists
    if (result.status === 409) {
      log("info", `Client grant already exists for ${clientId} -> ${audience}`);
      return result.data;
    }
    throw new Error(`Failed to create client grant: ${JSON.stringify(result.data)}`);
  }
  return result.data;
}

// ─────────────────────────────────────────────
// FGA functions
// ─────────────────────────────────────────────

async function getFGAToken(clientId, clientSecret, tokenIssuer = "auth.fga.dev") {
  const res = await fetch(`https://${tokenIssuer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      audience: "https://api.us1.fga.dev/",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get FGA token (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function validateFGAStore(apiUrl, storeId, fgaToken) {
  const result = await apiCall("GET", `/stores/${storeId}`, null, {
    baseUrl: apiUrl,
    token: fgaToken,
  });
  return result;
}

async function deployFGAModel(apiUrl, storeId, fgaToken) {
  const model = {
    schema_version: "1.1",
    type_definitions: [
      { type: "user" },
      {
        type: "order",
        relations: {
          owner: { this: {} },
          viewer: {
            union: {
              child: [{ this: {} }, { computedUserset: { relation: "owner" } }],
            },
          },
        },
        metadata: {
          relations: {
            owner: { directly_related_user_types: [{ type: "user" }] },
            viewer: { directly_related_user_types: [{ type: "user" }] },
          },
        },
      },
      {
        type: "profile",
        relations: {
          owner: { this: {} },
          editor: {
            union: {
              child: [{ this: {} }, { computedUserset: { relation: "owner" } }],
            },
          },
        },
        metadata: {
          relations: {
            owner: { directly_related_user_types: [{ type: "user" }] },
            editor: { directly_related_user_types: [{ type: "user" }] },
          },
        },
      },
    ],
  };

  const result = await apiCall("POST", `/stores/${storeId}/authorization-models`, model, {
    baseUrl: apiUrl,
    token: fgaToken,
  });
  return result;
}

// ─────────────────────────────────────────────
// Main orchestration
// ─────────────────────────────────────────────

async function main() {
  console.log("");
  console.log(`${COLORS.bold}${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log(`${COLORS.bold}  RetailZero A4AA -- Auth0 Tenant Setup Script${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log("");
  console.log("This script will create Auth0 applications, APIs, connections,");
  console.log("and other resources needed by the RetailZero sample app.");
  console.log("");
  console.log(`${COLORS.dim}Tip: All prompts can be pre-filled with environment variables.${COLORS.reset}`);
  console.log(`${COLORS.dim}Set SETUP_AUTH0_DOMAIN, SETUP_M2M_CLIENT_ID, SETUP_M2M_CLIENT_SECRET, etc.${COLORS.reset}`);
  console.log("");

  // Track everything we create for .env output
  const credentials = {};
  const createdResources = [];
  const manualSteps = [];

  // ── Phase 1: Collect Inputs ──

  log("step", "Phase 1: Collecting configuration inputs");
  console.log("");

  const auth0Domain = await prompt(
    "Auth0 tenant domain (canonical, e.g. mytenant.us.auth0.com)",
    process.env.SETUP_AUTH0_DOMAIN || ""
  );
  if (!auth0Domain) {
    log("error", "Auth0 domain is required.");
    process.exit(1);
  }
  credentials.AUTH0_MGMT_DOMAIN = auth0Domain;
  mgmtDomain = auth0Domain;

  const customDomain = await prompt(
    "Auth0 custom domain (optional, e.g. login.myapp.com)",
    process.env.SETUP_CUSTOM_DOMAIN || ""
  );
  credentials.AUTH0_DOMAIN = customDomain || auth0Domain;

  console.log("");
  log("info", "Bootstrap credentials: Provide an existing M2M app with Management API access.");

  const bootstrapClientId = await prompt(
    "M2M Client ID",
    process.env.SETUP_M2M_CLIENT_ID || ""
  );
  const bootstrapClientSecret = await promptSecret(
    "M2M Client Secret"
  );

  if (!bootstrapClientId || !bootstrapClientSecret) {
    log("error", "M2M Client ID and Secret are required to bootstrap the setup.");
    process.exit(1);
  }

  const appBaseUrl = await prompt(
    "Application base URL",
    process.env.SETUP_APP_BASE_URL || "http://localhost:3000"
  );
  credentials.APP_BASE_URL = appBaseUrl;

  console.log("");
  log("info", "Google OAuth2 credentials (for Calendar integration). Leave blank to skip.");

  const googleClientId = await prompt(
    "Google OAuth Client ID",
    process.env.SETUP_GOOGLE_CLIENT_ID || ""
  );
  const googleClientSecret = googleClientId
    ? await promptSecret("Google OAuth Client Secret")
    : "";

  const googleCalendarId = await prompt(
    "Google Calendar ID (optional)",
    process.env.SETUP_GOOGLE_CALENDAR_ID || ""
  );
  if (googleCalendarId) credentials.GOOGLE_CALENDAR_ID = googleCalendarId;

  console.log("");
  log("info", "FGA credentials (optional). Leave blank to skip FGA setup.");

  const fgaStoreId = await prompt("FGA Store ID", process.env.SETUP_FGA_STORE_ID || "");
  const fgaClientId = fgaStoreId
    ? await prompt("FGA Client ID", process.env.SETUP_FGA_CLIENT_ID || "")
    : "";
  const fgaClientSecret = fgaClientId
    ? await promptSecret("FGA Client Secret")
    : "";
  const fgaApiUrl = fgaStoreId
    ? await prompt("FGA API URL", process.env.SETUP_FGA_API_URL || "https://api.us1.fga.dev")
    : "";

  if (fgaStoreId) {
    credentials.FGA_STORE_ID = fgaStoreId;
    credentials.FGA_CLIENT_ID = fgaClientId;
    credentials.FGA_CLIENT_SECRET = fgaClientSecret;
    credentials.FGA_API_URL = fgaApiUrl;
    credentials.FGA_API_TOKEN_ISSUER = "auth.fga.dev";
    credentials.FGA_API_AUDIENCE = "https://api.us1.fga.dev/";
  }

  console.log("");
  log("info", "LLM/Anthropic config (optional). Leave blank to skip.");

  const anthropicBaseUrl = await prompt(
    "Anthropic Base URL",
    process.env.SETUP_ANTHROPIC_BASE_URL || ""
  );
  const anthropicApiKey = anthropicBaseUrl
    ? await promptSecret("Anthropic API Key")
    : "";

  if (anthropicBaseUrl) {
    credentials.ANTHROPIC_BASE_URL = anthropicBaseUrl;
    credentials.ANTHROPIC_API_KEY = anthropicApiKey;
  }

  // ── Phase 2: Validate & Get Management Token ──

  console.log("");
  log("step", "Phase 2: Validating bootstrap credentials");

  try {
    mgmtToken = await getManagementToken(auth0Domain, bootstrapClientId, bootstrapClientSecret);
    log("success", "Management API token obtained successfully");
  } catch (err) {
    log("error", `Failed to obtain management token: ${err.message}`);
    log("error", "Verify your M2M Client ID and Secret have Management API access.");
    process.exit(1);
  }

  // Quick validation
  const testResult = await apiCall("GET", "/api/v2/clients?per_page=1");
  if (!testResult.ok) {
    log("error", `Management API validation failed (${testResult.status}): ${JSON.stringify(testResult.data)}`);
    process.exit(1);
  }
  log("success", "Management API access confirmed");

  // ── Phase 3: Check Existing Resources ──

  console.log("");
  log("step", "Phase 3: Checking existing resources");

  const existingClients = await listClients();
  const existingServers = await listResourceServers();
  const existingGoogleConns = await listConnections("google-oauth2");

  const existingRetailZeroApp = existingClients.find(
    (c) => c.name === "RetailZero" && c.app_type === "regular_web"
  );
  const existingM2MApp = existingClients.find(
    (c) => c.name === "RetailZero Management API" && c.app_type === "non_interactive"
  );
  const existingResourceServer = existingServers.find(
    (s) => s.identifier === "https://api.retailzero.com"
  );
  const existingGoogleConn = existingGoogleConns.length > 0 ? existingGoogleConns[0] : null;

  log("info", `Found ${existingClients.length} existing applications`);
  log("info", `Found ${existingServers.length} existing resource servers`);
  log("info", `Found ${existingGoogleConns.length} Google OAuth2 connections`);

  if (existingRetailZeroApp) log("info", `  -> "RetailZero" app exists (${existingRetailZeroApp.client_id})`);
  if (existingM2MApp) log("info", `  -> "RetailZero Management API" app exists (${existingM2MApp.client_id})`);
  if (existingResourceServer) log("info", `  -> Resource server "https://api.retailzero.com" exists`);
  if (existingGoogleConn) log("info", `  -> Google OAuth2 connection exists (${existingGoogleConn.id})`);

  // ── Phase 4: Create Regular Web App ──

  console.log("");
  log("step", "Phase 4: Regular Web Application");

  let regularWebApp;
  if (existingRetailZeroApp) {
    log("info", "RetailZero app already exists. Updating configuration...");
    regularWebApp = await updateClient(existingRetailZeroApp.client_id, {
      grant_types: [
        "authorization_code",
        "refresh_token",
        "urn:openid:params:grant-type:ciba",
      ],
      callbacks: [`${appBaseUrl}/auth/callback`],
      allowed_logout_urls: [appBaseUrl],
      web_origins: [appBaseUrl],
      token_endpoint_auth_method: "client_secret_post",
      oidc_conformant: true,
    });
    // Preserve existing client_secret (not returned by PATCH)
    regularWebApp.client_id = existingRetailZeroApp.client_id;
    regularWebApp.client_secret = existingRetailZeroApp.client_secret;
    log("success", `Updated RetailZero app (${regularWebApp.client_id})`);
    createdResources.push({ type: "Regular Web App", action: "updated", id: regularWebApp.client_id });
  } else {
    regularWebApp = await createClient({
      name: "RetailZero",
      app_type: "regular_web",
      grant_types: [
        "authorization_code",
        "refresh_token",
        "urn:openid:params:grant-type:ciba",
      ],
      callbacks: [`${appBaseUrl}/auth/callback`],
      allowed_logout_urls: [appBaseUrl],
      web_origins: [appBaseUrl],
      token_endpoint_auth_method: "client_secret_post",
      oidc_conformant: true,
    });
    log("success", `Created RetailZero app (${regularWebApp.client_id})`);
    createdResources.push({ type: "Regular Web App", action: "created", id: regularWebApp.client_id });
  }

  credentials.AUTH0_CLIENT_ID = regularWebApp.client_id;
  credentials.AUTH0_CLIENT_SECRET = regularWebApp.client_secret;
  credentials.AUTH0_SECRET = generateSecret(32);
  credentials.AUTH0_AUDIENCE = "https://api.retailzero.com";

  // ── Phase 5: Create M2M App ──

  console.log("");
  log("step", "Phase 5: Machine-to-Machine Application");

  // Check if the bootstrap M2M app should be reused as the project's M2M app.
  // The Management API does not return client_secret for existing apps, so if
  // we reuse an existing app we need the user to confirm the bootstrap creds.
  const bootstrapIsM2M = existingM2MApp && existingM2MApp.client_id === bootstrapClientId;

  let m2mClientId;
  let m2mClientSecret;

  if (bootstrapIsM2M) {
    log("info", `Bootstrap M2M app matches "RetailZero Management API" (${bootstrapClientId}). Reusing.`);
    m2mClientId = bootstrapClientId;
    m2mClientSecret = bootstrapClientSecret;
    createdResources.push({ type: "M2M App", action: "reused", id: m2mClientId });
  } else if (existingM2MApp) {
    // Existing M2M app but it's not the bootstrap app -- we can't get its secret.
    log("info", `"RetailZero Management API" app exists (${existingM2MApp.client_id}) but is not the bootstrap app.`);
    const reuseBootstrap = await prompt(
      "Use the bootstrap M2M credentials as the project's M2M app? (Y/n)",
      "Y"
    );
    if (reuseBootstrap.toLowerCase() !== "n") {
      m2mClientId = bootstrapClientId;
      m2mClientSecret = bootstrapClientSecret;
      createdResources.push({ type: "M2M App", action: "reused (bootstrap)", id: m2mClientId });
    } else {
      log("info", "Creating a new M2M app...");
      const m2mApp = await createClient({
        name: "RetailZero Management API",
        app_type: "non_interactive",
        grant_types: ["client_credentials"],
        token_endpoint_auth_method: "client_secret_post",
      });
      m2mClientId = m2mApp.client_id;
      m2mClientSecret = m2mApp.client_secret;
      log("success", `Created RetailZero Management API app (${m2mClientId})`);
      createdResources.push({ type: "M2M App", action: "created", id: m2mClientId });
    }
  } else {
    // No existing M2M app -- ask whether to reuse bootstrap or create new
    const reuseBootstrap = await prompt(
      "Use the bootstrap M2M credentials as the project's M2M app? (Y/n)",
      "Y"
    );
    if (reuseBootstrap.toLowerCase() !== "n") {
      m2mClientId = bootstrapClientId;
      m2mClientSecret = bootstrapClientSecret;
      createdResources.push({ type: "M2M App", action: "reused (bootstrap)", id: m2mClientId });
    } else {
      const m2mApp = await createClient({
        name: "RetailZero Management API",
        app_type: "non_interactive",
        grant_types: ["client_credentials"],
        token_endpoint_auth_method: "client_secret_post",
      });
      m2mClientId = m2mApp.client_id;
      m2mClientSecret = m2mApp.client_secret;
      log("success", `Created RetailZero Management API app (${m2mClientId})`);
      createdResources.push({ type: "M2M App", action: "created", id: m2mClientId });
    }
  }

  credentials.AUTH0_MGMT_CLIENT_ID = m2mClientId;
  credentials.AUTH0_MGMT_CLIENT_SECRET = m2mClientSecret;

  // Create client grant for M2M -> Management API
  const mgmtApiAudience = `https://${auth0Domain}/api/v2/`;
  const requiredScopes = [
    "read:users",
    "update:users",
    "read:users_app_metadata",
    "update:users_app_metadata",
    "read:client_grants",
    "create:client_grants",
    "read:clients",
    "create:clients",
    "delete:clients",
    "update:clients",
    "read:connections",
    "update:connections",
  ];

  try {
    await createClientGrant(m2mClientId, mgmtApiAudience, requiredScopes);
    log("success", "Client grant for Management API created/confirmed");
  } catch (err) {
    log("warn", `Could not create Management API client grant: ${err.message}`);
    log("warn", "You may need to authorize this M2M app manually in the Auth0 Dashboard.");
    manualSteps.push("Authorize RetailZero Management API app for Auth0 Management API with required scopes");
  }

  // ── Phase 6: Create Resource Server ──

  console.log("");
  log("step", "Phase 6: Resource Server (API)");

  if (existingResourceServer) {
    log("info", "Resource server https://api.retailzero.com already exists. Skipping.");
    createdResources.push({ type: "Resource Server", action: "exists", id: existingResourceServer.identifier });
  } else {
    const rs = await createResourceServer({
      name: "RetailZero API",
      identifier: "https://api.retailzero.com",
      allow_offline_access: true,
      token_lifetime: 86400,
      scopes: [
        { value: "openid", description: "OpenID Connect" },
        { value: "profile", description: "User profile" },
        { value: "email", description: "User email" },
        { value: "offline_access", description: "Offline access" },
      ],
    });
    log("success", `Created resource server: ${rs.identifier}`);
    createdResources.push({ type: "Resource Server", action: "created", id: rs.identifier });
  }

  // ── Phase 7: Google OAuth2 Connection ──

  console.log("");
  log("step", "Phase 7: Google OAuth2 Connection");

  if (!googleClientId) {
    log("warn", "Google OAuth credentials not provided. Skipping connection setup.");
    log("warn", "You will need to configure the Google connection manually for Calendar integration.");
    manualSteps.push("Create/configure google-oauth2 connection with Calendar API scopes in Auth0 Dashboard");
  } else if (existingGoogleConn) {
    log("info", "Google OAuth2 connection exists. Updating...");

    // Ensure the regular web app is in enabled_clients
    const enabledClients = existingGoogleConn.enabled_clients || [];
    if (!enabledClients.includes(regularWebApp.client_id)) {
      enabledClients.push(regularWebApp.client_id);
    }

    try {
      await updateConnection(existingGoogleConn.id, {
        enabled_clients: enabledClients,
        options: {
          ...existingGoogleConn.options,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          scope: [
            "profile",
            "email",
            "https://www.googleapis.com/auth/calendar.events",
          ],
        },
      });
      log("success", `Updated Google OAuth2 connection (${existingGoogleConn.id})`);
      createdResources.push({ type: "Google Connection", action: "updated", id: existingGoogleConn.id });
    } catch (err) {
      log("warn", `Failed to update Google connection: ${err.message}`);
      manualSteps.push("Update google-oauth2 connection with Calendar API scopes and Google credentials");
    }
  } else {
    try {
      const conn = await createConnection({
        name: "google-oauth2",
        strategy: "google-oauth2",
        enabled_clients: [regularWebApp.client_id],
        options: {
          client_id: googleClientId,
          client_secret: googleClientSecret,
          scope: [
            "profile",
            "email",
            "https://www.googleapis.com/auth/calendar.events",
          ],
        },
      });
      log("success", `Created Google OAuth2 connection (${conn.id})`);
      createdResources.push({ type: "Google Connection", action: "created", id: conn.id });
    } catch (err) {
      log("warn", `Failed to create Google connection: ${err.message}`);
      manualSteps.push("Create google-oauth2 connection with Calendar API scopes in Auth0 Dashboard");
    }
  }

  // ── Phase 8: FGA Setup ──

  console.log("");
  log("step", "Phase 8: FGA Authorization Model");

  if (fgaStoreId && fgaClientId && fgaClientSecret) {
    try {
      const fgaToken = await getFGAToken(fgaClientId, fgaClientSecret);
      log("success", "FGA token obtained");

      // Validate store
      const storeResult = await validateFGAStore(fgaApiUrl, fgaStoreId, fgaToken);
      if (storeResult.ok) {
        log("success", `FGA store validated: ${storeResult.data.name || fgaStoreId}`);
      } else {
        log("warn", `FGA store validation returned ${storeResult.status}. Proceeding with model deployment...`);
      }

      // Deploy model
      const modelResult = await deployFGAModel(fgaApiUrl, fgaStoreId, fgaToken);
      if (modelResult.ok) {
        log("success", `FGA authorization model deployed (ID: ${modelResult.data.authorization_model_id || "unknown"})`);
        createdResources.push({ type: "FGA Model", action: "deployed", id: modelResult.data.authorization_model_id });
      } else {
        log("warn", `FGA model deployment returned ${modelResult.status}: ${JSON.stringify(modelResult.data)}`);
        manualSteps.push("Deploy FGA authorization model manually via the FGA Dashboard or CLI");
      }
    } catch (err) {
      log("warn", `FGA setup failed: ${err.message}`);
      manualSteps.push("Configure FGA store and deploy authorization model manually");
    }
  } else {
    log("info", "FGA credentials not provided. Skipping FGA setup.");
    log("info", "FGA-related .env.local variables will be left empty.");
  }

  // ── Phase 9: Manual Steps ──

  console.log("");
  log("step", "Phase 9: Manual Configuration Steps");
  console.log("");
  console.log(`${COLORS.yellow}The following features must be enabled manually in the Auth0 Dashboard:${COLORS.reset}`);
  console.log("");

  const dashboardSteps = [
    `${COLORS.bold}1. Token Vault${COLORS.reset}: Dashboard > Applications > RetailZero > Settings > Advanced Settings > Token Vault > Enable`,
    `${COLORS.bold}2. My Account API${COLORS.reset}: Applications > APIs > Activate Auth0 My Account API > Application Access tab > Find RetailZero > Edit > Set User Access, Authorized > Select All Connected Accounts scopes > Save. Then in Settings > Access Settings, enable "Allow Skipping User Consent".`,
    `${COLORS.bold}3. MRRT (Multi-Resource Refresh Tokens)${COLORS.reset}: Applications > RetailZero > Settings > Refresh Token section > Enable Multi-Resource Refresh Tokens for the My Account API (audience: https://{canonical-domain}/me/, scopes: create:me:connected_accounts, read:me:connected_accounts, delete:me:connected_accounts). Required for Token Vault.`,
    `${COLORS.bold}4. Google Connection -- Connected Accounts${COLORS.reset}: Authentication > Social > google-oauth2 > In the Purpose section, toggle on "Authentication and Connected Accounts for Token Vault". Also enable offline_access on the connection to permit refresh token retrieval.`,
    `${COLORS.bold}5. CIBA${COLORS.reset}: If not already enabled at tenant level, enable in Dashboard > Settings > Advanced > CIBA.`,
    `${COLORS.bold}6. Guardian Push MFA${COLORS.reset}: Security > Multi-factor Auth > Enable Push Notifications (Auth0 Guardian) > Set MFA policy to "Require". CIBA will not send push notifications unless MFA is required and Guardian is enabled.`,
    ...(customDomain
      ? [`${COLORS.bold}7. Custom Domain${COLORS.reset}: Configure DNS for "${customDomain}" in Dashboard > Settings > Custom Domains`]
      : []),
  ];

  dashboardSteps.forEach((step) => console.log(`  ${step}`));

  if (manualSteps.length > 0) {
    console.log("");
    console.log(`${COLORS.yellow}Additional manual steps (from issues encountered during setup):${COLORS.reset}`);
    manualSteps.forEach((step, i) => {
      console.log(`  ${COLORS.bold}${dashboardSteps.length + i + 1}. ${step}${COLORS.reset}`);
    });
  }

  // ── Phase 10: Generate .env.local ──

  console.log("");
  log("step", "Phase 10: Generating .env.local");

  const envContent = [
    "# Auth0 - Regular Web App",
    `AUTH0_SECRET=${credentials.AUTH0_SECRET || ""}`,
    `AUTH0_DOMAIN=${credentials.AUTH0_DOMAIN || ""}`,
    `AUTH0_CLIENT_ID=${credentials.AUTH0_CLIENT_ID || ""}`,
    `AUTH0_CLIENT_SECRET=${credentials.AUTH0_CLIENT_SECRET || ""}`,
    "",
    "# Auth0 - Management API (M2M)",
    `AUTH0_MGMT_DOMAIN=${credentials.AUTH0_MGMT_DOMAIN || ""}`,
    `AUTH0_MGMT_CLIENT_ID=${credentials.AUTH0_MGMT_CLIENT_ID || ""}`,
    `AUTH0_MGMT_CLIENT_SECRET=${credentials.AUTH0_MGMT_CLIENT_SECRET || ""}`,
    "",
    "# Auth0 - API",
    `AUTH0_AUDIENCE=${credentials.AUTH0_AUDIENCE || "https://api.retailzero.com"}`,
    "",
    "# App",
    `APP_BASE_URL=${credentials.APP_BASE_URL || "http://localhost:3000"}`,
    "",
    "# FGA (FGA)",
    `FGA_STORE_ID=${credentials.FGA_STORE_ID || ""}`,
    `FGA_CLIENT_ID=${credentials.FGA_CLIENT_ID || ""}`,
    `FGA_CLIENT_SECRET=${credentials.FGA_CLIENT_SECRET || ""}`,
    `FGA_API_URL=${credentials.FGA_API_URL || "https://api.us1.fga.dev"}`,
    `FGA_API_TOKEN_ISSUER=${credentials.FGA_API_TOKEN_ISSUER || "auth.fga.dev"}`,
    `FGA_API_AUDIENCE=${credentials.FGA_API_AUDIENCE || "https://api.us1.fga.dev/"}`,
    "",
    "# Google Calendar",
    `GOOGLE_CALENDAR_ID=${credentials.GOOGLE_CALENDAR_ID || ""}`,
    "",
    "# LLM (Anthropic)",
    `ANTHROPIC_BASE_URL=${credentials.ANTHROPIC_BASE_URL || ""}`,
    `ANTHROPIC_API_KEY=${credentials.ANTHROPIC_API_KEY || ""}`,
  ].join("\n") + "\n";

  const envPath = resolve(PROJECT_ROOT, ".env.local");
  const envExists = existsSync(envPath);

  if (envExists) {
    const overwrite = await prompt(
      `.env.local already exists. Overwrite? (y/N)`,
      "N"
    );
    if (overwrite.toLowerCase() !== "y") {
      // Write to .env.local.new instead
      const newEnvPath = resolve(PROJECT_ROOT, ".env.local.new");
      writeFileSync(newEnvPath, envContent, "utf-8");
      log("info", `Wrote credentials to .env.local.new (existing .env.local preserved)`);
    } else {
      writeFileSync(envPath, envContent, "utf-8");
      log("success", "Wrote .env.local");
    }
  } else {
    writeFileSync(envPath, envContent, "utf-8");
    log("success", "Wrote .env.local");
  }

  // ── Phase 11: Validation ──

  console.log("");
  log("step", "Phase 11: Validating setup");

  const validationResults = [];

  // Test M2M token
  try {
    if (credentials.AUTH0_MGMT_CLIENT_ID && credentials.AUTH0_MGMT_CLIENT_SECRET) {
      await getManagementToken(
        credentials.AUTH0_MGMT_DOMAIN,
        credentials.AUTH0_MGMT_CLIENT_ID,
        credentials.AUTH0_MGMT_CLIENT_SECRET
      );
      validationResults.push({ check: "M2M token exchange", passed: true });
    }
  } catch {
    validationResults.push({ check: "M2M token exchange", passed: false });
  }

  // Verify regular web app
  const appCheck = await apiCall("GET", `/api/v2/clients/${credentials.AUTH0_CLIENT_ID}`);
  validationResults.push({
    check: "Regular Web App exists",
    passed: appCheck.ok,
  });

  // Verify resource server
  const servers = await listResourceServers();
  const rsExists = servers.some((s) => s.identifier === "https://api.retailzero.com");
  validationResults.push({
    check: "Resource Server exists",
    passed: rsExists,
  });

  // Verify Google connection
  const googleConns = await listConnections("google-oauth2");
  const googleExists = googleConns.length > 0;
  validationResults.push({
    check: "Google OAuth2 connection",
    passed: googleExists,
  });

  // Print summary
  console.log("");
  console.log(`${COLORS.bold}${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log(`${COLORS.bold}  Setup Summary${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLORS.reset}`);
  console.log("");

  console.log(`${COLORS.bold}Resources:${COLORS.reset}`);
  createdResources.forEach((r) => {
    const icon = r.action === "created" || r.action === "deployed" || r.action === "uploaded" ? COLORS.green + "+" : COLORS.blue + "~";
    console.log(`  ${icon} ${r.type}${COLORS.reset}: ${r.action} ${r.id ? `(${r.id})` : ""}`);
  });

  console.log("");
  console.log(`${COLORS.bold}Validation:${COLORS.reset}`);
  validationResults.forEach((v) => {
    const icon = v.passed ? `${COLORS.green}PASS` : `${COLORS.red}FAIL`;
    console.log(`  ${icon}${COLORS.reset} ${v.check}`);
  });

  const allPassed = validationResults.every((v) => v.passed);
  console.log("");
  if (allPassed) {
    log("success", "All validation checks passed.");
  } else {
    log("warn", "Some validation checks failed. Review the output above.");
  }

  if (manualSteps.length > 0 || dashboardSteps.length > 0) {
    console.log("");
    log("info", `Don't forget the ${dashboardSteps.length + manualSteps.length} manual step(s) listed above.`);
  }

  console.log("");
  log("info", `Next: Run ${COLORS.bold}npm run dev${COLORS.reset} to start the RetailZero app.`);
  console.log("");

  rl.close();
}

main().catch((err) => {
  log("error", `Setup failed: ${err.message}`);
  console.error(err);
  rl.close();
  process.exit(1);
});
