export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-space-deeper">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin" />
        <p className="text-white/40 text-sm">加载中...</p>
      </div>
    </div>
  );
}
