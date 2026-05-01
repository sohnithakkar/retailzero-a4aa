import type { AIPromptConfig } from "../types";

export const aiConfig: AIPromptConfig = {
  domainDescription: "AI career development assistant",
  primaryAction: "enroll",
  primaryActionPastTense: "enrolled",
  catalogTerm: "programs and career pathways",
  catalogTermSingular: "program or pathway",
  cartTerm: "saved programs",
  orderTerm: "enrollment",
  orderTermPlural: "enrollments",
  calendarEventTerm: "class session or deadline",
  calendarEventPrefix: "Program",
  chatPlaceholder: "Ask about programs, career paths, or education benefits...",
  chatWelcomeMessage: "Hi! I'm Zero, your career development assistant. How can I help you today?",
  studentRoleInstructions:
    "Help learners discover education programs, explore career pathways, and make enrollment decisions. " +
    "Learners can browse PROGRAMS (degrees, certificates, bootcamps) and PATHWAYS (role-aligned learning sequences). " +
    "When a learner asks about career growth, use the career planning tools to provide guidance. " +
    "Learners have access to career development tools: " +
    "- explain_concept: Explain career-related topics, skills, or industry concepts " +
    "- create_practice_problems: Generate practice questions for certification prep or skill assessment " +
    "When a learner asks for help understanding something or wants practice, use these tools. " +
    "Emphasize that programs are employer-sponsored with no upfront costs. Be supportive and encouraging about career growth.",
  adminRoleInstructions:
    "Help HR administrators manage education benefits, track enrollment metrics, and understand program outcomes. " +
    "Admins can browse all programs and pathways, view enrollment reports, and manage employee access. " +
    "Focus on ROI, skills alignment, and workforce development outcomes. " +
    "Admins do NOT have access to learner tools (explain_concept, create_practice_problems).",
  toolDescriptions: {
    showProducts: "Browse education programs and career pathways. Can filter by search query and/or category.",
    getProductDetails: "Get detailed information about a program or pathway by ID.",
    viewCart: "View saved programs the learner is interested in.",
    addToCart: "Save a program or pathway for later review.",
    prepareCheckout: "Preview enrollment details before confirming.",
    checkoutCart: "Complete enrollment in selected programs.",
    viewProfile: "View the current learner or administrator profile.",
    editProfile: "Update profile information (name, career goals, preferences).",
    searchOrders: "Search enrollment history and program progress.",
    setCalendarReminder: "Set reminders for class sessions, deadlines, or milestones.",
    explainConcept: "Explain a career concept, skill, or industry topic to the learner.",
    createPracticeProblems: "Generate practice questions for certification prep or skill assessment.",
  },
  categories: [
    "Certificates",
    "Associate Degrees",
    "Bachelor's Degrees",
    "Master's Degrees",
    "Bootcamps",
    "Professional Development",
    "Foundational Skills",
    "Healthcare",
    "Technology",
    "Business & Finance",
    "Manufacturing",
    "Logistics",
    "Retail Management",
    "Human Resources",
  ],
  roleSpecificTools: {
    student: ["explain_concept", "create_practice_problems"],
  },
};
