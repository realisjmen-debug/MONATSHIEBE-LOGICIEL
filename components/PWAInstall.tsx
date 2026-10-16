"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> };

export default function PWAInstall({ school }: { school?: any }) {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const slug = String(school?.slug || url.searchParams.get("school") || url.pathname.match(/^\/ecole\/([^/]+)/)?.[1] || "");
    const schoolName = String(school?.name || "MONATSHIEBE Logiciel Scolaire");
    const shortName = schoolName.length > 24 ? schoolName.slice(0, 23).trim() : schoolName;
    const themeColor = /^#[0-9a-fA-F]{6}$/.test(String(school?.primary_color || "")) ? school.primary_color : "#4338ca";
    const startUrl = slug ? "/?school=" + encodeURIComponent(slug) : (url.pathname + url.search || "/");
    const manifestUrl = new URL("/manifest.webmanifest", window.location.origin);
    manifestUrl.searchParams.set("name", schoolName);
    manifestUrl.searchParams.set("short_name", shortName);
    manifestUrl.searchParams.set("theme_color", themeColor);
    manifestUrl.searchParams.set("start_url", startUrl);
    if (slug) manifestUrl.searchParams.set("school", slug);
    else if (school?.logo_url) manifestUrl.searchParams.set("icon", String(school.logo_url));
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = manifestUrl.toString();

    const ua = window.navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) && !(window.navigator as any).standalone);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as any).standalone));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("PWA service worker registration failed", error));
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [school?.name, school?.slug, school?.primary_color, school?.logo_url]);

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      return;
    }
    if (isIOS) {
      window.alert("Pour installer cette application sur iPhone ou iPad : ouvrez ce lien dans Safari, touchez le bouton Partager, puis « Sur l’écran d’accueil » et « Ajouter ».");
    } else if (!installed) {
      window.alert("Pour installer l’application, ouvrez le menu de votre navigateur puis choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ». Si cette option n’apparaît pas, vérifiez que le site est ouvert en HTTPS et que votre navigateur prend en charge les PWA.");
    }
  }

  if (installed) return <span className="pwaInstalled" title="Application installée"><Smartphone size={16}/> Application installée</span>;
  return <button type="button" className="pwaInstallButton" onClick={install}><Download size={16}/> Installer l’application</button>;
}
