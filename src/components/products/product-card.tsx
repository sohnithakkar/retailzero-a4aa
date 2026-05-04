import Link from "next/link";
import type { Product } from "@/lib/data/products";
import { getProductTypes } from "@/lib/config";

export function ProductCard({ product }: { product: Product }) {
  const productTypes = getProductTypes();
  const productType = productTypes.types.find(
    (t) => t.type === product.type
  );
  const showStock = productType?.showStock !== false;
  const showPrice = productType?.showPrice !== false;

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
          <div className="mt-3 flex items-center justify-between">
            {showPrice ? (
              <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
            ) : (
              <span className="text-sm text-muted-foreground">{productType?.priceLabel || "Included"}</span>
            )}
            {showStock && product.stock !== undefined && (
              <span className="text-xs text-muted-foreground">
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
