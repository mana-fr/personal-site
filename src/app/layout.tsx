import type { Metadata } from "next";
import { Geist, Geist_Mono, Bodoni_Moda, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { CursorGlow } from "@/components/CursorGlow";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bodoniModa = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["italic"],
});

const caveat = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "mana jampala",
  description: "12 y/o founder & ceo of voxa — building ai receptionists and agents for smbs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bodoniModa.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col overflow-x-hidden">
        <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
          <div className="grain" />
          <CursorGlow />
          <Nav />
          <main className="relative z-10 flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
