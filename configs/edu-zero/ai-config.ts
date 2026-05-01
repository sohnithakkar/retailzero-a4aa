import type { AIPromptConfig } from "../types";

export const aiConfig: AIPromptConfig = {
  domainDescription: "AI education assistant",
  primaryAction: "enroll",
  primaryActionPastTense: "enrolled",
  catalogTerm: "courses and software solutions",
  catalogTermSingular: "course or software solution",
  cartTerm: "enrollment cart",
  orderTerm: "enrollment",
  orderTermPlural: "enrollments",
  calendarEventTerm: "class or deadline",
  calendarEventPrefix: "Course",
  chatPlaceholder: "Ask about courses, enrollment, or school tools...",
  chatWelcomeMessage: "Hi! I'm Zero, your education assistant. How can I help you today?",
  studentRoleInstructions:
    "Help students find and enroll in courses, get homework help, and manage their learning. " +
    "Students can browse COURSES (not software), add courses to their cart, and enroll. " +
    "When showing products to students, filter to show only courses (type='course') unless they specifically ask about software. " +
    "Students have access to learning tools: " +
    "- explain_concept: Explain topics at their grade level with examples " +
    "- create_practice_problems: Generate practice problems tailored to their grade " +
    "When a student asks for help understanding something or wants practice problems, use these tools. " +
    "After calling explain_concept or create_practice_problems, use the returned instructions to generate " +
    "an age-appropriate explanation or set of practice problems. Be encouraging and supportive.",
  adminRoleInstructions:
    "Help administrators find and purchase software solutions for their school or district. " +
    "Admins can browse SOFTWARE solutions (not courses), add them to cart, and purchase. " +
    "When showing products to admins, filter to show only software (type='software') unless they specifically ask about courses. " +
    "Admins do NOT have access to student learning tools (explain_concept, create_practice_problems).",
  toolDescriptions: {
    showProducts: "Browse courses and education software solutions. Can filter by search query and/or category.",
    getProductDetails: "Get detailed information about a course or software module by ID.",
    viewCart: "View courses and solutions in the enrollment cart.",
    addToCart: "Add a course or software solution to the enrollment cart.",
    prepareCheckout: "Preview the enrollment cart before completing registration.",
    checkoutCart: "Complete enrollment and confirm registration.",
    viewProfile: "View the current student or educator profile information.",
    editProfile: "Update student or educator profile information (name, address, preferences).",
    searchOrders: "Search enrollment history and past registrations.",
    setCalendarReminder: "Set reminders for classes, assignments, or deadlines.",
    explainConcept: "Explain a concept or topic to the student at their grade level.",
    createPracticeProblems: "Generate practice problems or questions for a student to work on.",
  },
  categories: [
    "Mathematics",
    "Science",
    "History",
    "Technology",
    "Arts",
    "Health",
    "Language Arts",
    "Administration",
    "Assessment",
    "Communication",
    "Curriculum",
    "Analytics",
  ],
  roleSpecificTools: {
    student: ["explain_concept", "create_practice_problems"],
  },
};
