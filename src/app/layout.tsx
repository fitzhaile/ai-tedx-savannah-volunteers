import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

// Display face: confident editorial grotesk for headlines, numerals, wordmark.
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

// Body face: editorial lineage, crisp at small sizes on phones, tabular figures.
const body = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} antialiased`}
        // Browser extensions add attributes to <body> before React loads; not our markup.
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
