import type { Metadata } from "next";
import { Anonymous_Pro } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const anonPro = Anonymous_Pro({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-anon",
});

export const metadata: Metadata = {
  title: "EHAX Algo Tracker",
  description: "Track LeetCode and CodeForces progress for EHAX members",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anonPro.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#010101] text-[#e0e0e0] font-[family-name:var(--font-anon)]">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
