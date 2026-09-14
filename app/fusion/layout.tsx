"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function FusionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollNav = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const start = container.scrollLeft;
      const end = direction === 'left' ? 0 : container.scrollWidth - container.clientWidth;
      const duration = 400; // 400ms for a very smooth slide
      let startTime: number | null = null;

      const animateScroll = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        // Easing function (easeInOutCubic) for premium feel
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
    // Auth Protection
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
        window.location.href = "/login";
      }

      const checkNotifs = () => {
        const activeUserStr = localStorage.getItem("activeUser");
        if (!activeUserStr) return;
        const currentUserObj = JSON.parse(activeUserStr);
        const currentUsername = currentUserObj.firstName;
        const currentUsernameFullName = `${currentUserObj.firstName} ${currentUserObj.lastName}`.trim();
        const notifs = JSON.parse(localStorage.getItem("fusionNotifications") || "[]");
        const myUnread = notifs.filter((n: any) => (n.postAuthor === currentUsername || n.postAuthor === currentUsernameFullName || n.userId === currentUsernameFullName || n.userId === currentUsername) && !n.seen);
        setUnreadNotifs(myUnread.length);
      };

      checkNotifs();
      window.addEventListener('storage', checkNotifs);
      return () => window.removeEventListener('storage', checkNotifs);
    }
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar {
          scroll-behavior: smooth;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          display: block !important;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 234, 0, 0.4);
          border-radius: 10px;
        }
      `}} />
      {children}
      
      {/* Primary Bottom Navigation Bar for Fusion Camp - Smart Auto-Fit */}
      {pathname !== "/fusion/trash" && (
        <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", background: "rgba(10, 10, 10, 0.95)", borderTop: "1px solid rgba(255, 234, 0, 0.3)", backdropFilter: "blur(10px)", zIndex: 1000 }}>
          <div ref={scrollRef} className="fusion-bottom-nav-container">
            {/* Main */}
            <Link href="/" className="fusion-nav-item">
              <span className="fusion-nav-icon" style={{color: "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <span className="fusion-nav-label" style={{ color: "var(--text-muted)", transition: "all 0.3s ease-in-out" }}>Main</span>
            </Link>

            {/* Home */}
            <Link href="/fusion" className="fusion-nav-item">
              <span className="fusion-nav-icon" style={{color: pathname === "/fusion" ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname === "/fusion" ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
              </span>
              <span className={pathname === "/fusion" ? "fusion-nav-label glow-text-yellow" : "fusion-nav-label"} style={{ color: pathname === "/fusion" ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out" }}>Home</span>
            </Link>

            {/* Exhibit */}
            <Link href="/fusion/memories" className="fusion-nav-item">
              <span className="fusion-nav-icon" style={{color: pathname.startsWith("/fusion/memories") ? "var(--neon-white)" : "var(--text-muted)", filter: pathname.startsWith("/fusion/memories") ? "drop-shadow(0 0 5px rgba(255,255,255,0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </span>
              <span className={pathname.startsWith("/fusion/memories") ? "fusion-nav-label glow-text-white" : "fusion-nav-label"} style={{color: pathname.startsWith("/fusion/memories") ? "var(--neon-white)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Exhibit</span>
            </Link>

            {/* Blueprint */}
            <Link href="/fusion/info" className="fusion-nav-item">
              <span className="fusion-nav-icon" style={{color: pathname.startsWith("/fusion/info") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/fusion/info") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                  <line x1="9" y1="3" x2="9" y2="18"/>
                  <line x1="15" y1="6" x2="15" y2="21"/>
                </svg>
              </span>
              <span className={pathname.startsWith("/fusion/info") ? "fusion-nav-label glow-text-yellow" : "fusion-nav-label"} style={{color: pathname.startsWith("/fusion/info") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Blueprint</span>
            </Link>

            {/* Playlist */}
            <Link href="/fusion/playlist" className="fusion-nav-item">
              <span className="fusion-nav-icon" style={{color: pathname.startsWith("/fusion/playlist") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/fusion/playlist") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </span>
              <span className={pathname.startsWith("/fusion/playlist") ? "fusion-nav-label glow-text-yellow" : "fusion-nav-label"} style={{color: pathname.startsWith("/fusion/playlist") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Playlist</span>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
