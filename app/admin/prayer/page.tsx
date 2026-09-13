"use client";
import { formatCapitalizedName } from "@/utils/formatName";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { fetchPrayers, PrayerData } from "@/lib/prayerSync";
import BadgeIcon from "@/components/BadgeIcon";

export default function AdminPrayerPage() {
  const [prayers, setPrayers] = useState<any[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [userAccounts, setUserAccounts] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "answered">("active");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [prayerToDelete, setPrayerToDelete] = useState<{id: string, isLocal: boolean} | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
    // Auth Protection
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("isAdminLoggedIn")) {
        window.location.href = "/admin";
        return;
      }
    }
    loadData();
    
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPrayers();
      
      const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url, team, badge');
      const pMap: Record<string, string> = {};
      const aMap: Record<string, any> = {};
      
      if (profiles) {
        profiles.forEach(p => {
          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          pMap[p.id] = fullName;
          
          const accObj = {
            id: p.id,
            supabase_id: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            avatar: p.avatar_url,
            team: p.team,
            badge: p.badge
          };
          
          aMap[p.id] = accObj;
          aMap[fullName] = accObj;
          if (p.first_name) aMap[p.first_name] = accObj;
        });
      }

      let localPrayers: any[] = [];
      if (typeof window !== "undefined") {
        const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
        accounts.forEach((acc: any) => {
          if (acc.id) {
            pMap[acc.id] = `${acc.firstName || ''} ${acc.lastName || ''}`.trim();
            aMap[acc.id] = acc;
          }
          if (acc.supabase_id) {
            pMap[acc.supabase_id] = `${acc.firstName || ''} ${acc.lastName || ''}`.trim();
            aMap[acc.supabase_id] = acc;
          }
          const fullName = `${acc.firstName || ''} ${acc.lastName || ''}`.trim();
          aMap[fullName] = acc;
          if (acc.firstName) aMap[acc.firstName] = acc;
        });

        // Load local fallback prayers
        const communityPosts = JSON.parse(localStorage.getItem("communityPosts") || "[]");
        const fusionPrayers = JSON.parse(localStorage.getItem("fusionPrayers") || "[]");
        
        const localCommPrayers = communityPosts
            .filter((p: any) => p.category === "Prayer Request" && !p.isSupabaseSynced)
            .map((p: any) => ({
              id: String(p.id),
              author_id: p.author_id || p.authorId || null,
              author_name: p.author_name ? formatCapitalizedName(p.author_name) : (p.username ? formatCapitalizedName(p.username) : "Anonymous Heartist"),
              request: p.request || p.content || "",
              category: "Others",
              likes: p.likes || [],
            is_private: p.isAnonymous || false,
            status: 'active',
            hearts: [],
            answer_comment: null,
            answered_timestamp: null,
            created_at: p.created_at || (p.timestamp ? new Date(p.timestamp).toISOString() : (typeof p.id === 'number' ? new Date(p.id).toISOString() : new Date().toISOString())),
            _localRealName: p.realName || p.username || p.authorId || p.name,
            isLocal: true
          }));

          const localFusionPrayers = fusionPrayers.map((p: any) => ({
              id: String(p.id),
              author_id: p.author_id || p.authorId || null,
              author_name: p.author_name ? formatCapitalizedName(p.author_name) : (p.username ? formatCapitalizedName(p.username) : "Anonymous Heartist"),
              request: p.request || p.content || "",
              category: p.category,
              likes: p.likes || [],
            is_private: p.isAnonymous || false,
            status: p.status || 'active',
            hearts: p.hearts || [],
            answer_comment: p.answerComment || null,
              answered_timestamp: null,
              created_at: p.created_at || (p.timestamp ? new Date(p.timestamp).toISOString() : (typeof p.id === 'number' ? new Date(p.id).toISOString() : new Date().toISOString())),
              _localRealName: p._localRealName || p.author_name || p.username || p.name || "",
              isLocal: true
        }));
        
        localPrayers = [...localCommPrayers, ...localFusionPrayers];
      }
      
      setUserProfiles(pMap);
      setUserAccounts(aMap);

      const allPrayers = [...localPrayers, ...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const uniquePrayers = Array.from(new Map(allPrayers.map(item => [item.id, item])).values());
      
      setPrayers(uniquePrayers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!prayerToDelete) return;
    const { id, isLocal } = prayerToDelete;
    try {
      const p = prayers.find(p => p.id === id);
      
      // Hard delete from Supabase
      await supabase.from("prayers").delete().eq("id", id);
      
      // Always remove from local storages
      if (typeof window !== "undefined") {
        const communityPosts = JSON.parse(localStorage.getItem("communityPosts") || "[]");
        const newComm = communityPosts.filter((cp: any) => String(cp.id) !== id);
        localStorage.setItem("communityPosts", JSON.stringify(newComm));

        const fusionPrayers = JSON.parse(localStorage.getItem("fusionPrayers") || "[]");
        const newFusion = fusionPrayers.filter((fp: any) => String(fp.id) !== id);
        localStorage.setItem("fusionPrayers", JSON.stringify(newFusion));
        
        window.dispatchEvent(new Event("storage"));
      }
      
      // Push Notification
      if (p) {
        const authorToNotify = p._localRealName || p.author_name;
        if (authorToNotify) {
          const notifs = JSON.parse(localStorage.getItem("communityNotifications") || "[]");
          notifs.push({
            id: Date.now() + Math.floor(Math.random() * 100),
            type: "prayer_deleted",
            message: "Admin deleted your post/comment because it violates our guidelines.",
            targetUser: authorToNotify,
            postAuthor: authorToNotify,
            timestamp: Date.now(),
            read: false
          });
          localStorage.setItem("communityNotifications", JSON.stringify(notifs));
          try { supabase.channel('public-notifications').send({ type: 'broadcast', event: 'new_notif', payload: notifs[notifs.length - 1] }); } catch(e){}

          // Also push to Inbox
          const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
          if (!inboxData[authorToNotify]) inboxData[authorToNotify] = [];
          inboxData[authorToNotify].push({
            id: Date.now(),
            type: "PRAYER DELETED",
            content: "Admin deleted your post/comment because it violates our guidelines.",
            timestamp: new Date().toLocaleString(),
            read: false
          });
          localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
          window.dispatchEvent(new Event("storage"));
        }
      }

      setPrayers(prev => prev.filter(p => p.id !== id));
      setPrayerToDelete(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete prayer.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "black", color: "white", fontFamily: "var(--font-outfit)", paddingBottom: "100px" }}>
      {toastMessage && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#d50000", color: "white", padding: "10px 20px", borderRadius: "8px", zIndex: 9999, fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toastMessage}
        </div>
      )}
      {/* Custom Delete Modal */}
      {prayerToDelete && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 3000,
          display: "flex", justifyContent: "center", alignItems: "center",
          animation: "fadeIn 0.3s ease"
        }}>
          <div style={{
            background: "var(--card-bg, #1a1a1a)", border: "1px solid rgba(255,68,68,0.5)",
            borderRadius: "16px", width: "90%", maxWidth: "400px", padding: "25px",
            animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255,68,68,0.2)",
            textAlign: "center"
          }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "15px" }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#FF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </div>
            <h3 style={{ margin: "0 0 10px 0", color: "#FF4444", fontFamily: "var(--font-outfit)", fontSize: "1.3rem" }}>
              Delete Prayer?
            </h3>
            <p style={{ color: "var(--text-muted, #999)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "25px" }}>
              Are you sure you want to delete this prayer? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button 
                onClick={() => setPrayerToDelete(null)}
                style={{ flex: 1, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                style={{ flex: 1, background: "#FF4444", color: "white", border: "none", padding: "10px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <header style={{ padding: "40px 20px 20px 20px", textAlign: "center", borderBottom: "1px solid rgba(255, 51, 102, 0.3)", background: "linear-gradient(to bottom, rgba(255,51,102,0.1), transparent)" }}>
        <h1 style={{ fontSize: "2.5rem", color: "#ff3366", margin: 0, letterSpacing: "1px", textTransform: "uppercase" }}>
          PRAYER ROOM ADMIN
        </h1>
        <p style={{ marginTop: "10px", color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Manage prayer requests and view true authors.
        </p>
      </header>

      <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "30px" }}>
          <button 
            onClick={() => setActiveTab("active")}
            style={{ 
              flex: 1, padding: "15px", background: "transparent", border: "none", 
              borderBottom: activeTab === "active" ? "2px solid var(--neon-yellow)" : "2px solid transparent",
              color: activeTab === "active" ? "var(--neon-yellow)" : "var(--text-muted)",
              fontFamily: "var(--font-outfit)", fontSize: "1rem", cursor: "pointer", transition: "all 0.3s"
            }}
          >
            Active Prayers
          </button>
          <button 
            onClick={() => setActiveTab("answered")}
            style={{ 
              flex: 1, padding: "15px", background: "transparent", border: "none", 
              borderBottom: activeTab === "answered" ? "2px solid var(--neon-white)" : "2px solid transparent",
              color: activeTab === "answered" ? "var(--neon-white)" : "var(--text-muted)",
              fontFamily: "var(--font-outfit)", fontSize: "1rem", cursor: "pointer", transition: "all 0.3s"
            }}
          >
            Answered
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading prayers...</p>
        ) : prayers.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>No prayers found.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {prayers.filter(p => p.status === activeTab).map((prayer) => {
              // Determine real author name
              let realName = prayer.author_name;
              let searchKey = prayer.author_id || prayer.author_name;
              let isUnmasked = false;

              if (prayer.is_private || realName === "Anonymous Heartist") {
                 if (prayer._localRealName) {
                   realName = prayer._localRealName;
                   searchKey = prayer.author_id || prayer._localRealName;
                   isUnmasked = true;
                 } else if (prayer.author_id && userProfiles[prayer.author_id]) {
                   realName = userProfiles[prayer.author_id];
                   searchKey = prayer.author_id;
                   isUnmasked = true;
                 } else {
                   realName = "Unknown (No profile found)";
                   isUnmasked = true;
                 }
              }

              const acc = userAccounts[searchKey] || userAccounts[realName];
              let avatar = "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
              let teamColor = "transparent";
              let postRole = "Heartist";

              if (acc) {
                avatar = acc.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                teamColor = (acc.team && acc.team !== 'none') ? acc.team : "transparent";
                postRole = acc.badge || "Heartist";
              }

              if (prayer.is_private) {
                postRole = "anonymous";
              }

              return (
                <div key={prayer.id} style={{ 
                  background: "rgba(255,255,255,0.05)", 
                  padding: "20px", 
                  borderRadius: "10px", 
                  borderLeft: `4px solid var(--neon-yellow)`,
                  position: "relative"
                }}>
                  
                  {/* 3 Dots Menu */}
                  <div 
                    onClick={() => setOpenMenuId(openMenuId === prayer.id ? null : prayer.id)}
                    style={{ position: "absolute", top: "15px", right: "15px", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold", padding: "5px 10px", color: "var(--text-muted)", letterSpacing: "2px", zIndex: 10 }}
                    title="Options"
                  >
                    ...
                  </div>
                  {openMenuId === prayer.id && (
                    <div style={{ position: "absolute", top: "50px", right: "20px", background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "10px 0", zIndex: 10, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", minWidth: "120px", display: "flex", flexDirection: "column" }}>
                      <div 
                        onClick={() => { setPrayerToDelete({ id: prayer.id, isLocal: prayer.isLocal }); setOpenMenuId(null); }} 
                        style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.95rem" }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,68,68,0.1)"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        Delete
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    
                    <div style={{ display: "flex", gap: "15px", alignItems: "flex-start" }}>
                      {/* Avatar */}
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <div style={{
                          minWidth: "45px", minHeight: "45px", width: "45px", height: "45px", borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", overflow: "hidden", border: `2px solid ${teamColor}`
                        }}>
                          {avatar.length > 10 ? (
                            <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                          ) : (
      <div style={{width: "100%", height: "100%", background: "transparent", color: "var(--neon-yellow)", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", textTransform: "uppercase", fontSize: "1.2rem", fontFamily: "var(--font-outfit)"}}>
        {(() => {
           if(prayer.is_private) return "AN";
           let n = (typeof acc !== 'undefined' && acc) ? (acc.firstName + " " + acc.lastName) : (typeof realName !== 'undefined' ? realName : ((prayer as any).author_name || "A"));
           if(typeof n !== 'string') n="A";
           const parts = n.trim().split(" ");
           return (parts[0]?.[0]||"") + (parts.length>1 ? parts[parts.length-1]?.[0]||"" : "");
        })()}
      </div>
  )}
  </div>
                        <div style={{ position: "absolute", bottom: "-2px", right: "-4px", background: "var(--bg-main, #0a0a0c)", borderRadius: "50%", padding: "3px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, border: "1px solid rgba(255,255,255,0.2)" }}>
                          <BadgeIcon badge={postRole} size={13} />
                        </div>
                      </div>

                      {/* Name & Details */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <h3 style={{ margin: "0", fontSize: "1.1rem", color: "var(--neon-white)", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ color: "var(--neon-yellow)" }}>
                            {prayer.is_private ? "Anonymous Heartist" : realName}
                          </span>
                        </h3>
                        
                        {/* Hidden Real Name revealed */}
                        {isUnmasked && (
                          <div style={{ background: "rgba(255, 68, 68, 0.1)", border: "1px solid rgba(255,68,68,0.3)", padding: "4px 8px", borderRadius: "5px", display: "inline-block", width: "fit-content" }}>
                            <span style={{ fontSize: "0.8rem", color: "#ff4444" }}>
                              <strong>Real Name:</strong> {realName}
                            </span>
                          </div>
                        )}

                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", gap: "10px" }}>
                          <span>{new Date(prayer.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "20px", width: "100%", textAlign: "center" }}>
                    <p style={{ margin: "15px 0 0 0", color: "var(--neon-white)", whiteSpace: "pre-wrap", lineHeight: "1.6", fontSize: "1rem", fontFamily: "var(--font-outfit)" }}>
                      {prayer.request}
                    </p>
                  </div>

                  {prayer.status === 'answered' && (
                    <div style={{ marginTop: "15px", padding: "10px", background: "rgba(0,255,0,0.1)", border: "1px dashed rgba(0,255,0,0.3)", borderRadius: "5px", textAlign: "center" }}>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#00C851" }}><strong>Answered Testimony:</strong> {prayer.answer_comment}</p>
                    </div>
                  )}

                  <div style={{ textAlign: "right", marginTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px", width: "100%" }}>
                    <span style={{ color: "var(--neon-yellow)", fontSize: "0.85rem", fontStyle: "italic" }}>{prayer.category}</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
