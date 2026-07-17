import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TFM Trading Bot Dashboard",
  description: "Web interface for Algorithmic Trading Bot",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
