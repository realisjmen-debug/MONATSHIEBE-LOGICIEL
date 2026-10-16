import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function clean(value: string | null, fallback: string, max = 80) {
  const normalized = (value || "").replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max);
  return normalized || fallback;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const name = clean(params.get("name"), "MONATSHIEBE Logiciel Scolaire", 80);
  const shortName = clean(params.get("short_name"), name, 24);
  const themeColor = /^#[0-9a-fA-F]{6}$/.test(params.get("theme_color") || "") ? params.get("theme_color")! : "#4338ca";
  const startUrlParam = params.get("start_url") || "/";
  const startUrl = startUrlParam.startsWith("/") && !startUrlParam.startsWith("//") ? startUrlParam : "/";
  const schoolSlug = params.get("school");
  const iconParam = params.get("icon");
  let icon = "/pwa-icon.svg";
  if (schoolSlug && /^[a-zA-Z0-9_-]{1,120}$/.test(schoolSlug)) {
    icon = new URL("/api/pwa-icon?school=" + encodeURIComponent(schoolSlug), request.nextUrl.origin).toString();
  } else if (iconParam) {
    try {
      const parsed = new URL(iconParam, request.nextUrl.origin);
      if (parsed.protocol === "https:" || parsed.origin === request.nextUrl.origin) icon = parsed.toString();
    } catch { /* Keep the built-in icon when the URL is invalid. */ }
  }
  const manifest = {
    id: startUrl,
    name,
    short_name: shortName,
    description: "Application de gestion scolaire",
    lang: "fr",
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: themeColor,
    icons: [
      { src: icon, sizes: "192x192", type: icon.endsWith(".svg") ? "image/svg+xml" : "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: icon.endsWith(".svg") ? "image/svg+xml" : "image/png", purpose: "any maskable" }
    ]
  };
  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/manifest+json; charset=utf-8" }
  });
}
