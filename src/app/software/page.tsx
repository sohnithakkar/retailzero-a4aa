import { getSoftware } from "@/lib/data/products";
import { SoftwareGrid } from "@/components/products/software-grid";

export default function SoftwarePage() {
  const software = getSoftware();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">School Software</h1>
        <p className="mt-2 text-muted-foreground">
          Enterprise solutions for school administration and management
        </p>
      </div>
      <SoftwareGrid products={software} />
    </div>
  );
}
