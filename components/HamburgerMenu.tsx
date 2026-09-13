"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import HeartistLogo from "./HeartistLogo";
import { supabase } from "@/lib/supabase";
import { formatCapitalizedName, formatFullName } from "@/utils/formatName";

export default function HamburgerMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [adminReportsCount, setAdminReportsCount] = useState(0);
  const [adminAppealsCount, setAdminAppealsCount] = useState(0);
  const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(false);
  const [latestAnnId, setLatestAnnId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
        const checkStatus = async () => {
          const adminLog = localStorage.getItem("isAdminLoggedIn") === "true";
          const userLog = localStorage.getItem("isHeartistLoggedIn") === "true";
          const auStr = localStorage.getItem("activeUser");
          let userId = "";
          let uname = "";
          
          if (auStr) {
            try {
              const parsed = JSON.parse(auStr);
              userId = parsed.id || parsed.firstName;
              uname = parsed.firstName;
            } catch (e) {}
          }

          const currentUsername = adminLog ? "admin" : (uname || "guest");
          
          try {
            // Fetch unread announcements
            const readKey = `lastReadAnnouncementId_${currentUsername}`;
            const lastSeenKey = `lastSeenAnnouncementId_${currentUsername}`;
            const lastReadId = Number(localStorage.getItem(readKey) || localStorage.getItem(lastSeenKey) || 0);
            const { data: anns } = await supabase.from("announcements").select("id").order("created_at", { ascending: false }).limit(1);
            let annUnread = false;
            if (anns && anns.length > 0) {
              const latestId = String(anns[0].id);
              setLatestAnnId(latestId);
              annUnread = Number(latestId) > lastReadId;
            } else {
              setLatestAnnId(null);
            }

            let regUnread = false;
            let parsedBlueprint = null;
            const savedBlueprint = localStorage.getItem("fusionBlueprintData");
            if (savedBlueprint) {
              try {
                parsedBlueprint = JSON.parse(savedBlueprint);
              } catch(e) {}
            }
            if (parsedBlueprint && parsedBlueprint.isRegistrationOpen) {
              const lastSeenRegStamp = localStorage.getItem(`lastSeenRegistrationOpen_${currentUsername}`);
              if (parsedBlueprint.timestamp && parsedBlueprint.timestamp !== lastSeenRegStamp) {
                regUnread = true;
              }
            }

            setHasUnreadAnnouncement(annUnread || regUnread);

            // Fetch admin counts
            if (adminLog) {
               const { count: appeals } = await supabase.from("appeals").select("*", { count: 'exact', head: true }).eq("status", "pending");
               const { count: reports } = await supabase.from("reports").select("*", { count: 'exact', head: true }).eq("status", "pending");
               setAdminAppealsCount(appeals || 0);
               setAdminReportsCount(reports || 0);
            } else if (userId) {
               // Fetch unread notifications for user
               const { count: unreadNotifs } = await supabase.from("notifications").select("*", { count: 'exact', head: true }).eq("recipient_id", userId).eq("is_read", false);
               setHasUnreadMessages((unreadNotifs || 0) > 0);
            }
          } catch(e) {
            console.error("Error fetching menu counts", e);
          }

          if (adminLog || userLog) {
            setIsLoggedIn(true);
            setIsAdmin(!!adminLog);
            if (auStr) {
               try {
                 const parsed = JSON.parse(auStr);
                 if (parsed.firstName) parsed.firstName = formatCapitalizedName(parsed.firstName);
                 if (parsed.middleName) parsed.middleName = formatCapitalizedName(parsed.middleName);
                 if (parsed.lastName) parsed.lastName = formatCapitalizedName(parsed.lastName);
                 setActiveUser(parsed);
               } catch (e) {
                 setActiveUser(JSON.parse(auStr));
               }
            } else if (adminLog) {
               // Fallback just in case
               setActiveUser({ firstName: "Admin", lastName: "", avatar: "👑" });
            }
          } else {
            setIsLoggedIn(false);
            setIsAdmin(false);
            setActiveUser(null);
            setHasUnreadMessages(false);
          }
      };

      const channelId = `hamburgermenu_realtime_${Math.random().toString(36).substring(2, 9)}`;
      const channel = supabase.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
          checkStatus();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
          checkStatus();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          checkStatus();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'appeals' }, () => {
          checkStatus();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
          checkStatus();
        })
        .on('broadcast', { event: 'announcement_updated' }, () => {
          checkStatus();
        })
        .subscribe();

      checkStatus();
      window.addEventListener("storage", checkStatus);
      window.addEventListener("announcements_updated", checkStatus);
      return () => {
        window.removeEventListener("storage", checkStatus);
        window.removeEventListener("announcements_updated", checkStatus);
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, pathname]); // Re-check when menu opens or route changes

  // Prevent background scrolling when menu is open
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isOpen) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }
    };
  }, [isOpen]);

  if (pathname === "/login") return null;

  const hasUnreadHomeAnnouncement = hasUnreadAnnouncement && (isAdmin ? pathname !== "/admin" : pathname !== "/");
  const hasAnyNotification = isAdmin ? (adminAppealsCount > 0 || adminReportsCount > 0 || hasUnreadHomeAnnouncement) : (hasUnreadMessages || hasUnreadHomeAnnouncement);

  return (
    <>
      {/* Hamburger Icon */}
      <button 
        className={`hamburger-btn ${isOpen ? "open" : ""}`} 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle Menu"
        style={{ outline: "none", WebkitTapHighlightColor: "transparent" }}
      >
        <span></span>
        <span></span>
        <span></span>
        {hasAnyNotification && (
          <div style={{ position: "absolute", top: "-4px", right: "-6px", width: "12px", height: "12px", background: "#FF4444", borderRadius: "50%", zIndex: 10 }}></div>
        )}
      </button>

      {/* Backdrop (closes menu when clicked outside) */}
      <div 
        className={`sidebar-backdrop ${isOpen ? "show" : ""}`} 
        onClick={() => setIsOpen(false)}
      ></div>

      {/* Sidebar Content */}
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        {isLoggedIn && activeUser ? (
          <div style={{ display: "block", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "20px", marginBottom: "20px" }}>
            <Link href={isAdmin ? "/admin" : "/profile"} onClick={() => setIsOpen(false)} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", background: "rgba(255,234,0,0.1)", borderRadius: "50%", padding: "0", border: `2px solid ${(() => { const accounts = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('registeredAccounts') || '[]') : []; const match = accounts.find((a: any) => (a.firstName || '').toLowerCase() === (activeUser?.firstName || '').toLowerCase() && (a.lastName || '').toLowerCase() === (activeUser?.lastName || '').toLowerCase()); return (match?.team && match.team !== 'none') ? match.team : (activeUser?.team && activeUser.team !== 'none' ? activeUser.team : 'transparent'); })()}`, overflow: "hidden" }}>
                  {(activeUser.avatar && activeUser.avatar.length > 10) ? (
                    <img src={activeUser.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
      "👤"
  )}
                </div>
                <h2 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontWeight: 900, fontSize: "1.3rem", textAlign: "center", margin: 0, textTransform: "capitalize" }}>
                  {formatCapitalizedName(activeUser.firstName || "")}
                </h2>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                  {isAdmin ? "Admin View" : "View Profile"}
                </span>
              </div>
            </Link>
          </div>
        ) : (
          <div className="sidebar-header">
            <HeartistLogo width={25} height={25} className="animated-glow-text" />
            <h2 className="animated-glow-text" style={{ fontFamily: "var(--font-outfit)", fontWeight: 900, fontSize: "1.5rem" }}>EARTIST</h2>
          </div>
        )}
        
        <nav className="sidebar-nav">
          {isAdmin ? (
            <>
              <Link href="/admin" onClick={() => setIsOpen(false)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Admin Dashboard</span>
                {hasUnreadAnnouncement && pathname !== "/admin" && (
                  <span style={{ width: "8px", height: "8px", background: "red", borderRadius: "50%" }}></span>
                )}
              </Link>
              <Link href="/profile" onClick={() => setIsOpen(false)}>Admin Profile</Link>
              <Link href="/admin/community" onClick={() => setIsOpen(false)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                Community Hub
                {(adminAppealsCount > 0 || adminReportsCount > 0) && (
                  <span style={{ width: "10px", height: "10px", background: "red", borderRadius: "50%", display: "inline-block" }}></span>
                )}
              </Link>
              <Link href="/admin/fusion" onClick={() => setIsOpen(false)}>Manage Fusion</Link>
              <Link href="/admin/joint" onClick={() => setIsOpen(false)}>Manage HYN</Link>
              <Link href="/admin/prayer" onClick={() => setIsOpen(false)}>Manage Prayer Room</Link>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px", marginBottom: "5px" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)" }}>Main</div>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
              </div>
              <Link 
                href="/" 
                onClick={() => {
                  setIsOpen(false);
                  const adminLog = localStorage.getItem("isAdminLoggedIn") === "true";
                  const auStr = localStorage.getItem("activeUser");
                  let uname = "";
                  if (auStr) {
                    try { uname = JSON.parse(auStr).firstName; } catch(e) {}
                  }
                  const currentUsername = adminLog ? "admin" : (uname || "guest");
                  if (latestAnnId) {
                    localStorage.setItem(`lastSeenAnnouncementId_${currentUsername}`, latestAnnId);
                    localStorage.setItem(`lastReadAnnouncementId_${currentUsername}`, latestAnnId);
                  }
                  const savedBlueprint = localStorage.getItem("fusionBlueprintData");
                  if (savedBlueprint) {
                    try {
                      const parsedBlueprint = JSON.parse(savedBlueprint);
                      if (parsedBlueprint.timestamp) {
                        localStorage.setItem(`lastSeenRegistrationOpen_${currentUsername}`, parsedBlueprint.timestamp);
                        localStorage.setItem(`lastReadRegistrationOpen_${currentUsername}`, parsedBlueprint.timestamp);
                      }
                    } catch (e) {}
                  }
                  setHasUnreadAnnouncement(false);
                  window.dispatchEvent(new CustomEvent("announcements_updated"));
                  window.dispatchEvent(new Event("storage"));
                }} 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>Home</span>
                {hasUnreadAnnouncement && pathname !== "/" && <span style={{ width: "8px", height: "8px", background: "red", borderRadius: "50%" }}></span>}
              </Link>
              <Link href="/about" onClick={() => setIsOpen(false)}>About Us</Link>
              <Link href="/vision" onClick={() => setIsOpen(false)}>Vision & Mission</Link>
              <Link 
                href="/get-involved" 
                onClick={(e) => {
                  if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                    e.preventDefault();
                    setIsOpen(false);
                    window.location.href = "/login";
                    return;
                  }
                  setIsOpen(false);
                }}
              >
                Get Involved
              </Link>
              <Link href="/contact" onClick={() => setIsOpen(false)}>Connect</Link>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px", marginBottom: "5px" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)" }}>Activities</div>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
              </div>
              <Link 
                href="/devotion" 
                onClick={(e) => {
                  if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                    e.preventDefault();
                    setIsOpen(false);
                    window.location.href = "/login";
                    return;
                  }
                  setIsOpen(false);
                }}
              >
                Daily Devotion
              </Link>
              <Link 
                href="/prayer" 
                onClick={(e) => {
                  if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                    e.preventDefault();
                    setIsOpen(false);
                    window.location.href = "/login";
                    return;
                  }
                  setIsOpen(false);
                }}
              >
                Prayer Room
              </Link>
              <Link 
                href="/fusion" 
                onClick={(e) => {
                  if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                    e.preventDefault();
                    setIsOpen(false);
                    window.location.href = "/login";
                    return;
                  }
                  setIsOpen(false);
                }}
              >
                Fusion Camp
              </Link>
              <Link 
                href="/joint" 
                onClick={(e) => {
                  if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                    e.preventDefault();
                    setIsOpen(false);
                    window.location.href = "/login";
                    return;
                  }
                  setIsOpen(false);
                }}
              >
                Heart Youth Night
              </Link>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "5px", marginBottom: "5px" }}>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)" }}>Personal</div>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }}></div>
              </div>
              <Link 
                href="/fusion/inbox" 
                onClick={(e) => {
                  if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                    e.preventDefault();
                    setIsOpen(false);
                    window.location.href = "/login";
                    return;
                  }
                  setIsOpen(false);
                }} 
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                Inbox
                {hasUnreadMessages && (
                  <span style={{ width: "10px", height: "10px", background: "red", borderRadius: "50%", display: "inline-block" }}></span>
                )}
              </Link>
            </>
          )}

          {/* Logout Button */}
          <button 
            onClick={() => {
              setIsOpen(false);
              if (isLoggedIn) {
                localStorage.removeItem("isAdminLoggedIn");
                localStorage.removeItem("isHeartistLoggedIn");
                localStorage.removeItem("heartistUsername");
                localStorage.removeItem("heartistEmail");
                localStorage.removeItem("activeUser");
                localStorage.removeItem("activeAdmin");
              }
              window.location.href = "/login";
            }} 
            style={{ 
              background: "transparent",
              border: "none",
              borderTop: "1px solid rgba(255,255,255,0.1)", 
              borderBottom: "1px solid rgba(255,255,255,0.1)", 
              paddingTop: "15px", 
              paddingBottom: "15px", 
              marginTop: "5px",
              color: "var(--neon-yellow)",
              textAlign: "center",
              textTransform: "uppercase",
              fontFamily: "var(--font-outfit)",
              fontSize: "1.1rem",
              fontWeight: "bold",
              cursor: "pointer",
              display: "block",
              width: "100%",
              letterSpacing: "2px"
            }}
          >
            {isLoggedIn ? "LOGOUT" : "LOGIN"}
          </button>
        </nav>

        {/* Social Media Links */}
        <div className="sidebar-socials">
          {/* Facebook Icon */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-1.1 0-2 .9-2 2v1h3l-1 3h-2v6.8c4.56-.93 8-4.96 8-9.8z"/>
            </svg>
          </a>
          {/* Instagram Icon */}
          <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 2.16c-2.67 0-3.004.01-4.058.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.054-.058 1.388-.058 4.058 0 2.67.01 3.004.058 4.058.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.388.058 4.058.058 2.67 0 3.004-.01 4.058-.058.975-.045 1.504-.207 1.857-.344.467-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.054.058-1.388.058-4.058 0-2.67-.01-3.004-.058-4.058-.045-.975-.207-1.504-.344-1.857a3.097 3.097 0 0 0-.748-1.15 3.098 3.098 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.054-.048-1.388-.058-4.058-.058zM12 6.865a5.135 5.135 0 1 0 0 10.27 5.135 5.135 0 0 0 0-10.27zm0 8.11a2.975 2.975 0 1 1 0-5.95 2.975 2.975 0 0 1 0 5.95zm3.535-7.394a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z"/>
            </svg>
          </a>
        </div>
      </div>
    </>
  );
}
