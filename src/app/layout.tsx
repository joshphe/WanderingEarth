import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "流浪地球 - 在太空看你的旅行相册",
  description: "把你的旅行照片标记在3D地球上，从太空视角重温每一次旅程",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
