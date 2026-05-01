import type { LandingContent } from "../types";

export const landing: LandingContent = {
  hero: {
    headline: "Shop smarter with",
    highlightedWord: "RetailZero",
    subheadline:
      "AI-powered shopping experience with enterprise-grade security. Discover products through natural conversation, checkout with confidence using Auth0 CIBA step-up authentication, and enjoy fine-grained access controls that keep your data safe.",
  },
  ctas: [
    {
      label: "Browse Products",
      href: "/products",
      variant: "primary",
    },
    {
      label: "View Categories",
      href: "/categories",
      variant: "secondary",
    },
  ],
  featuresTitle: "About RetailZero",
  features: [
    {
      icon: "Bot",
      title: "AI Shopping Assistant",
      description:
        "Discover products through a conversational AI assistant that understands exactly what you're looking for.",
    },
    {
      icon: "Shield",
      title: "Secure Checkout",
      description:
        "Complete purchases with CIBA step-up approval, ensuring every transaction is verified on a trusted device.",
    },
    {
      icon: "Lock",
      title: "Privacy Protected",
      description:
        "FGA controls protect your personal data and order history, giving you control over your information.",
    },
    {
      icon: "Truck",
      title: "Fast Delivery",
      description:
        "Track your orders in real-time and get notifications when your package is on its way.",
    },
  ],
};
