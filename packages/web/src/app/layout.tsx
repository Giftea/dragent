import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import ContextProvider from "@/components/provider";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ContextProvider cookies={cookies}>
          {children} <Toaster />
        </ContextProvider>
      </body>
    </html>
  );
}
