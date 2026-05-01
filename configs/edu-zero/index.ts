import type { DemoConfig } from "../types";
import { branding } from "./branding";
import { landing } from "./content";
import { navigation } from "./navigation";
import { roles } from "./roles";
import { productTypes } from "./product-types";
import { aiConfig } from "./ai-config";

export const eduZeroConfig: DemoConfig = {
  id: "edu-zero",
  branding,
  landing,
  navigation,
  roles,
  productTypes,
  ai: aiConfig,
  dataPath: "configs/edu-zero/data",
};

export default eduZeroConfig;
