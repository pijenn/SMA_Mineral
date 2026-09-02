import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "PT Sumber Mineral Abadi - Procurement Management System",
  description: "Weekly operational procurement and budget visibility for PT SMA (PT PAM Mineral)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-[#0c0e12] text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400">
        <ThemeProvider>
          <AppProvider>{children}</AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
