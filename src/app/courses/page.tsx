import { getCourses } from "@/lib/data/products";
import { CourseGrid } from "@/components/products/course-grid";

export default function CoursesPage() {
  const courses = getCourses();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Courses</h1>
        <p className="mt-2 text-muted-foreground">
          Enroll in courses to earn credits toward your degree
        </p>
      </div>
      <CourseGrid products={courses} />
    </div>
  );
}
