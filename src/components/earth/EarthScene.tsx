"use client";

import { Component } from "react";
import dynamic from "next/dynamic";

class WebGLErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-space-deeper">
          <div className="text-center space-y-6 p-8 max-w-md">
            <div className="text-6xl">🌍</div>
            <h2 className="text-xl font-semibold text-white">3D 渲染失败</h2>
            <p className="text-white/50 text-sm">{this.state.error?.message}</p>
            <div className="text-left bg-white/5 rounded-lg p-4 space-y-2 text-sm text-white/50">
              <p className="text-blue-400 font-medium">🔧 解决方法：</p>
              <p>1. 使用 <b>Chrome</b> 或 <b>Edge</b> 浏览器打开</p>
              <p>2. 确保浏览器开启了<b>硬件加速</b></p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="glass glass-hover rounded-full px-6 py-2.5 text-blue-400 text-sm"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 单层动态导入，避免嵌套 chunk 404
const EarthCanvas = dynamic(
  () => import("./EarthCanvas").then((mod) => mod.EarthCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-space-deeper">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
          <p className="text-white/40 text-sm">正在渲染地球...</p>
        </div>
      </div>
    ),
  }
);

export function EarthScene() {
  return (
    <WebGLErrorBoundary>
      <EarthCanvas />
    </WebGLErrorBoundary>
  );
}
