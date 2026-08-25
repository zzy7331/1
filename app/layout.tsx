import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "画布",
  description: "模板驱动的 AI 画布",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <nav aria-label="主导航">
          <Link href="/templates">模板</Link>
          <Link href="/projects">项目</Link>
          <Link href="/assets">素材</Link>
          <Link href="/brand">品牌</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
