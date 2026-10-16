import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("school")?.trim();
  if (!slug || slug.length > 120 || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return NextResponse.redirect(new URL("/pwa-icon.svg", request.nextUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://batcggonqggzdgsypzfc.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_gaw_uApUL4uJ2LHOERqz0A_4lat-NQF";

  try {
    const response = await fetch(supabaseUrl + "/functions/v1/parent-portal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: "Bearer " + supabaseKey,
      },
      body: JSON.stringify({ action: "branding", school_slug: slug }),
      cache: "no-store",
    });
    if (response.ok) {
      const payload = await response.json();
      const logoUrl = payload?.school?.logo_url;
      if (typeof logoUrl === "string") {
        const parsed = new URL(logoUrl);
        if (parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co")) {
          return NextResponse.redirect(parsed, { headers: { "Cache-Control": "no-store, max-age=0" } });
        }
      }
    }
  } catch {
    // Fall back to the generic icon if the branding endpoint is unavailable.
  }

  return NextResponse.redirect(new URL("/pwa-icon.svg", request.nextUrl.origin), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
