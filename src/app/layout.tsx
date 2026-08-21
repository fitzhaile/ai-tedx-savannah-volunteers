import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// UI face: Geist for everything interactive and dense.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });

// Display face: Bricolage Grotesque for headlines, big numerals, the wordmark.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

export const metadata: Metadata = {
  title: {
    default: "TEDxSavannah Volunteers",
    template: "%s · TEDxSavannah Volunteers",
  },
  description: "Sign up for volunteer shifts at TEDxSavannah — May 15, 2027.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} font-sans`}>
      {/* Browser extensions add attributes to <body> before React loads; not our markup. */}
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Toaster position="bottom-center" richColors closeButton />
      </body>
    </html>
  );
}
