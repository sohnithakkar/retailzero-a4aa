"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Star, Clock, BookOpen } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/provider";
import { addGuestCartItem } from "@/lib/cart/guest-cart";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  rating: number;
  type?: "course" | "software";
  credits?: number;
  schedule?: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`/api/products?q=`)
      .then((res) => res.json())
      .then((products: Product[]) => {
        const found = products.find((p) => p.id === params.id);
        setProduct(found || null);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleAddToCart = async () => {
    if (!product) return;
    setAdding(true);
    try {
      if (isAuthenticated) {
        await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, quantity: 1 }),
        });
      } else {
        addGuestCartItem(product.id, 1);
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-destructive">Product not found.</p>
        <Link href="/products" className="text-sm underline mt-2 inline-block">
          Back to solutions
        </Link>
      </div>
    );
  }

  const isCourse = product.type === "course";
  const backLink = isCourse ? "/courses" : product.type === "software" ? "/software" : "/products";
  const backLabel = isCourse ? "Back to courses" : product.type === "software" ? "Back to software" : "Back to solutions";

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href={backLink}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-lg bg-muted overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mb-2">
            {product.category}
          </span>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < product.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            ))}
            <span className="text-sm text-muted-foreground ml-1">
              ({product.rating}/5)
            </span>
          </div>

          {isCourse ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#0066CC]" />
                <span className="text-2xl font-bold">{product.credits} credits</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>{product.schedule}</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-2xl font-bold">
              ${product.price.toFixed(2)}{product.type === "software" ? "/year" : ""}
            </p>
          )}

          <p className="mt-4 text-muted-foreground">{product.description}</p>

          <p className="mt-4 text-sm">
            {isCourse ? (
              <span className="text-green-600">Open enrollment</span>
            ) : product.stock > 0 ? (
              <span className="text-green-600">
                {product.type === "software" ? `${product.stock} licenses available` : `${product.stock} in stock`}
              </span>
            ) : (
              <span className="text-destructive">
                {product.type === "software" ? "Contact sales" : "Out of stock"}
              </span>
            )}
          </p>

          <button
            onClick={handleAddToCart}
            disabled={adding || (!isCourse && product.stock === 0)}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="h-4 w-4" />
            {added ? "Added!" : adding ? "Adding..." : isCourse ? "Enroll Now" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
