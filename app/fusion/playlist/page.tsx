"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import { fetchSystemSetting } from "@/lib/fusionSync";
import { ALL_SONGS as DEFAULT_SONGS } from "./songsData";

export default function PlaylistPage() {
  const CAMPS = ["Fusion 1", "Fusion 2", "Fusion 3"];
  const [selectedCamp, setSelectedCamp] = useState(CAMPS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allSongs, setAllSongs] = useState<any[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const dbSongs = await fetchSystemSetting("fusionPlaylist");
      setAllSongs(dbSongs && dbSongs.length > 0 ? dbSongs : DEFAULT_SONGS);
    };
    loadData();
  }, []);

  const filteredSongs = allSongs.filter(s => s.camp === selectedCamp);

  // Group songs by Day (normalized to prevent duplicates like 'day 1' and 'Day 1')
  const groupedSongs = filteredSongs.reduce((acc: Record<string, { display: string, songs: any[] }>, song) => {
    const rawDay = (song.day || "Unassigned Day").trim();
    const dayKey = rawDay.toUpperCase(); // Normalize case for grouping
    
    if (!acc[dayKey]) {
      acc[dayKey] = { display: rawDay, songs: [] };
    }
    acc[dayKey].songs.push(song);
    return acc;
  }, {});

  const dayKeys = Object.keys(groupedSongs);

  return (
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      {/* Header */}
      <header className="top-header" style={{ marginBottom: "20px" }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "10px" }}>
          THE PLAYLIST
        </h1>
        <p className="logo-sub">Camp Worship Setlist & Lyrics</p>
      </header>

      {/* Camp Filter Custom Dropdown */}
      <section style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
        <div ref={dropdownRef} style={{ position: "relative", width: "100%", maxWidth: "300px" }}>
          <div 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            style={{
              width: "100%",
              padding: "12px 20px",
              borderRadius: isDropdownOpen ? "20px 20px 0 0" : "20px",
              border: "1px solid var(--neon-yellow)",
              background: "rgba(255,234,0,0.1)",
              color: "var(--neon-yellow)",
              cursor: "pointer",
              fontFamily: "var(--font-outfit)",
              fontWeight: 700,
              fontSize: "1.1rem",
              boxShadow: "0 0 10px rgba(255,234,0,0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "border-radius 0.3s ease"
            }}
          >
            {selectedCamp}
            <span style={{ 
              transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", 
              transition: "transform 0.3s ease",
              fontSize: "0.8rem"
            }}>▼</span>
          </div>

          {/* Animated Options Container */}
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            background: "rgba(10,10,10,0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid var(--neon-yellow)",
            borderTop: "none",
            borderRadius: "0 0 20px 20px",
            overflow: "hidden",
            maxHeight: isDropdownOpen ? "200px" : "0",
            opacity: isDropdownOpen ? 1 : 0,
            visibility: isDropdownOpen ? "visible" : "hidden",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            zIndex: 100,
            boxShadow: "0 10px 15px rgba(0,0,0,0.5)"
          }}>
            {CAMPS.map(c => (
              <div 
                key={c} 
                onClick={() => {
                  setSelectedCamp(c);
                  setIsDropdownOpen(false);
                }}
                style={{ 
                  padding: "12px 20px", 
                  color: selectedCamp === c ? "var(--neon-yellow)" : "white", 
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit)",
                  fontWeight: selectedCamp === c ? 700 : 400,
                  background: selectedCamp === c ? "rgba(255,234,0,0.1)" : "transparent",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => {
                  if (selectedCamp !== c) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseOut={(e) => {
                  if (selectedCamp !== c) e.currentTarget.style.background = "transparent";
                }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Spotify-style Continuous Song List Grouped by Day */}
      <section>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {dayKeys.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", padding: "40px 0" }}>
              No songs found for this camp.
            </p>
          ) : (
            dayKeys.map(dayKey => (
              <div key={dayKey}>
                {/* Day Header Subtext */}
                <h3 style={{ 
                  color: "var(--neon-yellow)", 
                  fontSize: "1.1rem", 
                  fontFamily: "var(--font-outfit)",
                  borderBottom: "1px solid rgba(255,234,0,0.3)",
                  paddingBottom: "5px",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "3px"
                }}>
                  {groupedSongs[dayKey].display}
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  {groupedSongs[dayKey].songs.map((song, index) => {
                    let badgeColor = "var(--neon-white)";
                    if (song.type === "Camp Song") badgeColor = "var(--sunflower-yellow)";
                    else if (song.type === "Worship Song") badgeColor = "var(--amber-yellow)";

                    return (
                      <Link key={song.id} href={`/fusion/playlist/${song.id}`} style={{ textDecoration: "none" }}>
                        <div 
                          style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            padding: "12px 15px", 
                            cursor: "pointer", 
                            background: "rgba(255,255,255,0.02)", 
                            borderRadius: "8px",
                            transition: "background 0.2s" 
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.02)"}
                        >
                          <div style={{ color: "var(--text-muted)", fontSize: "1rem", fontWeight: "bold", width: "35px", textAlign: "center", marginRight: "10px" }}>
                            {index + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ color: "var(--neon-white)", fontSize: "1.1rem", fontFamily: "var(--font-outfit)", margin: "0 0 5px 0" }}>{song.title}</h3>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              <span style={{ 
                                fontSize: "0.65rem", 
                                background: "rgba(255,255,255,0.1)", 
                                color: badgeColor,
                                padding: "2px 6px", 
                                borderRadius: "4px", 
                                textTransform: "uppercase", 
                                letterSpacing: "1px",
                                fontWeight: "bold"
                              }}>
                                {song.type}
                              </span>
                              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>{song.artist}</p>
                            </div>
                          </div>
                          <div style={{ color: "var(--text-muted)", fontSize: "1.2rem", paddingLeft: "10px" }}>
                            ⋮
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))
          )}

        </div>
      </section>
    </main>
  );
}
