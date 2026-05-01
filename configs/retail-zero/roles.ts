import type { RoleConfig } from "../types";

export const roles: RoleConfig = {
  roles: [
    {
      name: "customer",
      label: "Customer",
      description: "Customers can browse products, add items to cart, and make purchases.",
      canBrowse: "all",
      hasLearningTools: false,
    },
    {
      name: "admin",
      label: "Administrator",
      description: "Administrators can manage products, view all orders, and access analytics.",
      canBrowse: "all",
      hasLearningTools: false,
    },
  ],
  defaultRole: "customer",
};
