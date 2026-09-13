"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import dynamic from "next/dynamic";
import HeartistLogo from "@/components/HeartistLogo";
import Countdown from "@/components/Countdown";
import CustomDropdown from "@/components/CustomDropdown";

const LocationMap = dynamic(() => import('@/components/LocationMap'), { ssr: false, loading: () => <div style={{height: "200px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", borderRadius: "12px", border: "2px solid rgba(255,255,255,0.1)"}}>Loading Map...</div> });

export default function FusionCampPage() {
  const [ignitionDate, setIgnitionDate] = useState("2027-06-15T00:00:00");
  const [countdownLabel, setCountdownLabel] = useState("June 15-18, 2027");
  const [themeIteration, setThemeIteration] = useState("1");
  const [themeWord, setThemeWord] = useState("IGNITE");
  const [themeSub, setThemeSub] = useState("our passion and creativity all for God's glory.");
  const [throwbackPhotos, setThrowbackPhotos] = useState<any[]>([]);
  const [isRegOpen, setIsRegOpen] = useState(true);
  const [selectedCamp, setSelectedCamp] = useState("1");
  const [campLocation, setCampLocation] = useState<any>(null);
  const [campStatus, setCampStatus] = useState("Open");
  const [campLat, setCampLat] = useState<number | null>(null);
  const [campLng, setCampLng] = useState<number | null>(null);
  const [compassThemeWord, setCompassThemeWord] = useState("IGNITE");
  const [campIterations, setCampIterations] = useState<number[]>([1, 2, 3, 4, 5]);
  const [latestPost, setLatestPost] = useState<any>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadCampData = async (iteration: string) => {
    const { fetchSystemSetting } = await import("@/lib/fusionSync");
    const savedLoc = await fetchSystemSetting(`fusionLocationData_${iteration}`);
    if (savedLoc) {
      setCampLocation(savedLoc);
      setCampStatus(savedLoc.status || "Open");
      setCampLat(savedLoc.lat || null);
      setCampLng(savedLoc.lng || null);
    } else {
      setCampLocation(null);
      setCampStatus("Open");
      setCampLat(null);
      setCampLng(null);
    }

    const savedTheme = await fetchSystemSetting(`fusionTheme_${iteration}`);
    if (savedTheme) {
      setCompassThemeWord(savedTheme.word || "IGNITE");
    } else {
      setCompassThemeWord("IGNITE");
    }
  };

  useEffect(() => {
    const loadCoreData = async () => {
      const { fetchSystemSetting } = await import("@/lib/fusionSync");
      
      const savedIters = await fetchSystemSetting("eventIterations");
      if (savedIters) {
        const maxFusion = savedIters.fusion || 5;
        setCampIterations(Array.from({ length: maxFusion }, (_, i) => i + 1));
      }
      const savedCountdown = await fetchSystemSetting("fusionCountdownData");
      if (savedCountdown) {
        setIgnitionDate(savedCountdown.targetDate || "2027-06-15T00:00:00");
        setCountdownLabel(savedCountdown.labelDate || "June 15-18, 2027");
      }
      
      try {
        const { fetchCommunityPosts } = await import("@/lib/communitySync");
        const posts = await fetchCommunityPosts();
        const activePosts = posts.filter(p => p.status !== 'trashed');
        if (activePosts.length > 0) {
          setLatestPost(activePosts[0]);
        }
      } catch (e) {
        console.error("Failed to load community posts:", e);
      }
      
      await loadCampData(selectedCamp);
    };

    loadCoreData();
  }, [selectedCamp]);

  useEffect(() => {
    const loadThemeData = async () => {
      const { fetchSystemSetting } = await import("@/lib/fusionSync");
      const savedTheme = await fetchSystemSetting(`fusionTheme_${themeIteration}`);
      if (savedTheme) {
        setThemeWord(savedTheme.word || "IGNITE");
        setThemeSub(savedTheme.subtext || "our passion and creativity all for God's glory.");
      } else {
        setThemeWord("IGNITE");
        setThemeSub("our passion and creativity all for God's glory.");
      }

      const savedBlueprint = localStorage.getItem("fusionBlueprintData");
      if (savedBlueprint) {
        const parsed = JSON.parse(savedBlueprint);
        setIsRegOpen(parsed.isRegistrationOpen ?? true);
      } else {
        setIsRegOpen(true);
      }
      
      const photos = await fetchSystemSetting("fusionExhibitPhotos");
      if (photos) {
        setThrowbackPhotos(photos.filter((p: any) => p.isThrowback).slice(0, 3));
      }
    };

        loadThemeData();
    window.addEventListener("storage", loadThemeData);

    const channel = supabase.channel('system_settings_changes_fusion')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        loadThemeData();
        // Since loadCoreData is in another useEffect, it will also be triggered if we just reload the page or we could export a global event, but for now this triggers theme data update
        // We'll just force a small state change to re-trigger loadCoreData by re-setting selectedCamp to itself
        setSelectedCamp(prev => prev);
      })
      .subscribe();

    return () => {
      window.removeEventListener("storage", loadThemeData);
      supabase.removeChannel(channel);
    };
  }, [themeIteration]);

  return (
    <>
      <main className="app-container fusion-home-container" style={{ paddingBottom: "120px" }}>
        {/* Top-Left Back Button (Pure SVG Icon, Fixed to Screen Top-Left, Navigates to Dashboard) */}
        <Link
          href="/"
          aria-label="Back to Dashboard"
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

        {/* Top Logo Section */}
        <header className="top-header">
          <div className="header-title-container">
            <HeartistLogo className="animated-glow-text" width={40} height={40} />
            <h1 className="header-title animated-glow-text" style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem" }}>
              FUSION
            </h1>
          </div>
          <h2 className="header-title" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", letterSpacing: "5px" }}>CAMP</h2>
          <p className="logo-sub">By Heartist Ministry</p>
        </header>

        {/* The Core / Ignition Zone */}
        <section style={{ marginBottom: "clamp(30px, 5vw, 45px)" }}>
          <h2 className="section-title">The Ignition Zone</h2>
          <div className="core-grid">
            <div style={{ width: "100%" }}>
              <Countdown targetDate={ignitionDate} />
              <p style={{ textAlign: "center", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", marginTop: "10px", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "1px" }}> 
                {countdownLabel}
              </p>
            </div>

            <div style={{ width: "100%" }}>
              <div style={{ marginBottom: "15px", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ color: "var(--neon-white)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>View Past Theme:</span>
                <div style={{ width: "150px" }}>
                  <CustomDropdown
                    value={themeIteration}
                    options={campIterations.map((num) => ({ value: num.toString(), label: `Fusion ${num}` }))}
                    onChange={(val) => setThemeIteration(val)}
                  />
                </div>
              </div>
              
              <div className="theme-reveal-card" style={{ padding: "clamp(20px, 5vw, 30px)" }}>
                <span className="theme-tag">THEME</span>
                <h3 className="theme-word glow-text-yellow" style={{ fontSize: "clamp(2rem, 8vw, 3.5rem)" }}>
                  {themeWord}
                </h3>
                <p className="theme-sub" style={{ fontSize: "clamp(0.9rem, 3vw, 1.05rem)" }}>
                  {themeSub}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Camp Compass (Info Preview) */}
        <section style={{ marginBottom: "clamp(30px, 5vw, 45px)" }}>
          <h2 className="section-title">Camp Compass</h2>
          <div className="card" style={{ padding: "clamp(18px, 4vw, 24px)" }}>
            <div style={{ marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ color: "var(--neon-white)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px" }}>Select Fusion:</span>
                <div style={{ width: "140px" }}>
                  <CustomDropdown
                    value={selectedCamp}
                    options={campIterations.map((num) => ({ value: num.toString(), label: `Fusion ${num}` }))}
                    onChange={(val) => {
                      setSelectedCamp(val);
                      loadCampData(val);
                    }}
                  />
                </div>
              </div>
              <span style={{ 
                fontSize: "0.75rem", 
                padding: "4px 10px", 
                borderRadius: "12px", 
                background: campStatus === "Open" ? "rgba(0, 255, 128, 0.15)" : campStatus === "Ended" ? "rgba(255, 68, 68, 0.15)" : campStatus === "NotAvailable" ? "rgba(255, 165, 0, 0.15)" : "rgba(255,255,255,0.05)",
                color: campStatus === "Open" ? "#00FF80" : campStatus === "Ended" ? "#FF4444" : campStatus === "NotAvailable" ? "#FFA500" : "var(--text-muted)",
                border: `1px solid ${campStatus === "Open" ? "rgba(0, 255, 128, 0.3)" : campStatus === "Ended" ? "rgba(255, 68, 68, 0.3)" : campStatus === "NotAvailable" ? "rgba(255, 165, 0, 0.3)" : "rgba(255,255,255,0.1)"}`,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                fontWeight: "bold"
              }}>
                {campStatus === "Open" ? "Registration Open" : campStatus === "Ended" ? "Ended" : campStatus === "NotAvailable" ? "Not Available" : "Registration Closed"}
              </span>
            </div>

            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", margin: 0, fontSize: "0.95rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                  <strong style={{ color: "var(--sunflower-yellow)", display: "inline-block", width: "90px", flexShrink: 0 }}>Location:</strong> 
                  <span style={{ flex: 1, lineHeight: "1.4", wordBreak: "break-word" }}>{campLocation ? campLocation.name : "Location details classified."}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", margin: 0, fontSize: "0.95rem", color: "var(--canary-yellow)", fontFamily: "var(--font-outfit)" }}>
                  <strong style={{ color: "var(--sunflower-yellow)", display: "inline-block", width: "90px", flexShrink: 0 }}>Theme:</strong> 
                  <span style={{ flex: 1, lineHeight: "1.4", wordBreak: "break-word" }}>{compassThemeWord}</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-start", margin: 0, fontSize: "0.95rem", color: campStatus === "Open" ? "#00FF80" : campStatus === "Ended" ? "#FF4444" : campStatus === "NotAvailable" ? "#FFA500" : "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                  <strong style={{ color: "var(--sunflower-yellow)", display: "inline-block", width: "90px", flexShrink: 0 }}>Status:</strong> 
                  <span style={{ flex: 1, wordBreak: "break-word" }}>{campStatus === "Open" ? "Open for Registration" : campStatus === "Ended" ? "Event Ended" : campStatus === "NotAvailable" ? "Registration Not Available" : "Registration Closed"}</span>
                </div>
              </div>

              {campLat !== null && campLng !== null ? (
                <div style={{ marginTop: "15px" }}>
                  <LocationMap lat={campLat} lng={campLng} interactive={false} />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px", alignItems: "center", padding: "30px 0", marginTop: "15px", border: "2px dashed rgba(255,255,255,0.1)", borderRadius: "12px", background: "rgba(0,0,0,0.3)" }}>
                  <div style={{ width: "80px", height: "80px", borderRadius: "50%", border: "2px dashed var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", animation: "spin 10s linear infinite" }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 10s linear infinite reverse" }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", textTransform: "uppercase" }}>CLASSIFIED</h3>
                    <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>The coordinates for Fusion {selectedCamp} are still unknown.</p>
                  </div>
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                  `}} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Dashboard Feed Section */}
        <section style={{ marginBottom: "20px" }}>
          <h2 className="section-title">Camp Dashboard</h2>
          <div className="dashboard-feed">
            
            {/* Featured Announcement (Blueprint Teaser) */}
            <div className="card dashboard-item" style={{ borderLeft: isRegOpen ? "4px solid var(--neon-yellow)" : "4px solid #FF4444", padding: "clamp(18px, 4vw, 24px)" }}>
              <div className="feed-header" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span className="feed-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--neon-yellow)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path>
                    <path d="m3 11 18-5v12L3 13v-2z"></path>
                    <path d="M11.6 16.8 9.5 21"></path>
                  </svg>
                </span>
                <span className="feed-label">Latest Announcement</span>
              </div>
              <h3 style={{ color: isRegOpen ? "var(--neon-white)" : "#FF4444", marginBottom: "8px", fontFamily: "var(--font-outfit)", fontSize: "clamp(1.1rem, 3.5vw, 1.25rem)" }}>
                {isRegOpen ? "Camp Registration is OPEN!" : "Camp Registration is CLOSED"}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "15px", lineHeight: "1.5" }}>
                {isRegOpen 
                  ? "Secure your slot now for Fusion Camp 2027. Early bird discounts apply until the end of the month. Connect with your leaders to get the forms."
                  : "Registration is currently closed. Please wait for further announcements from the team."}
              </p>
              <Link href="/fusion/info" className="feed-action glow-text-yellow">
                View the Blueprint
              </Link>
            </div>

            {/* Sneak Peek Gallery (Memories Teaser) */}
            <div className="card dashboard-item" style={{ padding: "clamp(18px, 4vw, 24px)" }}>
              <div className="feed-header" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                <span className="feed-icon" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--neon-white)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </span>
                <span className="feed-label glow-text-white" style={{color: "var(--neon-white)"}}>Throwback Memories</span>
              </div>
              <div className="sneak-peek-gallery" style={{ height: "clamp(90px, 20vw, 120px)" }}>
                {throwbackPhotos.length > 0 ? (
                  throwbackPhotos.map((photo, index) => (
                    <Link 
                      key={photo.id} 
                      href={`/fusion/memories?camp=${encodeURIComponent(photo.camp)}&day=${encodeURIComponent(photo.day)}&category=${encodeURIComponent(photo.category)}`}
                      className="peek-img" 
                      style={{ 
                        backgroundImage: `url('${photo.url}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid rgba(255,255,255,0.2)",
                        display: "block"
                      }}
                    >
                    </Link>
                  ))
                ) : (
                  <>
                    <div className="peek-img" style={{ backgroundImage: "linear-gradient(45deg, #222, #444)" }}>
                      <span style={{opacity: 0.5}}>Pic 1</span>
                    </div>
                    <div className="peek-img" style={{ backgroundImage: "linear-gradient(45deg, #111, #333)" }}>
                      <span style={{opacity: 0.5}}>Pic 2</span>
                    </div>
                    <div className="peek-img" style={{ backgroundImage: "linear-gradient(45deg, #000, #222)" }}>
                      <span style={{opacity: 0.5}}>Pic 3</span>
                    </div>
                  </>
                )}
                {throwbackPhotos.length > 0 && throwbackPhotos.length < 3 && (
                  Array.from({ length: 3 - throwbackPhotos.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="peek-img" style={{ backgroundImage: "linear-gradient(45deg, #111, #333)" }}></div>
                  ))
                )}
              </div>
              <Link href="/fusion/memories" className="feed-action glow-text-white" style={{ marginTop: "15px", display: "inline-block" }}>
                Enter the Exhibit
              </Link>
            </div>

          </div>
        </section>
      </main>
    </>
  );
}
