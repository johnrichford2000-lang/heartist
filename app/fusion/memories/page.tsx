"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import { fetchSystemSetting, saveSystemSetting } from "@/lib/fusionSync";
import { supabase } from "@/lib/supabase";
import { formatCapitalizedName, formatFullName } from "@/utils/formatName";

function AnimatedDropdown({ value, options, onChange, label }: { value: string, options: string[], onChange: (val: string) => void, label?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%", marginBottom: "15px", zIndex: isOpen ? 50 : 1 }}>
      {label && <label style={{ display: "block", marginBottom: "5px", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "12px 20px",
          borderRadius: isOpen ? "20px 20px 0 0" : "20px",
          border: isOpen ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.2)",
          background: isOpen ? "rgba(255,234,0,0.1)" : "rgba(255,255,255,0.05)",
          color: isOpen ? "var(--neon-yellow)" : "var(--neon-white)",
          cursor: "pointer",
          fontFamily: "var(--font-outfit)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.3s ease",
          boxShadow: isOpen ? "0 0 10px rgba(255,234,0,0.2)" : "none"
        }}
      >
        <span style={{ fontWeight: isOpen ? 700 : 400 }}>{value}</span>
        <span style={{ 
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", 
          transition: "transform 0.3s ease",
          fontSize: "0.8rem"
        }}>▼</span>
      </div>

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
        overflowY: "auto",
        maxHeight: isOpen ? "250px" : "0",
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? "visible" : "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 10px 15px rgba(0,0,0,0.5)"
      }}>
        {options.map(opt => (
          <div 
            key={opt} 
            onClick={() => {
              onChange(opt);
              setIsOpen(false);
            }}
            style={{ 
              padding: "12px 20px", 
              color: value === opt ? "var(--neon-yellow)" : "white", 
              cursor: "pointer",
              fontFamily: "var(--font-outfit)",
              fontWeight: value === opt ? 700 : 400,
              background: value === opt ? "rgba(255,234,0,0.1)" : "transparent",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => {
              if (value !== opt) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseOut={(e) => {
              if (value !== opt) e.currentTarget.style.background = "transparent";
            }}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MemoriesInteractivePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [likersState, setLikersState] = useState({ isOpen: false, users: [] as any[], isLoading: false });
  const [selectedCamp, setSelectedCamp] = useState<string>("All Fusion");
  const [selectedDay, setSelectedDay] = useState<string>("All Days");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"album" | "fullscreen">("album");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    // Read URL params to see if we came from a Throwback click
    const searchParams = new URLSearchParams(window.location.search);
    const qCamp = searchParams.get('camp');
    const qDay = searchParams.get('day');
    const qCat = searchParams.get('category');
    const tbId = searchParams.get('tb');

    if (qCamp) setSelectedCamp(qCamp);
    if (qDay) setSelectedDay(qDay);
    if (qCat) setSelectedCategory(qCat);

    const loadData = async () => {
      const saved = await fetchSystemSetting("fusionExhibitPhotos");
      if (saved) setPhotos(saved);

      if (tbId && saved) {
        // smooth scroll down to the image grid
        setTimeout(() => {
          const photoEl = document.getElementById(`photo-${tbId}`);
          if (photoEl) {
            const startPosition = window.pageYOffset;
            const targetPosition = photoEl.getBoundingClientRect().top + startPosition - 100;
            const distance = targetPosition - startPosition;
            const duration = 800; // ms
            let start: number | null = null;
            
            window.requestAnimationFrame(function step(timestamp) {
              if (!start) start = timestamp;
              const progress = timestamp - start;
              // easeInOutCubic easing
              const easeInOutCubic = progress < duration / 2 
                ? 4 * Math.pow(progress / duration, 3) 
                : 1 - Math.pow(-2 * (progress / duration) + 2, 3) / 2;
              
              window.scrollTo(0, startPosition + distance * easeInOutCubic);
              
              if (progress < duration) {
                window.requestAnimationFrame(step);
              }
            });
          }
        }, 800);
      }
    };
    loadData();
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    window.addEventListener("storage", loadData);
    
      const channel = supabase.channel('system_settings_changes_mem')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
          loadData();
        })
        .subscribe();

      return () => {
        window.removeEventListener("storage", loadData);
        supabase.removeChannel(channel);
      };

  }, []);

  const toggleHeart = async (id: number) => {
    if (!currentUser) return alert("You must be logged in to like photos!");
    const updatedPhotos = photos.map(p => {
      if (p.id === id) {
        let likedBy = p.likedBy || [];
        if (likedBy.includes(currentUser.id)) {
          likedBy = likedBy.filter((userId: string) => userId !== currentUser.id);
        } else {
          likedBy = [...likedBy, currentUser.id];
        }
        return { ...p, likedBy, likes: likedBy.length };
      }
      return p;
    });
    setPhotos(updatedPhotos);
    await saveSystemSetting("fusionExhibitPhotos", updatedPhotos);
    localStorage.setItem("fusionExhibitPhotos", JSON.stringify(updatedPhotos));
    window.dispatchEvent(new Event("storage"));
  };

  const toggleIndividualHeart = async (albumId: number, photoIndex: number) => {
    if (!currentUser) return alert("You must be logged in to like photos!");
    const updatedPhotos = photos.map(p => {
      if (p.id === albumId) {
        const childLikedBy = p.childLikedBy ? [...p.childLikedBy] : new Array(p.urls.length).fill([]);
        let currentLikes = childLikedBy[photoIndex] || [];
        if (currentLikes.includes(currentUser.id)) {
          currentLikes = currentLikes.filter((userId: string) => userId !== currentUser.id);
        } else {
          currentLikes = [...currentLikes, currentUser.id];
        }
        childLikedBy[photoIndex] = currentLikes;
        return { ...p, childLikedBy };
      }
      return p;
    });
    
    setPhotos(updatedPhotos);
    await saveSystemSetting("fusionExhibitPhotos", updatedPhotos);
    localStorage.setItem("fusionExhibitPhotos", JSON.stringify(updatedPhotos));
    window.dispatchEvent(new Event("storage"));
    
    if (lightboxPhoto && lightboxPhoto.id === albumId) {
      setLightboxPhoto(updatedPhotos.find(p => p.id === albumId));
    }
  };

  const openLikers = async (likedByList: string[] = []) => {
    if (likedByList.length === 0) {
      setLikersState({ isOpen: true, users: [], isLoading: false });
      return;
    }
    setLikersState({ isOpen: true, users: [], isLoading: true });
    try {
      const { data, error } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', likedByList);
      if (error) {
        console.error("Error fetching likers profiles:", error);
        setLikersState({ isOpen: true, users: [], isLoading: false });
        return;
      }
      setLikersState({ isOpen: true, users: data || [], isLoading: false });
    } catch (err) {
      console.error("Network or fetch error fetching likers:", err);
      setLikersState({ isOpen: true, users: [], isLoading: false });
    }
  };

  // Dynamically generate filter options based on available photos
  const availableCamps = ["All Fusion", ...Array.from(new Set(photos.map(p => p.camp)))];
  
  const availableDays = ["All Days", ...Array.from(new Set(photos
    .filter(p => selectedCamp === "All Fusion" || p.camp === selectedCamp)
    .map(p => p.day)
  ))];

  const availableCategories = ["All Categories", ...Array.from(new Set(photos
    .filter(p => selectedCamp === "All Fusion" || p.camp === selectedCamp)
    .filter(p => selectedDay === "All Days" || p.day === selectedDay)
    .map(p => p.category)
  ))];

  // If a selected filter is no longer available in the options, reset it
  if (!availableCamps.includes(selectedCamp)) setSelectedCamp("All Fusion");
  if (!availableDays.includes(selectedDay)) setSelectedDay("All Days");
  if (!availableCategories.includes(selectedCategory)) setSelectedCategory("All Categories");

  const isReady = !!(selectedCamp && selectedDay && selectedCategory);

  const filteredPhotos = photos.filter(p => {
    if (selectedCamp !== "All Fusion" && selectedCamp !== p.camp) return false;
    if (selectedDay !== "All Days" && p.day !== selectedDay) return false;
    if (selectedCategory !== "All Categories" && p.category !== selectedCategory) return false;
    return true;
  }).sort((a, b) => b.id - a.id);

  return (
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      {/* Top-Left Back Button (Pure SVG Icon, Fixed to Screen Top-Left, Navigates to Fusion Home) */}
      <Link
        href="/fusion"
        aria-label="Back to Fusion"
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

      <header className="top-header" style={{ marginBottom: "20px" }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "10px" }}>
          THE EXHIBIT
        </h1>
        <p className="logo-sub">Photo Library Filter</p>
      </header>

      {/* FILTER SECTION */}
      <section className="filter-section" style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
        <AnimatedDropdown 
          label="1. Select Camp"
          value={selectedCamp} 
          options={availableCamps} 
          onChange={(val) => {
            setSelectedCamp(val);
            setSelectedDay("All Days");
            setSelectedCategory("All Categories");
          }} 
        />
        
        {selectedCamp !== "All Fusion" && (
          <AnimatedDropdown 
            label="2. Select Day"
            value={selectedDay} 
            options={availableDays} 
            onChange={(val) => {
              setSelectedDay(val);
              setSelectedCategory("All Categories");
            }} 
          />
        )}

        {selectedCamp !== "All Fusion" && selectedDay !== "All Days" && (
          <AnimatedDropdown 
            label="3. Select Category"
            value={selectedCategory} 
            options={availableCategories} 
            onChange={(val) => setSelectedCategory(val)} 
          />
        )}
      </section>

      {/* GALLERY RESULTS */}
      <section id="gallery-results">
        {isReady ? (
          <>
            <div style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              <h2 className="glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "1.2rem" }}>
                Results for: <span className="glow-text-yellow">{selectedCamp} &gt; {selectedDay} &gt; {selectedCategory}</span>
              </h2>
            </div>
            
            {filteredPhotos.length === 0 ? (
              <div className="card" style={{ padding: "40px 20px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.2)", background: "transparent" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Walang picture para sa filter na ito.</p>
              </div>
            ) : (
              <div className="masonry-grid" style={{ columnCount: 2, columnGap: "10px" }}>
                {filteredPhotos.map((photo) => (
                  <div 
                    key={photo.id} 
                    className="album-card"
                    onClick={() => {
                      if (photo.urls && photo.urls.length > 0) {
                        setLightboxPhoto(photo);
                        setLightboxIndex(0);
                      } else {
                        // For backwards compatibility with single image posts
                        setLightboxPhoto({ ...photo, urls: [photo.url] });
                        setLightboxIndex(0);
                      }
                    }}
                    style={{ breakInside: "avoid", marginBottom: "25px", position: "relative", cursor: "pointer" }}
                  >
                    <div style={{ position: "relative", width: "100%" }}>
                      {photo.urls && photo.urls.length > 2 && (
                        <img src={photo.urls[2]} alt="stack 3" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px", transform: "rotate(-9deg) scale(0.9) translate(-12px, 15px)", zIndex: 1, filter: "brightness(0.4)", border: "1px solid rgba(255,255,255,0.2)" }} />
                      )}
                      {photo.urls && photo.urls.length > 1 && (
                        <img src={photo.urls[1]} alt="stack 2" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: "10px", transform: "rotate(8deg) scale(0.95) translate(12px, 2px)", zIndex: 2, filter: "brightness(0.6)", border: "1px solid rgba(255,255,255,0.3)" }} />
                      )}
                      <img src={photo.url} alt={`Exhibit ${photo.category}`} style={{ width: "100%", display: "block", position: "relative", zIndex: 3, borderRadius: "10px", border: "1px solid rgba(255,255,255,0.4)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)", transform: photo.urls && photo.urls.length > 1 ? "rotate(-3deg)" : "none", transition: "transform 0.3s ease" }} />
                    </div>
                    
                    {photo.urls && photo.urls.length > 1 && (
                      <div style={{
                        position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", borderRadius: "4px", padding: "4px 8px", display: "flex", alignItems: "center", gap: "6px", color: "white", fontSize: "0.8rem", fontWeight: "bold", backdropFilter: "blur(4px)", zIndex: 10
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        {photo.urls.length}
                      </div>
                    )}
                    <div 
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        right: "10px",
                        background: (photo.likedBy?.includes(currentUser?.id) || photo.isLiked) ? "rgba(255, 234, 0, 0.25)" : "rgba(0,0,0,0.5)",
                        border: (photo.likedBy?.includes(currentUser?.id) || photo.isLiked) ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.3)",
                        borderRadius: "20px",
                        padding: "2px 6px",
                        color: (photo.likedBy?.includes(currentUser?.id) || photo.isLiked) ? "var(--neon-yellow)" : "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        fontSize: "0.85rem",
                        fontFamily: "var(--font-outfit)",
                        transition: "all 0.3s",
                        backdropFilter: "blur(4px)",
                        textShadow: (photo.likedBy?.includes(currentUser?.id) || photo.isLiked) ? "0 0 8px rgba(255, 234, 0, 0.5)" : "none",
                        zIndex: 10
                      }}
                    >
                      <div 
                        onClick={(e) => { e.stopPropagation(); toggleHeart(photo.id); }}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "10px" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" 
                          fill={(photo.likedBy?.includes(currentUser?.id) || photo.isLiked) ? "var(--neon-yellow)" : "none"} 
                          stroke={(photo.likedBy?.includes(currentUser?.id) || photo.isLiked) ? "var(--neon-yellow)" : "currentColor"} 
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                          style={{ filter: (photo.likedBy?.includes(currentUser?.id) || photo.isLiked) ? "drop-shadow(0 0 3px rgba(255,234,0,0.6))" : "none", transition: "all 0.3s" }}
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </div>
                      <div 
                        onClick={(e) => { e.stopPropagation(); openLikers(photo.likedBy || []); }}
                        style={{ cursor: "pointer", padding: "10px" }}
                      >
                        {photo.likedBy?.length ?? photo.likes ?? 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="card" style={{ padding: "40px 20px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.2)", background: "transparent" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>Pumili ng Camp, Day, at Category sa itaas para lumabas ang mga pictures.</p>
          </div>
        )}
      </section>

      {/* LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div 
          style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.95)", zIndex: 9999, display: "flex", flexDirection: "column",
            animation: "scaleUp 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)"
          }}
        >
          {viewMode === "album" ? (
            /* LAYER 1: ALBUM VIEW */
            <>
              {/* Header */}
              <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 style={{ color: "white", margin: 0, fontFamily: "var(--font-outfit)" }}>
                  {lightboxPhoto.category} Album
                </h3>
                <button 
                  onClick={() => setLightboxPhoto(null)}
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: "5px" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              
              {/* Vertical Scrollable Photos */}
              <div style={{ flex: 1, overflowY: "auto", padding: "10px", display: "flex", flexDirection: "column", gap: "15px", alignItems: "center" }}>
                {lightboxPhoto.urls.map((imgUrl: string, idx: number) => {
                  const isSingle = !lightboxPhoto.urls || lightboxPhoto.urls.length <= 1;
                  const isLiked = isSingle 
                    ? (lightboxPhoto.likedBy?.includes(currentUser?.id) || lightboxPhoto.isLiked)
                    : lightboxPhoto.childLikedBy?.[idx]?.includes(currentUser?.id);
                  const likesCount = isSingle 
                    ? (lightboxPhoto.likedBy?.length ?? lightboxPhoto.likes ?? 0)
                    : (lightboxPhoto.childLikedBy?.[idx]?.length || 0);
                  
                  return (
                  <div key={idx} style={{ position: "relative", width: "100%", maxWidth: "500px" }}>
                    <img 
                      src={imgUrl} 
                      alt={`Album photo ${idx}`}
                      onClick={() => {
                        setLightboxIndex(idx);
                        setViewMode("fullscreen");
                      }}
                      style={{ width: "100%", borderRadius: "8px", objectFit: "contain", cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)" }}
                    />
                    <div 
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        right: "10px",
                        background: isLiked ? "rgba(255, 234, 0, 0.25)" : "rgba(0,0,0,0.5)",
                        border: isLiked ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.3)",
                        borderRadius: "20px",
                        padding: "2px 6px",
                        color: isLiked ? "var(--neon-yellow)" : "white",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        fontSize: "0.85rem",
                        fontFamily: "var(--font-outfit)",
                        transition: "all 0.3s",
                        backdropFilter: "blur(4px)",
                        textShadow: isLiked ? "0 0 8px rgba(255, 234, 0, 0.5)" : "none",
                        zIndex: 10
                      }}
                    >
                      <div 
                        onClick={(e) => { e.stopPropagation(); if (isSingle) toggleHeart(lightboxPhoto.id); else toggleIndividualHeart(lightboxPhoto.id, idx); }}
                        style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "10px" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" 
                          fill={isLiked ? "var(--neon-yellow)" : "none"} 
                          stroke={isLiked ? "var(--neon-yellow)" : "currentColor"} 
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                          style={{ filter: isLiked ? "drop-shadow(0 0 3px rgba(255,234,0,0.6))" : "none", transition: "all 0.3s" }}
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </div>
                      <div 
                        onClick={(e) => { e.stopPropagation(); if (isSingle) openLikers(lightboxPhoto.likedBy || []); else openLikers(lightboxPhoto.childLikedBy?.[idx] || []); }}
                        style={{ cursor: "pointer", padding: "10px" }}>{likesCount}
                      </div>
                    </div>
                  </div>
                );
                })}
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "20px 0" }}>End of Album</p>
              </div>
            </>
          ) : (
            /* LAYER 2: FULLSCREEN VIEWER */
            <div 
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
              onTouchStart={(e) => setTouchStart(e.targetTouches[0].clientX)}
              onTouchEnd={(e) => {
                if (!touchStart) return;
                const diff = touchStart - e.changedTouches[0].clientX;
                if (diff > 50) {
                  setSlideDirection("right");
                  setLightboxIndex(prev => prev < lightboxPhoto.urls.length - 1 ? prev + 1 : 0);
                }
                if (diff < -50) {
                  setSlideDirection("left");
                  setLightboxIndex(prev => prev > 0 ? prev - 1 : lightboxPhoto.urls.length - 1);
                }
                setTouchStart(null);
              }}
            >
              {/* Back to Album Button */}
              <button 
                onClick={() => setViewMode("album")}
                style={{ position: "absolute", top: "20px", left: "20px", background: "rgba(0,0,0,0.5)", border: "none", color: "white", cursor: "pointer", padding: "10px", borderRadius: "50%", zIndex: 10001, backdropFilter: "blur(4px)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
                </svg>
              </button>

              {/* Close (X) Button */}
              <button 
                onClick={() => { setLightboxPhoto(null); setViewMode("album"); }}
                style={{ position: "absolute", top: "20px", right: "20px", background: "rgba(0,0,0,0.5)", border: "none", color: "white", cursor: "pointer", padding: "10px", borderRadius: "50%", zIndex: 10001, backdropFilter: "blur(4px)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              {/* Previous Arrow (Desktop) */}
              {lightboxPhoto.urls.length > 1 && (
                <button 
                  onClick={() => {
                    setSlideDirection("left");
                    setLightboxIndex(prev => prev > 0 ? prev - 1 : lightboxPhoto.urls.length - 1);
                  }}
                  style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "50px", height: "50px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", zIndex: 10001 }}
                  className="desktop-arrow"
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
              )}

              {/* Image Display */}
              <img 
                key={lightboxIndex}
                src={lightboxPhoto.urls[lightboxIndex]} 
                alt="Fullscreen" 
                className={slideDirection === "right" ? "slide-anim-right" : "slide-anim-left"}
                style={{ maxWidth: "100%", maxHeight: "100vh", objectFit: "contain", userSelect: "none" }}
              />

              {/* Individual Heart Reaction */}
              {(() => {
                const isSingle3 = !lightboxPhoto.urls || lightboxPhoto.urls.length <= 1;
                const isLiked3 = isSingle3 
                  ? (lightboxPhoto.likedBy?.includes(currentUser?.id) || lightboxPhoto.isLiked)
                  : lightboxPhoto.childLikedBy?.[lightboxIndex]?.includes(currentUser?.id);
                const likesCount3 = isSingle3 
                  ? (lightboxPhoto.likedBy?.length ?? lightboxPhoto.likes ?? 0)
                  : (lightboxPhoto.childLikedBy?.[lightboxIndex]?.length || 0);
                
                return ( <div 
                style={{
                  position: "absolute",
                  bottom: "30px",
                  right: "30px",
                  background: isLiked3 ? "rgba(255, 234, 0, 0.25)" : "rgba(0,0,0,0.5)",
                  border: isLiked3 ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "20px",
                  padding: "2px 6px",
                  color: isLiked3 ? "var(--neon-yellow)" : "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px",
                  fontSize: "1rem",
                  fontFamily: "var(--font-outfit)",
                  transition: "all 0.3s",
                  backdropFilter: "blur(4px)",
                  zIndex: 10001,
                  textShadow: isLiked3 ? "0 0 8px rgba(255, 234, 0, 0.5)" : "none"
                }}
              >
                <div 
                  onClick={(e) => { e.stopPropagation(); if (isSingle3) toggleHeart(lightboxPhoto.id); else toggleIndividualHeart(lightboxPhoto.id, lightboxIndex); }}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", padding: "12px" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" 
                    fill={isLiked3 ? "var(--neon-yellow)" : "none"} 
                    stroke={isLiked3 ? "var(--neon-yellow)" : "currentColor"} 
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                    style={{ filter: isLiked3 ? "drop-shadow(0 0 3px rgba(255,234,0,0.6))" : "none", transition: "all 0.3s" }}
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                  </svg>
                </div>
                <div 
                  onClick={(e) => { e.stopPropagation(); if (isSingle3) openLikers(lightboxPhoto.likedBy || []); else openLikers(lightboxPhoto.childLikedBy?.[lightboxIndex] || []); }}
                  style={{ cursor: "pointer", padding: "12px" }}>
                  {likesCount3}
                </div>
              </div>
              );
            })()}

              {/* Counter */}
              {lightboxPhoto.urls.length > 1 && (
                <div style={{ position: "absolute", bottom: "30px", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", color: "white", padding: "2px 6px", borderRadius: "20px", fontSize: "0.9rem", fontWeight: "bold", backdropFilter: "blur(4px)" }}>
                  {lightboxIndex + 1} / {lightboxPhoto.urls.length}
                </div>
              )}

              {/* Next Arrow (Desktop) */}
              {lightboxPhoto.urls.length > 1 && (
                <button 
                  onClick={() => {
                    setSlideDirection("right");
                    setLightboxIndex(prev => prev < lightboxPhoto.urls.length - 1 ? prev + 1 : 0);
                  }}
                  style={{ position: "absolute", right: "20px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "50px", height: "50px", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", zIndex: 10001 }}
                  className="desktop-arrow"
                >
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              )}
              
              <style>{`
                @media (max-width: 768px) {
                  .desktop-arrow { display: none !important; }
                }
                @keyframes slideRightAnim {
                  from { opacity: 0; transform: translateX(20px); }
                  to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideLeftAnim {
                  from { opacity: 0; transform: translateX(-20px); }
                  to { opacity: 1; transform: translateX(0); }
                }
                .slide-anim-right {
                  animation: slideRightAnim 0.5s cubic-bezier(0.25, 1, 0.3, 1) forwards;
                }
                .slide-anim-left {
                  animation: slideLeftAnim 0.5s cubic-bezier(0.25, 1, 0.3, 1) forwards;
                }
                @keyframes scaleUp {
                  from { transform: scale(0.9); opacity: 0; }
                  to { transform: scale(1); opacity: 1; }
                }
                @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
                }
                .album-card {
                  transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .album-card:active {
                  transform: scale(0.92);
                }
              `}</style>
            </div>
          )}
        </div>
      )}

      {/* LIKERS MODAL */}
      {likersState.isOpen && (
        <div 
          onClick={() => setLikersState(prev => ({ ...prev, isOpen: false }))}
          style={{
            position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
            background: "rgba(0,0,0,0.8)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px", animation: "fadeIn 0.2s ease"
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{
              display: "flex", flexDirection: "column", background: "var(--bg-main, #111)",
              width: "100%", maxWidth: "400px", border: "1px solid var(--neon-yellow)", borderTop: "4px solid var(--neon-yellow)",
              borderRadius: "12px", padding: "20px", color: "var(--neon-white, white)",
              animation: "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              boxShadow: "0 8px 30px rgba(255, 255, 0, 0.15)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-outfit)", color: "var(--neon-white, white)", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--neon-yellow)" stroke="var(--neon-yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 6px rgba(255, 234, 0, 0.6))" }}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span>Reactions</span>
              </h3>
              <button 
                onClick={() => setLikersState(prev => ({ ...prev, isOpen: false }))} 
                style={{ background: "transparent", border: "none", color: "var(--text-muted, gray)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: "4px" }}
                aria-label="Close modal"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "300px", overflowY: "auto", paddingRight: "5px" }}>
              {likersState.isLoading ? (
                <p style={{ textAlign: "center", color: "var(--text-muted, gray)", fontSize: "0.9rem", margin: "20px 0" }}>Loading...</p>
              ) : likersState.users.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--text-muted, gray)", fontSize: "0.9rem", margin: "20px 0" }}>No reactions yet.</p>
              ) : (
                likersState.users.map((user, i) => {
                  const displayName = formatFullName(user.first_name, user.last_name) || "Heartist";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px", background: "rgba(255,255,255,0.03)" }}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={displayName} style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--neon-yellow)", fontWeight: "900", fontFamily: "var(--font-outfit)" }}>
                          {(displayName || "?").charAt(0)}
                        </div>
                      )}
                      <span style={{ fontSize: "0.95rem", color: "var(--neon-white)" }}>{displayName}</span>
                      <div style={{ marginLeft: "auto" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--neon-yellow)" stroke="var(--neon-yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}





