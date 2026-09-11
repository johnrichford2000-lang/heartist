"use client";

import React, { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminFusionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
      
      {/* Primary Bottom Navigation Bar for Admin Fusion Modules */}
      {/* Primary Bottom Navigation Bar for Admin Fusion Modules - Smart Auto-Fit */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: "100%", background: "rgba(10, 10, 10, 0.95)", borderTop: "1px solid rgba(255, 234, 0, 0.3)", backdropFilter: "blur(10px)", zIndex: 1000 }}>
        <div ref={scrollRef} className="fusion-bottom-nav-container">
          <Link href="/admin" className="fusion-nav-item">
            <span className="fusion-nav-icon" style={{color: "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="fusion-nav-label" style={{ color: "var(--text-muted)", transition: "all 0.3s ease-in-out" }}>Main</span>
          </Link>
          <Link href="/admin/fusion" className="fusion-nav-item">
            <span className="fusion-nav-icon" style={{color: pathname === "/admin/fusion" ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname === "/admin/fusion" ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <span className={pathname === "/admin/fusion" ? "fusion-nav-label glow-text-yellow" : "fusion-nav-label"} style={{ color: pathname === "/admin/fusion" ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out" }}>Home</span>
          </Link>
          <Link href="/admin/fusion/exhibit" className="fusion-nav-item">
            <span className="fusion-nav-icon" style={{color: pathname.startsWith("/admin/fusion/exhibit") ? "var(--neon-white)" : "var(--text-muted)", filter: pathname.startsWith("/admin/fusion/exhibit") ? "drop-shadow(0 0 5px rgba(255,255,255,0.8))" : "none", transition: "all 0.3s ease-in-out"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </span>
            <span className={pathname.startsWith("/admin/fusion/exhibit") ? "fusion-nav-label glow-text-white" : "fusion-nav-label"} style={{color: pathname.startsWith("/admin/fusion/exhibit") ? "var(--neon-white)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Exhibit</span>
          </Link>
          <Link href="/admin/fusion/blueprint" className="fusion-nav-item">
            <span className="fusion-nav-icon" style={{color: pathname.startsWith("/admin/fusion/blueprint") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/admin/fusion/blueprint") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
                <line x1="9" y1="3" x2="9" y2="18"/>
                <line x1="15" y1="6" x2="15" y2="21"/>
              </svg>
            </span>
            <span className={pathname.startsWith("/admin/fusion/blueprint") ? "fusion-nav-label glow-text-yellow" : "fusion-nav-label"} style={{color: pathname.startsWith("/admin/fusion/blueprint") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Blueprint</span>
          </Link>
          <Link href="/admin/fusion/playlist" className="fusion-nav-item">
            <span className="fusion-nav-icon" style={{color: pathname.startsWith("/admin/fusion/playlist") ? "var(--neon-yellow)" : "var(--text-muted)", filter: pathname.startsWith("/admin/fusion/playlist") ? "drop-shadow(0 0 5px var(--neon-yellow-glow))" : "none", transition: "all 0.3s ease-in-out"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            </span>
            <span className={pathname.startsWith("/admin/fusion/playlist") ? "fusion-nav-label glow-text-yellow" : "fusion-nav-label"} style={{color: pathname.startsWith("/admin/fusion/playlist") ? "var(--neon-yellow)" : "var(--text-muted)", transition: "all 0.3s ease-in-out"}}>Playlist</span>
          </Link>
        </div>
      </div>
    </>
  );
}
