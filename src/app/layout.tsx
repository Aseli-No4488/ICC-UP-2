import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICC UP 2",
  description: "Better ICC UP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko-kr">
      <body>{children}</body>
    </html>
  );
}
