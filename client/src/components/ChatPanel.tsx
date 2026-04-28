"use client";

import { useState, useRef, useEffect } from "react";

interface ChatPanelProps {
  onEvent: (type: string, data: unknown) => void;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export function ChatPanel({ onEvent }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "AgentMesh ready. Enter a goal to begin orchestration.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendGoal = async () => {
    if (!input.trim() || loading) return;

    const goal = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: goal, timestamp: Date.now() }]);
    setLoading(true);

    onEvent("goal_submitted", { goal });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${apiUrl}/goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: JSON.stringify(data.task, null, 2),
          timestamp: Date.now(),
        },
      ]);
      onEvent("task_completed", data.task);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠ Connection failed. Is the Orchestrator running on port 3001?",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Title bar */}
      <div className="px-4 py-3 border-b-3 border-[var(--fg)] bg-[var(--surface)]">
        <h2 className="text-sm font-black uppercase tracking-wider">
          COMMAND INTERFACE
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${
              msg.role === "user"
                ? "border-brutal-accent bg-[var(--surface)] p-3"
                : msg.role === "system"
                  ? "border-l-4 border-[var(--border)] pl-3 text-[var(--border-heavy)] text-sm"
                  : "border-brutal bg-[var(--surface-raised)] p-3"
            }`}
          >
            <div className="mono text-xs text-[var(--border-heavy)] mb-1 uppercase">
              {msg.role === "user" ? "YOU" : msg.role === "system" ? "SYS" : "MESH"}
            </div>
            <pre className="mono text-sm whitespace-pre-wrap break-words">{msg.content}</pre>
          </div>
        ))}
        {loading && (
          <div className="border-brutal p-3 bg-[var(--surface)]">
            <div className="mono text-xs text-[var(--accent)] uppercase">
              ▓ ORCHESTRATING...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t-3 border-[var(--fg)] p-4 bg-[var(--surface)]">
        <div className="flex gap-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendGoal()}
            placeholder="Enter goal: Find me the best yield for 10 ETH..."
            className="flex-1 bg-[var(--bg)] border-3 border-[var(--fg)] border-r-0 px-4 py-3 mono text-sm text-[var(--fg)] placeholder:text-[var(--border)] outline-none focus:border-[var(--accent)]"
            disabled={loading}
          />
          <button
            onClick={sendGoal}
            disabled={loading || !input.trim()}
            className="bg-[var(--fg)] text-[var(--bg)] px-6 py-3 font-black uppercase text-sm tracking-wider border-3 border-[var(--fg)] hover:bg-[var(--accent)] hover:border-[var(--accent)] transition-colors disabled:opacity-30"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}
