import type { Metadata } from "next";
import { Toaster } from "sonner";
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
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
