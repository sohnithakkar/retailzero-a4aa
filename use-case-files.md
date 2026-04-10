# RetailZero A4AA Demo -- Code File Mapping by Use Case

RetailZero is a Next.js retail shopping app with an AI chat assistant ("Zero"). It integrates all 4 Auth0 for AI Agents (A4AA) use cases through the `@auth0/ai-vercel` and `@auth0/ai` SDKs. The AI agent tools are protected by A4AA wrappers so that user authentication, step-up authorization, fine-grained access control, and third-party token management all happen transparently within the agent's tool execution.

---

## 1. User Authentication

**What it demonstrates:** Auth0 Next.js SDK session management, login/logout, and bridging the authenticated session into the AI agent context.

| File | What to show |
|------|-------------|
| `src/lib/auth/auth0.ts` | Auth0Client initialization with Management API audience and scopes (`offline_access`, `read:current_user`, `update:current_user_metadata`). Also the separate `auth0Connect` client for Token Vault flows. |
| `src/lib/auth/session.ts` | Session helper that maps Auth0's `sub`/`email`/`name` into the app's session shape. |
| `src/lib/auth/provider.tsx` | Client-side `Auth0Provider` + `AuthBridge` context that exposes the `useAuth()` hook with `login()` / `logout()`. |
| `src/app/api/auth/[...auth0]/route.ts` | Catch-all route handler that delegates to `auth0.middleware()` for `/auth/login`, `/auth/logout`, `/auth/callback`. |
| `src/middleware.ts` | Next.js middleware running Auth0 session middleware on all routes (excluding OAuth proxy and `.well-known`). |
| `src/app/api/chat/route.ts` (lines 58-74) | The critical bridge: retrieves the Auth0 session, access token, and refresh token, then injects them into the AI tool context via `setAuthAccessToken()` / `setAuthRefreshToken()`. This is how the agent "knows who the user is." |

**Demo talking point:** The user logs in via Auth0 Universal Login. The session's access token and refresh token are passed into the AI agent context per-request, so every tool call the agent makes carries the authenticated user's identity.

---

## 2. CIBA (Client-Initiated Backchannel Authentication)

**What it demonstrates:** Step-up authorization for high-value actions. The agent triggers a push notification to the user's device and polls until approval.

| File | What to show |
|------|-------------|
| `src/lib/auth0-ai/ciba.ts` | CIBA configuration: `userID` resolver, `bindingMessage`, scopes, audience, and the `onAuthorizationRequest` callback that puts the flow into polling mode. |
| `src/lib/auth0-ai/index.ts` (lines 412-476) | The `checkout_cart` tool wrapped with `auth0AI.withAsyncAuthorization(getCIBAParams())`. The wrapper intercepts the tool call, initiates CIBA with Auth0, polls for user approval, and only executes the checkout logic once approved. |
| `src/app/api/chat/route.ts` (line 18) | `maxDuration = 300` -- 5-minute timeout to accommodate the CIBA polling wait. |
| `src/app/api/chat/route.ts` (lines 83-132) | `withInterruptions()` wrapper from `@auth0/ai-vercel/interrupts` that handles the async authorization flow within the AI stream. |

**Demo talking point:** When a user says "checkout," the agent calls `prepare_checkout` first, then `checkout_cart`. The CIBA wrapper sends a push notification to the user's phone. The server keeps the stream open, polling Auth0 until the user approves. No page redirect needed -- the approval happens out-of-band on the user's device.

---

## 3. FGA (Fine-Grained Authorization)

**What it demonstrates:** OpenFGA-based access control on agent tools. The agent can only perform actions the user is authorized for.

| File | What to show |
|------|-------------|
| `src/lib/auth0-ai/fga.ts` | FGA check configuration for profile editing: `buildQuery` constructs the tuple `user:{userId} editor profile:{userId}`, and `onUnauthorized` returns a denial message. |
| `src/lib/auth0-ai/index.ts` (lines 479-513) | The `edit_profile` tool wrapped with `fgaAI.withFGA(getFGAParams())`. Before the tool executes, the FGA wrapper checks if the user has the `editor` relation on the target profile. |
| `src/lib/fga/order-store.ts` | Full FGA integration for order retrieval: writes `owner` tuples when orders are placed (line 64), filters order documents through `FGAFilter` with `viewer` relation checks (line 162), and self-heals missing tuples (line 117). |
| `src/lib/auth0-ai/index.ts` (lines 333-395) | The `search_orders` tool that uses `FGAFilter` to ensure the agent only returns orders the user is authorized to view. |
| `src/lib/auth0/user-cache.ts` (lines 79-83) | On hydration, existing orders are seeded into the FGA-backed document store so tuples are written for historical orders. |

**Demo talking point:** FGA is used in two ways: (1) as a tool-level gate on `edit_profile` -- the agent is blocked from editing someone else's profile, and (2) as a document-level filter on `search_orders` -- even if the in-memory store has all orders, only the ones the user owns (per FGA) are returned to the agent. The self-healing logic automatically repairs missing FGA tuples.

---

## 4. Token Vault

**What it demonstrates:** Securely accessing third-party APIs (Google Calendar) using tokens managed by Auth0's Token Vault / Connected Accounts.

| File | What to show |
|------|-------------|
| `src/lib/auth/auth0.ts` (lines 11-24) | The `auth0Connect` client configured specifically for Connected Accounts flows, using the canonical tenant domain (`AUTH0_MGMT_DOMAIN`) without Management API audience/scopes. |
| `src/app/api/auth/connect/google/route.ts` | The route that initiates `auth0Connect.connectAccount()` with the `google-oauth2` connection and Calendar scopes. |
| `src/lib/auth0-ai/index.ts` (lines 516-583) | The `set_calendar_reminder` tool wrapped with `auth0AI.withTokenVault()` specifying the `google-oauth2` connection and Calendar scopes. The wrapper exchanges the user's refresh token for a Google access token via Token Vault. Inside the tool, `getAccessTokenFromTokenVault()` retrieves the exchanged token. |
| `src/lib/auth0-ai/calendar.ts` | The actual Google Calendar API call using the Token Vault-provided access token to create events. |
| `src/app/connect/google/page.tsx` | UI page for the Google account connection flow. |

**Demo talking point:** When a user asks the agent to set a calendar reminder, the `withTokenVault` wrapper transparently exchanges the user's Auth0 refresh token for a Google OAuth2 access token. If the user hasn't connected their Google account yet, the agent redirects them to the consent flow. Once connected, the agent creates Calendar events directly -- no Google credentials are ever exposed to the AI.

---

## Key Orchestration Files

These files tie all 4 use cases together and are worth highlighting in any walkthrough:

| File | Role |
|------|------|
| `src/lib/auth0-ai/index.ts` | **Central hub** -- defines all AI tools and wraps them with A4AA primitives (CIBA, FGA, Token Vault). This is the single most important file for the demo. |
| `src/app/api/chat/route.ts` | **Request handler** -- bridges the Auth0 session into the AI context, initializes tools, and runs the streaming chat with `withInterruptions`. |
| `src/lib/mcp/server.ts` | **MCP server** -- exposes the same tools via MCP protocol for external agent access (shows the resource server / OAuth 2.0 protected resource pattern). |
| `src/lib/mcp/auth.ts` | **MCP auth** -- JWT verification for MCP bearer tokens, demonstrating the resource server side. |
