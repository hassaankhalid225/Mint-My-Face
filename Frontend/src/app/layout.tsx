import { Inter, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import { WebSiteJsonLd } from "@/components/JsonLd";
import { rootMetadata } from "@/lib/seo";
import "./globals.css";
import "./site.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-var",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata = {
  ...rootMetadata,
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <WebSiteJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
