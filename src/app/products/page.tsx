import Link from "next/link";
import { BookOpen, Laptop } from "lucide-react";

export default function ProductsPage() {
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
          className="group rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-[#0066CC]"
        >
          <div className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#0066CC]/10 flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-[#0066CC]" />
            </div>
            <h2 className="text-2xl font-bold group-hover:text-[#0066CC] transition-colors">
              Courses
            </h2>
            <p className="mt-2 text-muted-foreground">
              Enroll in courses to earn credits toward your degree. Browse our
              catalog of mathematics, science, arts, and more.
            </p>
            <div className="mt-4 inline-flex items-center text-[#0066CC] font-medium">
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
          className="group rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all hover:shadow-lg hover:border-[#0066CC]"
        >
          <div className="p-8 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-[#0066CC]/10 flex items-center justify-center mb-4">
              <Laptop className="h-8 w-8 text-[#0066CC]" />
            </div>
            <h2 className="text-2xl font-bold group-hover:text-[#0066CC] transition-colors">
              School Software
            </h2>
            <p className="mt-2 text-muted-foreground">
              Enterprise solutions for administrators. Manage students, grades,
              attendance, and school operations.
            </p>
            <div className="mt-4 inline-flex items-center text-[#0066CC] font-medium">
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
