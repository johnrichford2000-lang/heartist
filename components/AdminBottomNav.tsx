"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAnnouncements, fetchSystemSetting } from "@/lib/fusionSync";

export default function AdminBottomNav() {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasUnreadAnnouncement, setHasUnreadAnnouncement] = useState(false);
  const [latestAnnId, setLatestAnnId] = useState<string | null>(null);

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

  useEffect(() => {
    const checkNotifs = async () => {
      let anns = await fetchAnnouncements();
      if (!anns || anns.length === 0) {
        anns = JSON.parse(localStorage.getItem("communityAnnouncements") || "[]");
      }
      
      const lastSeenId = Number(localStorage.getItem("lastSeenAnnouncementId_admin") || localStorage.getItem("lastReadAnnouncementId_admin") || 0);
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
      
      if (parsedBlueprint && (parsedBlueprint.isRegistrationOpen || parsedBlueprint.isPackingAnnounced || parsedBlueprint.isItineraryAnnounced)) {
        const lastSeenRegStamp = localStorage.getItem("lastSeenRegistrationOpen_admin") || localStorage.getItem("lastReadRegistrationOpen_admin");
        if (parsedBlueprint.timestamp && parsedBlueprint.timestamp !== lastSeenRegStamp) {
          regUnread = true;
        }
      }
      
      setHasUnreadAnnouncement(annUnread || regUnread);
    };

    const channelId = `admin_nav_realtime_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        checkNotifs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        checkNotifs();
      })
      .on('broadcast', { event: 'announcement_updated' }, () => {
        checkNotifs();
      })
      .subscribe();

    checkNotifs();
    window.addEventListener('storage', checkNotifs);
    window.addEventListener('announcements_updated', checkNotifs);
    return () => {
      window.removeEventListener('storage', checkNotifs);
      window.removeEventListener('announcements_updated', checkNotifs);
      supabase.removeChannel(channel);
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

  // Only show on admin paths, or on profile/get-involved if admin, but hide on /admin/fusion because it has its own navigation
  const isAdminPath = pathname.startsWith('/admin');
  const isProfileAdmin = pathname.startsWith('/profile') && isAdmin;
  const isInvolvedAdmin = pathname.startsWith('/get-involved') && isAdmin;

  if (!pathname || (!isAdminPath && !isProfileAdmin && !isInvolvedAdmin) || pathname.startsWith('/admin/fusion')) {
    return null;
  }

  // Exact match for /admin to handle "Main" correctly, otherwise /admin matches everything
  const isMain = pathname === "/admin";

  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", background: "rgba(20, 10, 10, 0.95)", borderTop: "1px solid rgba(255, 51, 102, 0.3)", backdropFilter: "blur(10px)", zIndex: 1000 }}>
      {/* Left Arrow (hidden by CSS on touch screens to prevent overlapping taps) */}
      <button onClick={() => scrollNav('left')} className="nav-scroll-arrow" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "32px", background: "transparent", border: "none", color: "var(--neon-pink, #ff3366)", cursor: "pointer", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: "6px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <div ref={scrollRef} className="responsive-bottom-nav-container custom-scrollbar">
        
        {/* Main */}
        <Link href="/admin" data-active={isMain ? "true" : undefined} onClick={() => {
          if (latestAnnId) {
            localStorage.setItem("lastSeenAnnouncementId_admin", latestAnnId);
            localStorage.setItem("lastReadAnnouncementId_admin", latestAnnId);
          }
          const savedBlueprint = localStorage.getItem("fusionBlueprintData");
          if (savedBlueprint) {
            try {
              const parsedBlueprint = JSON.parse(savedBlueprint);
              if (parsedBlueprint.timestamp) {
                localStorage.setItem("lastSeenRegistrationOpen_admin", parsedBlueprint.timestamp);
                localStorage.setItem("lastReadRegistrationOpen_admin", parsedBlueprint.timestamp);
              }
            } catch (e) {}
          }
          setHasUnreadAnnouncement(false);
          window.dispatchEvent(new CustomEvent("announcements_updated"));
          window.dispatchEvent(new Event("storage"));
        }} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: isMain ? "#ff3366" : "var(--text-muted)", filter: isMain ? "drop-shadow(0 0 5px rgba(255, 51, 102, 0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          {hasUnreadAnnouncement && !isMain && (
            <span style={{ position: "absolute", top: "2px", right: "8px", width: "8px", height: "8px", background: "red", borderRadius: "50%", zIndex: 20 }}></span>
          )}
          <span className="responsive-nav-label" style={{color: isMain ? "#ff3366" : "var(--text-muted)", textShadow: isMain ? "0 0 10px rgba(255, 51, 102, 0.8)" : "none", transition: "all 0.3s ease-in-out"}}>Main</span>
        </Link>

        {/* Profile */}
        <Link href="/profile" data-active={pathname.startsWith("/profile") ? "true" : undefined} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/profile") ? "#ff3366" : "var(--text-muted)", filter: pathname.startsWith("/profile") ? "drop-shadow(0 0 5px rgba(255, 51, 102, 0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span className="responsive-nav-label" style={{color: pathname.startsWith("/profile") ? "#ff3366" : "var(--text-muted)", textShadow: pathname.startsWith("/profile") ? "0 0 10px rgba(255, 51, 102, 0.8)" : "none", transition: "all 0.3s ease-in-out"}}>Profile</span>
        </Link>

        {/* Community Hub / Canvas */}
        <Link href="/admin/community" data-active={pathname.startsWith("/admin/community") ? "true" : undefined} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/admin/community") ? "#ff3366" : "var(--text-muted)", filter: pathname.startsWith("/admin/community") ? "drop-shadow(0 0 5px rgba(255, 51, 102, 0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <span className="responsive-nav-label" style={{color: pathname.startsWith("/admin/community") ? "#ff3366" : "var(--text-muted)", textShadow: pathname.startsWith("/admin/community") ? "0 0 10px rgba(255, 51, 102, 0.8)" : "none", transition: "all 0.3s ease-in-out"}}>Canvas</span>
        </Link>

        {/* Fusion */}
        <Link href="/admin/fusion" data-active={pathname.startsWith("/admin/fusion") ? "true" : undefined} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/admin/fusion") ? "#ff3366" : "var(--text-muted)", filter: pathname.startsWith("/admin/fusion") ? "drop-shadow(0 0 5px rgba(255, 51, 102, 0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21 12 4 5 21" />
              <path d="M12 4v17" />
              <path d="m2 21 3-6" />
              <path d="m22 21-3-6" />
              <path d="M5 21h14" />
            </svg>
          </span>
          <span className="responsive-nav-label" style={{color: pathname.startsWith("/admin/fusion") ? "#ff3366" : "var(--text-muted)", textShadow: pathname.startsWith("/admin/fusion") ? "0 0 10px rgba(255, 51, 102, 0.8)" : "none", transition: "all 0.3s ease-in-out"}}>Fusion</span>
        </Link>

        {/* HYN */}
        <Link href="/admin/joint" data-active={pathname.startsWith("/admin/joint") ? "true" : undefined} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/admin/joint") ? "#ff3366" : "var(--text-muted)", filter: pathname.startsWith("/admin/joint") ? "drop-shadow(0 0 5px rgba(255, 51, 102, 0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
            </svg>
          </span>
          <span className="responsive-nav-label" style={{color: pathname.startsWith("/admin/joint") ? "#ff3366" : "var(--text-muted)", textShadow: pathname.startsWith("/admin/joint") ? "0 0 10px rgba(255, 51, 102, 0.8)" : "none", transition: "all 0.3s ease-in-out"}}>HYN</span>
        </Link>

        {/* Prayer */}
        <Link href="/admin/prayer" data-active={pathname.startsWith("/admin/prayer") ? "true" : undefined} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/admin/prayer") ? "#ff3366" : "var(--text-muted)", filter: pathname.startsWith("/admin/prayer") ? "drop-shadow(0 0 5px rgba(255, 51, 102, 0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18" />
              <path d="M12 3c-1.8 2.2-3.5 5.5-3.5 9.5 0 3.8 1.5 6.5 3.5 8.5" />
              <path d="M12 3c1.8 2.2 3.5 5.5 3.5 9.5 0 3.8-1.5 6.5-3.5 8.5" />
              <path d="M8.5 9.5C7 11.5 5.5 14 5.5 16.5c0 2 1 3.5 2.5 4.5" />
              <path d="M15.5 9.5c1.5 2 3 4.5 3 7 0 2-1 3.5-2.5 4.5" />
            </svg>
          </span>
          <span className="responsive-nav-label" style={{color: pathname.startsWith("/admin/prayer") ? "#ff3366" : "var(--text-muted)", textShadow: pathname.startsWith("/admin/prayer") ? "0 0 10px rgba(255, 51, 102, 0.8)" : "none", transition: "all 0.3s ease-in-out"}}>Prayer</span>
        </Link>

        {/* Users */}
        <Link href="/admin/users" data-active={pathname.startsWith("/admin/users") ? "true" : undefined} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/admin/users") ? "#ff3366" : "var(--text-muted)", filter: pathname.startsWith("/admin/users") ? "drop-shadow(0 0 5px rgba(255, 51, 102, 0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span className="responsive-nav-label" style={{color: pathname.startsWith("/admin/users") ? "#ff3366" : "var(--text-muted)", textShadow: pathname.startsWith("/admin/users") ? "0 0 10px rgba(255, 51, 102, 0.8)" : "none", transition: "all 0.3s ease-in-out"}}>Users</span>
        </Link>

        {/* Involved */}
        <Link href="/get-involved" data-active={pathname.startsWith("/get-involved") ? "true" : undefined} className="responsive-nav-item" style={{ textDecoration: "none" }}>
          <span className="responsive-nav-icon" style={{color: pathname.startsWith("/get-involved") ? "#ff3366" : "var(--text-muted)", filter: pathname.startsWith("/get-involved") ? "drop-shadow(0 0 5px rgba(255, 51, 102, 0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </span>
          <span className="responsive-nav-label" style={{color: pathname.startsWith("/get-involved") ? "#ff3366" : "var(--text-muted)", textShadow: pathname.startsWith("/get-involved") ? "0 0 10px rgba(255, 51, 102, 0.8)" : "none", transition: "all 0.3s ease-in-out"}}>Involved</span>
        </Link>
      </div>

      {/* Right Arrow (hidden by CSS on touch screens to prevent overlapping taps) */}
      <button onClick={() => scrollNav('right')} className="nav-scroll-arrow" style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "32px", background: "transparent", border: "none", color: "var(--neon-pink, #ff3366)", cursor: "pointer", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "6px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  );
}
