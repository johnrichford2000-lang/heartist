"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HeartistLogo from "@/components/HeartistLogo";

import { supabase } from "@/lib/supabase";

export default function InboxPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const f = searchParams.get("filter");
      if (f && ["All", "Warnings", "Penalties", "Reports", "Deleted", "Others"].includes(f)) {
        setFilter(f);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeUserStr = localStorage.getItem("activeUser");
      if (!activeUserStr) {
        window.location.href = "/login";
        return;
      }
      const activeUser = JSON.parse(activeUserStr);
      const u = activeUser.firstName;
      setUsername(u);
      setUserId(activeUser.id || u);

      const loadInbox = async () => {
        try {
          const { data, error } = await supabase.from('notifications').select('*').eq('recipient_id', activeUser.id || u).order('created_at', { ascending: false });
          
          if (!error && data) {
                          const formatted = data.map((n: any) => {
                 let parsedMessage = n.message;
                 let parsedReason = '';
                 try {
                     const parsed = JSON.parse(n.message);
                     if (parsed.message) {
                         parsedMessage = parsed.message;
                         parsedReason = parsed.reasonText || parsed.reason || '';
                     }
                 } catch (e) {}
                 return {
                     id: n.id,
                     type: n.type,
                     content: {
                        text: parsedMessage,
                        snippet: n.post_id ? `Ref: ${n.post_id.substring(0, 8)}...` : '',
                        action: '',
                        reason: parsedReason
                     },
                     timestamp: new Date(n.created_at).toLocaleString(),
                     read: n.is_read
                 };
             });
             
             // Legacy
             const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
             const myMessages = inboxData[u] || [];
             
             const combined = [...formatted, ...myMessages];
             combined.sort((a: any, b: any) => {
                const ta = a.created_at ? new Date(a.created_at).getTime() : a.id;
                const tb = b.created_at ? new Date(b.created_at).getTime() : b.id;
                return tb - ta;
             });
             setMessages(combined);
          }
        } catch (e) {
          console.error(e);
        }
      };

      loadInbox();
      
      const onStorage = () => loadInbox();
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }
  }, []);

  const deleteMessage = async (id: number | string) => {
    if (typeof id === 'string' && id.length === 36) {
       await supabase.from('notifications').delete().eq('id', id);
    }
    
    const updated = messages.filter(m => m.id !== id);
    setMessages(updated);
    if (typeof window !== "undefined") {
      const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
      if (inboxData[username]) {
         inboxData[username] = inboxData[username].filter((m: any) => m.id !== id);
         localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
         window.dispatchEvent(new Event("storage"));
      }
    }
  };

  const markAllAsRead = async () => {
    if (userId) {
       await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', userId);
    }

    if (typeof window !== "undefined") {
      const inbox = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
      if (inbox[username]) {
        inbox[username] = inbox[username].map((m: any) => {
          if (m.read) return m; // Already read
          
          if (filter === "All") return { ...m, read: true };
          
          const t = m.type ? m.type.toUpperCase() : "MESSAGE";
          if (filter === "Warnings" && t.includes("WARN")) return { ...m, read: true };
          if (filter === "Penalties" && t.includes("PENALTY")) return { ...m, read: true };
          if (filter === "Reports" && t.includes("REPORT")) return { ...m, read: true };
          if (filter === "Deleted" && t.includes("DELETE")) return { ...m, read: true };
          if (filter === "Others" && !t.includes("WARN") && !t.includes("PENALTY") && !t.includes("REPORT") && !t.includes("DELETE")) return { ...m, read: true };
          
          return m;
        });
        localStorage.setItem("fusionInbox", JSON.stringify(inbox));
        window.dispatchEvent(new Event("storage"));
        setMessages(inbox[username].sort((a: any, b: any) => b.id - a.id));
      }
    }
  };

  const markSingleAsRead = (id: number) => {
    if (typeof window !== "undefined") {
      const inbox = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
      if (inbox[username]) {
        let changed = false;
        inbox[username] = inbox[username].map((m: any) => {
          if (m.id === id && !m.read) {
            changed = true;
            return { ...m, read: true };
          }
          return m;
        });
        if (changed) {
          localStorage.setItem("fusionInbox", JSON.stringify(inbox));
          window.dispatchEvent(new Event("storage"));
          setMessages(inbox[username].sort((a: any, b: any) => b.id - a.id));
        }
      }
    }
  };

  return (
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      <header className="top-header" style={{ marginBottom: "30px" }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "10px" }}>
          INBOX
        </h1>
        <p className="logo-sub">Notifications & Warnings</p>
      </header>

      <section style={{ marginBottom: "40px" }}>
        {messages.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "50px 20px", borderTop: "2px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px", opacity: 0.5, color: "var(--text-muted)" }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
              </svg>
            </div>
            <h3 style={{ color: "var(--text-muted)", fontFamily: "var(--font-outfit)", fontSize: "1.2rem", margin: 0 }}>Your inbox is empty.</h3>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "10px", marginBottom: "25px", flexWrap: "wrap", justifyContent: "center", alignItems: "center" }}>
              {["All", "Warnings", "Penalties", "Reports", "Deleted", "Others"].map(f => {
                const hasUnreadInFilter = messages.some(m => {
                  if (m.read) return false;
                  if (f === "All") return true;
                  const t = m.type ? m.type.toUpperCase() : "MESSAGE";
                  if (f === "Warnings") return t.includes("WARN");
                  if (f === "Penalties") return t.includes("PENALTY");
                  if (f === "Reports") return t.includes("REPORT");
                  if (f === "Deleted") return t.includes("DELETE");
                  if (f === "Others") return !t.includes("WARN") && !t.includes("PENALTY") && !t.includes("REPORT") && !t.includes("DELETE");
                  return false;
                });

                return (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{ 
                      position: "relative",
                      padding: "8px 18px", 
                      borderRadius: "20px", 
                      border: filter === f ? "2px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.2)", 
                      background: filter === f ? "rgba(255,234,0,0.1)" : "transparent", 
                      color: filter === f ? "#FFF" : "var(--text-muted)", 
                      cursor: "pointer",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      fontSize: "0.9rem",
                      transition: "all 0.3s ease"
                    }}
                  >
                    {f}
                    {hasUnreadInFilter && (
                      <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "12px", height: "12px", background: "#FF4444", borderRadius: "50%", border: "2px solid var(--bg-main)", zIndex: 5 }}></span>
                    )}
                  </button>
                );
              })}
              
              {messages.some(m => {
                  if (m.read) return false;
                  if (filter === "All") return true;
                  const t = m.type ? m.type.toUpperCase() : "MESSAGE";
                  if (filter === "Warnings") return t.includes("WARN");
                  if (filter === "Penalties") return t.includes("PENALTY");
                  if (filter === "Reports") return t.includes("REPORT");
                  if (filter === "Deleted") return t.includes("DELETE");
                  if (filter === "Others") return !t.includes("WARN") && !t.includes("PENALTY") && !t.includes("REPORT") && !t.includes("DELETE");
                  return false;
              }) && (
                <button 
                  onClick={markAllAsRead}
                  style={{ 
                    padding: "8px 18px", 
                    borderRadius: "20px", 
                    border: "1px solid #FF4444", 
                    background: "rgba(255,68,68,0.1)", 
                    color: "#FF4444", 
                    cursor: "pointer",
                    fontFamily: "var(--font-outfit)",
                    fontWeight: "bold",
                    fontSize: "0.9rem",
                    transition: "all 0.3s ease",
                    marginLeft: "auto"
                  }}
                >
                  Mark {filter === "All" ? "All" : filter} As Read
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {(() => {
                const filteredMessages = messages.filter(m => {
                  if (filter === "All") return true;
                  const t = m.type ? m.type.toUpperCase() : "MESSAGE";
                  if (filter === "Warnings") return t.includes("WARN");
                  if (filter === "Penalties") return t.includes("PENALTY");
                  if (filter === "Reports") return t.includes("REPORT");
                  if (filter === "Deleted") return t.includes("DELETE");
                  if (filter === "Others") return !t.includes("WARN") && !t.includes("PENALTY") && !t.includes("REPORT") && !t.includes("DELETE");
                  return true;
                });

                if (filteredMessages.length === 0) {
                  return (
                    <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No messages found for "{filter}".
                    </div>
                  );
                }

                return filteredMessages.map(msg => (
                  <div onClick={() => markSingleAsRead(msg.id)} key={msg.id} className="card" style={{ 
                    borderLeft: "4px solid #FF3366", 
                    position: "relative", 
                    cursor: "pointer",
                    background: msg.read ? "rgba(255, 51, 102, 0.03)" : "rgba(255, 51, 102, 0.15)",
                    transition: "all 0.3s ease"
                  }}>
                    <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ color: "#FF3366", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                        {msg.type || "MESSAGE"}
                        {!msg.read && <span style={{ width: "8px", height: "8px", background: "#FF3366", borderRadius: "50%" }}></span>}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: "4px" }}>
                        {msg.timestamp}
                      </div>
                    </div>
                    
                    {typeof msg.content === "object" ? (
                      <div style={{ color: "var(--neon-white)", fontSize: "0.95rem", lineHeight: "1.5", margin: "0 0 15px 0" }}>
                        {msg.content.text} <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>&quot;{msg.content.snippet}&quot;</span> <span style={{ color: "#FF4444", fontWeight: "bold" }}>{msg.content.action}</span>
                        <br/><br/>
                        <span style={{ color: "var(--neon-yellow)" }}>Reason: {msg.content.reason}</span>
                      </div>
                    ) : (
                      <p style={{ color: "var(--neon-white)", fontSize: "1rem", lineHeight: "1.5", margin: "0 0 15px 0", whiteSpace: "pre-wrap" }}>
                        {msg.content}
                      </p>
                    )}

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                        style={{ background: "rgba(255,68,68,0.1)", border: "1px solid #FF4444", borderRadius: "6px", color: "#FF4444", padding: "5px 10px", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.3s" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </>
        )}
      </section>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <button onClick={() => router.back()} className="nav-item" style={{ padding: "10px 20px", background: "transparent", border: "1px solid var(--neon-yellow)", borderRadius: "8px", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", cursor: "pointer", fontSize: "1rem" }}>
          Go Back
        </button>
      </div>
    </main>
  );
}
