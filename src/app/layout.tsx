import type { Metadata } from "next";
import AuthProvider from "@/components/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PokéVault — Abre tus sobres",
  description: "La plataforma de apertura de cartas Pokémon más premium.",
  icons: {
    icon:        [
      { url: "/icons/favicon-32.png",  sizes: "32x32",   type: "image/png" },
      { url: "/icons/favicon-96.png",  sizes: "96x96",   type: "image/png" },
      { url: "/icons/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple:       { url: "/icons/favicon-192.png", sizes: "192x192" },
    shortcut:    "/icons/favicon-32.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-void text-white antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
