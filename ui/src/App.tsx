/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

const DEFAULT_API_BASE = "https://cmva-777350106407.europe-west1.run.app";
const LS_KEY = "cocis_api_base";

function loadApiBase() {
  try {
    return localStorage.getItem(LS_KEY) || DEFAULT_API_BASE;
  } catch {
    return DEFAULT_API_BASE;
  }
}

function saveApiBase(url) {
  try {
    localStorage.setItem(LS_KEY, url);
  } catch {
    // storage blocked — silently fall back
  }
}

const LANGUAGES = [
  { code: "english", label: "English", flag: "🇬🇧", native: "English" },
  { code: "luganda", label: "Luganda", flag: "🇺🇬", native: "Luganda" },
  { code: "acholi", label: "Acholi", flag: "🇺🇬", native: "Acholi" },
];

const SUGGESTIONS = {
  english: [
    "What programs does COCIS offer?",
    "How do I apply to COCIS?",
    "Who is the Dean of COCIS?",
  ],
  luganda: [
    "COCIS kye ki?",
    "Nsobola ntya okutuuka e COCIS?",
    "Mulimu ki ogufundibwa e COCIS?",
  ],
  acholi: [
    "COCIS en ango?",
    "Amyero donyo i COCIS nining?",
    "Gin aŋo myero opwony i COCIS?",
  ],
};

/* ─── Settings Panel ─────────────────────────────────────────────────────── */
function SettingsPanel({ open, onClose, apiBase, onSave }) {
  const [draft, setDraft] = useState(apiBase);
  const [status, setStatus] = useState(null); // null | "checking" | "ok" | "error"
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Sync draft whenever panel opens
  useEffect(() => {
    if (open) {
      setDraft(apiBase);
      setStatus(null);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, apiBase]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const isDefault = draft.trim() === DEFAULT_API_BASE;
  const isChanged = draft.trim() !== apiBase;

  const testConnection = async () => {
    const url = draft.trim().replace(/\/$/, "");
    if (!url) return;
    setStatus("checking");
    try {
      const res = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  };

  const handleSave = () => {
    const clean = draft.trim().replace(/\/$/, "");
    if (!clean) return;
    onSave(clean);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_API_BASE);
    setStatus(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`settings-backdrop ${open ? "visible" : ""}`}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        className={`settings-panel ${open ? "open" : ""}`}
        ref={panelRef}
        role="dialog"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="settings-header">
          <div className="settings-title-row">
            <svg
              className="settings-title-icon"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span className="settings-title">Settings</span>
          </div>
          <button
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="settings-body">
          {/* API URL field */}
          <section className="settings-section">
            <label className="settings-label" htmlFor="api-url-input">
              API Base URL
              {!isDefault && (
                <span className="settings-badge-custom">custom</span>
              )}
            </label>
            <p className="settings-hint">
              The URL where your COCIS FastAPI server is running. Changes are
              saved to your browser.
            </p>

            <div className="settings-input-row">
              <input
                id="api-url-input"
                ref={inputRef}
                className="settings-input"
                type="url"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setStatus(null);
                }}
                placeholder="http://localhost:8000"
                spellCheck={false}
                autoComplete="off"
              />
            </div>

            {/* Default URL hint */}
            <div className="settings-default-row">
              <span className="settings-default-label">Default:</span>
              <code className="settings-default-value">{DEFAULT_API_BASE}</code>
              {!isDefault && (
                <button
                  className="settings-reset-inline"
                  onClick={handleReset}
                  title="Reset to default"
                >
                  Reset
                </button>
              )}
            </div>
          </section>

          {/* Connection test */}
          <section className="settings-section">
            <div className="settings-test-row">
              <button
                className="settings-test-btn"
                onClick={testConnection}
                disabled={status === "checking" || !draft.trim()}
              >
                {status === "checking" ? (
                  <>
                    <svg className="spinner-sm" viewBox="0 0 24 24" fill="none">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="40"
                        strokeDashoffset="15"
                      />
                    </svg>
                    Testing…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" width="14" height="14">
                      <path
                        d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Test Connection
                  </>
                )}
              </button>

              {status === "ok" && (
                <span className="conn-badge conn-ok">
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 8l3.5 3.5L13 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Reachable
                </span>
              )}
              {status === "error" && (
                <span className="conn-badge conn-error">
                  <svg viewBox="0 0 16 16" fill="none">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Unreachable
                </span>
              )}
            </div>
          </section>
        </div>

        {/* Footer actions */}
        <div className="settings-footer">
          <button className="settings-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="settings-save-btn"
            onClick={handleSave}
            disabled={!draft.trim() || !isChanged}
          >
            Save & Apply
          </button>
        </div>
      </aside>
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="message bot-message typing-message">
      <div className="bot-avatar">
        <CocsisIcon />
      </div>
      <div className="bubble typing-bubble">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  );
}

function CocsisIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="#C2410C" />
      <path
        d="M10 18C10 13.58 13.58 10 18 10C20.39 10 22.55 11.01 24.07 12.65L27 10C24.73 7.57 21.53 6 18 6C11.37 6 6 11.37 6 18C6 24.63 11.37 30 18 30C21.53 30 24.73 28.43 27 26L24.07 23.35C22.55 24.99 20.39 26 18 26C13.58 26 10 22.42 10 18Z"
        fill="#FEF3C7"
      />
      <circle cx="26" cy="18" r="4" fill="#F59E0B" />
    </svg>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("english");
  const [loading, setLoading] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [apiBase, setApiBase] = useState(loadApiBase);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const langMenuRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Close lang menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSaveApiBase = useCallback((url) => {
    setApiBase(url);
    saveApiBase(url);
  }, []);

  const isCustomUrl = apiBase !== DEFAULT_API_BASE;

  const selectedLang = LANGUAGES.find((l) => l.code === language);

  const sendMessage = async (text) => {
    const question = text || input.trim();
    if (!question || loading) return;

    setInput("");
    setHasStarted(true);

    const userMsg = { role: "user", text: question, id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${apiBase}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, language }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: data.answer,
          meta: {
            latency: data.latency_seconds,
            englishQ: data.english_question,
            englishA: data.english_answer,
          },
          id: Date.now() + 1,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Sorry, I couldn't reach the server. Please try again.",
          error: true,
          id: Date.now() + 1,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLangChange = (code) => {
    setLanguage(code);
    setLangMenuOpen(false);
  };

  return (
    <div className="app">
      {/* Decorative background */}
      <div className="bg-pattern" aria-hidden />

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiBase={apiBase}
        onSave={handleSaveApiBase}
      />

      {/* ── Header ── */}
      <header className="header">
        <div className="header-brand">
          <CocsisIcon />
          <div>
            <span className="header-title">COCIS Assistant</span>
            <span className="header-subtitle">
              College of Computing & Information Sciences
            </span>
          </div>
        </div>

        <div className="header-controls">
          {/* Language selector */}
          <div className="lang-selector" ref={langMenuRef}>
            <button
              className="lang-trigger"
              onClick={() => setLangMenuOpen((v) => !v)}
              aria-label="Select language"
            >
              <span className="lang-flag">{selectedLang.flag}</span>
              <span className="lang-name">{selectedLang.native}</span>
              <svg
                className={`chevron ${langMenuOpen ? "open" : ""}`}
                viewBox="0 0 16 16"
                fill="none"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {langMenuOpen && (
              <div className="lang-dropdown">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    className={`lang-option ${lang.code === language ? "active" : ""}`}
                    onClick={() => handleLangChange(lang.code)}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.native}</span>
                    {lang.code === language && (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="check-icon"
                      >
                        <path
                          d="M3 8l3.5 3.5L13 5"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings gear */}
          <button
            className={`settings-btn ${isCustomUrl ? "settings-btn-active" : ""}`}
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            title={isCustomUrl ? `Custom API: ${apiBase}` : "Settings"}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            {isCustomUrl && <span className="settings-dot" aria-hidden />}
          </button>
        </div>
      </header>

      {/* ── Chat area ── */}
      <main className="chat-area">
        {!hasStarted ? (
          <div className="welcome-screen">
            <div className="welcome-icon">
              <CocsisIcon />
            </div>
            <h1 className="welcome-title">Oli otya!</h1>
            <p className="welcome-sub">
              Ask me anything about COCIS — programs, admissions, faculty, and
              more. Choose your language above to get started.
            </p>
            <div className="suggestions">
              {(SUGGESTIONS[language] || SUGGESTIONS.english).map((s, i) => (
                <button
                  key={i}
                  className="suggestion-chip"
                  onClick={() => sendMessage(s)}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message ${msg.role === "user" ? "user-message" : "bot-message"}`}
              >
                {msg.role === "bot" && (
                  <div className="bot-avatar">
                    <CocsisIcon />
                  </div>
                )}
                <div className={`bubble ${msg.error ? "error-bubble" : ""}`}>
                  <p>{msg.text}</p>
                  {msg.meta && (
                    <span className="meta">{msg.meta.latency.toFixed(2)}s</span>
                  )}
                </div>
              </div>
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* ── Input bar ── */}
      <footer className="input-bar">
        <div className="input-wrap">
          <textarea
            ref={inputRef}
            className="chat-input"
            rows={1}
            placeholder={
              language === "luganda"
                ? "Buuza ekintu..."
                : language === "acholi"
                  ? "Penyo gin mo..."
                  : "Ask something about COCIS..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className={`send-btn ${loading ? "loading" : ""}`}
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            {loading ? (
              <svg className="spinner" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="40"
                  strokeDashoffset="15"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 2L15 22L11 13L2 9L22 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="footer-note">
          Powered by Phi-4 · NLLB-200 · FAISS · Makerere COCIS
        </p>
      </footer>
    </div>
  );
}
