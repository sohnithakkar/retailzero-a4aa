"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/provider";
import { getGuestCart } from "@/lib/cart/guest-cart";
import {
  ShoppingCart,
  User,
  LogIn,
  LogOut,
  GraduationCap,
  ShoppingBag,
  Heart,
  Building2,
  Package,
  BookOpen,
  Laptop,
  Grid,
} from "lucide-react";
import { getBranding, getNavigation } from "@/lib/config";

const logoIconMap = {
  GraduationCap,
  ShoppingBag,
  Heart,
  Building2,
};

const navIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ShoppingCart,
  User,
  LogIn,
  LogOut,
  Package,
  BookOpen,
  Laptop,
  Grid,
};

export function Header() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [itemCount, setItemCount] = useState(0);
  const branding = getBranding();
  const navigation = getNavigation();

  const LogoIcon = logoIconMap[branding.logoIcon as keyof typeof logoIconMap];

  const refreshCount = useCallback(async () => {
    if (authLoading) return;
    if (isAuthenticated) {
      try {
        const res = await fetch("/api/cart");
        if (res.ok) {
          const cart = await res.json();
          const count = (cart.items || []).reduce(
            (sum: number, item: { quantity: number }) => sum + item.quantity,
            0
          );
          setItemCount(count);
        }
      } catch {
        setItemCount(0);
      }
    } else {
      const items = getGuestCart();
      setItemCount(items.reduce((sum, item) => sum + item.quantity, 0));
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    refreshCount();

    // Listen for storage events (guest cart changes from other tabs)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "guest-cart") refreshCount();
    };
    window.addEventListener("storage", onStorage);

    // Listen for cart-updated events (from AI chat widget syncing localStorage)
    const onCartUpdated = () => refreshCount();
    window.addEventListener("cart-updated", onCartUpdated);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("cart-updated", onCartUpdated);
    };
  }, [refreshCount]);

  return (
    <header className="border-b border-gray-200 bg-white text-gray-900">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <LogoIcon className="h-6 w-6" style={{ color: branding.primaryColor }} />
          <span>
            {branding.appNameSplit.prefix}
            <span style={{ color: branding.primaryColor }}>
              {branding.appNameSplit.highlight}
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {/* Primary Navigation */}
          {navigation.primaryNav.map((item) => {
            const Icon = navIconMap[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </Link>
            );
          })}

          {/* Cart (always visible) */}
          <Link
            href="/cart"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 relative"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
            {itemCount > 0 && (
              <span
                className="absolute -top-2 -right-3 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                style={{ backgroundColor: branding.primaryColor }}
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>

          {/* Authenticated Navigation */}
          {isAuthenticated ? (
            <>
              {navigation.authNav
                .filter((item) => item.requiresAuth && item.href !== "/cart")
                .map((item) => {
                  const Icon = navIconMap[item.icon];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label === "Account" ? user?.name || "Account" : item.label}
                    </Link>
                  );
                })}
              <button
                onClick={() => logout()}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              <LogIn className="h-4 w-4" />
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
