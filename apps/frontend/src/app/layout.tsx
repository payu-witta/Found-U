import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FoundU — AI-Powered Lost & Found for UMass",
  description:
    "Lost something on campus? Found someone's stuff? FoundU uses AI to match lost and found items across UMass Amherst.",
  openGraph: {
    title: "FoundU — AI-Powered Lost & Found",
    description:
      "The fastest way to find your lost items on campus.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
