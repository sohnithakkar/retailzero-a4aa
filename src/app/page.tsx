import Link from "next/link";
import { Bot, Shield, Lock, Calendar, Truck, CreditCard, Package, Headphones } from "lucide-react";
import { getBranding, getLanding } from "@/lib/config";

const iconMap = {
  Bot,
  Shield,
  Lock,
  Calendar,
  Truck,
  CreditCard,
  Package,
  Headphones,
};

export default function LandingPage() {
  const branding = getBranding();
  const landing = getLanding();

  return (
    <div>
      {/* Hero section */}
      <section
        className="bg-gradient-to-b to-white py-24 px-4"
        style={{ background: `linear-gradient(to bottom, ${branding.gradientFrom}, white)` }}
      >
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl text-gray-900">
            {landing.hero.headline}{" "}
            <span style={{ color: branding.primaryColor }}>
              {landing.hero.highlightedWord}
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-relaxed">
            {landing.hero.subheadline}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {landing.ctas.map((cta, index) => (
              <Link
                key={index}
                href={cta.href}
                className={`inline-flex items-center justify-center rounded-md px-8 py-3 text-base font-medium shadow transition-colors ${
                  cta.variant === "primary"
                    ? "text-white hover:opacity-90"
                    : "bg-white hover:opacity-90"
                }`}
                style={
                  cta.variant === "primary"
                    ? { backgroundColor: branding.primaryColor }
                    : {
                        borderWidth: "1px",
                        borderColor: branding.primaryColor,
                        color: branding.primaryColor,
                      }
                }
              >
                {cta.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="bg-white py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {landing.featuresTitle}
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {landing.features.map((feature, index) => {
              const Icon = iconMap[feature.icon as keyof typeof iconMap];
              return (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm"
                >
                  <Icon
                    className="mx-auto h-10 w-10"
                    style={{ color: branding.primaryColor }}
                  />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
