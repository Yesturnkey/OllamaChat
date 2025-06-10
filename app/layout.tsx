import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ollama Chat",
  description: "Chat with AI using Ollama",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
