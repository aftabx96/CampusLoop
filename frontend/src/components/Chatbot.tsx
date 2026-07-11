import { useState } from "react";
import { createPortal } from "react-dom";
import { api, errMsg } from "../lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ChatBot({ open, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [messages, setMessages] = useState<
    { sender: "user" | "ai"; text: string }[]
  >([
    {
      sender: "ai",
      text: "👋 Hi! I'm your CampusLoop AI Assistant. How can I help you?",
    },
  ]);

  if (!open) return null;

  const sendMessage = async () => {
    if (!message.trim() || sending) return;

    const userMessage = message;

    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userMessage,
      },
    ]);

    setMessage("");
    setSending(true);

    try {
      // Goes through the NestJS backend proxy (POST /ai/chat) — the AI
      // provider key lives only in the backend .env, never in the browser.
      const { data } = await api.post("/ai/chat", { message: userMessage });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: data.reply,
        },
      ]);
    } catch (err) {
      console.log(err);

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: errMsg(err) || "❌ AI is unavailable.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      style={{
        position: "fixed",
        right: 20,
        bottom: 20,
        width: 360,
        height: "min(520px, 80vh)",
        maxHeight: "80vh",
        background: "white",
        borderRadius: 15,
        boxShadow: "0 0 20px rgba(0,0,0,.2)",
        display: "flex",
        flexDirection: "column",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#4f46e5",
          color: "white",
          padding: 15,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <strong>CampusLoop AI</strong>

        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: 18,
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 15,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.sender === "user" ? "right" : "left",
              marginBottom: 10,
            }}
          >
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 10,
                background:
                  m.sender === "user" ? "#4f46e5" : "#f1f1f1",
                color: m.sender === "user" ? "white" : "black",
              }}
            >
              {m.text}
            </span>
          </div>
        ))}
        {sending && (
          <div style={{ textAlign: "left", marginBottom: 10 }}>
            <span
              style={{
                display: "inline-block",
                padding: "8px 12px",
                borderRadius: 10,
                background: "#f1f1f1",
                color: "#666",
              }}
            >
              Thinking…
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          padding: 10,
          borderTop: "1px solid #ddd",
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          placeholder="Ask anything..."
          disabled={sending}
          autoComplete="off"
          name="campusloop-ai-chat-input"
          style={{
            flex: 1,
            padding: 10,
          }}
        />

        <button
          onClick={sendMessage}
          disabled={sending}
          style={{
            marginLeft: 8,
            padding: "10px 16px",
          }}
        >
          Send
        </button>
      </div>
    </div>,
    document.body
  );
}
