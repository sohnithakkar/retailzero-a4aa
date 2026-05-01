import type { DemoConfig } from "./types";
import { eduZeroConfig } from "./edu-zero";
import { retailZeroConfig } from "./retail-zero";

// Registry of all available demo configurations
const configs: Record<string, DemoConfig> = {
  "edu-zero": eduZeroConfig,
  "retail-zero": retailZeroConfig,
};

// Cache the config after first load
let _cachedConfig: DemoConfig | null = null;

/**
 * Get the current demo configuration based on NEXT_PUBLIC_DEMO environment variable.
 * Defaults to "edu-zero" if not set.
 */
export function getConfig(): DemoConfig {
  if (_cachedConfig) return _cachedConfig;

  const demoId = process.env.NEXT_PUBLIC_DEMO || "edu-zero";
  const config = configs[demoId];

  if (!config) {
    console.warn(
      `Unknown demo "${demoId}", falling back to edu-zero. ` +
      `Available demos: ${Object.keys(configs).join(", ")}`
    );
    _cachedConfig = configs["edu-zero"];
    return _cachedConfig;
  }

  _cachedConfig = config;
  return _cachedConfig;
}

/**
 * Get all available demo IDs
 */
export function getAvailableDemos(): string[] {
  return Object.keys(configs);
}

/**
 * Register a new demo configuration (useful for dynamically loaded configs)
 */
export function registerConfig(config: DemoConfig): void {
  configs[config.id] = config;
}

// Re-export types for convenience
export * from "./types";
