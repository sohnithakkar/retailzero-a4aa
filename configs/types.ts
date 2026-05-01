// TypeScript interfaces for the multi-demo configuration system

export interface BrandingConfig {
  appName: string;
  appNameSplit: {
    prefix: string;
    highlight: string;
  };
  assistantName: string;
  tagline: string;
  description: string;
  primaryColor: string;
  primaryColorHSL: string;
  gradientFrom: string;
  logoIcon: "GraduationCap" | "ShoppingBag" | "Heart" | "Building2";
}

export interface CTAButton {
  label: string;
  href: string;
  variant: "primary" | "secondary";
}

export interface FeatureCard {
  icon: "Bot" | "Shield" | "Lock" | "Calendar" | "Truck" | "CreditCard" | "Package" | "Headphones";
  title: string;
  description: string;
}

export interface LandingContent {
  hero: {
    headline: string;
    highlightedWord: string;
    subheadline: string;
  };
  ctas: CTAButton[];
  featuresTitle: string;
  features: FeatureCard[];
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  requiresAuth?: boolean;
  showWhenGuest?: boolean;
}

export interface NavigationConfig {
  primaryNav: NavItem[];
  authNav: NavItem[];
  guestNav: NavItem[];
}

export interface RoleDefinition {
  name: string;
  label: string;
  description: string;
  canBrowse: "course" | "software" | "all";
  hasLearningTools: boolean;
  additionalFields?: string[];
}

export interface RoleConfig {
  roles: RoleDefinition[];
  defaultRole: string;
  gradeLevels?: string[];
  careerLevels?: string[];
}

export interface ProductTypeDefinition {
  type: string;
  label: string;
  labelPlural: string;
  verb: string;
  verbPastTense: string;
  priceLabel: string;
  showPrice: boolean;
  additionalFields: string[];
  categories: string[];
  pageTitle: string;
  pageDescription: string;
}

export interface ProductTypeConfig {
  types: ProductTypeDefinition[];
}

export interface AIPromptConfig {
  domainDescription: string;
  primaryAction: string;
  primaryActionPastTense: string;
  catalogTerm: string;
  catalogTermSingular: string;
  cartTerm: string;
  orderTerm: string;
  orderTermPlural: string;
  calendarEventTerm: string;
  calendarEventPrefix: string;
  chatPlaceholder: string;
  chatWelcomeMessage: string;
  studentRoleInstructions: string;
  adminRoleInstructions: string;
  toolDescriptions: {
    showProducts: string;
    getProductDetails: string;
    viewCart: string;
    addToCart: string;
    prepareCheckout: string;
    checkoutCart: string;
    viewProfile: string;
    editProfile: string;
    searchOrders: string;
    setCalendarReminder: string;
    explainConcept?: string;
    createPracticeProblems?: string;
  };
  categories: string[];
  roleSpecificTools: {
    student?: string[];
    admin?: string[];
  };
}

export interface DemoConfig {
  id: string;
  branding: BrandingConfig;
  landing: LandingContent;
  navigation: NavigationConfig;
  roles: RoleConfig;
  productTypes: ProductTypeConfig;
  ai: AIPromptConfig;
  dataPath: string;
}
