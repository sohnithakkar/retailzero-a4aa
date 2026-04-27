import Link from "next/link";
import { Clock, BookOpen } from "lucide-react";
import type { Product } from "@/lib/data/products";

export function CourseCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.id}`} className="group">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-square bg-muted flex items-center justify-center">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm group-hover:underline">
              {product.name}
            </h3>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
              {product.category}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4 text-[#0066CC]" />
              <span className="font-semibold">{product.credits} credits</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{product.schedule}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
