import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import "@/styles/animations.css";
import "@/styles/glass.css";
import ToastProvider from "@/components/ToastProvider";
import BottomNav from "@/components/layout/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import CustomCursor from "@/components/ui/CustomCursor";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Navoryn — Plan your perfect trip with AI",
  description: "Navoryn turns scattered ideas into seamless travel itineraries using AI.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Navoryn" },
  formatDetection: { telephone: false },
  other: { "mobile-web-app-capable": "yes" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#06080F",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('navoryn-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        <style>{`
          ::-webkit-scrollbar{width:4px;height:4px}
          ::-webkit-scrollbar-track{background:transparent}
          ::-webkit-scrollbar-thumb{background:rgba(56,189,248,0.3);border-radius:2px}
          ::-webkit-scrollbar-thumb:hover{background:rgba(56,189,248,0.5)}
          ::selection{background:rgba(56,189,248,0.3);color:white}
          *{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        `}</style>
      </head>
      <body className={`${geistSans.variable} ${playfair.variable} ${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <CustomCursor />
          <ToastProvider />
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
