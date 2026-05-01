import type { LandingContent } from "../types";

export const landing: LandingContent = {
  hero: {
    headline: "Learn smarter with",
    highlightedWord: "EduZero",
    subheadline:
      "AI-powered education platform with enterprise-grade security for students, educators, and administrators. Discover courses through natural conversation, enroll with confidence using Auth0 CIBA step-up authentication, and enjoy fine-grained access controls that keep your data safe.",
  },
  ctas: [
    {
      label: "Browse Courses",
      href: "/courses",
      variant: "primary",
    },
    {
      label: "School Software",
      href: "/software",
      variant: "secondary",
    },
  ],
  featuresTitle: "About EduZero",
  features: [
    {
      icon: "Bot",
      title: "AI Education Assistant",
      description:
        "Discover courses and tools through a conversational AI assistant that understands what you need.",
    },
    {
      icon: "Shield",
      title: "Secure Enrollment",
      description:
        "Complete registrations with CIBA step-up approval, ensuring every enrollment is verified on a trusted device.",
    },
    {
      icon: "Lock",
      title: "Role-Based Access",
      description:
        "FGA controls protect student records and administrative data, giving everyone exactly the permissions they need.",
    },
    {
      icon: "Calendar",
      title: "Calendar Integration",
      description:
        "Never miss a class, assignment, or deadline with integrated Google Calendar reminders.",
    },
  ],
};
