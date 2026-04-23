import Link from "next/link";
import { Bot, Shield, Lock } from "lucide-react";

export default function LandingPage() {
  return (
    <div>
      {/* Hero section */}
      <section className="bg-gradient-to-b from-[#f8f6fc] to-white py-24 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl text-gray-900">
            Shop smarter with{" "}
            <span className="text-[#4016A0]">RetailZero</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            AI-powered shopping meets enterprise-grade security. Discover
            products through natural conversation, check out with confidence
            using Auth0 CIBA step-up authentication, and enjoy fine-grained
            access controls that keep your data safe.
          </p>
          <Link
            href="/products"
            className="mt-10 inline-flex items-center justify-center rounded-md bg-[#4016A0] px-8 py-3 text-base font-medium text-white shadow hover:bg-[#4016A0]/90 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </section>

      {/* About section */}
      <section className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            About RetailZero
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Bot className="mx-auto h-10 w-10 text-[#4016A0]" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                AI Shopping Assistant
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Discover products through a conversational AI assistant that
                understands what you need and surfaces the best matches.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Shield className="mx-auto h-10 w-10 text-[#4016A0]" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Secure Checkout
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Complete purchases with CIBA step-up approval, ensuring every
                high-value transaction is verified on a trusted device.
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
              <Lock className="mx-auto h-10 w-10 text-[#4016A0]" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Fine-Grained Access
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                FGA role-based controls protect every resource, giving admins
                and shoppers exactly the permissions they need.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
