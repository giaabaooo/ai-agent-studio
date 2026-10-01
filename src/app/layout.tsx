import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";

export const metadata: Metadata = {
  title: "Affiliate AI Studio — TikTok UGC",
  description:
    "AI Account Manager cho TikTok Affiliate: Quản lý 2 virtual creators, kịch bản, Claim Guard, và phân tích dữ liệu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="flex min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-white">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopNav />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
