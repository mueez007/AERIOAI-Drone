import type { Metadata } from "next";
import { Outfit, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeToggle";
import AnimatedBackground from "@/components/layout/AnimatedBackground";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AERIOAI | Mission Intelligence Platform",
  description: "AI-Powered Autonomous Drone Platform — Custom hardware, edge AI, and cloud intelligence built from scratch.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider>
          <AnimatedBackground />
          <AppLayout>
            <ProtectedRoute>
              {children}
            </ProtectedRoute>
          </AppLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
