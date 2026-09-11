"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown from "@/components/CustomDropdown";

const LocationMap = dynamic(() => import('@/components/LocationMap'), { ssr: false, loading: () => <div style={{height: "200px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", borderRadius: "12px", border: "2px solid rgba(255,255,255,0.1)"}}>Loading Map...</div> });

export default function JointFellowshipPage() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [hynTargetDate, setHynTargetDate] = useState("");
  const [hynHighlights, setHynHighlights] = useState<string[]>([]);

  const [selectedHYN, setSelectedHYN] = useState("1");
  const [hynIterations, setHynIterations] = useState<number[]>([1, 2, 3, 4, 5]);
  const [hynLocation, setHynLocation] = useState<any>(null);
  const [hynTheme, setHynTheme] = useState("TBA");
  const [hynDate, setHynDate] = useState("TBA");
  const [hynTime, setHynTime] = useState("TBA");
  const [hynStatus, setHynStatus] = useState("Open");
  const [hynLat, setHynLat] = useState<number | null>(null);
  const [hynLng, setHynLng] = useState<number | null>(null);

  const loadHynData = async (iteration: string) => {
    const iterId = parseInt(iteration);
    const { data } = await supabase.from('hyn_events').select('*').eq('id', iterId).single();
    if (data) {
      setHynLocation(data);
      setHynTheme(data.theme || "TBA");
        setHynDate(data.date || "--,--,----");
      setHynTime(data.time || "--");
      setHynStatus(data.status || "Open");
      setHynLat(data.lat || null);
      setHynLng(data.lng || null);
      setHynTargetDate(data.target_date || "");
      setHynHighlights(data.highlights && data.highlights.length > 0 ? data.highlights : []);
      
      const { data: rsvps } = await supabase.from('hyn_rsvps').select('*').eq('event_id', iterId);
      let rsvpd = false;
      if (rsvps && rsvps.length > 0) {
        const activeUserStr = localStorage.getItem("activeUser");
          if (activeUserStr) {
            try {
              const userObj = JSON.parse(activeUserStr);
              const activeName = userObj.firstName + (userObj.lastName ? " " + userObj.lastName : "");
              rsvpd = rsvps.some((r:any) => r.username === activeName);
            } catch(e) {}
          }
      }
      setIsRegistered(rsvpd);
    } else {
      setHynLocation(null);
      setHynTheme("TBA");
        setHynDate("--,--,----");
      setHynTime("--");
      setHynStatus("Open");
      setHynLat(null);
      setHynLng(null);
      setHynTargetDate("");
      setHynHighlights([]);
      setIsRegistered(false);
    }
  
  };

  const fetchItersAndData = async () => {
    const { data } = await supabase.from('hyn_events').select('id').order('id', { ascending: true });
    if (data && data.length > 0) {
      const ids = data.map(d => d.id);
      setHynIterations(ids);
      const maxId = ids[ids.length - 1];
      setSelectedHYN(maxId.toString());
      loadHynData(maxId.toString());
    }
  };

  useEffect(() => {
    fetchItersAndData();

    const channel = supabase.channel('hyn_events_iters')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hyn_events' }, () => {
        fetchItersAndData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    loadHynData(selectedHYN);
    setCurrentSlide(0);

    // Realtime listener for HYN changes
    const channel = supabase.channel('hyn_events_changes_user')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hyn_events' }, () => {
        loadHynData(selectedHYN);
    setCurrentSlide(0);
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
      };
    }, [selectedHYN]);

    useEffect(() => {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("scrollTo") === "register") {
          // Force page to start at the top immediately
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
          
          let attempts = 0;
          const maxAttempts = 40;
          const interval = setInterval(() => {
            attempts++;
            const el = document.getElementById("register-section");
            if (el) {
              const targetEl = el;
              clearInterval(interval);
              
              setTimeout(() => {
                const rect = targetEl.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const targetY = Math.max(0, rect.top + scrollTop - window.innerHeight / 2 + rect.height / 2);
                const startY = window.pageYOffset || document.documentElement.scrollTop;
                const difference = targetY - startY;
                const duration = Math.min(Math.max(Math.abs(difference) * 0.7, 1400), 2800);
                let startTime: number | null = null;
                
                function step(time: number) {
                  if (startTime === null) startTime = time;
                  const progress = time - startTime;
                  const t = Math.min(progress / duration, 1);
                  const ease = t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
                  window.scrollTo(0, startY + difference * ease);
                  
                  if (progress < duration) {
                    window.requestAnimationFrame(step);
                  } else {
                    // Highlight pulse
                    const origTransform = targetEl.style.transform;
                    const origShadow = targetEl.style.boxShadow;
                    const origTransition = targetEl.style.transition;
                    targetEl.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
                    targetEl.style.transform = "scale(1.05)";
                    targetEl.style.boxShadow = "0 0 30px rgba(255, 234, 0, 0.85)";
                    setTimeout(() => {
                      targetEl.style.transform = origTransform || "";
                      targetEl.style.boxShadow = origShadow || "";
                      setTimeout(() => {
                        targetEl.style.transition = origTransition || "";
                      }, 500);
                    }, 2000);
                  }
                }
                window.requestAnimationFrame(step);
              }, 100);
            } else if (attempts >= maxAttempts) {
              clearInterval(interval);
            }
          }, 50);
        }
      }
    }, []);

  // Target Date for next Heart Youth Night (Dummy Data: Dec 15, 2026)
  useEffect(() => {
    // Auth Protection
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
        window.location.href = "/login";
        return;
      }
    }

    if (!hynTargetDate) return;
    const targetDate = new Date(hynTargetDate).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hynTargetDate]);

  
    useEffect(() => {
      const channel = supabase.channel('hyn_rsvps_changes_user')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hyn_rsvps' }, () => {
          loadHynData(selectedHYN);
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [selectedHYN]);

  const handleRSVP = async () => {
    if (isRegistered || hynStatus !== "Open") return;
    let uname = "Unknown User";
      const activeUserStr = localStorage.getItem("activeUser");
      if (activeUserStr) {
        try {
          const userObj = JSON.parse(activeUserStr);
          uname = userObj.firstName + (userObj.lastName ? " " + userObj.lastName : "");
        } catch(e) {}
      }
    const { error } = await supabase.from('hyn_rsvps').insert({
      event_id: parseInt(selectedHYN),
      username: uname,
      time: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
    });
    
    if (!error) {
      setIsRegistered(true);
    }
  };

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % hynHighlights.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? hynHighlights.length - 1 : prev - 1));

  // Auto-play Carousel
  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % (hynHighlights.length || 1));
    }, 4000);
    return () => clearInterval(slideInterval);
  }, [hynHighlights.length]);

  // Swipe handlers
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) {
        // It was a tap (no movement)
        if (hynHighlights[currentSlide] && (!hynHighlights[currentSlide].startsWith("#"))) {
          setSelectedImage(hynHighlights[currentSlide]);
        }
        setTouchStart(0);
        setTouchEnd(0);
        return;
      }
      const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) nextSlide();
    if (distance < -minSwipeDistance) prevSlide();
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <>
      <style>{`
        @keyframes fadeSlide {
          0% { opacity: 0.5; transform: scale(0.98); }
          100% { opacity: 1; transform: scale(1); }
        }
        .carousel-item {
          animation: fadeSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
      <main className="app-container" style={{ paddingBottom: "120px" }}>
      {/* Hero Section */}
      <header className="top-header" style={{ marginBottom: "40px" }}>
        <HeartistLogo className="animated-glow-text" width={40} height={40} />
        <h1 className="header-title glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2.2rem", marginTop: "15px", lineHeight: "1.2" }}>
          HEART YOUTH NIGHT
        </h1>
        
        <p className="logo-sub" style={{ marginTop: "10px", fontStyle: "italic" }}>Gathering as one body in Christ.</p>
      </header>

      {/* 1. New Look Countdown Timer (Circular) */}
      <section style={{ marginBottom: "50px", textAlign: "center" }}>
        <h2 style={{ color: "var(--text-muted)", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "20px" }}>
          Next Gathering In
        </h2>
        
        <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { label: "DAYS", value: timeLeft.days },
            { label: "HOURS", value: timeLeft.hours },
            { label: "MINS", value: timeLeft.minutes },
            { label: "SECS", value: timeLeft.seconds },
          ].map((item, idx) => (
            <div key={idx} style={{ 
              width: "75px", 
              height: "75px", 
              borderRadius: "50%", 
              border: "2px solid rgba(255, 234, 0, 0.5)", 
              display: "flex", 
              flexDirection: "column", 
              alignItems: "center", 
              justifyContent: "center",
              background: "rgba(0,0,0,0.3)",
              boxShadow: "0 0 15px rgba(255, 234, 0, 0.1)"
            }}>
              <span style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>{item.value}</span>
              <span style={{ fontSize: "0.65rem", color: "var(--neon-yellow)", letterSpacing: "1px" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Event Details & Registration */}
      <section style={{ marginBottom: "50px" }}>
        <div className="card" style={{ borderLeft: "4px solid var(--neon-white)", background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%)", padding: "25px" }}>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "1.4rem", color: "var(--neon-white)", marginBottom: "20px", textAlign: "center" }}>
            Event Details
          </h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginBottom: "25px" }}>
            <div style={{ display: "flex", gap: "15px", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div>
                <p style={{ color: "var(--neon-yellow)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Theme</p>
                <p style={{ color: "white", fontSize: "1.1rem" }}>{hynTheme !== "TBA" ? hynTheme : "TBA"}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "15px", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div>
                <p style={{ color: "var(--neon-yellow)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Date</p>
                <p style={{ color: "white", fontSize: "1.1rem" }}>{hynDate !== "--,--,----" ? hynDate : "TBA"}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "15px", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div>
                <p style={{ color: "var(--neon-yellow)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Time</p>
                <p style={{ color: "white", fontSize: "1.1rem" }}>{hynTime !== "--" ? hynTime : "TBA"}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "15px", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              <div>
                <p style={{ color: "var(--neon-yellow)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Venue</p>
                <p style={{ color: "white", fontSize: "1.1rem" }}>{hynLocation?.name || "Classified"}</p>
              </div>
            </div>
          </div>

          <button id="register-section" className="glow-text-black"
            onClick={handleRSVP}
            disabled={isRegistered || hynStatus !== "Open"}
            style={{ width: "100%", padding: "15px", background: isRegistered || hynStatus !== "Open" ? "gray" : "var(--neon-yellow)", color: isRegistered || hynStatus !== "Open" ? "lightgray" : "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "1px", cursor: isRegistered || hynStatus !== "Open" ? "not-allowed" : "pointer", marginTop: "10px" }}
          >
            {hynStatus === "Ended" ? "Registration Ended" : hynStatus === "Close" ? "Registration Closed" : isRegistered ? "You are registered!" : "Register Here"}
          </button>
        </div>
      </section>

      {/* The Event Compass */}
      <section style={{ marginBottom: "50px" }}>
        <h2 className="section-title">The Event Compass</h2>
        <div className="card" style={{ padding: "30px", borderLeft: "4px solid var(--neon-yellow)", background: "linear-gradient(135deg, rgba(255,234,0,0.05) 0%, transparent 100%)" }}>
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Select Event Iteration</label>
            <CustomDropdown
              value={selectedHYN}
              onChange={(val) => setSelectedHYN(val)}
              options={hynIterations.map((num) => ({ value: num.toString(), label: `Heart Youth Night ${num}` }))}
            />
          </div>

          {hynLocation ? (
            <div style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "20px", marginTop: "15px", textAlign: "left" }}>
              <p style={{ margin: "0 0 15px 0", fontSize: "1.1rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                <strong style={{ color: "var(--neon-white)", display: "inline-block", width: "80px" }}>Location:</strong> {hynLocation.name || "TBA"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px" }}>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--canary-yellow)", fontFamily: "var(--font-outfit)" }}>
                  <strong style={{ color: "var(--neon-white)", display: "inline-block", width: "80px" }}>Theme:</strong> {hynTheme}
                </p>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--canary-yellow)", fontFamily: "var(--font-outfit)" }}>
                  <strong style={{ color: "var(--neon-white)", display: "inline-block", width: "80px" }}>Date:</strong> {hynDate}
                </p>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--canary-yellow)", fontFamily: "var(--font-outfit)" }}>
                  <strong style={{ color: "var(--neon-white)", display: "inline-block", width: "80px" }}>Time:</strong> {hynTime}
                </p>
                <p style={{ margin: 0, fontSize: "0.95rem", color: hynStatus === "Open" ? "#00FF80" : hynStatus === "Ended" ? "#FF4444" : "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                  <strong style={{ color: "var(--neon-white)", display: "inline-block", width: "80px" }}>Status:</strong> {hynStatus === "Open" ? "Registration open" : hynStatus === "Ended" ? "Event Ended" : "Registration Closed"}
                </p>
              </div>
              {hynLat !== null && hynLng !== null && (
                <div style={{ marginTop: "15px" }}>
                  <LocationMap lat={hynLat} lng={hynLng} interactive={false} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", alignItems: "center", padding: "30px 0" }}>
              <div style={{ width: "100px", height: "100px", borderRadius: "50%", border: "2px dashed var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", animation: "spin 10s linear infinite" }}>
                <span style={{ fontSize: "3rem", animation: "spin 10s linear infinite reverse" }}>❓</span>
              </div>
              <h3 style={{ margin: 0, fontSize: "1.5rem", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", textTransform: "uppercase", }}> CLASSIFIED</h3>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center" }}>The coordinates for HYN {selectedHYN} are still unknown. Are you ready?</p>
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes spin { 100% { transform: rotate(360deg); } }
              `}} />
            </div>
          )}
        </div>
      </section>

      {/* 3. Recent Highlights (Carousel) */}
        {hynHighlights && hynHighlights.length > 0 && (
        <section style={{ marginBottom: "50px" }}>
        <h2 className="section-title">Recent Highlights</h2>
        
        <div 
            style={{ position: "relative", width: "100%", minHeight: "250px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", touchAction: "pan-y", backgroundColor: "#111" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {hynHighlights[currentSlide] && (!hynHighlights[currentSlide].startsWith("#")) ? (
              <img 
                key={currentSlide}
                className="carousel-item"
                src={hynHighlights[currentSlide]} 
                alt={`Highlight ${currentSlide + 1}`}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block"
                }}
              />
            ) : (
              <div 
                key={currentSlide}
                className="carousel-item"
                style={{
                  width: "100%", 
                  minHeight: "250px", 
                  background: hynHighlights[currentSlide] || "#333",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <p style={{ color: "black", fontSize: "1.2rem", fontFamily: "var(--font-outfit)" }}>
                  Highlight {currentSlide + 1}
                </p>
              </div>
            )}

            {/* Indicators */}
            <div style={{ position: "absolute", bottom: "15px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "8px", background: "rgba(0,0,0,0.4)", padding: "5px 10px", borderRadius: "15px" }}>
              {hynHighlights.map((_, idx) => (
                <div key={idx} style={{ 
                  width: "8px", 
                  height: "8px", 
                  borderRadius: "50%", 
                  background: currentSlide === idx ? "var(--neon-yellow)" : "rgba(255,255,255,0.5)",
                  transition: "all 0.3s"
                }}/>
              ))}
            </div>
          </div>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "10px", fontStyle: "italic" }}>
          Swipe to see memories from our last gathering.
        </p>
      </section>
      )}

      <Link href="/" className="nav-item" style={{ alignSelf: "center", padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)", display: "block", textAlign: "center", maxWidth: "200px", margin: "0 auto" }}>
        Back to Home
      </Link>
    </main>
    </>
  );
}
