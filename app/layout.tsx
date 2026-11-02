import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MONATSHIEBE LOGICIEL",
  description: "MONATSHIEBE LOGICIEL — plateforme professionnelle de gestion scolaire, personnalisable pour chaque établissement.",
  applicationName: "MONATSHIEBE Logiciel Scolaire",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MONATSHIEBE",
  },
  icons: {
    icon: "/pwa-icon.svg",
    apple: "/pwa-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3730a3",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><head><meta name="mobile-web-app-capable" content="yes" /></head><body>{children}</body></html>;
}
