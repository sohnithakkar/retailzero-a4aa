import type { NavigationConfig } from "../types";

export const navigation: NavigationConfig = {
  primaryNav: [
    {
      label: "Courses",
      href: "/courses",
      icon: "BookOpen",
    },
    {
      label: "Software",
      href: "/software",
      icon: "Laptop",
    },
  ],
  authNav: [
    {
      label: "Cart",
      href: "/cart",
      icon: "ShoppingCart",
    },
    {
      label: "Orders",
      href: "/orders",
      icon: "Package",
      requiresAuth: true,
    },
    {
      label: "Account",
      href: "/account",
      icon: "User",
      requiresAuth: true,
    },
  ],
  guestNav: [
    {
      label: "Cart",
      href: "/cart",
      icon: "ShoppingCart",
      showWhenGuest: true,
    },
    {
      label: "Login",
      href: "/login",
      icon: "LogIn",
      showWhenGuest: true,
    },
  ],
};
