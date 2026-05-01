import type { RoleConfig } from "../types";

export const roles: RoleConfig = {
  roles: [
    {
      name: "student",
      label: "Student",
      description: "Students can browse and enroll in courses, get homework help, and manage their learning.",
      canBrowse: "course",
      hasLearningTools: true,
      additionalFields: ["gradeLevel"],
    },
    {
      name: "admin",
      label: "Administrator",
      description: "Administrators can browse and purchase software solutions for their school or district.",
      canBrowse: "software",
      hasLearningTools: false,
    },
  ],
  defaultRole: "student",
  gradeLevels: ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
};
