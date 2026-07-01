"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import type { CommentItem } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const MAX_COMMENT_LENGTH = 50;

interface CommentPanelProps {
  locationId: string;
  isOwner: boolean;
  onClose?: () => void;
}

/** 格式化相对时间 */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "刚刚";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export function CommentPanel({ locationId, isOwner, onClose }: CommentPanelProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // 正在回复的评论 ID（null = 顶级评论输入框）
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const prefersReduced = useReducedMotion();

  const fetchComments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/locations/${locationId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      } else {
        const err = await res.json();
        setError(err.error || "加载评论失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // 发表顶级评论
  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    if (content.trim().length > MAX_COMMENT_LENGTH) {
      toast.error(`评论不能超过${MAX_COMMENT_LENGTH}字`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/locations/${locationId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setContent("");
        toast.success("评论已发表");
      } else {
        const err = await res.json();
        toast.error(err.error || "发表失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 发表回复
  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || submitting) return;
    if (replyContent.trim().length > MAX_COMMENT_LENGTH) {
      toast.error(`回复不能超过${MAX_COMMENT_LENGTH}字`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/locations/${locationId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim(), parentId }),
      });
      if (res.ok) {
        const newReply = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...c.replies, newReply] }
              : c
          )
        );
        setReplyContent("");
        setReplyToId(null);
        toast.success("回复已发表");
      } else {
        const err = await res.json();
        toast.error(err.error || "回复失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  // 删除评论
  const handleDelete = async (commentId: string) => {
    if (!confirm("确定删除这条评论吗？子回复也会一并删除。")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => {
          // Check if it's a top-level comment
          const isTopLevel = prev.some((c) => c.id === commentId);
          if (isTopLevel) {
            return prev.filter((c) => c.id !== commentId);
          }
          // It's a reply — remove from parent's replies array
          return prev.map((c) => ({
            ...c,
            replies: c.replies.filter((r) => r.id !== commentId),
          }));
        });
        toast.success("评论已删除");
      } else {
        const err = await res.json();
        toast.error(err.error || "删除失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    }
  };

  return (
    <div className="flex flex-col w-[300px] h-full border-l border-white/10 bg-black/30 backdrop-blur-sm shrink-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          评论 ({comments.length})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 评论列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {loading && <LoadingState size="sm" message="加载评论..." />}
        {error && <ErrorState message={error} onRetry={fetchComments} />}
        {!loading && !error && comments.length === 0 && (
          <EmptyState message="暂无评论，来写第一条吧 ✨" />
        )}
        {!loading &&
          !error && (
            <AnimatePresence>
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={prefersReduced ? {} : { x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={prefersReduced ? {} : { x: 20, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="glass-card glass-card-hover p-2.5 space-y-1.5"
                >
                  {/* 顶级评论 */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/60">
                        {comment.user.name || "未知用户"}
                      </span>
                      <span className="text-[10px] text-white/25">
                        {timeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-white/70 mt-0.5 leading-relaxed">
                      {comment.content}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {isOwner && (
                        <>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="text-[11px] text-white/30 hover:text-red-400 transition-colors"
                          >
                            删除
                          </button>
                          <button
                            onClick={() =>
                              setReplyToId(
                                replyToId === comment.id ? null : comment.id
                              )
                            }
                            className="text-[11px] text-white/30 hover:text-blue-400 transition-colors"
                          >
                            回复
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 子回复 */}
                  {comment.replies.length > 0 && (
                    <div className="ml-5 pl-2 border-l border-white/10 space-y-1.5">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="bg-white/[0.03] rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white/50">
                              {reply.user.name || "未知用户"}
                            </span>
                            <span className="text-[10px] text-white/20">
                              {timeAgo(reply.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-white/60 mt-0.5 leading-relaxed">
                            {reply.content}
                          </p>
                          {isOwner && (
                            <button
                              onClick={() => handleDelete(reply.id)}
                              className="text-[11px] text-white/30 hover:text-red-400 transition-colors mt-0.5"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 回复输入框 */}
                  {replyToId === comment.id && (
                    <div className="ml-5 mt-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="写下回复..."
                          maxLength={MAX_COMMENT_LENGTH}
                          disabled={submitting}
                          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(comment.id);
                            }
                          }}
                        />
                        <span className="text-[10px] text-white/20 shrink-0">
                          {replyContent.length}/{MAX_COMMENT_LENGTH}
                        </span>
                        <button
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyContent.trim() || submitting}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-blue-500/30 rounded text-xs text-blue-300 transition-colors"
                        >
                          {submitting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
      </div>

      {/* 底部输入区 */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下评论..."
            maxLength={MAX_COMMENT_LENGTH}
            disabled={submitting}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-blue-400/50 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <span className="text-[10px] text-white/20 shrink-0">
            {content.length}/{MAX_COMMENT_LENGTH}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-30 disabled:cursor-not-allowed border border-blue-500/30 rounded text-xs text-blue-300 transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
