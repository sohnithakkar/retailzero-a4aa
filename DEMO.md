# RetailZero Demo Script

Duration: 5 minutes
Format: Technical walkthrough with live demo
Audience: Developers, architects, and technical decision-makers evaluating Auth0 for AI Agents

## Opening — The Problem (0:00–0:30)

AI agents are no longer just answering questions — they're taking actions on behalf of users. They're browsing products, placing orders, editing profiles, and connecting to third-party APIs. Every one of those actions is an identity and authorization decision. Without proper guardrails, an AI agent is an unauthenticated, unauthorized actor with access to your entire system.

Today I'm going to walk through RetailZero, a Next.js shopping app with a conversational AI assistant, and show you how Auth0 for AI Agents solves three critical problems: step-up authentication for high-risk actions, fine-grained authorization for data access, and secure third-party API access through Token Vault.

## Part 1 — The App & AI Assistant (0:30–1:15)

Show the landing page. Click "Browse Products."

This is RetailZero — a mock retail storefront built with Next.js, Tailwind, and the Vercel AI SDK using Claude as the backing model. But the interesting part isn't the storefront itself — it's this chat widget in the bottom-right corner. This is "Zero," the AI shopping assistant.

Open the chat widget. Show the guest/authenticated status indicator in the header.

Zero is a full agentic experience. It has tools it can call — browsing products, managing a cart, checking out, editing a profile, searching order history, and creating Google Calendar reminders. The key thing to understand: every sensitive tool is wrapped with an Auth0 AI primitive. Let me show you what that means.

## Part 2 — Guest Browsing & Login via Agent (1:15–2:00)

In the chat, type: "Show me electronics"

As a guest, I can browse products. The agent calls the show_products tool and the UI renders an interactive product carousel — images, prices, add-to-cart buttons — all driven by the tool response.

Click "Add to Cart" on a product from the carousel.

I can add items to a cart as a guest. The cart is stored in localStorage and synced to the server on each request. But if I try to check out...

Type: "Checkout"

The agent knows I'm a guest and tells me I need to log in. Now watch this — instead of giving me a link to click, I can just ask.

Type: "Log me in"

The agent calls the redirect_to_login tool, which programmatically redirects me to the Auth0 Universal Login page. After I authenticate, I'm returned to the store with my session intact and my chat history preserved. The status indicator now shows my name and "Authenticated."

## Part 3 — CIBA Step-Up Authentication at Checkout (2:00–3:15)

Add a product to the cart if needed, then type: "I'd like to checkout"

This is where Auth0 for AI Agents really shines. Checkout is a high-value action — we don't want an AI agent placing orders without explicit human approval. The checkout tool is wrapped with auth0AI.withAsyncAuthorization(), which implements CIBA — Client Initiated Backchannel Authentication.

Watch the two-step flow: prepare_checkout returns the cart summary, then checkout_cart triggers the push notification.

The agent first calls prepare_checkout to show me what I'm buying. Then it calls checkout_cart, which triggers a push notification to my device through Auth0. The UI shows a polling state — "Waiting for approval..." — while the server holds the connection open and polls Auth0.

Approve the push notification on your device (Auth0 Guardian or similar).

I approve on my device, the CIBA flow completes server-side, and the agent presents my order confirmation with an order ID and total. The human was in the loop for the high-risk action, but the experience was seamless — no page redirects, no copy-pasting codes. This is step-up authentication for agentic workflows.

## Part 4 — Fine-Grained Authorization with OpenFGA (3:15–3:55)

Type: "Show me my order history"

Now let's look at authorization. The search_orders tool uses Auth0 FGA — Fine-Grained Authorization. Every order in the system is stored as a document with an FGA tuple: user:X is owner of order:Y. When I search my orders, FGAFilter checks every candidate document against OpenFGA and only returns the ones I'm authorized to view.

This matters because the AI agent has access to all orders in the system. Without FGA, a prompt injection or a hallucinated user ID could leak another customer's data. FGA ensures the agent can only surface what the authenticated user is permitted to see.

Optionally show the FGA model from the README: user / order with owner and viewer relations.

The profile edit tool works the same way — it's wrapped with fgaAI.withFGA() and checks that the requesting user has the editor relation on the target profile. Try to edit someone else's profile and FGA blocks it before the tool even executes.

## Part 5 — Token Vault & Google Calendar (3:55–4:40)

Type: "Set a calendar reminder for [product name] on Friday at 10am"

The last primitive is Token Vault. The calendar tool is wrapped with auth0AI.withTokenVault(), which manages federated credentials — in this case, a Google OAuth2 token with calendar write scope.

If Google is not yet connected, the agent will trigger redirect_to_google_connect, opening a popup for OAuth consent.

If I haven't connected my Google account yet, the agent detects the Token Vault error and opens Google OAuth in a popup — my chat stays open, context is preserved. After I authorize, the agent retries and creates the calendar event.

Show the success response with the event ID and calendar link.

Token Vault handles the entire OAuth token lifecycle — acquiring, storing, and refreshing tokens — so the AI agent never touches raw credentials. The agent just calls the tool; Auth0 handles the identity plumbing.

## Closing — Why This Matters (4:40–5:00)

To recap what we just saw: an AI agent that browses products, manages a cart, checks out with CIBA push approval, respects FGA authorization on every data query, and securely accesses Google Calendar through Token Vault — all using three Auth0 AI primitives:

1. withAsyncAuthorization — CIBA for step-up consent on high-risk agent actions
2. withFGA — fine-grained authorization so agents only access what users are permitted to see
3. withTokenVault — secure third-party API access without exposing credentials to the agent

This is what it looks like to give AI agents real capabilities without giving up security. That's Auth0 for AI Agents.
