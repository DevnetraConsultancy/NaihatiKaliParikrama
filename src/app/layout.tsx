import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/AppHeader";
import TabBar from "@/components/TabBar";
import { LanguageProvider } from "@/components/LanguageProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://naihatikaliparikrama.vercel.app"),
  title: {
    default: "NaihatiKaliParikrama — নৈহাটি কালীপূজা লাইভ ম্যাপ",
    template: "%s · NaihatiKaliParikrama",
  },
  description:
    "Live Kali Puja pandal map for Naihati: 28 heritage, large and small pandals with walking routes, travel time, live crowd levels, and the nearest hospital, police station, toilet and food stop.",
  applicationName: "NaihatiKaliParikrama",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Naihati Parikrama", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/boro-maa-emblem.png", type: "image/png" }],
    apple: [{ url: "/boro-maa-emblem.png" }],
  },
  openGraph: {
    title: "NaihatiKaliParikrama — live Kali Puja pandal map for Naihati",
    description:
      "Scan, allow location, and walk the Naihati Kali Puja parikrama with live routes, ETAs and crowd levels.",
    type: "website",
    images: [{ url: "/boro-maa-emblem.png", width: 320, height: 320, alt: "Naihati Boro Maa" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07060e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${inter.variable} ${bengali.variable}`}>
      <body className="min-h-[100dvh] bg-ink font-sans antialiased text-white selection:bg-gold/30 selection:text-gold relative overflow-x-hidden">
        <LanguageProvider>
          <AppHeader />
          <main className="relative z-10">{children}</main>
          <TabBar />
        </LanguageProvider>
      </body>
    </html>
  );
}
