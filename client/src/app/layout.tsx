import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentMesh — Decentralized Agent Marketplace",
  description:
    "A decentralized marketplace where AI tool providers register MCP tools, orchestrated via P2P mesh with crypto-native payments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
