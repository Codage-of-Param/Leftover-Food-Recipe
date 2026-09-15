import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppWrapper from "@/components/AppWrapper";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Midnight Chefs - Kitchen Salvage Engine",
  description: "Don't ask what you want to cook. Ask what food you can rescue before it spoils.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased selection:bg-emerald-100 selection:text-emerald-900`}>
        <AppWrapper>
          {children}
        </AppWrapper>
      </body>
    </html>
  );
}
