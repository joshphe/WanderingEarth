"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Send, X, Loader2, CornerDownRight, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import type { CommentItem } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";

const MAX_COMMENT_LENGTH = 200;
const INITIAL_COMMENTS = 5;
const COMMENTS_PER_PAGE = 5;
const INITIAL_REPLIES = 3;

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

/** 从用户名提取首字母作为头像 fallback */
function avatarLetter(name: string | null): string {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
}

/** 用用户名生成稳定的浅色头像背景色 */
function avatarColor(name: string | null): string {
  const colors = [
    "#f4a460", "#6b8e9b", "#c49b7a", "#8b9d83", "#b8937a",
    "#7b9c8e", "#c49a6c", "#8b8b7a", "#a8947b", "#9b8b7a",
  ];
  if (!name) return colors[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function CommentPanel({ locationId, isOwner, onClose }: CommentPanelProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_COMMENTS);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
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
        // API 返回的新评论不含 replies，补齐空数组
        setComments((prev) => [{ ...newComment, replies: [] }, ...prev]);
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
        // 递归将回复插入到正确的父评论下（支持任意嵌套层级）
        const addReplyToTree = (items: CommentItem[]): CommentItem[] =>
          items.map((item) => {
            if (item.id === parentId) {
              return { ...item, replies: [...(item.replies || []), newReply] };
            }
            if ((item.replies || []).length > 0) {
              return { ...item, replies: addReplyToTree(item.replies || []) };
            }
            return item;
          });
        setComments((prev) => addReplyToTree(prev));
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

  const handleDelete = async (commentId: string) => {
    if (!confirm("确定删除这条评论吗？子回复也会一并删除。")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setComments((prev) => {
          const isTopLevel = prev.some((c) => c.id === commentId);
          if (isTopLevel) {
            return prev.filter((c) => c.id !== commentId);
          }
          return prev.map((c) => ({
            ...c,
            replies: (c.replies || []).filter((r) => r.id !== commentId),
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

  // 查找被回复的用户名
  const getReplyTargetName = (parentId: string): string => {
    for (const c of comments) {
      if (c.id === parentId) return c.user.name || "未知用户";
      for (const r of c.replies) {
        if (r.id === parentId) return r.user.name || "未知用户";
      }
    }
    return "未知用户";
  };

  const charCountClass = (len: number) =>
    len > MAX_COMMENT_LENGTH * 0.85
      ? "text-amber-500"
      : "text-gray-400";

  return (
    <div className="flex flex-col w-[320px] h-full border-l border-[#d8d4cc] bg-[#f2efe8] shrink-0">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#d8d4cc] shrink-0 bg-[#f7f5f0]">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-amber-600" />
          评论
          {comments.length > 0 && (
            <span className="text-xs font-normal text-gray-400">
              {comments.length}
            </span>
          )}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-black/5 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 评论列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="py-8">
            <LoadingState size="sm" message="加载评论..." />
          </div>
        )}
        {error && (
          <div className="py-4">
            <ErrorState message={error} onRetry={fetchComments} />
          </div>
        )}
        {!loading && !error && comments.length === 0 && (
          <div className="py-8">
            <EmptyState message="暂无评论，来写第一条吧 ✨" />
          </div>
        )}

        {!loading && !error && comments.length > 0 && (
          <>
            <AnimatePresence>
              {comments.slice(0, visibleCount).map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={prefersReduced ? {} : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReduced ? {} : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-black/[0.06]"
                >
                  {/* 顶级评论头部 */}
                  <div className="flex items-start gap-2.5">
                    {/* 头像 */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: avatarColor(comment.user.name) }}
                    >
                      {avatarLetter(comment.user.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* 用户名 + 时间 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-gray-700">
                          {comment.user.name || "未知用户"}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {timeAgo(comment.createdAt)}
                        </span>
                      </div>

                      {/* 评论内容 */}
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed break-words">
                        {comment.content}
                      </p>

                      {/* 操作按钮行 */}
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() =>
                            setReplyToId(
                              replyToId === comment.id ? null : comment.id
                            )
                          }
                          className={`text-xs flex items-center gap-1 transition-colors ${
                            replyToId === comment.id
                              ? "text-amber-600 font-medium"
                              : "text-gray-400 hover:text-amber-600"
                          }`}
                        >
                          <CornerDownRight className="w-3 h-3" />
                          回复
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="text-xs flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            删除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 子回复列表 */}
                  {(comment.replies || []).length > 0 && (
                    <div className="mt-2 ml-4 pl-3 border-l-2 border-amber-200 space-y-2">
                      {(expandedReplies.has(comment.id)
                        ? (comment.replies || [])
                        : (comment.replies || []).slice(0, INITIAL_REPLIES)
                      ).map((reply) => (
                        <div key={reply.id} className="bg-[#faf8f4] rounded-lg p-2.5">
                          <div className="flex items-start gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold text-white shadow-sm"
                              style={{ backgroundColor: avatarColor(reply.user.name) }}
                            >
                              {avatarLetter(reply.user.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[12px] font-semibold text-gray-600">
                                  {reply.user.name || "未知用户"}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {timeAgo(reply.createdAt)}
                                </span>
                              </div>
                              {/* 回复上下文：显示被回复的内容缩略 */}
                              {reply.parentContent && (
                                <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed line-clamp-1">
                                  回复 <span className="font-medium text-gray-500">@{reply.parentUserName || "未知用户"}</span>
                                  ：<span className="italic">&ldquo;{reply.parentContent}{reply.parentContent.length >= 40 ? '...' : ''}&rdquo;</span>
                                </p>
                              )}
                              <p className="text-[13px] text-gray-500 mt-0.5 leading-relaxed break-words">
                                {reply.content}
                              </p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <button
                                  onClick={() =>
                                    setReplyToId(
                                      replyToId === reply.id ? null : reply.id
                                    )
                                  }
                                  className={`text-[11px] flex items-center gap-1 transition-colors ${
                                    replyToId === reply.id
                                      ? "text-amber-600 font-medium"
                                      : "text-gray-400 hover:text-amber-600"
                                  }`}
                                >
                                  <CornerDownRight className="w-2.5 h-2.5" />
                                  回复
                                </button>
                                {isOwner && (
                                  <button
                                    onClick={() => handleDelete(reply.id)}
                                    className="text-[11px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                    删除
                                  </button>
                                )}
                              </div>

                              {/* 二级子回复 */}
                              {(reply.replies || []).length > 0 && (
                                <div className="mt-1.5 ml-2 pl-2.5 border-l-2 border-amber-100 space-y-1.5">
                                  {reply.replies.map((subReply) => (
                                    <div key={subReply.id} className="bg-white/70 rounded-md px-2.5 py-2">
                                      <div className="flex items-start gap-2">
                                        <div
                                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold text-white"
                                          style={{ backgroundColor: avatarColor(subReply.user.name) }}
                                        >
                                          {avatarLetter(subReply.user.name)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-semibold text-gray-600">
                                              {subReply.user.name || "未知用户"}
                                            </span>
                                            <span className="text-[9px] text-gray-400">
                                              {timeAgo(subReply.createdAt)}
                                            </span>
                                          </div>
                                          {subReply.parentContent && (
                                            <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed line-clamp-1">
                                              回复 <span className="font-medium text-gray-500">@{subReply.parentUserName || "未知用户"}</span>
                                              ：<span className="italic">&ldquo;{subReply.parentContent}{subReply.parentContent.length >= 40 ? '...' : ''}&rdquo;</span>
                                            </p>
                                          )}
                                          <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed break-words">
                                            {subReply.content}
                                          </p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <button
                                              onClick={() =>
                                                setReplyToId(
                                                  replyToId === subReply.id ? null : subReply.id
                                                )
                                              }
                                              className={`text-[10px] flex items-center gap-1 transition-colors ${
                                                replyToId === subReply.id
                                                  ? "text-amber-600 font-medium"
                                                  : "text-gray-400 hover:text-amber-600"
                                              }`}
                                            >
                                              <CornerDownRight className="w-2 h-2" />
                                              回复
                                            </button>
                                            {isOwner && (
                                              <button
                                                onClick={() => handleDelete(subReply.id)}
                                                className="text-[10px] text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                              >
                                                <Trash2 className="w-2 h-2" />
                                                删除
                                              </button>
                                            )}
                                          </div>

                                          {/* 回复输入框（针对二级子回复） */}
                                          {replyToId === subReply.id && (
                                            <div className="mt-2 bg-[#faf8f4] rounded-lg p-2 border border-amber-200/60">
                                              <p className="text-[10px] text-gray-500 mb-1.5">
                                                回复 <span className="font-medium text-gray-700">@{getReplyTargetName(subReply.id)}</span>
                                              </p>
                                              <div className="flex items-center gap-1.5">
                                                <input
                                                  type="text"
                                                  value={replyContent}
                                                  onChange={(e) => setReplyContent(e.target.value)}
                                                  placeholder="写下回复..."
                                                  maxLength={MAX_COMMENT_LENGTH}
                                                  disabled={submitting}
                                                  autoFocus
                                                  className="flex-1 bg-white border border-[#d8d4cc] rounded-lg px-2 py-1.5 text-gray-700 text-[12px] placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all"
                                                  onKeyDown={(e) => {
                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                      e.preventDefault();
                                                      handleReply(subReply.id);
                                                    }
                                                  }}
                                                />
                                                <button
                                                  onClick={() => handleReply(subReply.id)}
                                                  disabled={!replyContent.trim() || submitting}
                                                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-medium text-white transition-colors"
                                                >
                                                  {submitting ? (
                                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                                  ) : (
                                                    <Send className="w-2.5 h-2.5" />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 回复输入框（针对一级子回复） */}
                              {replyToId === reply.id && (
                                <div className="mt-2 bg-white rounded-lg p-2.5 border border-amber-200/60">
                                  <p className="text-[10px] text-gray-500 mb-1.5">
                                    回复 <span className="font-medium text-gray-700">@{getReplyTargetName(reply.id)}</span>
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      value={replyContent}
                                      onChange={(e) => setReplyContent(e.target.value)}
                                      placeholder="写下回复..."
                                      maxLength={MAX_COMMENT_LENGTH}
                                      disabled={submitting}
                                      autoFocus
                                      className="flex-1 bg-[#faf8f4] border border-[#d8d4cc] rounded-lg px-2 py-1.5 text-gray-700 text-[12px] placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          handleReply(reply.id);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => handleReply(reply.id)}
                                      disabled={!replyContent.trim() || submitting}
                                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[11px] font-medium text-white transition-colors"
                                    >
                                      {submitting ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                      ) : (
                                        <Send className="w-2.5 h-2.5" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* 子回复展开/收起按钮 */}
                      {(comment.replies || []).length > INITIAL_REPLIES && (
                        <button
                          onClick={() =>
                            setExpandedReplies((prev) => {
                              const next = new Set(prev);
                              if (next.has(comment.id)) {
                                next.delete(comment.id);
                              } else {
                                next.add(comment.id);
                              }
                              return next;
                            })
                          }
                          className="text-xs text-gray-400 hover:text-amber-600 transition-colors flex items-center gap-1 py-0.5"
                        >
                          {expandedReplies.has(comment.id) ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              收起回复
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              展开全部 {comment.replies.length} 条回复
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}

                  {/* 回复输入框（针对顶级评论） */}
                  {replyToId === comment.id && (
                    <div className="mt-2.5 ml-9 bg-[#faf8f4] rounded-lg p-2.5 border border-amber-200/60">
                      <p className="text-[11px] text-gray-500 mb-2">
                        回复 <span className="font-medium text-gray-700">@{getReplyTargetName(comment.id)}</span>
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="写下回复..."
                          maxLength={MAX_COMMENT_LENGTH}
                          disabled={submitting}
                          autoFocus
                          className="flex-1 bg-white border border-[#d8d4cc] rounded-lg px-2.5 py-1.5 text-gray-700 text-[13px] placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(comment.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleReply(comment.id)}
                          disabled={!replyContent.trim() || submitting}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-medium text-white transition-colors"
                        >
                          {submitting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                      <div className="flex justify-end mt-1">
                        <span className={`text-[10px] ${charCountClass(replyContent.length)}`}>
                          {replyContent.length}/{MAX_COMMENT_LENGTH}
                        </span>
                      </div>
                    </div>
                  )}

                </motion.div>
              ))}
            </AnimatePresence>

            {/* 查看更多评论 */}
            {comments.length > visibleCount && (
              <button
                onClick={() =>
                  setVisibleCount((prev) =>
                    Math.min(prev + COMMENTS_PER_PAGE, comments.length)
                  )
                }
                className="w-full text-xs text-gray-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-1 py-1.5"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                查看更多评论 ({comments.length - visibleCount})
              </button>
            )}

            {/* 收起部分评论 */}
            {visibleCount > INITIAL_COMMENTS && comments.length > INITIAL_COMMENTS && (
              <button
                onClick={() => setVisibleCount(INITIAL_COMMENTS)}
                className="w-full text-xs text-gray-400 hover:text-gray-500 transition-colors flex items-center justify-center gap-1 py-1"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                收起
              </button>
            )}
          </>
        )}
      </div>

      {/* 底部输入区 */}
      <div className="p-3 border-t border-[#d8d4cc] shrink-0 bg-[#f7f5f0]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下评论..."
            maxLength={MAX_COMMENT_LENGTH}
            disabled={submitting}
            className="flex-1 bg-white border border-[#d8d4cc] rounded-lg px-3 py-2 text-gray-700 text-sm placeholder:text-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="flex justify-end mt-1">
          <span className={`text-[10px] ${charCountClass(content.length)}`}>
            {content.length}/{MAX_COMMENT_LENGTH}
          </span>
        </div>
      </div>
    </div>
  );
}
