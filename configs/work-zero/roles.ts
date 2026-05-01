import type { RoleConfig } from "../types";

export const roles: RoleConfig = {
  roles: [
    {
      name: "learner",
      label: "Learner",
      description: "Employee exploring education benefits and career growth",
      canBrowse: "all",
      hasLearningTools: true,
      additionalFields: ["currentRole", "careerGoal"],
    },
    {
      name: "admin",
      label: "HR Administrator",
      description: "Manage employee education benefits and track program outcomes",
      canBrowse: "all",
      hasLearningTools: false,
    },
  ],
  defaultRole: "learner",
  careerLevels: [
    "Entry Level",
    "Individual Contributor",
    "Team Lead",
    "Manager",
    "Senior Manager",
    "Director",
    "Executive",
  ],
};
