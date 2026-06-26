"use client";

import { useState, useEffect, useRef } from "react";
import type { TripWithDays } from "@/types/trip";
import { useChat } from "@/hooks/useChat";
import ChatMessage from "./ChatMessage";
import SuggestedPrompts from "./SuggestedPrompts";

interface ChatPanelProps {
  trip: TripWithDays;
  currentDayIndex: number;
  isOpen: boolean;
  onClose: () => void;
  initialMessage?: string;
}

export default function ChatPanel({
  trip,
  currentDayIndex,
  isOpen,
  onClose,
  initialMessage,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [hasCheckedConflicts, setHasCheckedConflicts] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isStreaming,
    error,
    dailyCount,
    sendMessage,
    stopStreaming,
    clearMessages,
  } = useChat({ tripId: trip.id, currentDayIndex });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when panel opens; auto-send initialMessage if provided
  useEffect(() => {
    if (isOpen) {
      if (initialMessage) {
        setTimeout(() => {
          sendMessage(initialMessage);
        }, 200);
      } else {
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMessage]);

  // Silent conflict detection on first open (only when no history yet)
  useEffect(() => {
    if (!isOpen || hasCheckedConflicts || messages.length > 0) return;
    setHasCheckedConflicts(true);

    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/trips/${trip.id}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message:
              "Review this itinerary and identify any timing conflicts or logistical issues (e.g. back-to-back places with no travel time, very tight schedules). Reply with only the issues found in 1-2 short sentences, or reply with exactly 'LGTM' if everything looks fine.",
            history: [],
            currentDay: currentDayIndex,
            silent: true,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) return;

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let response = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          response += decoder.decode(value, { stream: true });
        }
        const trimmed = response.trim();
        if (trimmed && !trimmed.toLowerCase().startsWith("lgtm")) {
          setConflictWarning(trimmed);
        }
      } catch {
        // Silently ignore errors — this is a background check
      }
    })();
    return () => ctrl.abort();
  }, [isOpen, hasCheckedConflicts, messages.length, trip.id, currentDayIndex]);

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

  async function handleClear() {
    await clearMessages();
    setConflictWarning(null);
    setHasCheckedConflicts(false);
    setShowClearConfirm(false);
  }

  function handlePromptSelect(p: string) {
    setInputValue(p);
    textareaRef.current?.focus();
  }

  const lastIsAssistant =
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "assistant" &&
    !isStreaming;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className="fixed inset-0 z-40 sm:hidden"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed z-50 flex flex-col bottom-0 left-0 right-0 h-[92vh] rounded-t-2xl sm:bottom-6 sm:right-6 sm:left-auto sm:h-[580px] sm:w-[400px] sm:rounded-2xl animate-slide-up"
        style={{
          background: "rgba(10,15,30,0.95)",
          border: "1px solid rgba(56,189,248,0.2)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.7), 0 0 40px rgba(56,189,248,0.08)",
        }}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div
          style={{
            flexShrink: 0, padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(245,158,11,0.04) 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* AI avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                style={{
                  width: 38, height: 38, borderRadius: "50%", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(56,189,248,0.25), rgba(14,165,233,0.1))",
                  border: "1px solid rgba(56,189,248,0.4)",
                  boxShadow: "0 0 16px rgba(56,189,248,0.2)",
                }}
              >
                ✨
              </div>
              {/* Online dot */}
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#10B981", border: "2px solid rgba(10,15,30,0.95)" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "white" }}>Navoryn AI</span>
                <span
                  style={{
                    borderRadius: 999, padding: "2px 8px", fontSize: 10, fontWeight: 600,
                    background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.3)", color: "#38BDF8",
                  }}
                >
                  LIVE
                </span>
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                Knows your full {trip.destination} trip
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {showClearConfirm ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ color: "rgba(255,255,255,0.5)" }}>Clear?</span>
                <button onClick={handleClear} style={{ color: "#F87171", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Yes</button>
                <button onClick={() => setShowClearConfirm(false)} style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>No</button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                style={{ borderRadius: 8, padding: 6, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "rgba(255,255,255,0.35)" }}
                className="hover:text-white/70 transition-colors"
                title="Clear chat history"
              >
                🗑
              </button>
            )}
            <button
              onClick={onClose}
              style={{ borderRadius: 8, padding: "4px 8px", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}
              className="hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Rate limit notice ── */}
        {dailyCount >= 20 && (
          <div style={{ flexShrink: 0, padding: "6px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {dailyCount}/30 messages used today
            </p>
          </div>
        )}

        {/* ── Conflict warning banner ── */}
        {conflictWarning && (
          <button
            onClick={() => {
              sendMessage(`I noticed a potential issue with the itinerary: ${conflictWarning} Can you suggest a fix?`);
              setConflictWarning(null);
            }}
            style={{
              flexShrink: 0, padding: "12px 16px", textAlign: "left", cursor: "pointer",
              borderTop: "none", borderLeft: "none", borderRight: "none",
              borderBottom: "1px solid rgba(245,158,11,0.15)",
              background: "rgba(245,158,11,0.07)", width: "100%",
              transition: "background 0.2s",
            }}
            className="hover:bg-amber-900/20"
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#F59E0B" }}>⚠️ Navoryn AI spotted a potential issue</p>
            <p style={{ marginTop: 2, fontSize: 12, color: "rgba(245,158,11,0.7)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{conflictWarning}</p>
            <p style={{ marginTop: 4, fontSize: 11, color: "rgba(245,158,11,0.45)" }}>Tap to ask for a fix →</p>
          </button>
        )}

        {/* ── Messages ── */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px" }}>
          {messages.length === 0 ? (
            <div style={{ display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
              <div
                style={{
                  width: 72, height: 72, borderRadius: "50%", fontSize: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(56,189,248,0.05))",
                  border: "1px solid rgba(56,189,248,0.3)",
                  boxShadow: "0 0 40px rgba(56,189,248,0.15)",
                }}
              >
                ✨
              </div>
              <div>
                <p style={{ fontWeight: 600, color: "white", fontSize: 15 }}>Hi! I know everything about your</p>
                <p style={{ fontWeight: 600, color: "white", fontSize: 15 }}>trip to {trip.destination}.</p>
                <p style={{ marginTop: 8, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                  Ask me anything — places, tips, packing, timing…
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.isStreaming}
                  timestamp={msg.timestamp}
                />
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 16, borderRadius: 12, padding: "10px 14px", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <p style={{ fontSize: 12, color: "#F87171" }}>{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Suggested prompts ── */}
        <div style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 16px" }}>
          <SuggestedPrompts
            trip={trip}
            onSelect={handlePromptSelect}
            afterResponse={lastIsAssistant}
          />
        </div>

        {/* ── Input ── */}
        <div style={{ flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.07)", padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${trip.destination}…`}
              rows={1}
              style={{
                flex: 1, resize: "none", borderRadius: 12, maxHeight: 96,
                border: "1px solid rgba(255,255,255,0.1)", padding: "10px 14px",
                background: "rgba(255,255,255,0.05)", color: "white", fontSize: 14,
                outline: "none", transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(56,189,248,0.4)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
            />

            {isStreaming ? (
              <button
                onClick={stopStreaming}
                style={{
                  flexShrink: 0, borderRadius: 10, padding: "8px 12px", fontSize: 12,
                  background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)",
                  color: "#F87171", cursor: "pointer", transition: "all 0.2s",
                }}
              >
                ⏹ Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                style={{
                  flexShrink: 0, width: 38, height: 38, borderRadius: 10,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: inputValue.trim() ? "linear-gradient(135deg, #38BDF8, #0EA5E9)" : "rgba(255,255,255,0.06)",
                  border: "none", cursor: inputValue.trim() ? "pointer" : "not-allowed",
                  opacity: inputValue.trim() ? 1 : 0.4, transition: "all 0.2s",
                  boxShadow: inputValue.trim() ? "0 4px 16px rgba(56,189,248,0.3)" : "none",
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" style={{ width: 16, height: 16 }}>
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            )}
          </div>

          <p style={{ marginTop: 8, textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
            Powered by Llama 3.1 · Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
