import type { LandingContent } from "../types";

export const landing: LandingContent = {
  hero: {
    headline: "Grow your career with",
    highlightedWord: "WorkZero",
    subheadline:
      "Access employer-sponsored education programs, certificates, and degrees. Get personalized guidance from AI and coaching support to advance your career.",
  },
  ctas: [
    {
      label: "Browse Programs",
      href: "/products",
      variant: "primary",
    },
    {
      label: "View Categories",
      href: "/categories",
      variant: "secondary",
    },
  ],
  featuresTitle: "Your Career Development Partner",
  features: [
    {
      icon: "Bot",
      title: "AI Career Coach",
      description:
        "Get personalized program recommendations and career guidance powered by AI, available 24/7.",
    },
    {
      icon: "Shield",
      title: "Employer-Sponsored",
      description:
        "Access tuition-free programs funded by your employer with no upfront costs.",
    },
    {
      icon: "Calendar",
      title: "Flexible Learning",
      description:
        "Balance work and education with programs designed for working professionals.",
    },
    {
      icon: "Package",
      title: "Recognized Credentials",
      description:
        "Earn certificates, degrees, and credentials from accredited institutions.",
    },
  ],
};
