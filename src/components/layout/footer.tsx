"use client";

import { getBranding } from "@/lib/config";

export function Footer() {
  const branding = getBranding();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto flex h-14 items-center justify-center px-4">
        <p className="text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {branding.appName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
