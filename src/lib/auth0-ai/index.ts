import { tool, type Tool } from "ai";
import { z } from "zod";
import { Auth0AI, getAccessTokenFromTokenVault } from "@auth0/ai-vercel";

import { searchProducts, getProductById } from "@/lib/data/products";
import { getUser, updateUser } from "@/lib/data/users";
import { getAIConfig, getBranding } from "@/lib/config";
import {
  hydrateUser,
  getCachedCart,
  getCachedOrders,
  setCachedCart,
  addOrderAndClearCart,
} from "@/lib/auth0/user-cache";

import { getCIBAParams } from "./ciba";
import { getFGAParams } from "./fga";
import { createCalendarEvent } from "./calendar";
import {
  searchOrderDocuments,
  getOrderFilter,
  repairMissingTuples,
} from "@/lib/fga/order-store";

// ---------------------------------------------------------------------------
// Guest cart context — set per-request from the chat route so that AI tools
// can read/write the guest cart without touching the JSON file.  The client
// sends the current localStorage cart in the request body and the tool
// results include the updated cart so the client can sync back.
// ---------------------------------------------------------------------------

let _guestCart: { productId: string; quantity: number; addedAt: string }[] = [];

export function setGuestCart(
  items: { productId: string; quantity: number; addedAt: string }[]
) {
  _guestCart = items ?? [];
}

function getGuestCartItems() {
  return _guestCart;
}

function addToGuestCart(productId: string, quantity: number) {
  const existing = _guestCart.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    _guestCart.push({
      productId,
      quantity,
      addedAt: new Date().toISOString(),
    });
  }
  return _guestCart;
}

// ---------------------------------------------------------------------------
// Authenticated user context — set per-request from the chat route so that
// AI tools can read/write user_metadata via the Management API.
// ---------------------------------------------------------------------------

let _authAccessToken: string | null = null;
let _authRefreshToken: string | null = null;
let _userTimezone: string | null = null;

export function setAuthAccessToken(token: string) {
  _authAccessToken = token;
}

export function getAuthAccessToken(): string | null {
  return _authAccessToken;
}

export function setAuthRefreshToken(token: string) {
  _authRefreshToken = token;
}

export function getAuthRefreshToken(): string | null {
  return _authRefreshToken;
}

export function setUserTimezone(tz: string) {
  _userTimezone = tz;
}

export function getUserTimezone(): string | null {
  return _userTimezone;
}

// ---------------------------------------------------------------------------
// User role and grade level context — set per-request from the chat route
// ---------------------------------------------------------------------------

let _userRole: "student" | "admin" | null = null;
let _userGradeLevel: string | null = null;

export function setUserRole(role: "student" | "admin") {
  _userRole = role;
}

export function getUserRole(): "student" | "admin" | null {
  return _userRole;
}

export function setUserGradeLevel(gradeLevel: string) {
  _userGradeLevel = gradeLevel;
}

export function getUserGradeLevel(): string | null {
  return _userGradeLevel;
}

// ---------------------------------------------------------------------------
// Public tools (no auth required) — created at request time to use config
// ---------------------------------------------------------------------------

function createShowProductsTool() {
  const aiConfig = getAIConfig();
  return tool({
    description: aiConfig.toolDescriptions.showProducts,
    inputSchema: z.object({
      query: z
        .string()
        .optional()
        .describe("Search query to filter by name or description"),
      category: z
        .string()
        .optional()
        .describe(`Category filter (${aiConfig.categories.join(", ")})`),
    }),
    execute: async ({ query, category }) => {
      const products = searchProducts(query, category);
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        stock: p.stock,
        rating: p.rating,
        image: p.image,
        description: p.description,
      }));
    },
  });
}

function createGetProductDetailsTool() {
  const aiConfig = getAIConfig();
  return tool({
    description: aiConfig.toolDescriptions.getProductDetails,
    inputSchema: z.object({
      productId: z.string().describe(`The ${aiConfig.catalogTermSingular} ID to look up`),
    }),
    execute: async ({ productId }) => {
      const product = getProductById(productId);
      if (!product) return { error: "Product not found" };
      return product;
    },
  });
}

// Keep backward compatibility exports
export const showProducts = createShowProductsTool();
export const getProductDetails = createGetProductDetailsTool();

// ---------------------------------------------------------------------------
// Student learning tools — for students to get help with coursework
// ---------------------------------------------------------------------------

function createExplainConceptTool() {
  const aiConfig = getAIConfig();
  return tool({
    description:
      aiConfig.toolDescriptions.explainConcept ||
      "Explain a concept or topic to the student at their grade level. " +
      "Use clear language, relatable examples, and break down complex ideas. " +
      "This tool is only available to students.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("The concept or topic to explain (e.g., 'photosynthesis', 'fractions', 'the American Revolution')"),
      subject: z
        .string()
        .optional()
        .describe("The subject area (e.g., 'Math', 'Science', 'History', 'English')"),
      additionalContext: z
        .string()
        .optional()
        .describe("Any additional context about what the student is struggling with or wants to know"),
    }),
    execute: async ({
      topic,
      subject,
      additionalContext,
    }: {
      topic: string;
      subject?: string;
      additionalContext?: string;
    }) => {
      const role = getUserRole();
      if (role !== "student") {
        return {
          error: "This tool is only available to students.",
          suggestion: `Admins can browse ${aiConfig.catalogTerm} using show_products.`,
        };
      }

      const gradeLevel = getUserGradeLevel() || "8"; // Default to 8th grade if not set

      // Return structured data that the LLM will use to generate the explanation
      return {
        requestType: "explain_concept",
        topic,
        subject: subject || "General",
        gradeLevel,
        additionalContext: additionalContext || null,
        instructions:
          `Generate an age-appropriate explanation of "${topic}" for a grade ${gradeLevel} student. ` +
          "Include: 1) A simple definition, 2) A real-world example or analogy, " +
          "3) Why it matters or how it connects to things they know. " +
          "Keep the language accessible and encouraging.",
      };
    },
  });
}

export const explainConceptTool = createExplainConceptTool();

function makePracticeProblemsTool() {
  const aiConfig = getAIConfig();
  return tool({
    description:
      aiConfig.toolDescriptions.createPracticeProblems ||
      "Generate practice problems or questions for a student to work on. " +
      "Problems are tailored to the student's grade level. " +
      "This tool is only available to students.",
    inputSchema: z.object({
      topic: z
        .string()
        .describe("The topic or skill to practice (e.g., 'multiplication', 'vocabulary', 'grammar')"),
      subject: z
        .string()
        .describe("The subject area (e.g., 'Math', 'Science', 'History', 'English')"),
      difficulty: z
        .enum(["easy", "medium", "hard"])
        .optional()
        .default("medium")
        .describe("Difficulty level of the problems"),
      numberOfProblems: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Number of practice problems to generate (1-10)"),
      includeAnswers: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include answers (set to true for self-study, false for quiz mode)"),
    }),
    execute: async ({
      topic,
      subject,
      difficulty,
      numberOfProblems,
      includeAnswers,
    }: {
      topic: string;
      subject: string;
      difficulty: "easy" | "medium" | "hard";
      numberOfProblems: number;
      includeAnswers: boolean;
    }) => {
      const role = getUserRole();
      if (role !== "student") {
        return {
          error: "This tool is only available to students.",
          suggestion: `Admins can browse ${aiConfig.catalogTerm} using show_products.`,
        };
      }

      const gradeLevel = getUserGradeLevel() || "8"; // Default to 8th grade if not set

      // Return structured data that the LLM will use to generate practice problems
      return {
        requestType: "create_practice_problems",
        topic,
        subject,
        gradeLevel,
        difficulty,
        numberOfProblems,
        includeAnswers,
        instructions:
          `Generate ${numberOfProblems} ${difficulty} practice problems about "${topic}" in ${subject} ` +
          `for a grade ${gradeLevel} student. ` +
          (includeAnswers
            ? "Include the answers after each problem."
            : "Do NOT include answers — let the student try first.") +
          " Make problems progressively build on each other when possible. " +
          "Use encouraging language and provide clear instructions for each problem.",
      };
    },
  });
}

export const createPracticeProblemsTool = makePracticeProblemsTool();

// ---------------------------------------------------------------------------
// Session tools — no Token Vault required
// For guests: works with in-memory cart (synced from/to localStorage via client)
// For authenticated users: works with Auth0 user_metadata via Management API
// ---------------------------------------------------------------------------

function enrichCart(items: { productId: string; quantity: number }[]) {
  const enriched = items.map((item) => {
    const product = getProductById(item.productId);
    return {
      productId: item.productId,
      productName: product?.name || "Unknown",
      price: product?.price || 0,
      quantity: item.quantity,
      subtotal: (product?.price || 0) * item.quantity,
    };
  });
  const total = enriched.reduce((sum, i) => sum + i.subtotal, 0);
  return { items: enriched, total: Math.round(total * 100) / 100 };
}

function createViewCartTool() {
  const aiConfig = getAIConfig();
  return tool({
    description:
      `${aiConfig.toolDescriptions.viewCart} Do not ask the user for their userId — it is provided automatically.`,
    inputSchema: z.object({
      userId: z
        .string()
        .optional()
        .default("guest")
        .describe("The user ID (provided automatically, do not ask the user)"),
    }),
    execute: async ({ userId }: { userId: string }) => {
      if (userId === "guest") {
        return enrichCart(getGuestCartItems());
      }
      try {
        const accessToken = getAuthAccessToken();
        if (!accessToken) return { error: "Not authenticated" };
        await hydrateUser(accessToken, userId);
        return enrichCart(getCachedCart(userId).items);
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
  });
}

const viewCartTool = createViewCartTool();

function createAddToCartTool() {
  const aiConfig = getAIConfig();
  return tool({
    description:
      `${aiConfig.toolDescriptions.addToCart} If already in the ${aiConfig.cartTerm}, increases the quantity. Do not ask the user for their userId — it is provided automatically.`,
    inputSchema: z.object({
      userId: z
        .string()
        .optional()
        .default("guest")
        .describe("The user ID (provided automatically, do not ask the user)"),
      productId: z.string().describe(`The ${aiConfig.catalogTermSingular} ID to add`),
      quantity: z
        .number()
        .int()
        .positive()
        .optional()
        .default(1)
        .describe("Quantity to add (defaults to 1)"),
    }),
    execute: async ({
      userId,
      productId,
      quantity,
    }: {
      userId: string;
      productId: string;
      quantity: number;
    }) => {
      const product = getProductById(productId);
      if (!product) return { error: "Product not found" };

      if (userId === "guest") {
        const items = addToGuestCart(productId, quantity);
        return enrichCart(items);
      }

      try {
        const accessToken = getAuthAccessToken();
        if (!accessToken) return { error: "Not authenticated" };
        await hydrateUser(accessToken, userId);
        const cart = getCachedCart(userId);
        const existing = cart.items.find((i) => i.productId === productId);
        if (existing) {
          existing.quantity += quantity;
        } else {
          cart.items.push({
            productId,
            quantity,
            addedAt: new Date().toISOString(),
          });
        }
        cart.updatedAt = new Date().toISOString();
        setCachedCart(accessToken, userId, cart);
        return enrichCart(cart.items);
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
  });
}

const addToCartTool = createAddToCartTool();

function createPrepareCheckoutTool() {
  const aiConfig = getAIConfig();
  return tool({
    description:
      `${aiConfig.toolDescriptions.prepareCheckout} Returns the ${aiConfig.cartTerm} summary with items and total. ` +
      `Call this BEFORE calling checkout_cart so the user knows what they are ${aiConfig.primaryAction}ing and that a push notification will be sent for approval. ` +
      "Do not ask the user for their userId — it is provided automatically.",
    inputSchema: z.object({
      userId: z
        .string()
        .optional()
        .default("guest")
        .describe("The user ID (provided automatically, do not ask the user)"),
    }),
    execute: async ({ userId }: { userId: string }) => {
      if (userId === "guest") {
        return { error: `You must be logged in to ${aiConfig.primaryAction}.` };
      }
      try {
        const accessToken = getAuthAccessToken();
        if (!accessToken) return { error: "Not authenticated" };
        await hydrateUser(accessToken, userId);
        const cart = getCachedCart(userId);
        if (cart.items.length === 0) {
          return { error: "Cart is empty" };
        }
        const enriched = enrichCart(cart.items);
        return {
          ...enriched,
          message:
            "A push notification will be sent to the user's device for approval. " +
            "Tell the user to check their device, then call checkout_cart to proceed.",
        };
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
  });
}

const prepareCheckoutTool = createPrepareCheckoutTool();

function createViewProfileTool() {
  const aiConfig = getAIConfig();
  return tool({
    description:
      `${aiConfig.toolDescriptions.viewProfile} Do not ask the user for their userId — it is provided automatically.`,
    inputSchema: z.object({
      userId: z
        .string()
        .optional()
        .default("guest")
        .describe("The user ID (provided automatically, do not ask the user)"),
    }),
    execute: async ({ userId }: { userId: string }) => {
      const user = getUser(userId);
      if (!user) return { error: "User not found" };
      return user;
    },
  });
}

const viewProfileTool = createViewProfileTool();

function createRedirectToLoginTool() {
  const branding = getBranding();
  return tool({
    description:
      "Redirect the user to the login page. Use this when a guest user asks to log in, sign in, or authenticate. " +
      `This will redirect them to the login page and return them back to ${branding.appName} after authentication.`,
    inputSchema: z.object({
      returnTo: z
        .string()
        .optional()
        .default("/")
        .describe("The page to return to after login (defaults to home)"),
    }),
    execute: async ({ returnTo }: { returnTo: string }) => {
      return {
        redirect: true,
        url: `/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
        message: "Redirecting to login page...",
      };
    },
  });
}

const redirectToLoginTool = createRedirectToLoginTool();

function createRedirectToGoogleConnectTool() {
  const branding = getBranding();
  return tool({
    description:
      "Redirect the user to connect their Google account. Use this when Token Vault authorization is required for Google Calendar features. " +
      `Redirects the user to the Google OAuth consent page. After connecting, they return to ${branding.appName}.`,
    inputSchema: z.object({}),
    execute: async () => {
      return {
        redirect: true,
        url: "/connect/google",
        message: "Redirecting to connect your Google account...",
      };
    },
  });
}

const redirectToGoogleConnectTool = createRedirectToGoogleConnectTool();

function createSearchOrdersTool() {
  const aiConfig = getAIConfig();
  return tool({
    description:
      `${aiConfig.toolDescriptions.searchOrders} ` +
      "Do not ask the user for their userId — it is provided automatically.",
    inputSchema: z.object({
      userId: z
        .string()
        .describe("The user ID (provided automatically, do not ask the user)"),
      query: z
        .string()
        .optional()
        .describe(
          `Optional search query to filter ${aiConfig.orderTerm}s by ${aiConfig.catalogTermSingular} name or summary`
        ),
    }),
    execute: async ({ userId, query }: { userId: string; query?: string }) => {
      if (!userId || userId === "guest") {
        return { error: `You must be logged in to search ${aiConfig.orderTerm} history.` };
      }

      try {
        // Ensure user's orders are hydrated into the in-memory store first
        const accessToken = getAuthAccessToken();
        if (accessToken) {
          await hydrateUser(accessToken, userId);
        }

        // Get candidate documents (optionally filtered by text query)
        const candidates = searchOrderDocuments(query);

        if (candidates.length === 0) {
          return { orders: [], message: `No ${aiConfig.orderTerm}s found.` };
        }

        // Apply FGA filter — only returns orders the user is authorized to view
        const filter = getOrderFilter(userId);
        let authorized = await filter.filter(candidates);

        // Self-healing: check for orders in user_metadata that FGA denied
        // (missing tuples). Repair them and re-filter once.
        const cachedOrders = getCachedOrders(userId);
        const authorizedIds = new Set(authorized.map((d) => d.id));
        const missingOrders = cachedOrders.filter(
          (o) => !authorizedIds.has(o.orderId)
        );

        if (missingOrders.length > 0) {
          const repairedIds = await repairMissingTuples(missingOrders, userId);
          if (repairedIds.length > 0) {
            // Re-filter only the repaired candidates to avoid redundant checks
            const repairedCandidates = candidates.filter((d) =>
              repairedIds.includes(d.id)
            );
            const newlyAuthorized = await filter.filter(repairedCandidates);
            authorized = [...authorized, ...newlyAuthorized];
          }
        }

        return {
          orders: authorized.map((doc) => ({
            orderId: doc.id,
            items: doc.items,
            total: doc.total,
            placedAt: doc.placedAt,
            summary: doc.summary,
          })),
          count: authorized.length,
        };
      } catch (e) {
        return { error: (e as Error).message };
      }
    },
  });
}

const searchOrdersTool = createSearchOrdersTool();

// ---------------------------------------------------------------------------
// Lazily-initialized Auth0AI instance and authorized tools.
// Auth0AI reads AUTH0_DOMAIN / AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET from
// process.env at construction time, so we defer creation to request time
// to avoid build-time failures when env vars aren't set.
// ---------------------------------------------------------------------------

let _authorizedTools: Record<string, Tool> | null = null;

function getAuthorizedTools(): Record<string, Tool> {
  if (_authorizedTools) return _authorizedTools;

  const tools: Record<string, Tool> = {};
  const auth0AI = new Auth0AI();
  const aiConfig = getAIConfig();

  // -- CIBA: checkout with push approval --
  try {
    const withCIBA = auth0AI.withAsyncAuthorization(getCIBAParams());
    tools.checkout_cart = withCIBA(
      tool({
        description: aiConfig.toolDescriptions.checkoutCart,
        inputSchema: z.object({
          userId: z.string().describe("The user ID whose cart to checkout"),
        }),
        execute: async ({ userId }: { userId: string }) => {
          try {
            const accessToken = getAuthAccessToken();
            if (!accessToken) {
              return { error: "Not authenticated" };
            }

            await hydrateUser(accessToken, userId);
            const cart = getCachedCart(userId);
            if (cart.items.length === 0) {
              return { error: `${aiConfig.cartTerm} is empty` };
            }

            // Compute total and build order items
            let total = 0;
            const orderItems: {
              productId: string;
              productName: string;
              price: number;
              quantity: number;
            }[] = [];

            for (const item of cart.items) {
              const product = getProductById(item.productId);
              const price = product?.price ?? 0;
              total += price * item.quantity;
              orderItems.push({
                productId: item.productId,
                productName: product?.name ?? "Unknown",
                price,
                quantity: item.quantity,
              });
            }
            total = Math.round(total * 100) / 100;

            const orderId = `${aiConfig.orderTerm}-${Date.now()}`;
            const order = {
              orderId,
              items: orderItems,
              total,
              placedAt: new Date().toISOString(),
            };

            addOrderAndClearCart(accessToken, userId, order);
            return { orderId, total };
          } catch (e) {
            return { error: (e as Error).message };
          }
        },
      })
    );
  } catch (e) {
    console.warn("CIBA checkout tool unavailable:", (e as Error).message);
  }

  // -- FGA: profile edit with fine-grained authorization --
  try {
    const fgaAI = new Auth0AI.FGA();
    const withFGA = fgaAI.withFGA(getFGAParams());
    tools.edit_profile = withFGA(
      tool({
        description: aiConfig.toolDescriptions.editProfile,
        inputSchema: z.object({
          userId: z.string().describe("The user ID whose profile to update"),
          updates: z
            .record(z.unknown())
            .describe(
              "Object with fields to update (name, address, preferences)"
            ),
        }),
        execute: async ({
          userId,
          updates,
        }: {
          userId: string;
          updates: Record<string, unknown>;
        }) => {
          const updated = updateUser(
            userId,
            updates as Record<string, unknown>
          );
          if (!updated) return { error: "User not found" };
          return updated;
        },
      })
    );
  } catch (e) {
    console.warn("FGA edit_profile tool unavailable:", (e as Error).message);
  }

  // -- Token Vault: Google Calendar reminder --
  try {
    const currentRefreshToken = getAuthRefreshToken();
    console.log("[token-vault] setting up withTokenVault", {
      connection: "google-oauth2",
      hasRefreshToken: !!currentRefreshToken,
      refreshTokenLength: currentRefreshToken?.length,
    });
    const protect = auth0AI.withTokenVault({
      connection: "google-oauth2",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
      refreshToken: () => {
        const rt = getAuthRefreshToken();
        console.log("[token-vault] refreshToken callback invoked", {
          hasToken: !!rt,
          length: rt?.length,
        });
        return rt ?? undefined;
      },
    });
    tools.set_calendar_reminder = protect(
      tool({
        description: aiConfig.toolDescriptions.setCalendarReminder,
        inputSchema: z.object({
          productId: z
            .string()
            .describe(`The ${aiConfig.catalogTermSingular} ID to set a reminder for`),
          dropDate: z
            .string()
            .describe(
              `ISO 8601 date-time for the ${aiConfig.calendarEventTerm} (e.g. 2025-01-15T10:00:00-05:00)`
            ),
          notes: z
            .string()
            .optional()
            .describe("Optional notes to include in the calendar event"),
        }),
        execute: async ({
          productId,
          dropDate,
          notes,
        }: {
          productId: string;
          dropDate: string;
          notes?: string;
        }) => {
          console.log("[token-vault] set_calendar_reminder executing", { productId, dropDate, notes });
          let accessToken: string;
          try {
            accessToken = getAccessTokenFromTokenVault();
            console.log("[token-vault] got access token from vault, length:", (accessToken as any)?.length);
          } catch (vaultErr) {
            console.error("[token-vault] getAccessTokenFromTokenVault FAILED:", vaultErr);
            throw vaultErr;
          }
          const product = getProductById(productId);
          if (!product) return { error: `${aiConfig.catalogTermSingular} not found` };

          const startDateTime = dropDate;
          const endDateTime = new Date(
            new Date(dropDate).getTime() + 60 * 60 * 1000
          ).toISOString();
          const timeZone = getUserTimezone() || undefined;

          try {
            const eventPrefix = aiConfig.calendarEventPrefix || (product.type === "course" ? "Course" : "Product Drop");
            const result = await createCalendarEvent(accessToken, {
              summary: `${eventPrefix}: ${product.name}`,
              description:
                notes || `Reminder for ${product.name} — $${product.price}`,
              startDateTime,
              endDateTime,
              timeZone,
            });

            return {
              success: true,
              eventId: result.eventId,
              calendarLink: result.htmlLink,
              product: product.name,
              reminderTime: result.start,
            };
          } catch (calErr: any) {
            console.error("[token-vault] createCalendarEvent threw:", calErr.message);
            // Return a structured error so the LLM knows this is a
            // calendar API failure, NOT a Token Vault auth issue.
            return {
              error: "calendar_api_error",
              message: "Failed to create the calendar event. The Google account is connected but the Calendar API returned an error. Please try again later.",
              details: calErr.message,
            };
          }
        },
      })
    );
  } catch (e) {
    console.error("[token-vault] calendar tool setup FAILED:", {
      message: (e as Error).message,
      stack: (e as Error).stack,
      name: (e as Error).name,
    });
  }

  _authorizedTools = tools;
  return _authorizedTools;
}

// ---------------------------------------------------------------------------
// Combined tool set for use with streamText / generateText.
// Call getRetailTools() at request time (not at module level).
// ---------------------------------------------------------------------------
export function getRetailTools() {
  const role = getUserRole();

  // Base tools available to all users
  const baseTools: Record<string, Tool<any, any>> = {
    show_products: showProducts,
    get_product_details: getProductDetails,
    view_cart: viewCartTool,
    add_to_cart: addToCartTool,
    prepare_checkout: prepareCheckoutTool,
    view_profile: viewProfileTool,
    search_orders: searchOrdersTool,
    redirect_to_login: redirectToLoginTool,
    redirect_to_google_connect: redirectToGoogleConnectTool,
  };

  // Student-only learning tools
  if (role === "student") {
    baseTools.explain_concept = explainConceptTool;
    baseTools.create_practice_problems = createPracticeProblemsTool;
  }

  try {
    const authorizedTools = getAuthorizedTools();
    return { ...baseTools, ...authorizedTools };
  } catch (e) {
    console.warn(
      "Auth0AI tools could not be initialized (missing env vars?) — " +
        "checkout, profile edit, and calendar tools will be unavailable.",
      (e as Error).message
    );
    return baseTools;
  }
}
