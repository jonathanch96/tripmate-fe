import type { Metadata } from "next";
import { Toaster } from "sonner";

import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripMate",
  description: "Shared-trip expenses, balances, and settlements without the spreadsheet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AppProviders>
          {children}
          <Toaster richColors position="top-right" />
        </AppProviders>
      </body>
    </html>
  );
}
