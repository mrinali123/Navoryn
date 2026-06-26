"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const SUGGESTED = [
  "Help me pick a destination for 5 days",
  "Best budget travel tips?",
  "Suggest a romantic getaway",
  "What to pack for a beach trip?",
  "Best time to visit Southeast Asia?",
];

const FOLLOW_UP = [
  "Tell me more",
  "Any alternatives?",
  "Give me specific recommendations",
];

interface GeneralChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GeneralChatPanel({
  isOpen,
  onClose,
}: GeneralChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [msgCount, setMsgCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      setIsStreaming(true);
      setMsgCount((c) => c + 1);

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      const historySnapshot = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history: historySnapshot }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(
            (json as { error?: string }).error ?? `Error ${res.status}`
          );
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: fullContent,
              };
            }
            return updated;
          });
        }

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, isStreaming: false };
          }
          return updated;
        });
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.isStreaming) {
              updated[updated.length - 1] = { ...last, isStreaming: false };
            }
            return updated;
          });
          return;
        }
        setError(e instanceof Error ? e.message : "Something went wrong");
        setMessages((prev) =>
          prev.filter((_, i) => i < prev.length - 1 || prev[i].content !== "")
        );
        setMsgCount((c) => Math.max(0, c - 1));
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages]
  );

  function handleSend() {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    sendMessage(text);
    setInputValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
  }

  const lastIsAssistant =
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    !isStreaming;

  const prompts = lastIsAssistant ? FOLLOW_UP : SUGGESTED;

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden"
        onClick={onClose}
      />

      <div
        className={[
          "fixed z-50 flex flex-col",
          "bottom-0 left-0 right-0 h-[92vh] rounded-t-2xl",
          "sm:bottom-6 sm:right-6 sm:left-auto sm:h-[560px] sm:w-[400px] sm:rounded-2xl",
          "border border-slate-700/60 bg-[#0B1523] shadow-2xl shadow-black/60",
          "animate-slide-up",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-700/60 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sky/30 bg-navy text-lg">
              🧭
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white">
                  Navoryn AI
                </span>
                <span className="rounded-full bg-sky/10 px-1.5 py-0.5 text-[10px] font-medium text-sky">
                  ✨ AI
                </span>
              </div>
              <p className="text-xs text-slate-400">Your travel planning assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {showClearConfirm ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400">Clear?</span>
                <button
                  onClick={() => {
                    setMessages([]);
                    setMsgCount(0);
                    setShowClearConfirm(false);
                  }}
                  className="font-medium text-red-400 hover:text-red-300"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="text-slate-400 hover:text-white"
                >
                  No
                </button>
              </div>
            ) : messages.length > 0 ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:text-slate-300"
              >
                🗑
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Rate limit notice */}
        {msgCount >= 15 && (
          <div className="shrink-0 border-b border-slate-700/40 bg-slate-800/30 px-4 py-1.5">
            <p className="text-xs text-slate-500">{msgCount}/20 messages used today</p>
          </div>
        )}

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="text-5xl opacity-80">✈️</div>
              <div>
                <p className="font-semibold text-white">Where to next?</p>
                <p className="mt-1 text-sm text-slate-400">
                  Ask me anything about travel — destinations, packing, tips…
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((msg) => (
                <GeneralMessage key={msg.id} {...msg} />
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-800/40 bg-red-900/20 px-3 py-2.5">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts */}
        <div className="shrink-0 border-t border-slate-700/40 px-4 py-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setInputValue(p);
                  textareaRef.current?.focus();
                }}
                className="shrink-0 rounded-full border border-slate-700/60 bg-[#0B1523] px-3 py-1.5 text-xs text-slate-300 transition hover:border-sky/50 hover:text-white whitespace-nowrap"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-slate-700/60 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about travel…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-slate-700 bg-navy px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-sky/50"
              style={{ maxHeight: "96px" }}
            />
            {isStreaming ? (
              <button
                onClick={() => abortRef.current?.abort()}
                className="shrink-0 rounded-xl border border-red-700/50 bg-red-900/30 px-3 py-2.5 text-xs text-red-300 transition hover:bg-red-900/50"
              >
                ⏹ Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="shrink-0 flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-sky text-navy transition hover:bg-sky-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[10px] text-slate-700">
            Powered by Llama 3.1 · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}

function GeneralMessage({
  role,
  content,
  isStreaming,
}: Message) {
  if (role === "user") {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="max-w-[82%] rounded-2xl rounded-tr-sm border border-slate-700/50 bg-navy px-4 py-2.5 text-sm leading-relaxed text-white">
          {content}
        </div>
        <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky text-xs font-bold text-navy">
          U
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-navy text-base">
        🧭
      </div>
      <div className="min-w-0 flex-1">
        {isStreaming && !content ? (
          <div className="flex items-center gap-1 py-2">
            <span className="typing-dot" />
            <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
            <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
          </div>
        ) : (
          <div className="chat-prose text-sm leading-relaxed text-slate-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            {isStreaming && <span className="streaming-cursor">▊</span>}
          </div>
        )}
      </div>
    </div>
  );
}
