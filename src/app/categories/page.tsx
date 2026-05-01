"use client";

import Link from "next/link";
import { getBranding, getAIConfig } from "@/lib/config";

export default function CategoriesPage() {
  const branding = getBranding();
  const aiConfig = getAIConfig();
  const categories = aiConfig.categories;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="mt-2 text-muted-foreground">
          Browse products by category
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {categories.map((category) => (
          <Link
            key={category}
            href={`/products?category=${encodeURIComponent(category)}`}
            className="group rounded-lg border bg-card p-6 text-center shadow-sm transition-all hover:shadow-md"
            style={{ borderColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = branding.primaryColor)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
          >
            <h3
              className="font-semibold transition-colors"
              style={{ color: "inherit" }}
            >
              {category}
            </h3>
          </Link>
        ))}
      </div>
    </div>
  );
}
