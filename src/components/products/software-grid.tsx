import type { Product } from "@/lib/data/products";
import { SoftwareCard } from "./software-card";

export function SoftwareGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No software found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product) => (
        <SoftwareCard key={product.id} product={product} />
      ))}
    </div>
  );
}
