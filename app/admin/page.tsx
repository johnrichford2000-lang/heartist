"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import { useRouter } from "next/navigation";
import GlobalBottomNav from "@/components/GlobalBottomNav";
import { fetchAnnouncements, fetchSystemSetting, saveSystemSetting, submitAnnouncement, deleteAnnouncement } from "@/lib/fusionSync";
import { supabase } from "@/lib/supabase";

export default function AdminDashboardPage() {
  const router = useRouter();


  const [connectMessages, setConnectMessages] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
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

  const loadAnnouncements = async () => {
    let isAnnUnread = false;
    
    // Fetch from Supabase
    let parsedAnns = await fetchAnnouncements();
    if (parsedAnns) {
      setAnnouncements(parsedAnns);
      if (parsedAnns.length > 0) {
        const lastId = String(parsedAnns[parsedAnns.length - 1].id);
        const readId = Number(localStorage.getItem(`lastReadAnnouncementId_admin`) || localStorage.getItem(`lastSeenAnnouncementId_admin`) || 0);
        isAnnUnread = Number(lastId) > readId;
      }
    }
    
    let parsedCountdown = await fetchSystemSetting("fusionCountdownData");
    if (!parsedCountdown) {
      const savedCountdownStr = localStorage.getItem("fusionCountdownData");
      if (savedCountdownStr) {
        try { parsedCountdown = JSON.parse(savedCountdownStr); } catch (e) {}
      }
    }
    
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
    if (!parsedBlueprint) {
      const savedBlueprint = localStorage.getItem("fusionBlueprintData");
      if (savedBlueprint) parsedBlueprint = JSON.parse(savedBlueprint);
    }
    
    if (parsedBlueprint) {
      try {
        if (typeof parsedBlueprint === "string") {
          try { parsedBlueprint = JSON.parse(parsedBlueprint); } catch(e) {}
        }
        const regOpen = parsedBlueprint.isRegistrationOpen ?? false;
        setIsRegOpen(regOpen);
        setIsPackingAnnounced(parsedBlueprint.isPackingAnnounced ?? false);
        setIsItineraryAnnounced(parsedBlueprint.isItineraryAnnounced ?? false);
        
        if (regOpen || parsedBlueprint.isPackingAnnounced || parsedBlueprint.isItineraryAnnounced) {
          const lastReadRegStamp = localStorage.getItem(`lastReadRegistrationOpen_admin`);
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
    
    setHasUnread(isAnnUnread || isRegUnread);
  };

  useEffect(() => {
    const checkAdminAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }
      
      let fetchedAdminEmails = await fetchSystemSetting("admin_emails");
      if (typeof fetchedAdminEmails === "string") {
        try { fetchedAdminEmails = JSON.parse(fetchedAdminEmails); } catch(e) {}
      }
      if (!Array.isArray(fetchedAdminEmails)) fetchedAdminEmails = ["heartistrichford@gmail.com"];
      
      setAdminEmails(fetchedAdminEmails);

      if (!fetchedAdminEmails.includes(session.user.email)) {
        window.location.href = "/login";
        return;
      }
      
      setIsLoggedIn(true);
    };

    const loadConnectMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("forms")
          .select("*")
          .eq("type", "CONTACT_US")
          .order("created_at", { ascending: false });

        if (!error && data) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            date: row.data?.date || new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            name: row.data?.name || "Anonymous",
            email: row.data?.email || "-",
            message: row.data?.message || "",
            status: row.status
          }));
          setConnectMessages(mapped);
        }
      } catch (err) {
        console.error("Error loading connect messages from Supabase:", err);
      }
    };

    // Migrate any legacy local messages if found
    if (typeof window !== "undefined") {
      const localMsg = localStorage.getItem("connectMessages");
      if (localMsg) {
        try {
          const parsed = JSON.parse(localMsg);
          if (Array.isArray(parsed) && parsed.length > 0) {
            for (const m of parsed) {
              supabase.from("forms").insert([{
                type: "CONTACT_US",
                data: m,
                status: "Pending"
              }]).then(() => {});
            }
          }
        } catch {}
        localStorage.removeItem("connectMessages");
      }
    }

    loadConnectMessages();
    checkAdminAuth();

    const formsChannel = supabase.channel('admin_forms')
      .on('broadcast', { event: 'new_contact_message' }, () => {
        loadConnectMessages();
      })
      .subscribe();

    const channelId = `admin_announcements_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        loadAnnouncements();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
        loadAnnouncements();
      })
      .on('broadcast', { event: 'announcement_updated' }, () => {
        loadAnnouncements();
      })
      .subscribe();

    loadAnnouncements();
    window.addEventListener("storage", loadAnnouncements);
    window.addEventListener("announcements_updated", loadAnnouncements);
    return () => { 
      window.removeEventListener("storage", loadAnnouncements); 
      window.removeEventListener("announcements_updated", loadAnnouncements);
      supabase.removeChannel(channel); 
      supabase.removeChannel(formsChannel);
    };
  }, []);

  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    
    const newAnn = { content: newAnnouncement, timestamp: new Date().toISOString() };
    const savedAnn = await submitAnnouncement(newAnn);
    
    if (savedAnn) {
      const existing = [...announcements, savedAnn];
      localStorage.setItem("communityAnnouncements", JSON.stringify(existing));
      localStorage.setItem("lastReadAnnouncementId_admin", String(savedAnn.id));
      localStorage.setItem("lastSeenAnnouncementId_admin", String(savedAnn.id));
      setNewAnnouncement("");
      window.dispatchEvent(new CustomEvent("announcements_updated"));
      window.dispatchEvent(new Event("storage"));
      loadAnnouncements();
    }
  };

  const handleRemoveAnnouncement = async (id: number) => {
    const success = await deleteAnnouncement(id);
    if (success) {
      const existing = announcements.filter(a => a.id !== id);
      localStorage.setItem("communityAnnouncements", JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent("announcements_updated"));
      window.dispatchEvent(new Event("storage"));
      loadAnnouncements();
    }
  };

  const handleAddAdminEmail = async () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes("@")) return;
    setIsSavingAdmin(true);
    const updatedList = [...adminEmails, newAdminEmail.trim()];
    const success = await saveSystemSetting("admin_emails", updatedList);
    if (success) {
      setAdminEmails(updatedList);
      setNewAdminEmail("");
    }
    setIsSavingAdmin(false);
  };

  const handleRemoveAdminEmail = async (email: string) => {
    if (adminEmails.length <= 1) {
      alert("You cannot remove the last admin.");
      return;
    }
    const updatedList = adminEmails.filter(e => e !== email);
    const success = await saveSystemSetting("admin_emails", updatedList);
    if (success) {
      setAdminEmails(updatedList);
    }
  };

  if (!isLoggedIn) return null; // Prevent flicker before redirect

  return (
    <main className="admin-main-container">
      <header style={{ marginBottom: "40px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1 
          className="header-title glow-text-yellow" 
          style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}
        >
          Admin Dashboard
        </h1>
        <h2 style={{ color: "var(--text-muted)", fontSize: "1.1rem", marginTop: "10px", fontFamily: "var(--font-outfit)" }}>
          Manage your forms, data, and community.
        </h2>
      </header>

      {/* Announcements Widget */}
      <div 
        onClick={() => {
          setActiveAnnId(activeAnnId === 1 ? null : 1);
          if (hasUnread) {
            if (announcements.length > 0) {
              const latestId = announcements[announcements.length - 1].id.toString();
              localStorage.setItem(`lastReadAnnouncementId_admin`, latestId);
              localStorage.setItem(`lastSeenAnnouncementId_admin`, latestId);
            }
            
            const savedBlueprint = localStorage.getItem("fusionBlueprintData");
            if (savedBlueprint) {
              try {
                const parsedBlueprint = JSON.parse(savedBlueprint);
                if (parsedBlueprint.timestamp) {
                  localStorage.setItem(`lastReadRegistrationOpen_admin`, parsedBlueprint.timestamp);
                  localStorage.setItem(`lastSeenRegistrationOpen_admin`, parsedBlueprint.timestamp);
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
          maxWidth: "1000px",
          margin: "0 auto 40px",
          background: activeAnnId === 1 ? "rgba(255, 234, 0, 0.05)" : "var(--bg-card)", 
          border: activeAnnId === 1 ? "1px solid var(--neon-yellow)" : "1px solid rgba(255, 255, 255, 0.2)", 
          borderRadius: "15px", 
          padding: "clamp(15px, 4vw, 30px)",
          boxShadow: activeAnnId === 1 ? "0 0 30px rgba(255, 234, 0, 0.6), inset 0 0 15px rgba(255, 234, 0, 0.1)" : "none",
          transition: "all 0.3s ease",
          cursor: "pointer",
          position: "relative",
          boxSizing: "border-box"
        }}
      >
        <h2 style={{ margin: "0 0 20px 0", color: "var(--neon-white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ position: "relative" }}>
            📢 Announcements
            {hasUnread && (
              <span style={{ position: "absolute", top: "-5px", right: "-15px", width: "12px", height: "12px", background: "red", borderRadius: "50%", zIndex: 20 }}></span>
            )}
          </span>
        </h2>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {announcements.length === 0 && fusionCountdownDays === null && !isRegOpen && !isPackingAnnounced && !isItineraryAnnounced ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontStyle: "italic" }}>No active announcements.</p>
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
                          onClick={() => {
                            if (ann.postId) router.push(`/admin/community?scrollTo=${ann.postId}`);
                            if (ann.isRegistrationAnnouncement) router.push(`/admin/fusion/blueprint?scrollTo=bulletin`);
                          }}
                          style={ann.isFusionCountdown ? {
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            textAlign: "center",
                            position: "relative",
                            minHeight: "clamp(80px, 15vw, 120px)",
                            flex: 1,
                            minWidth: 0,
                            width: "100%",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            padding: "clamp(15px, 3vw, 15px) clamp(25px, 8vw, 45px) clamp(15px, 3vw, 25px) clamp(25px, 8vw, 45px)", 
                            borderRadius: "8px", 
                            cursor: "default"
                          } : (ann.isRegistrationAnnouncement || ann.isPackingListAnnouncement || ann.isItineraryAnnouncement) ? {
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            textAlign: "center",
                            position: "relative",
                            minHeight: "clamp(80px, 15vw, 120px)",
                            flex: 1,
                            minWidth: 0,
                            width: "100%",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            padding: "clamp(15px, 3vw, 15px) clamp(25px, 8vw, 45px) clamp(15px, 3vw, 25px) clamp(25px, 8vw, 45px)", 
                            borderRadius: "8px", 
                            cursor: "pointer",
                            border: "1px solid rgba(0,255,0,0.5)",
                            background: "rgba(0,0,0,0.6)",
                            boxShadow: "0 0 15px rgba(0, 255, 0, 0.4), inset 0 0 5px rgba(0, 255, 0, 0.1)"
                          } : { 
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            textAlign: "left",
                            position: "relative",
                            minHeight: "clamp(80px, 15vw, 120px)",
                            flex: 1,
                            minWidth: 0,
                            width: "100%",
                            boxSizing: "border-box",
                            overflow: "hidden",
                            padding: "clamp(15px, 3vw, 15px) clamp(25px, 8vw, 45px) clamp(15px, 3vw, 25px) clamp(25px, 8vw, 45px)", 
                            background: ann.isFeatured ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.05)", 
                            borderRadius: "8px", 
                            border: ann.isFeatured ? "1px solid #ff3366" : "1px solid rgba(255,255,255,0.1)",
                            boxShadow: ann.isFeatured ? "0 0 15px rgba(255, 51, 102, 0.4), inset 0 0 5px rgba(255, 51, 102, 0.1)" : "none",
                            cursor: ann.postId ? "pointer" : "default"
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
                                  <Link href={`/admin/community?scrollTo=${ann.postId}`} onClick={(e) => e.stopPropagation()} style={{ color: "var(--neon-yellow)", fontWeight: "bold", textDecoration: "none", cursor: "pointer" }}>see more...</Link>
                                ) : isLong ? (
                                  <span style={{ color: "var(--neon-yellow)", fontWeight: "bold" }}>...</span>
                                ) : null}
                              </p>
                            )}
                            
                          </div>
                          
                          {!ann.isFusionCountdown && !ann.isRegistrationAnnouncement && !ann.isPackingListAnnouncement && !ann.isItineraryAnnouncement && (
                            <>
                              <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === ann.id ? null : ann.id); }} style={{ position: "absolute", top: "15px", right: "45px", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold", color: "var(--text-muted)", padding: "0 5px", zIndex: 20 }}> 
                                ...
                              </div>
                              
                              {openMenuId === ann.id && (
                                <div style={{ position: "absolute", top: "40px", right: "45px", background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", zIndex: 30, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", overflow: "hidden" }}>
                                  <div onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuId(null);
                                    handleRemoveAnnouncement(ann.id);
                                    if (currentAnnSlide >= reversedAnns.length - 1) {
                                      setCurrentAnnSlide(Math.max(0, reversedAnns.length - 2));
                                    }
                                  }} style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,68,68,0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                                    Remove
                                  </div>
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

      {/* Separate Map & Feature Managers - Smart Auto-Resize Grid */}
      <section className="admin-managers-grid">
        <Link href="/admin/fusion" style={{ textDecoration: "none" }}>
          <div className="card admin-mgr-card" style={{ border: "1px solid var(--neon-yellow)", background: "rgba(255, 234, 0, 0.05)" }}>
            <div className="admin-mgr-icon-circle" style={{ background: "rgba(255, 234, 0, 0.12)", border: "1px solid var(--neon-yellow)", color: "var(--neon-yellow)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 21 9-18 9 18H3z"/>
                <path d="m9 21 3-6 3 6"/>
              </svg>
            </div>
            <h3 className="admin-mgr-title" style={{ color: "var(--neon-yellow)" }}>Manage Fusion</h3>
            <p className="admin-mgr-desc">Map coords for Fusion Camps.</p>
          </div>
        </Link>

        <Link href="/admin/joint" style={{ textDecoration: "none" }}>
          <div className="card admin-mgr-card" style={{ border: "1px solid var(--neon-white)", background: "rgba(255, 255, 255, 0.05)" }}>
            <div className="admin-mgr-icon-circle" style={{ background: "rgba(255, 255, 255, 0.12)", border: "1px solid var(--neon-white)", color: "var(--neon-white)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
            <h3 className="admin-mgr-title" style={{ color: "var(--neon-white)" }}>Manage Joint</h3>
            <p className="admin-mgr-desc">Map coords for Joint Worship.</p>
          </div>
        </Link>

        <Link href="/admin/community" style={{ textDecoration: "none" }}>
          <div className="card admin-mgr-card" style={{ border: "1px solid var(--neon-yellow)", background: "rgba(255, 234, 0, 0.05)" }}>
            <div className="admin-mgr-icon-circle" style={{ background: "rgba(255, 234, 0, 0.12)", border: "1px solid var(--neon-yellow)", color: "var(--neon-yellow)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className="admin-mgr-title" style={{ color: "var(--neon-yellow)" }}>Community Hub</h3>
            <p className="admin-mgr-desc">Canvas & Notifications.</p>
          </div>
        </Link>

        <Link href="/admin/users" style={{ textDecoration: "none" }}>
          <div className="card admin-mgr-card" style={{ border: "1px solid var(--neon-blue)", background: "rgba(0, 100, 255, 0.05)" }}>
            <div className="admin-mgr-icon-circle" style={{ background: "rgba(0, 100, 255, 0.12)", border: "1px solid var(--neon-blue)", color: "var(--neon-blue)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3 className="admin-mgr-title" style={{ color: "var(--neon-blue)" }}>Manage Users</h3>
            <p className="admin-mgr-desc">Registered users & roles.</p>
          </div>
        </Link>

        <Link href="/get-involved" className="admin-card-col-featured" style={{ textDecoration: "none" }}>
          <div className="card admin-mgr-card" style={{ border: "1px solid var(--neon-yellow)", background: "rgba(255, 234, 0, 0.08)", boxShadow: "0 0 15px rgba(255, 234, 0, 0.08)" }}>
            <div className="admin-mgr-icon-circle" style={{ background: "rgba(255, 234, 0, 0.15)", border: "1px solid var(--neon-yellow)", color: "var(--neon-yellow)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <h3 className="admin-mgr-title" style={{ color: "var(--neon-yellow)" }}>Manage Get Involved</h3>
            <p className="admin-mgr-desc">Review entries, send messages & update banner.</p>
          </div>
        </Link>
      </section>

      {/* Connect Messages Section */}
      <section className="card" style={{ maxWidth: "1000px", margin: "40px auto 0", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-white)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
          <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)" }}>
            Inbox (Connect Messages)
          </h3>
          <span style={{ background: "rgba(255,255,255,0.1)", padding: "5px 15px", borderRadius: "20px", fontSize: "0.85rem", color: "white" }}>
            Total: {connectMessages.length}
          </span>
        </div>

        {connectMessages.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
            No messages yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "800px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.9rem", fontFamily: "var(--font-outfit)" }}>Date</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.9rem", fontFamily: "var(--font-outfit)" }}>Name</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.9rem", fontFamily: "var(--font-outfit)" }}>Email</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.9rem", fontFamily: "var(--font-outfit)", width: "45%" }}>Message</th>
                  <th style={{ padding: "12px", color: "var(--text-muted)", fontSize: "0.9rem", fontFamily: "var(--font-outfit)", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {connectMessages.map((msg) => (
                  <tr key={msg.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "15px 12px", color: "white", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{msg.date}</td>
                    <td style={{ padding: "15px 12px", color: "var(--neon-white)", fontWeight: "bold" }}>{msg.name}</td>
                    <td style={{ padding: "15px 12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>{msg.email || "-"}</td>
                    <td style={{ padding: "15px 12px", color: "white", fontSize: "0.9rem", lineHeight: "1.5" }}>{msg.message}</td>
                    <td style={{ padding: "15px 12px", textAlign: "right" }}>
                      <button 
                        onClick={async () => {
                          if (confirm("Delete this message?")) {
                            await supabase.from("forms").delete().eq("id", msg.id);
                            setConnectMessages(prev => prev.filter(m => m.id !== msg.id));
                          }
                        }}
                        style={{ background: "transparent", border: "1px solid rgba(255,50,50,0.4)", color: "#ff4d4d", borderRadius: "6px", padding: "5px 10px", fontSize: "0.8rem", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Security Settings Section */}
      <section className="card" style={{ maxWidth: "1000px", margin: "40px auto 0", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid #ff3366" }}>
        <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "20px" }}>
          Security Settings (Admin Access)
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
          Manage the email addresses that have administrative access to the system. These emails cannot be used to register as normal users.
        </p>
        
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
          <input 
            type="email" 
            placeholder="Add new admin email..."
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            style={{ flex: 1, minWidth: "200px", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", outline: "none" }}
          />
          <button 
            onClick={handleAddAdminEmail}
            disabled={isSavingAdmin || !newAdminEmail.trim() || !newAdminEmail.includes("@")}
            style={{ padding: "12px 24px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: (isSavingAdmin || !newAdminEmail.trim() || !newAdminEmail.includes("@")) ? "not-allowed" : "pointer", opacity: (isSavingAdmin || !newAdminEmail.trim() || !newAdminEmail.includes("@")) ? 0.5 : 1 }}
          >
            {isSavingAdmin ? "Saving..." : "Add Admin"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {adminEmails.map((email) => (
            <div key={email} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <span style={{ color: "white", fontWeight: "bold" }}>{email}</span>
              <button 
                onClick={() => handleRemoveAdminEmail(email)}
                style={{ background: "transparent", border: "1px solid #FF4444", color: "#FF4444", padding: "6px 15px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", transition: "all 0.2s" }}
                onMouseOver={(e) => { e.currentTarget.style.background = "#FF4444"; e.currentTarget.style.color = "white"; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#FF4444"; }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <Link href="/" className="nav-item" style={{ padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)" }}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}


