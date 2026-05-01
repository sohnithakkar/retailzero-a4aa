import type { DemoConfig } from "../types";
import { branding } from "./branding";
import { landing } from "./content";
import { navigation } from "./navigation";
import { roles } from "./roles";
import { productTypes } from "./product-types";
import { aiConfig } from "./ai-config";

export const workZeroConfig: DemoConfig = {
  id: "work-zero",
  branding,
  landing,
  navigation,
  roles,
  productTypes,
  ai: aiConfig,
  dataPath: "configs/work-zero/data",
};

export default workZeroConfig;
