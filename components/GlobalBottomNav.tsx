"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAnnouncements, fetchSystemSetting } from "@/lib/fusionSync";

export default function GlobalBottomNav() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [canvasUnreadNotifs, setCanvasUnreadNotifs] = useState(0);
  const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(false);
  const [latestAnnId, setLatestAnnId] = useState<string | null>(null);

  useEffect(() => {
    const checkNotifs = async () => {
      const activeUserStr = localStorage.getItem("activeUser");
      const isAdminLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
      const currentUsername = isAdminLoggedIn ? "admin" : (activeUserStr ? JSON.parse(activeUserStr).firstName : "guest");
      
      let anns = await fetchAnnouncements();
      if (!anns || anns.length === 0) {
        anns = JSON.parse(localStorage.getItem("communityAnnouncements") || "[]");
      }
      
      const lastSeenId = Number(localStorage.getItem(`lastSeenAnnouncementId_${currentUsername}`) || localStorage.getItem(`lastReadAnnouncementId_${currentUsername}`) || 0);
      let annUnread = false;
      if (anns.length > 0) {
        const latestId = anns[anns.length - 1].id.toString();
        setLatestAnnId(latestId);
        annUnread = Number(latestId) > lastSeenId;
      }
      
      let regUnread = false;
      let parsedBlueprint = await fetchSystemSetting("fusionBlueprintData");
      if (!parsedBlueprint) {
        const savedBlueprint = localStorage.getItem("fusionBlueprintData");
        if (savedBlueprint) {
          try {
            parsedBlueprint = JSON.parse(savedBlueprint);
          } catch(e) {}
        }
      }
      
      if (parsedBlueprint && parsedBlueprint.isRegistrationOpen) {
        const lastSeenRegStamp = localStorage.getItem(`lastSeenRegistrationOpen_${currentUsername}`);
        if (parsedBlueprint.timestamp && parsedBlueprint.timestamp !== lastSeenRegStamp) {
          regUnread = true;
        }
      }
      
      setHasUnreadAnnouncement(annUnread || regUnread);

      if (!activeUserStr) return;
      const currentUserObj = JSON.parse(activeUserStr);
      
      let supabaseUnread = 0;
      let everyoneUnread = 0;
      try {
          if (currentUserObj.id || currentUsername) {
            const badgeClearedAt = Number(localStorage.getItem(`navBadgeClearedAt_${currentUsername}`) || 0);
            const badgeClearedIso = new Date(badgeClearedAt).toISOString();

            let userUuid = currentUserObj.id;
            if (!userUuid || !userUuid.includes("-")) {
              const rawAccs = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
              const found = rawAccs.find((a: any) => 
                (currentUsername && a.firstName?.toLowerCase() === currentUsername?.toLowerCase()) &&
                (currentUserObj.lastName && a.lastName?.toLowerCase() === currentUserObj.lastName?.toLowerCase())
              );
              if (found?.id) userUuid = found.id;
            }

            const targetRecipientIds = Array.from(new Set([
              currentUserObj.id,
              userUuid,
              currentUsername,
              `${currentUserObj.firstName} ${currentUserObj.lastName}`.trim(),
              currentUsername?.toLowerCase(),
              currentUserObj.email?.toLowerCase()
            ])).filter(Boolean);

            const { data: unreadRows } = await supabase
              .from('notifications')
              .select('id, message, type, created_at')
              .in('recipient_id', targetRecipientIds)
              .gt('created_at', badgeClearedIso)
              .eq('is_read', false); // Still only count unread ones even if newer than badge clear

            if (unreadRows) {
              const seenUnreadKeys = new Set<string>();
              unreadRows.forEach((r: any) => {
                let key = r.id;
                try {
                  if (r.message && typeof r.message === "string") {
                    const parsed = JSON.parse(r.message);
                    if (parsed.id) key = parsed.id;
                  }
                } catch (e) {}
                seenUnreadKeys.add(key);
              });
              supabaseUnread = seenUnreadKeys.size;
            }
            
            // Fetch @everyone mentions to check against canvas
            const lastSeenCanvasStamp = Number(localStorage.getItem(`lastSeenCanvas_${currentUsername}`) || 0);
            const { data: evData } = await supabase
              .from('notifications')
              .select('created_at')
              .eq('recipient_id', 'everyone')
              .eq('type', 'mention');
              
            if (evData) {
               everyoneUnread = evData.filter((n: any) => new Date(n.created_at).getTime() > lastSeenCanvasStamp).length;
            }
          }
       } catch(e) {}
       
       setUnreadNotifs(supabaseUnread);
       setCanvasUnreadNotifs(everyoneUnread);
    };

    // 1. Web BroadcastChannel for same-browser instant sync (0ms)
    let webBc: any = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        webBc = new window.BroadcastChannel("heartist_notifs_sync");
        webBc.onmessage = () => {
          checkNotifs();
        };
      } catch (e) {}
    }

    // 2. Canonical Supabase Realtime channel 'public-notifications'
    const channel = supabase.channel('public-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        checkNotifs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        checkNotifs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        checkNotifs();
      })
      .on('broadcast', { event: 'announcement_updated' }, () => {
        checkNotifs();
      })
      .on('broadcast', { event: 'new_notif' }, () => {
        checkNotifs();
      })
      .subscribe();

    checkNotifs();
    const pollInterval = setInterval(checkNotifs, 30000);
    window.addEventListener('storage', checkNotifs);
    window.addEventListener('announcements_updated', checkNotifs);
    window.addEventListener('badge_updated', checkNotifs);
    window.addEventListener('heartist_notification_event', checkNotifs);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('storage', checkNotifs);
      window.removeEventListener('announcements_updated', checkNotifs);
      window.removeEventListener('badge_updated', checkNotifs);
      window.removeEventListener('heartist_notification_event', checkNotifs);
      supabase.removeChannel(channel);
      if (webBc) webBc.close();
    };
  }, []);

  // Auto-scroll to active tab on mount and route change so it is always visible on CP/Tablet
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        setTimeout(() => {
          activeEl.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
        }, 100);
      }
    }
  }, [pathname]);

  const scrollNav = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const start = container.scrollLeft;
      const end = direction === 'left' ? 0 : container.scrollWidth - container.clientWidth;
      const duration = 400; // 400ms for a smooth slide
      let startTime: number | null = null;

      const animateScroll = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        container.scrollLeft = start + (end - start) * ease;

        if (timeElapsed < duration) {
          requestAnimationFrame(animateScroll);
        }
      };
      
      requestAnimationFrame(animateScroll);
    }
  };

  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdmin = () => {
      const activeUserStr = localStorage.getItem("activeUser");
      let activeIsAdmin = false;
      if (activeUserStr) {
        try {
          const parsed = JSON.parse(activeUserStr);
          activeIsAdmin = parsed.badge === "Admin" || parsed.badge === "admin" || parsed.isAdmin === true;
        } catch(e) {}
      }
      const adminStorage = localStorage.getItem("isAdminLoggedIn") === "true";
      setIsAdmin(adminStorage || activeIsAdmin);
    };
    checkAdmin();
    window.addEventListener("storage", checkAdmin);
    return () => window.removeEventListener("storage", checkAdmin);
  }, []);

  // Do not show on fusion or admin or login, or on profile if admin, or on get-involved if admin
  if (
    pathname &&
    ((pathname.startsWith('/fusion') && pathname !== '/fusion/trash') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/login') ||
      (pathname.startsWith('/profile') && isAdmin) ||
      (pathname.startsWith('/get-involved') && isAdmin))
  ) {
    return null;
  }

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", background: "rgba(10, 10, 10, 0.95)", borderTop: "1px solid rgba(255, 234, 0, 0.3)", backdropFilter: "blur(10px)", zIndex: 1000 }}>
      {/* Left Arrow (hidden by CSS on touch screens to prevent overlapping taps) */}
      <button onClick={() => scrollNav('left')} className="nav-scroll-arrow" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "32px", background: "transparent", border: "none", color: "var(--neon-yellow)", cursor: "pointer", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: "6px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <div ref={scrollRef} className="responsive-bottom-nav-container custom-scrollbar">
        
        {/* Main */}
        <Link href="/" data-active={pathname === "/" ? "true" : undefined} onClick={() => {
          const activeUserStr = localStorage.getItem("activeUser");
          const isAdminLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
          const currentUsername = isAdminLoggedIn ? "admin" : (activeUserStr ? JSON.parse(activeUserStr).firstName : "guest");
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
        }} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: pathname === "/" ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname === "/" ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </span>
          {hasUnreadAnnouncement && (
            <span style={{ position: "absolute", top: "2px", right: "8px", width: "8px", height: "8px", background: "red", borderRadius: "50%", zIndex: 20 }}></span>
          )}
          <span className={pathname === "/" ? "responsive-nav-label glow-text-yellow" : "responsive-nav-label"} style={{color: pathname === "/" ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Main</span>
        </Link>

        {/* Canvas */}
        <Link 
          href="/community" 
          data-active={pathname.startsWith("/community") ? "true" : undefined} 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="responsive-nav-item" 
          style={{ textDecoration: "none" }}
        >
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/community") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/community") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          {canvasUnreadNotifs > 0 && !pathname.startsWith("/community") && (
            <span style={{ position: "absolute", top: "2px", right: "8px", width: "8px", height: "8px", background: "red", borderRadius: "50%", zIndex: 20 }}></span>
          )}
          <span className={pathname.startsWith("/community") ? "responsive-nav-label glow-text-yellow" : "responsive-nav-label"} style={{color: pathname.startsWith("/community") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Canvas</span>
        </Link>

        {/* Notification */}
        <Link 
          href="/notifications" 
          data-active={pathname.startsWith("/notifications") ? "true" : undefined} 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
            const activeUserStr = localStorage.getItem("activeUser");
            if (activeUserStr) {
               const currentUserObj = JSON.parse(activeUserStr);
               const currentUsername = currentUserObj.firstName;
               localStorage.setItem(`navBadgeClearedAt_${currentUsername}`, Date.now().toString());
               setUnreadNotifs(0);
               window.dispatchEvent(new Event('storage'));
            }
          }} 
          className="responsive-nav-item" 
          style={{ textDecoration: "none" }}
        >
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/notifications") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/notifications") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          {unreadNotifs > 0 && (
            <span style={{ position: "absolute", top: "0px", right: "6px", background: "red", color: "white", fontSize: "0.58rem", fontWeight: "bold", padding: "1px 4px", borderRadius: "8px", zIndex: 20 }}>
              {unreadNotifs > 99 ? '99+' : unreadNotifs}
            </span>
          )}
          <span className={pathname.startsWith("/notifications") ? "responsive-nav-label glow-text-yellow" : "responsive-nav-label"} style={{color: pathname.startsWith("/notifications") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Notification</span>
        </Link>

        {/* Fusion */}
        <Link 
          href="/fusion" 
          data-active={pathname.startsWith("/fusion") ? "true" : undefined} 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="responsive-nav-item" 
          style={{ textDecoration: "none" }}
        >
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/fusion") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/fusion") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21 12 4 5 21" />
              <path d="M12 4v17" />
              <path d="m2 21 3-6" />
              <path d="m22 21-3-6" />
              <path d="M5 21h14" />
            </svg>
          </span>
          <span className={pathname.startsWith("/fusion") ? "responsive-nav-label glow-text-yellow" : "responsive-nav-label"} style={{color: pathname.startsWith("/fusion") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Fusion</span>
        </Link>

        {/* HYN */}
        <Link 
          href="/joint" 
          data-active={pathname.startsWith("/joint") ? "true" : undefined} 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="responsive-nav-item" 
          style={{ textDecoration: "none" }}
        >
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/joint") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/joint") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
            </svg>
          </span>
          <span className={pathname.startsWith("/joint") ? "responsive-nav-label glow-text-yellow" : "responsive-nav-label"} style={{color: pathname.startsWith("/joint") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>HYN</span>
        </Link>

        {/* PR */}
        <Link 
          href="/prayer" 
          data-active={pathname.startsWith("/prayer") ? "true" : undefined} 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="responsive-nav-item" 
          style={{ textDecoration: "none" }}
        >
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/prayer") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/prayer") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18" />
              <path d="M12 3c-1.8 2.2-3.5 5.5-3.5 9.5 0 3.8 1.5 6.5 3.5 8.5" />
              <path d="M12 3c1.8 2.2 3.5 5.5 3.5 9.5 0 3.8-1.5 6.5-3.5 8.5" />
              <path d="M8.5 9.5C7 11.5 5.5 14 5.5 16.5c0 2 1 3.5 2.5 4.5" />
              <path d="M15.5 9.5c1.5 2 3 4.5 3 7 0 2-1 3.5-2.5 4.5" />
            </svg>
          </span>
          <span className={pathname.startsWith("/prayer") ? "responsive-nav-label glow-text-yellow" : "responsive-nav-label"} style={{color: pathname.startsWith("/prayer") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Prayer</span>
        </Link>

      </div>

      {/* Right Arrow (hidden by CSS on touch screens to prevent overlapping taps) */}
      <button onClick={() => scrollNav('right')} className="nav-scroll-arrow" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "32px", background: "transparent", border: "none", color: "var(--neon-yellow)", cursor: "pointer", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  );
}
