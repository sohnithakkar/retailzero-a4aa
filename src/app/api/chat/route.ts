import {
  streamText,
  stepCountIs,
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { setAIContext } from "@auth0/ai-vercel";
import { withInterruptions, errorSerializer } from "@auth0/ai-vercel/interrupts";

import { getRetailTools, setGuestCart, setAuthAccessToken, setAuthRefreshToken, setUserTimezone, setUserRole, setUserGradeLevel } from "@/lib/auth0-ai";
import { auth0 } from "@/lib/auth/auth0";
import { getUser } from "@/lib/data/users";
import { getAIPrompt, getDefaultRole } from "@/lib/config";

// Allow up to 5 minutes for long-running CIBA approval flows where the
// server polls Auth0 while the user approves on their device.
export const maxDuration = 300;

const anthropic = createAnthropic({
  baseURL: `${process.env.ANTHROPIC_BASE_URL}/v1`,
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.LITELLM_KEY,
});

const chatModel = anthropic("claude-4-6-opus");

export async function POST(request: Request) {
  const {
    messages,
    threadId,
    userId,
    userName,
    userEmail,
    guestCart,
    userTimezone,
    userLocalTime,
    userRole,
    userGradeLevel,
  }: {
    messages: UIMessage[];
    threadId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
    guestCart?: { productId: string; quantity: number; addedAt: string }[];
    userTimezone?: string;
    userLocalTime?: string;
    userRole?: "student" | "admin";
    userGradeLevel?: string;
  } = await request.json();

  // Seed the in-memory guest cart so AI tools can read/write it
  if (!userId || userId === "guest") {
    setGuestCart(guestCart ?? []);
  }

  // Store user timezone so calendar tools can use it
  if (userTimezone) {
    setUserTimezone(userTimezone);
  }

  // Set user role and grade level for role-based tool access
  // Default to the demo's default role if not specified
  const effectiveRole = userRole || getDefaultRole();
  setUserRole(effectiveRole as "student" | "admin");
  if (userGradeLevel) {
    setUserGradeLevel(userGradeLevel);
  }

  // Provide Management API access token and refresh token so AI tools can
  // read/write user_metadata and exchange tokens via Token Vault.
  if (userId && userId !== "guest") {
    try {
      const session = await auth0.getSession();
      console.log("[chat] session check:", {
        hasSession: !!session,
        hasUser: !!session?.user,
        userSub: session?.user?.sub,
        tokenSetKeys: Object.keys(session?.tokenSet || {}),
        hasRefreshToken: !!session?.tokenSet?.refreshToken,
      });
      if (session?.user) {
        const tokenResult = await auth0.getAccessToken();
        console.log("[chat] access token obtained, length:", tokenResult.token?.length);
        setAuthAccessToken(tokenResult.token);
        if (session.tokenSet?.refreshToken) {
          setAuthRefreshToken(session.tokenSet.refreshToken);
          console.log("[chat] refresh token available, length:", session.tokenSet.refreshToken.length);
        } else {
          console.warn("[chat] no refresh token in session. tokenSet keys:", Object.keys(session.tokenSet || {}));
        }
      }
    } catch (err) {
      console.error("[chat] session/token retrieval failed:", err);
    }
  }

  setAIContext({
    threadID: threadId ?? "default",
    ...(userId ? { userID: userId } : {}),
  });

  const tools = getRetailTools();

  // Build the system prompt from config
  const systemPrompt = getAIPrompt({
    userId: userId || "guest",
    userName,
    userEmail,
    userRole: effectiveRole,
    userGradeLevel,
    userTimezone,
    userLocalTime,
  });

  const stream = createUIMessageStream({
    execute: withInterruptions(
      async ({ writer }) => {
        const result = streamText({
          model: chatModel,
          system: systemPrompt,
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(5),
        });

        await writer.merge(result.toUIMessageStream());
      },
      { messages, tools }
    ),
    onError: errorSerializer(),
  });

  return createUIMessageStreamResponse({ stream });
}
