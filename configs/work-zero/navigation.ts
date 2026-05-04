import type { NavigationConfig } from "../types";

export const navigation: NavigationConfig = {
  primaryNav: [
    {
      label: "Programs",
      href: "/products",
      icon: "BookOpen",
    },
    {
      label: "Categories",
      href: "/categories",
      icon: "Grid",
    },
  ],
  authNav: [
    {
      label: "My Enrollments",
      href: "/orders",
      icon: "ClipboardList",
      requiresAuth: true,
    },
    {
      label: "Saved Programs",
      href: "/cart",
      icon: "Bookmark",
      requiresAuth: false,
    },
    {
      label: "Profile",
      href: "/account",
      icon: "User",
      requiresAuth: true,
    },
  ],
  guestNav: [
    {
      label: "Sign In",
      href: "/api/auth/login",
      icon: "LogIn",
      showWhenGuest: true,
    },
  ],
};
