import Link from "next/link";
import { Bot, Shield, Lock, Calendar } from "lucide-react";

export default function LandingPage() {
  return (
    <div>
      {/* Hero section */}
      <section className="bg-gradient-to-b from-[#e6f0fa] to-white py-24 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl text-gray-900">
            Learn smarter with{" "}
            <span className="text-[#0066CC]">EduZero</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            AI-powered education platform with enterprise-grade security for
            students, educators, and administrators. Discover courses through
            natural conversation, enroll with confidence using Auth0 CIBA
            step-up authentication, and enjoy fine-grained access controls that
            keep your data safe.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/courses"
              className="inline-flex items-center justify-center rounded-md bg-[#0066CC] px-8 py-3 text-base font-medium text-white shadow hover:bg-[#0066CC]/90 transition-colors"
            >
              Browse Courses
            </Link>
            <Link
              href="/software"
              className="inline-flex items-center justify-center rounded-md border border-[#0066CC] bg-white px-8 py-3 text-base font-medium text-[#0066CC] shadow hover:bg-[#0066CC]/5 transition-colors"
            >
              School Software
            </Link>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            About EduZero
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Bot className="mx-auto h-10 w-10 text-[#0066CC]" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                AI Education Assistant
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Discover courses and tools through a conversational AI assistant
                that understands what you need.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Shield className="mx-auto h-10 w-10 text-[#0066CC]" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Secure Enrollment
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Complete registrations with CIBA step-up approval, ensuring every
                enrollment is verified on a trusted device.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Lock className="mx-auto h-10 w-10 text-[#0066CC]" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Role-Based Access
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                FGA controls protect student records and administrative data,
                giving everyone exactly the permissions they need.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Calendar className="mx-auto h-10 w-10 text-[#0066CC]" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Calendar Integration
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Never miss a class, assignment, or deadline with integrated
                Google Calendar reminders.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
