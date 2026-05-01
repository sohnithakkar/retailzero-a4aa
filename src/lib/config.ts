import { getConfig } from "../../configs";
import { buildSystemPrompt } from "../../configs/shared/ai-prompt-template";
import type {
  DemoConfig,
  BrandingConfig,
  LandingContent,
  NavigationConfig,
  RoleConfig,
  ProductTypeConfig,
  AIPromptConfig,
  ProductTypeDefinition,
} from "../../configs/types";

// Re-export getConfig for direct access
export { getConfig } from "../../configs";

/**
 * Get branding configuration
 */
export function getBranding(): BrandingConfig {
  return getConfig().branding;
}

/**
 * Get landing page content
 */
export function getLanding(): LandingContent {
  return getConfig().landing;
}

/**
 * Get navigation configuration
 */
export function getNavigation(): NavigationConfig {
  return getConfig().navigation;
}

/**
 * Get role configuration
 */
export function getRoles(): RoleConfig {
  return getConfig().roles;
}

/**
 * Get product type configuration
 */
export function getProductTypes(): ProductTypeConfig {
  return getConfig().productTypes;
}

/**
 * Get AI configuration
 */
export function getAIConfig(): AIPromptConfig {
  return getConfig().ai;
}

/**
 * Get config for a specific product type
 */
export function getProductTypeConfig(type: string): ProductTypeDefinition | undefined {
  return getConfig().productTypes.types.find((t) => t.type === type);
}

/**
 * Get the data path for the current demo
 */
export function getDataPath(): string {
  return getConfig().dataPath;
}

/**
 * Build the AI system prompt with user context
 */
export function getAIPrompt(context: {
  userId: string;
  userName?: string;
  userEmail?: string;
  userRole: string;
  userGradeLevel?: string;
  userTimezone?: string;
  userLocalTime?: string;
}): string {
  return buildSystemPrompt({
    config: getConfig(),
    ...context,
  });
}

/**
 * Get all categories from the current demo config
 */
export function getCategories(): string[] {
  return getConfig().ai.categories;
}

/**
 * Get the primary color in various formats
 */
export function getPrimaryColor(): { hex: string; hsl: string } {
  const branding = getBranding();
  return {
    hex: branding.primaryColor,
    hsl: branding.primaryColorHSL,
  };
}

/**
 * Check if the current demo has a specific role
 */
export function hasRole(roleName: string): boolean {
  return getConfig().roles.roles.some((r) => r.name === roleName);
}

/**
 * Get the default role for the current demo
 */
export function getDefaultRole(): string {
  return getConfig().roles.defaultRole;
}

// Re-export types
export type {
  DemoConfig,
  BrandingConfig,
  LandingContent,
  NavigationConfig,
  RoleConfig,
  ProductTypeConfig,
  AIPromptConfig,
  ProductTypeDefinition,
};
