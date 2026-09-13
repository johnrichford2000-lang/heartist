"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import GlobalBottomNav from "@/components/GlobalBottomNav";
import { fetchAnnouncements, fetchSystemSetting } from "@/lib/fusionSync";

const DEVOTIONS = [
  {
    verse: "Jeremiah 29:11",
    text: '"For I know the plans I have for you,” declares the Lord, “plans to prosper you and not to harm you, plans to give you hope and a future."',
    reflection: "God's timing is perfect. Even when things seem uncertain, trust that He is working behind the scenes for your good."
  },
  {
    verse: "Philippians 4:13",
    text: '"I can do all this through him who gives me strength."',
    reflection: "Whatever challenges you face today, you don't have to face them alone. Draw your strength from Him."
  },
  {
    verse: "Proverbs 3:5-6",
    text: '"Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight."',
    reflection: "Surrender your worries today. When we stop trying to control everything, God steps in and guides our way."
  },
  {
    verse: "Isaiah 40:31",
    text: '"But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."',
    reflection: "Are you feeling tired or burned out? Rest in God's presence today and let Him renew your spirit."
  },
  {
    verse: "Romans 8:28",
    text: '"And we know that in all things God works for the good of those who love him, who have been called according to his purpose."',
    reflection: "Every piece of your story has a purpose. Keep loving God, and watch how He weaves everything together for good."
  }
];

export default function Home() {
  const router = useRouter();
  const [dailyDevotion, setDailyDevotion] = useState(DEVOTIONS[0]);
  const [currentDate, setCurrentDate] = useState("");
  const [fusionTheme, setFusionTheme] = useState("CYBER GLOW");
  const [exhibitPhotos, setExhibitPhotos] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [activeAnnId, setActiveAnnId] = useState<number | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [fusionCountdownDays, setFusionCountdownDays] = useState<number | null>(null);
  const [isRegOpen, setIsRegOpen] = useState(false);
  const [isPackingAnnounced, setIsPackingAnnounced] = useState(false);
  const [isItineraryAnnounced, setIsItineraryAnnounced] = useState(false);
  
  const [currentAnnSlide, setCurrentAnnSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const nextAnnSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const total = announcements.length + (fusionCountdownDays !== null ? 1 : 0) + (isRegOpen ? 1 : 0) + (isPackingAnnounced ? 1 : 0) + (isItineraryAnnounced ? 1 : 0);
    if (total === 0) return;
    setCurrentAnnSlide(prev => (prev === total - 1 ? 0 : prev + 1));
  };
  const prevAnnSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const total = announcements.length + (fusionCountdownDays !== null ? 1 : 0) + (isRegOpen ? 1 : 0) + (isPackingAnnounced ? 1 : 0) + (isItineraryAnnounced ? 1 : 0);
    if (total === 0) return;
    setCurrentAnnSlide(prev => (prev === 0 ? total - 1 : prev - 1));
  };
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    if (distance > minSwipeDistance) nextAnnSlide();
    if (distance < -minSwipeDistance) prevAnnSlide();
    setTouchStart(0);
    setTouchEnd(0);
  };

  useEffect(() => {
    const loadData = async () => {
      const { performGlobalCleanup } = await import("@/lib/cleanup");
      performGlobalCleanup();

      const userStr = localStorage.getItem("activeUser");
      if (userStr) setActiveUser(JSON.parse(userStr));
      
      let isAnnUnread = false;
      
      // Fetch from Supabase
      let parsedAnns = await fetchAnnouncements();


      setAnnouncements(parsedAnns || []);
        if (parsedAnns && parsedAnns.length > 0) {
          const lastId = String(parsedAnns[parsedAnns.length - 1].id);
          const isAdminLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
          const currentUsername = isAdminLoggedIn ? "admin" : (userStr ? JSON.parse(userStr).firstName : "guest");
          const readId = Number(localStorage.getItem(`lastReadAnnouncementId_${currentUsername}`) || localStorage.getItem(`lastSeenAnnouncementId_${currentUsername}`) || 0);
          isAnnUnread = Number(lastId) > readId;
        }

      const parsedCountdown = await fetchSystemSetting("fusionCountdownData");
      if (parsedCountdown) {
        try {
          if (parsedCountdown.targetDate) {
            const target = new Date(parsedCountdown.targetDate);
            const now = new Date();
            const diffTime = target.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays >= -5 && diffDays <= 7) {
              setFusionCountdownDays(diffDays);
            } else {
              setFusionCountdownDays(null);
            }
          }
        } catch (e) {
          console.error("Failed to parse countdown data", e);
        }
      }

      let isRegUnread = false;
      let parsedBlueprint = await fetchSystemSetting("fusionBlueprintData");

      if (parsedBlueprint) {
        localStorage.setItem("fusionBlueprintData", JSON.stringify(parsedBlueprint));
        try {
          const regOpen = parsedBlueprint.isRegistrationOpen ?? false;
          setIsRegOpen(regOpen);
          setIsPackingAnnounced(parsedBlueprint.isPackingAnnounced ?? false);
          setIsItineraryAnnounced(parsedBlueprint.isItineraryAnnounced ?? false);
          
          if (regOpen || parsedBlueprint.isPackingAnnounced || parsedBlueprint.isItineraryAnnounced) {
            const isAdminLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
            const currentUsername = isAdminLoggedIn ? "admin" : (userStr ? JSON.parse(userStr).firstName : "guest");
            const lastReadRegStamp = localStorage.getItem(`lastReadRegistrationOpen_${currentUsername}`);
            if (parsedBlueprint.timestamp && parsedBlueprint.timestamp !== lastReadRegStamp) {
              isRegUnread = true;
            }
          }
        } catch (e) {
          console.error("Failed to parse blueprint data", e);
        }
      } else {
        setIsRegOpen(false);
        setIsPackingAnnounced(false);
        setIsItineraryAnnounced(false);
      }
      
      const photos = await fetchSystemSetting("fusionExhibitPhotos");
      if (photos) {
        setExhibitPhotos(photos);
      }

      setHasUnread(isAnnUnread || isRegUnread);
    };
    
    const channelId = `page_announcements_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        loadData();
      })
      .on('broadcast', { event: 'announcement_updated' }, () => {
        loadData();
      })
      .subscribe();

    loadData();
    window.addEventListener("storage", loadData);
    window.addEventListener("announcements_updated", loadData);
    return () => { 
      window.removeEventListener("storage", loadData); 
      window.removeEventListener("announcements_updated", loadData);
      supabase.removeChannel(channel); 
    };
  }, []);

  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    setCurrentDate(formattedDate);

    // Update devotion based on day of year (consistent Word of the Day)
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = Number(today) - Number(start);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    setDailyDevotion(DEVOTIONS[dayOfYear % DEVOTIONS.length]);
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
        .nav-item:hover .nav-icon {
          color: var(--neon-yellow) !important;
          filter: drop-shadow(0 0 5px var(--neon-yellow-glow)) !important;
        }
        .nav-item:hover .nav-label {
          color: var(--neon-yellow) !important;
          text-shadow: 0 0 5px var(--neon-yellow-glow) !important;
        }
      `}} />
      <main className="main-container" style={{ paddingBottom: "100px" }}>
      <header style={{ marginBottom: "30px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={50} height={50} />
        <h1 
          className="header-title glow-text-yellow" 
          style={{ fontFamily: "var(--font-outfit)", fontSize: "3rem", marginTop: "15px", color: "var(--sunflower-yellow)" }}
        >
          HEARTIST PORTAL
        </h1>
        <h2 style={{ color: "var(--neon-white)", fontSize: "1.2rem", marginTop: "10px", fontFamily: "var(--font-outfit)" }}>
          Your central hub for all youth ministry modules.
        </h2>
      </header>

      {/* Daily Devotion Widget */}
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "25px", background: "rgba(255, 234, 0, 0.05)", border: "1px solid var(--neon-yellow)", borderRadius: "15px", marginBottom: "40px", boxShadow: "0 0 15px rgba(255, 234, 0, 0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
          <h2 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", margin: 0, fontSize: "1.5rem", color: "var(--sunflower-yellow)" }}>Daily Devotion</h2>
          <span style={{ color: "var(--canary-yellow)", fontSize: "0.9rem", fontFamily: "var(--font-outfit)", fontStyle: "italic" }}>
            {currentDate}
          </span>
        </div>
        <p style={{ color: "var(--neon-white)", fontSize: "1.15rem", fontStyle: "italic", marginBottom: "10px", lineHeight: "1.5" }}>
          {dailyDevotion.text}
        </p>
        <p style={{ color: "var(--lemon-yellow)", fontSize: "1rem", fontWeight: "bold", marginBottom: "20px", fontFamily: "var(--font-outfit)" }}>
          - {dailyDevotion.verse}
        </p>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
          <p style={{ color: "var(--neon-white)", fontSize: "0.95rem", lineHeight: "1.6", fontFamily: "var(--font-outfit)", flex: 1, minWidth: "200px" }}>
            <strong style={{ color: "var(--amber-yellow)" }}>Reflection:</strong> {dailyDevotion.reflection}
          </p>
            <Link 
              href="/devotion" 
              onClick={(e) => {
                if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                  e.preventDefault();
                  window.location.href = "/login";
                  return;
                }
              }}
              style={{ padding: "8px 20px", background: "var(--neon-yellow)", color: "black", borderRadius: "8px", textDecoration: "none", fontWeight: "bold", fontFamily: "var(--font-outfit)", transition: "all 0.3s" }}
            >
              Write Reflection
            </Link>
          </div>
        </div>

      {/* Announcement Widget */}
      <div 
        onClick={() => {
          if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
            window.location.href = "/login";
            return;
          }
          setActiveAnnId(activeAnnId === 1 ? null : 1);
          if (hasUnread) {
            const userStr = localStorage.getItem("activeUser");
            const isAdminLoggedIn = localStorage.getItem("isAdminLoggedIn") === "true";
            const currentUsername = isAdminLoggedIn ? "admin" : (userStr ? JSON.parse(userStr).firstName : "guest");
            
            if (announcements.length > 0) {
              const latestId = announcements[announcements.length - 1].id.toString();
              localStorage.setItem(`lastReadAnnouncementId_${currentUsername}`, latestId);
              localStorage.setItem(`lastSeenAnnouncementId_${currentUsername}`, latestId);
            }
            
            const savedBlueprint = localStorage.getItem("fusionBlueprintData");
            if (savedBlueprint) {
              try {
                const parsedBlueprint = JSON.parse(savedBlueprint);
                if (parsedBlueprint.timestamp) {
                  localStorage.setItem(`lastReadRegistrationOpen_${currentUsername}`, parsedBlueprint.timestamp);
                  localStorage.setItem(`lastSeenRegistrationOpen_${currentUsername}`, parsedBlueprint.timestamp);
                }
              } catch (e) {}
            }
            
            setHasUnread(false);
            window.dispatchEvent(new CustomEvent("announcements_updated"));
            window.dispatchEvent(new Event("storage"));
          }
        }}
        style={{ 
          width: "100%",
          minWidth: 0,
          maxWidth: "800px", 
          margin: "0 auto", 
          padding: "clamp(15px, 4vw, 25px)", 
          background: activeAnnId === 1 ? "rgba(255, 234, 0, 0.05)" : "var(--card-bg)", 
          border: activeAnnId === 1 ? "1px solid var(--neon-yellow)" : "1px solid rgba(255, 255, 255, 0.2)", 
          borderRadius: "15px", 
          marginBottom: "40px", 
          textAlign: "center",
          boxShadow: activeAnnId === 1 ? "0 0 30px rgba(255, 234, 0, 0.6), inset 0 0 15px rgba(255, 234, 0, 0.1)" : "none",
          transition: "all 0.3s ease",
          cursor: "pointer",
          position: "relative",
          boxSizing: "border-box"
        }}
      >
        <h2 style={{ fontFamily: "var(--font-outfit)", margin: "0 0 15px 0", fontSize: "clamp(1.8rem, 6vw, 2.5rem)", color: "var(--neon-white)", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <span style={{ position: "relative" }}>
            📢 Announcements
            {hasUnread && (
              <span style={{ position: "absolute", top: "-5px", right: "-15px", width: "12px", height: "12px", background: "red", borderRadius: "50%", zIndex: 20 }}></span>
            )}
          </span>
        </h2>
             <div style={{ padding: "clamp(15px, 4vw, 30px)", background: "rgba(0,0,0,0.3)", borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", gap: "15px" }}>
            {announcements.length === 0 && fusionCountdownDays === null && !isRegOpen && !isPackingAnnounced && !isItineraryAnnounced ? (
              <p style={{ margin: 0, color: "var(--text-muted)", fontStyle: "italic", fontSize: "clamp(1.1rem, 4vw, 1.3rem)" }}>No announcement yet.</p>
            ) : (
              (() => {
                let finalAnns = [...announcements].reverse();
                if (fusionCountdownDays !== null) {
                  const contentText = fusionCountdownDays <= 0 
                    ? "IT'S THE DAY OF FUSION CAMP! GET READY!" 
                    : `${fusionCountdownDays} DAY${fusionCountdownDays > 1 ? "S" : ""} TO GO BEFORE FUSION CAMP!`;
                    
                  finalAnns.push({
                    id: 999999,
                    content: contentText,
                    timestamp: new Date().toISOString(),
                    isFeatured: false,
                    isFusionCountdown: true
                  });
                }
                if (isRegOpen) {
                  finalAnns.push({
                    id: 999998,
                    content: "FUSION CAMP REGISTRATION IS NOW OPEN!",
                    timestamp: new Date().toISOString(),
                    isFeatured: false,
                    isRegistrationAnnouncement: true
                  });
                }
                if (isPackingAnnounced) {
                  finalAnns.push({
                    id: 999997,
                    content: "CHECK YOUR PACKING LIST(PABAON)",
                    timestamp: new Date().toISOString(),
                    isFeatured: false,
                    isPackingListAnnouncement: true
                  });
                }
                if (isItineraryAnnounced) {
                  finalAnns.push({
                    id: 999996,
                    content: "VIEW CAMP ITINERARY",
                    timestamp: new Date().toISOString(),
                    isFeatured: false,
                    isItineraryAnnouncement: true
                  });
                }
                const reversedAnns = finalAnns;
                if (reversedAnns.length === 0) return null;

                return (
                  <div 
                    style={{ position: "relative", width: "100%", borderRadius: "12px", overflow: "hidden", touchAction: "pan-y" }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {/* Arrow Left */}
                    {reversedAnns.length > 1 && (
                      <button onClick={prevAnnSlide} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.5)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        &#10094;
                      </button>
                    )}
                
                    {/* Arrow Right */}
                    {reversedAnns.length > 1 && (
                      <button onClick={nextAnnSlide} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", zIndex: 10, background: "rgba(0,0,0,0.5)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50%", width: "30px", height: "30px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        &#10095;
                      </button>
                    )}

                    <div style={{ display: "flex", width: `${reversedAnns.length * 100}%`, flexWrap: "nowrap", alignItems: "stretch", transition: "transform 0.5s ease-in-out", transform: `translateX(-${(currentAnnSlide / reversedAnns.length) * 100}%)` }}>
                      {reversedAnns.map((ann) => {
                        const isLong = !ann.isFusionCountdown && !ann.isRegistrationAnnouncement && !ann.isPackingListAnnouncement && !ann.isItineraryAnnouncement && ann.content.length > 80;
                        const displayText = isLong ? ann.content.substring(0, 80) + " " : ann.content;
                        return (
                          <div key={ann.id} style={{ width: `${100 / reversedAnns.length}%`, minWidth: 0, boxSizing: "border-box", padding: "0 5px", display: "flex", alignItems: "stretch" }}>
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                                  window.location.href = "/login";
                                  return;
                                }
                                if (ann.postId) {
                                  router.push(`/community?scrollTo=${ann.postId}`);
                                } else if (ann.content && typeof ann.content === 'string' && (ann.content.includes("HYN Registration is now OPEN") || ann.content.toLowerCase().includes("hyn registration"))) {
                                  router.push('/joint?scrollTo=register');
                                } else if (ann.isRegistrationAnnouncement) {
                                  router.push(`/fusion/info?scrollTo=bulletin`);
                                } else if (ann.isPackingListAnnouncement) {
                                  router.push(`/fusion/info?scrollTo=packingList`);
                                } else if (ann.isItineraryAnnouncement) {
                                  router.push(`/fusion/info?scrollTo=itinerary`);
                                }
                              }}
                              style={ann.isFusionCountdown ? {
                                position: "relative", 
                                padding: "clamp(15px, 3vw, 15px) clamp(25px, 8vw, 45px) clamp(15px, 3vw, 25px) clamp(25px, 8vw, 45px)", 
                                borderRadius: "8px", 
                                textAlign: "center",
                                minHeight: "clamp(80px, 15vw, 120px)",
                                flex: 1,
                                minWidth: 0,
                                width: "100%",
                                boxSizing: "border-box",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                cursor: "default"
                              } : (ann.isRegistrationAnnouncement || ann.isPackingListAnnouncement || ann.isItineraryAnnouncement) ? {
                                position: "relative", 
                                padding: "clamp(15px, 3vw, 15px) clamp(25px, 8vw, 45px) clamp(15px, 3vw, 25px) clamp(25px, 8vw, 45px)", 
                                borderRadius: "8px", 
                                textAlign: "center",
                                minHeight: "clamp(80px, 15vw, 120px)",
                                flex: 1,
                                minWidth: 0,
                                width: "100%",
                                boxSizing: "border-box",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                cursor: "pointer",
                                border: "1px solid rgba(0,255,0,0.5)",
                                background: "rgba(0,0,0,0.6)",
                                boxShadow: "0 0 15px rgba(0, 255, 0, 0.4), inset 0 0 5px rgba(0, 255, 0, 0.1)"
                              } : { 
                                position: "relative", 
                                padding: "clamp(15px, 3vw, 15px) clamp(25px, 8vw, 45px) clamp(15px, 3vw, 25px) clamp(25px, 8vw, 45px)", 
                                background: ann.isFeatured ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.05)", 
                                borderRadius: "8px", 
                                border: ann.isFeatured ? "1px solid #ff3366" : "1px solid rgba(255,255,255,0.1)", 
                                boxShadow: ann.isFeatured ? "0 0 15px rgba(255, 51, 102, 0.4), inset 0 0 5px rgba(255, 51, 102, 0.1)" : "none",
                                textAlign: "left",
                                minHeight: "clamp(80px, 15vw, 120px)",
                                flex: 1,
                                minWidth: 0,
                                width: "100%",
                                boxSizing: "border-box",
                                overflow: "hidden",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                cursor: (ann.postId || (ann.content && typeof ann.content === 'string' && ann.content.toLowerCase().includes("hyn registration"))) ? "pointer" : "default"
                              }}
                              className={ann.isFusionCountdown ? "fusion-countdown-box" : ""}
                            >
                              {ann.isFeatured && (
                                <div style={{ position: "absolute", top: "clamp(-10px, -2vw, -15px)", right: "clamp(10px, 3vw, 20px)", fontSize: "clamp(1.4rem, 4vw, 1.8rem)", zIndex: 5, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>📌</div>
                              )}
                              <div style={{ minWidth: 0, width: "100%" }}>
                                {ann.isRegistrationAnnouncement || ann.isPackingListAnnouncement || ann.isItineraryAnnouncement ? (
                                  <p className="glow-text-white" style={{ margin: 0, fontFamily: "var(--font-outfit)", fontSize: "clamp(1.5rem, 5vw, 2.5rem)", fontWeight: "900", textTransform: "uppercase", whiteSpace: "pre-wrap", wordWrap: "break-word", overflowWrap: "anywhere", wordBreak: "break-word", display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "row", flexWrap: "wrap", gap: "8px" }}>
                                    {ann.isRegistrationAnnouncement && (
                                      <>
                                        <span style={{ color: "var(--neon-white)", textAlign: "center" }}>FUSION CAMP REGISTRATION IS NOW</span>
                                        <span style={{ color: "#00ff00", textShadow: "0 0 10px #00ff00", textAlign: "center" }}>OPEN!</span>
                                      </>
                                    )}
                                    {ann.isPackingListAnnouncement && (
                                      <span style={{ color: "var(--neon-yellow)", textShadow: "0 0 10px var(--neon-yellow)", textAlign: "center" }}>CHECK YOUR PACKING LIST (PABAON)</span>
                                    )}
                                    {ann.isItineraryAnnouncement && (
                                      <span style={{ color: "var(--neon-yellow)", textShadow: "0 0 10px var(--neon-yellow)", textAlign: "center" }}>VIEW CAMP ITINERARY</span>
                                    )}
                                  </p>
                                ) : (
                                  <p style={ann.isFusionCountdown ? {
                                    margin: 0, 
                                    fontSize: "clamp(1.5rem, 5vw, 2.5rem)",
                                    fontWeight: "900",
                                    fontFamily: "var(--font-outfit)",
                                    textTransform: "uppercase",
                                    whiteSpace: "pre-wrap", 
                                    wordWrap: "break-word", 
                                    overflowWrap: "anywhere", 
                                    wordBreak: "break-word",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%"
                                  } : { 
                                    margin: 0, 
                                    color: "var(--neon-white)", 
                                    fontSize: "1.05rem",
                                    fontWeight: "normal",
                                    fontFamily: "inherit",
                                    textTransform: "none",
                                    textShadow: "none",
                                    whiteSpace: "pre-wrap", 
                                    wordWrap: "break-word", 
                                    overflowWrap: "anywhere", 
                                    wordBreak: "break-word",
                                    display: "block",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "100%"
                                  }}>
                                    {displayText}
                                    {isLong && ann.postId ? (
                                      <Link 
                                        href={`/community?scrollTo=${ann.postId}`} 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
                                            e.preventDefault();
                                            window.location.href = "/login";
                                            return;
                                          }
                                        }} 
                                        style={{ color: "var(--neon-yellow)", fontWeight: "bold", textDecoration: "none", cursor: "pointer" }}
                                      >
                                        see more...
                                      </Link>
                                    ) : isLong ? (
                                      <span style={{ color: "var(--neon-yellow)", fontWeight: "bold" }}>...</span>
                                    ) : null}
                                  </p>
                                )}
                                
                              </div>
                          
                              {activeUser && activeUser.role === "Admin" && (
                                <>
                                  <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ann.id ? null : ann.id); }} style={{ position: "absolute", top: "10px", right: "45px", cursor: "pointer", color: "var(--text-muted)", fontWeight: "bold", fontSize: "1.2rem", padding: "0 5px", zIndex: 20 }}> ...</div>
                                  {openMenuId === ann.id && (
                                    <div style={{ position: "absolute", top: "35px", right: "45px", background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", zIndex: 30, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", overflow: "hidden" }}>
                                      <div onClick={(e) => {
                                        e.stopPropagation();
                                        const newAnns = announcements.filter(a => a.id !== ann.id);
                                        setAnnouncements(newAnns);
                                        if (currentAnnSlide >= reversedAnns.length - 1) {
                                          setCurrentAnnSlide(Math.max(0, reversedAnns.length - 2));
                                        }
                                        localStorage.setItem("communityAnnouncements", JSON.stringify(newAnns));
                                        setOpenMenuId(null);
                                        window.dispatchEvent(new Event("storage"));
                                      }} style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,68,68,0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>Remove</div>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>

      {/* iOS Style Highlight Widgets */}
      <div className="ios-widget-grid">
        {/* Gallery Widget (2x2) */}
        <Link 
          href={exhibitPhotos.length > 0 ? `/fusion/memories?camp=${encodeURIComponent(exhibitPhotos[0].camp)}&day=${encodeURIComponent(exhibitPhotos[0].day)}&category=${encodeURIComponent(exhibitPhotos[0].category)}` : "/fusion/memories"}
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="ios-widget" 
          style={{ 
            gridColumn: "span 2", 
            padding: 0,
            overflow: "hidden",
            position: "relative",
            textDecoration: "none",
            display: "flex",
            flexDirection: "column",
            border: "none",
            background: "transparent",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}
        >
          <img 
            src={exhibitPhotos.length > 0 ? exhibitPhotos[0].url : "https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=500&auto=format&fit=crop"} 
            alt="The Exhibit" 
            style={{ width: "100%", height: "auto", display: "block", borderRadius: "22px" }}
          />
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, width: "100%",
            background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 70%, transparent)",
            padding: "20px",
            borderBottomLeftRadius: "22px",
            borderBottomRightRadius: "22px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end"
          }}>
            <h3 style={{ margin: 0, fontSize: "1.4rem", fontFamily: "var(--font-outfit)", color: "white", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>The Exhibit</h3>
            <p style={{ margin: "5px 0 0 0", fontSize: "0.9rem", color: "var(--canary-yellow)", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>{exhibitPhotos.length} moments captured</p>
          </div>
        </Link>

        {/* Video Widget (2x1) */}
        <div className="ios-widget" style={{ gridColumn: "span 2", gridRow: "span 1", background: "linear-gradient(45deg, #1a1a1a, #333)", minHeight: "100px", display: "flex", flexDirection: "row", alignItems: "center", gap: "15px", opacity: 0.8 }}>
          <div style={{ width: "45px", height: "45px", borderRadius: "50%", background: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M8 5v14l11-7z"></path>
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-muted)", letterSpacing: "1px" }}>FUSION VIDEOS</span>
            <h3 style={{ margin: "2px 0 0 0", fontSize: "1.1rem", fontFamily: "var(--font-outfit)", color: "white" }}>Coming Soon</h3>
          </div>
        </div>

        {/* HYN Highlights Widget (1x1) */}
        <Link 
          href="/joint" 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="ios-widget" 
          style={{ gridColumn: "span 1", gridRow: "span 1", background: "rgba(255, 255, 255, 0.05)", minHeight: "100px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}
        >
          <span style={{ fontSize: "1.8rem", marginBottom: "5px" }}>🔥</span>
          <h3 style={{ margin: 0, fontSize: "1rem", fontFamily: "var(--font-outfit)", color: "white", lineHeight: "1.2" }}>HYN<br/>Highlights</h3>
        </Link>

        {/* Answered Prayers Widget (1x1) */}
        <Link 
          href="/prayer" 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="ios-widget" 
          style={{ gridColumn: "span 1", gridRow: "span 1", background: "rgba(255, 234, 0, 0.1)", minHeight: "100px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", border: "1px solid rgba(255,234,0,0.3)" }}
        >
          <span style={{ fontSize: "1.8rem" }}>💛✨</span>
          <h3 style={{ margin: "5px 0 0 0", fontSize: "1.3rem", fontFamily: "var(--font-outfit)", color: "var(--sunflower-yellow)" }}>12</h3>
          <p style={{ margin: 0, fontSize: "0.7rem", color: "var(--canary-yellow)", textTransform: "uppercase" }}>Answered</p>
        </Link>
      </div>

      <div className="cards-grid">
        <Link 
          href="/community" 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="card card-full" 
          style={{ borderLeft: "4px solid var(--neon-white)" }}
        >
          <h2 className="glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "2rem", marginBottom: "8px", color: "var(--neon-white)" }}>COMMUNITY HUB</h2>
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>Connect, share, and grow together in one central place.</p>
        </Link>

        <Link 
          href="/fusion" 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="card card-full"
        >
          <h2 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "2rem", marginBottom: "8px", color: "var(--sunflower-yellow)" }}>FUSION CAMP</h2>
          <p style={{ color: "var(--canary-yellow)", fontFamily: "var(--font-outfit)" }}>Ignite our passion and creativity all for God&apos;s glory.</p>
        </Link>

        <Link 
          href="/joint" 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="card"
        >
          <h2 className="glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.6rem", marginBottom: "8px", color: "var(--neon-white)" }}>HEART YOUTH NIGHT</h2>
          <p style={{ color: "var(--canary-yellow)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>Gathering the community as one family.</p>
        </Link>

        <Link 
          href="/prayer" 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="card"
        >
          <h2 className="glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.6rem", marginBottom: "8px", color: "var(--neon-white)" }}>PRAYER ROOM</h2>
          <p style={{ color: "var(--canary-yellow)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>Share your petitions and stand with us in faith.</p>
        </Link>

        <Link 
          href="/get-involved" 
          onClick={(e) => {
            if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
              e.preventDefault();
              window.location.href = "/login";
              return;
            }
          }}
          className="card" 
          style={{ borderLeft: "3px solid var(--amber-yellow)" }}
        >
          <h2 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontWeight: 700, fontSize: "1.6rem", marginBottom: "8px", color: "var(--sunflower-yellow)" }}>GET INVOLVED</h2>
          <p style={{ color: "var(--canary-yellow)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>Partner with us in fueling the next generation. Your prayers, time, and resources make this ministry possible.</p>
        </Link>
      </div>
    </main>
    </>
  );
}
