import { NextRequest, NextResponse } from "next/server";
import { auth0Connect } from "@/lib/auth/auth0";

export async function GET(req: NextRequest) {
  try {
    const session = await auth0Connect.getSession();
    console.log("[connect/google] session check:", {
      hasSession: !!session,
      userSub: session?.user?.sub,
      userEmail: session?.user?.email,
    });
    if (!session) {
      console.warn("[connect/google] no session on auth0Connect client -- redirecting with error");
      const url = new URL("/connect/google", req.url);
      url.searchParams.set("error", "no_session");
      return NextResponse.redirect(url);
    }
  } catch (err) {
    console.warn("[connect/google] session check threw:", err);
    // Session check failed — proceed and let connectAccount handle it
  }

  try {
    return await auth0Connect.connectAccount({
      connection: "google-oauth2",
      scopes: [
        "profile",
        "email",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      returnTo: "/connect/google/success",
    });
  } catch (err: any) {
    console.error("[connect/google] connectAccount failed:", err.code, err.message);
    const url = new URL("/connect/google", req.url);
    url.searchParams.set("error", err.code || err.message || "unknown");
    return NextResponse.redirect(url);
  }
}
