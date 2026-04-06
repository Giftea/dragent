"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import { WagmiProvider }          from "wagmi";
import { RainbowKitProvider }     from "@rainbow-me/rainbowkit";
import { QueryClientProvider }    from "@tanstack/react-query";
import { wagmiConfig }            from "@/lib/wagmi";
import { queryClient }            from "@/lib/queryClient";
import { Toaster }                from "@/components/ui/sonner";

import "@rainbow-me/rainbowkit/styles.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              {children}
              <Toaster />
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}