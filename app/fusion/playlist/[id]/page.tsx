"use client";

import React, { use, useState, useEffect } from "react";
import Link from "next/link";
import { ALL_SONGS as DEFAULT_SONGS } from "../songsData";
import HeartistLogo from "@/components/HeartistLogo";
import { fetchSystemSetting } from "@/lib/fusionSync";

export default function SongLyricsPage({ params }: { params: Promise<{ id: string }> }) {
  // In Next.js 15, params is a Promise and must be unwrapped
  const resolvedParams = use(params);
  
  const [song, setSong] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSong = async () => {
      setIsLoading(true);
      const dbSongs = await fetchSystemSetting("fusionPlaylist");
      const songsToSearch = dbSongs && dbSongs.length > 0 ? dbSongs : DEFAULT_SONGS;
      const foundSong = songsToSearch.find((s: any) => String(s.id) === String(resolvedParams.id));
      setSong(foundSong || null);
      setIsLoading(false);
    };
    loadSong();
  }, [resolvedParams.id]);

  if (isLoading) {
    return (
      <main className="app-container" style={{ textAlign: "center", paddingTop: "100px" }}>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>Loading song...</p>
      </main>
    );
  }

  if (!song) {
    return (
      <main className="app-container" style={{ textAlign: "center", paddingTop: "100px" }}>
        <h1 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>Song not found</h1>
        <Link href="/fusion/playlist" style={{ color: "var(--neon-yellow)", textDecoration: "none" }}>Back to Playlist</Link>
      </main>
    );
  }

  return (
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      {/* Top-Left Back Button (Pure SVG Icon, Fixed to Screen Top-Left, Navigates to Playlist) */}
      <Link
        href="/fusion/playlist"
        aria-label="Back to Playlist"
        style={{
          position: "fixed",
          top: "18px",
          left: "18px",
          zIndex: 9999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "rgba(10, 10, 10, 0.75)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid var(--neon-yellow)",
          color: "var(--neon-yellow)",
          textDecoration: "none",
          boxShadow: "0 0 14px rgba(255, 234, 0, 0.2)",
          transition: "all 0.25s ease",
          cursor: "pointer"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255, 234, 0, 0.18)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(255, 234, 0, 0.45)";
          e.currentTarget.style.transform = "translateX(-3px)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(10, 10, 10, 0.75)";
          e.currentTarget.style.boxShadow = "0 0 14px rgba(255, 234, 0, 0.2)";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <svg 
          width="22" 
          height="22" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </Link>

      {/* Header */}
      <header className="top-header" style={{ marginBottom: "20px", textAlign: "center", position: "relative" }}>
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "1.5rem", margin: 0, textTransform: "uppercase" }}>
          {song.type}
        </h1>
        <p className="logo-sub" style={{ margin: 0 }}>{song.camp}</p>
      </header>

      {/* Song Details & YouTube Player */}
      <section style={{ marginBottom: "30px" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(255,234,0,0.1), rgba(0,0,0,0.8))", border: "1px solid var(--neon-yellow)", textAlign: "center", padding: "30px 20px", borderRadius: "16px" }}>
          
          {song.youtubeId && (
            <div style={{ marginBottom: "20px", borderRadius: "8px", overflow: "hidden", position: "relative", paddingTop: "56.25%", width: "100%" }}>
              <iframe
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                src={`https://www.youtube.com/embed/${song.youtubeId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          )}

          <h2 style={{ color: "white", fontSize: "1.8rem", fontFamily: "var(--font-outfit)", margin: "0 0 10px 0", textShadow: "0 0 10px rgba(255,234,0,0.5)" }}>
            {song.title}
          </h2>
          <p style={{ color: "var(--canary-yellow)", fontSize: "1.1rem", margin: "0", fontStyle: "italic" }}>
            by {song.artist}
          </p>
        </div>
      </section>

      {/* Lyrics */}
      <section>
        <div style={{ borderTop: "3px solid var(--neon-yellow)", background: "rgba(0,0,0,0.3)", padding: "30px 20px", borderRadius: "16px" }}>
          <h3 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", textAlign: "center", marginBottom: "20px", fontSize: "1.3rem", letterSpacing: "2px" }}>LYRICS</h3>
          <div style={{ 
            color: "var(--neon-white)", 
            fontSize: "1.1rem", 
            lineHeight: "2", 
            fontFamily: "var(--font-outfit)", 
            textAlign: "center", 
            margin: 0,
            textShadow: "0 2px 4px rgba(0,0,0,0.5)"
          }}>
            {(song.lyrics || "").split('\n').map((line: string, i: number) => {
              const trimmed = line.trim();
              
              // 1. Detect if the ENTIRE line is a bracket [Header]
              const fullLineBracketMatch = trimmed.match(/^\[(.*)\]$/);
              
              if (fullLineBracketMatch && fullLineBracketMatch[1]) {
                const tagText = fullLineBracketMatch[1].trim();
                return (
                  <div key={i} style={{ 
                    color: "var(--neon-yellow)", 
                    fontWeight: "bold", 
                    marginTop: i === 0 ? "0" : "25px", 
                    marginBottom: "5px",
                    textTransform: "uppercase",
                    letterSpacing: "2px",
                    textShadow: "0 0 8px rgba(255,234,0,0.5)"
                  }}>
                    {tagText}
                  </div>
                );
              }
              
              // 2. Otherwise, render the line normally but highlight any [inline tags]
              return (
                <div key={i} style={{ minHeight: trimmed === "" ? "1.5rem" : "auto" }}>
                  {trimmed === "" ? <br /> : (
                    line.split(/(\[[^\]]+\])/g).map((part, index) => {
                      if (part.startsWith('[') && part.endsWith(']')) {
                        const innerText = part.slice(1, -1).trim();
                        return (
                          <span key={index} style={{
                            color: "var(--neon-yellow)",
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                            textShadow: "0 0 5px rgba(255,234,0,0.3)"
                          }}>
                            {innerText}
                          </span>
                        );
                      }
                      return <span key={index}>{part}</span>;
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Back to Playlist Button at the very bottom */}
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <Link href="/fusion/playlist" className="nav-item" style={{ padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)", display: "inline-block", fontFamily: "var(--font-outfit)" }}>
          Back to Playlist
        </Link>
      </div>
    </main>
  );
}
