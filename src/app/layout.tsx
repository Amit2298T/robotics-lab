import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RoboForge",
    template: "%s | RoboForge",
  },

  description:
    "Program, simulate, and experiment with robots directly in your browser using JavaScript, TypeScript, 3D physics, and interactive robotics challenges.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}