"use client";

import Link from "next/link";
import { BookOpen, Laptop } from "lucide-react";
import { getConfig, getBranding } from "@/lib/config";
import { ProductGrid } from "@/components/products/product-grid";
import { useState, useEffect } from "react";
import type { Product } from "@/lib/data/products";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const config = getConfig();
  const branding = getBranding();

  // For EduZero (education), show the course/software selector
  // For RetailZero (retail), show all products directly
  const isEducation = config.id === "edu-zero";

  useEffect(() => {
    // Only fetch products for RetailZero
    if (!isEducation) {
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => {
          setProducts(data);
          setLoading(false);
        })
        .catch(() => {
          setProducts([]);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [isEducation]);

  if (isEducation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Solutions</h1>
          <p className="mt-2 text-muted-foreground">
            Choose from our educational offerings
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Link
            href="/courses"
            className="group rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-lg"
            style={{ borderColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = branding.primaryColor)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
          >
            <div className="p-8 text-center">
              <div
                className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${branding.primaryColor}15` }}
              >
                <BookOpen className="h-8 w-8" style={{ color: branding.primaryColor }} />
              </div>
              <h2 className="text-2xl font-bold transition-colors">
                Courses
              </h2>
              <p className="mt-2 text-muted-foreground">
                Enroll in courses to earn credits toward your degree. Browse our
                catalog of mathematics, science, arts, and more.
              </p>
              <div
                className="mt-4 inline-flex items-center font-medium"
                style={{ color: branding.primaryColor }}
              >
                Browse Courses
                <svg
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>

          <Link
            href="/software"
            className="group rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-lg"
            style={{ borderColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = branding.primaryColor)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
          >
            <div className="p-8 text-center">
              <div
                className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${branding.primaryColor}15` }}
              >
                <Laptop className="h-8 w-8" style={{ color: branding.primaryColor }} />
              </div>
              <h2 className="text-2xl font-bold transition-colors">
                School Software
              </h2>
              <p className="mt-2 text-muted-foreground">
                Enterprise solutions for administrators. Manage students, grades,
                attendance, and school operations.
              </p>
              <div
                className="mt-4 inline-flex items-center font-medium"
                style={{ color: branding.primaryColor }}
              >
                Browse Software
                <svg
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  // For RetailZero, show all products
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="mt-2 text-muted-foreground">
          Browse our selection of products
        </p>
      </div>
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
