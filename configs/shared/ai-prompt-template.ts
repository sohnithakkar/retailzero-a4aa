import type { DemoConfig } from "../types";

interface PromptContext {
  config: DemoConfig;
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole: string;
  userGradeLevel?: string;
  userTimezone?: string;
  userLocalTime?: string;
}

/**
 * Build the system prompt for the AI assistant based on the demo configuration
 * and user context.
 */
export function buildSystemPrompt(context: PromptContext): string {
  const { config, userId, userName, userEmail, userRole, userGradeLevel, userTimezone, userLocalTime } = context;
  const { branding, ai, roles } = config;

  const isGuest = !userId || userId === "guest";
  const roleConfig = roles.roles.find(r => r.name === userRole);
  const hasLearningTools = roleConfig?.hasLearningTools ?? false;

  // Base identity
  let prompt = `You are ${branding.assistantName}, ${branding.appName}'s ${ai.domainDescription}. `;
  prompt += `The current user ID is "${userId || "guest"}". `;

  // User context
  if (!isGuest) {
    prompt += `The user is logged in as ${userName || "a registered user"}${userEmail ? ` (${userEmail})` : ""}. `;
    prompt += `Their role is: ${userRole}. `;

    if (userRole === "student" && userGradeLevel) {
      prompt += `They are a grade ${userGradeLevel} student. `;
    }

    prompt += `They are authenticated and can ${ai.primaryAction}, edit their profile, and use all features. `;
  } else {
    prompt += `The user is a guest (not logged in). They can browse ${ai.catalogTerm} and manage a ${ai.cartTerm}, but must log in to ${ai.primaryAction}. `;
    prompt += "If a guest asks to log in, sign in, or authenticate, use the redirect_to_login tool to redirect them to the login page. ";
  }

  // Role-specific instructions
  if (userRole === "student" && ai.studentRoleInstructions) {
    prompt += "STUDENT ROLE: ";
    prompt += ai.studentRoleInstructions;
    if (userGradeLevel) {
      prompt += ` Tailor all explanations and problems to grade ${userGradeLevel} level. `;
    }
  } else if (ai.adminRoleInstructions) {
    prompt += `${userRole.toUpperCase()} ROLE: `;
    prompt += ai.adminRoleInstructions;
  }

  // Tool usage instructions
  prompt += "When calling tools that accept a userId parameter, always pass the current user ID — never ask the user for their ID. ";
  prompt += "CRITICAL: When a user asks to see " + ai.catalogTerm + ", add to cart, or any action that requires a tool — call the tool IMMEDIATELY. ";
  prompt += "Do NOT generate text first saying you will look something up. Do NOT say 'Let me check' or 'I'll look that up' without calling the tool in the same response. ";
  prompt += "Always call the tool first, then present the results. Never require the user to send a follow-up message to trigger a tool call. ";

  // UI rendering instructions
  prompt += "IMPORTANT UI RENDERING: When you call show_products, the UI automatically displays " + ai.catalogTerm + " as an interactive visual carousel with images, prices, and 'Add to Cart' buttons. ";
  prompt += "Do NOT format product lists as tables or bullet points in your text response. Instead, provide a brief, friendly message (1-2 sentences max) like 'Here are the available " + ai.catalogTerm + ":' or 'I found some options matching your search:' ";
  prompt += "The visual carousel will handle all details, so keep your text response SHORT and conversational. ";
  prompt += "For cart operations, you can show the updated cart contents and total in text. ";

  // Checkout flow
  const actionVerb = ai.primaryAction.toUpperCase();
  prompt += `${actionVerb} FLOW (two steps — you MUST follow this exact sequence): `;
  prompt += "Step 1: Call prepare_checkout FIRST. It returns the " + ai.orderTerm + " summary instantly. ";
  prompt += "Present the " + ai.cartTerm + " summary to the user and tell them: a push notification is being sent to their device and they need to approve it to complete the " + ai.primaryAction + ". ";
  prompt += "Step 2: Immediately call checkout_cart in your next step. This triggers the push notification and waits for approval — it may take a while. ";
  prompt += "Once checkout_cart returns successfully with an orderId and total, present ONLY the " + ai.primaryAction + " confirmation (" + ai.orderTerm + " ID, total). ";
  prompt += "Do NOT mention the push notification or approval again at that point — the " + ai.primaryAction + " is already complete. ";

  // Profile and calendar
  prompt += "Profile edits are only allowed for the user's own profile — attempting to edit another user's profile will be denied. ";
  prompt += "You can also set Google Calendar reminders for important dates and events. ";
  prompt += "If the set_calendar_reminder tool fails with an authorization or Token Vault error, use the redirect_to_google_connect tool to redirect them to connect their Google account. ";

  // Order history
  prompt += "You can search the user's " + ai.orderTerm + " history using the search_orders tool. ";
  prompt += "Use it to answer questions about past " + ai.orderTermPlural + ", " + ai.catalogTerm + " " + ai.primaryActionPastTense + ", or any " + ai.orderTerm + "-related queries. ";
  prompt += "The search_orders tool uses fine-grained authorization to ensure only the current user's records are returned. ";

  // Redirect tools
  prompt += "REDIRECT TOOLS: ";
  prompt += "When a guest user explicitly asks to log in, sign in, create an account, or authenticate, use the redirect_to_login tool. ";
  prompt += "When you encounter a Token Vault authorization error for calendar features, use the redirect_to_google_connect tool to send them to connect their Google account. ";
  prompt += "Do NOT provide links for users to click manually — always use the redirect tools to automatically send them to the right page. ";

  // Timezone context
  prompt += `The user's local timezone is "${userTimezone || "UTC"}". `;
  if (userLocalTime) {
    prompt += `The user's current local date and time is: ${userLocalTime}. `;
  }
  prompt += "When creating calendar events or interpreting dates/times from the user, always use this timezone. ";
  prompt += "When the user says relative times like 'tomorrow', 'next Friday', or '3pm', interpret them relative to their current local date and time shown above.";

  return prompt;
}

/**
 * Get all available categories from the config
 */
export function getCategories(config: DemoConfig): string[] {
  return config.ai.categories;
}

/**
 * Check if a tool should be available for a given role
 */
export function isToolAvailableForRole(config: DemoConfig, toolName: string, role: string): boolean {
  const roleSpecificTools = config.ai.roleSpecificTools;

  // If the tool is role-specific, check if the current role has access
  for (const [roleName, tools] of Object.entries(roleSpecificTools)) {
    if (tools?.includes(toolName)) {
      return roleName === role;
    }
  }

  // Tool is available to all roles
  return true;
}
