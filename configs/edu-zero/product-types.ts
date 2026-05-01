import type { ProductTypeConfig } from "../types";

export const productTypes: ProductTypeConfig = {
  types: [
    {
      type: "course",
      label: "Course",
      labelPlural: "Courses",
      verb: "Enroll",
      verbPastTense: "Enrolled",
      priceLabel: "Free",
      showPrice: false,
      additionalFields: ["credits", "schedule"],
      categories: [
        "Mathematics",
        "Science",
        "History",
        "Technology",
        "Arts",
        "Health",
        "Language Arts",
      ],
      pageTitle: "Courses",
      pageDescription: "Enroll in courses to earn credits toward your degree",
    },
    {
      type: "software",
      label: "Software",
      labelPlural: "School Software",
      verb: "Purchase",
      verbPastTense: "Purchased",
      priceLabel: "Price",
      showPrice: true,
      additionalFields: ["price"],
      categories: [
        "Administration",
        "Assessment",
        "Communication",
        "Curriculum",
        "Analytics",
      ],
      pageTitle: "School Software",
      pageDescription: "Enterprise solutions for school administration and management",
    },
  ],
};
