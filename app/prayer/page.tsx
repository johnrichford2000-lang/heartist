"use client";
import { dispatchNotification } from "@/lib/notificationsSync";


import { useState, useEffect } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import { supabase } from "@/lib/supabase";
import { fetchPrayers, submitPrayerToSupabase, togglePrayerLike, togglePrayerHeart, markPrayerAsAnswered, PrayerData } from "@/lib/prayerSync";

export default function PrayerRoomPage() {
  const CATEGORIES = [
    { id: "Family", label: "Family", color: "var(--neon-white)" },
    { id: "Healing", label: "Healing", color: "var(--neon-yellow)" },
    { id: "Studies", label: "Studies / Career", color: "var(--text-muted)" },
    { id: "Guidance", label: "Guidance", color: "var(--neon-gold)" },
    { id: "Provision", label: "Provision", color: "var(--text-main)" },
    { id: "Others", label: "Others", color: "var(--neon-white)" },
  ];

  const [activeTab, setActiveTab] = useState<"active" | "answered">("active");
  const [prayers, setPrayers] = useState<PrayerData[]>([]);

  const [activeUser, setActiveUser] = useState<any>(null);


  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answeringPrayerId, setAnsweringPrayerId] = useState<string | null>(null);
  const [answerCommentInput, setAnswerCommentInput] = useState("");
  const [openItemMenuId, setOpenItemMenuId] = useState<string | null>(null);
  const [editPrayerId, setEditPrayerId] = useState<string | null>(null);
  const [prayerToDelete, setPrayerToDelete] = useState<string | null>(null);
  const [editPrayerContent, setEditPrayerContent] = useState("");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [reportLimitReached, setReportLimitReached] = useState(false);
  const [reportedUIState, setReportedUIState] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState("");
    const [tick, setTick] = useState(0);
  const [reactionsModalUsers, setReactionsModalUsers] = useState<{ id: string, type: 'pray' | 'heart', users: string[] } | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, string>>({});
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  useEffect(() => {
    if (activeUser && allProfiles.length > 0) {
      const updatedUser = allProfiles.find(
        (p) => p.id === activeUser.supabase_id || p.id === activeUser.id || p.firstName === activeUser.firstName
      );
      if (updatedUser) {
        if (
          updatedUser.badge !== activeUser.badge ||
          updatedUser.team !== activeUser.team ||
          updatedUser.avatar !== activeUser.avatar ||
          updatedUser.is_banned !== activeUser.is_banned
        ) {
          const mergedUser = {
            ...activeUser,
            badge: updatedUser.badge,
            team: updatedUser.team,
            avatar: updatedUser.avatar,
            is_banned: updatedUser.is_banned
          };
          setActiveUser(mergedUser);
          localStorage.setItem("activeUser", JSON.stringify(mergedUser));
        }
      }
    }
  }, [allProfiles]);


  const loadPrayers = async () => {
    const data = await fetchPrayers();
    
    // Also fetch Prayer Requests from Community Posts (Canvas) directly from Supabase
    const { data: commPostsData } = await supabase
      .from('posts')
      .select('*')
      .eq('category', 'Prayer Request');
    
    const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, avatar_url, badge, team, is_banned');
    if (profiles) {
      const pMap: Record<string, string> = {};
      const accounts = profiles.map((p) => {
        pMap[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        return {
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          avatar: p.avatar_url,
          badge: p.badge,
          team: p.team,
          is_banned: p.is_banned
        };
      });
      setUserProfiles(pMap);
      setAllProfiles(accounts);
      if (typeof window !== 'undefined') {
        localStorage.setItem("registeredAccounts", JSON.stringify(accounts));
      }
    }
    
    let localPrayers: PrayerData[] = [];
    if (typeof window !== 'undefined') {
      const communityPosts = commPostsData || JSON.parse(localStorage.getItem("communityPosts") || "[]");
      const fusionPrayers = JSON.parse(localStorage.getItem("fusionPrayers") || "[]");
      
      const localCommPrayers = communityPosts
        .filter((p: any) => p.category === "Prayer Request" && !p.isSupabaseSynced)
        .map((p: any) => ({
          id: String(p.id),
          author_id: p.author_id || p.authorId || null,
          author_name: p.author_name || p.name || (p.is_anonymous || p.isAnonymous ? "Anonymous Heartist" : ""),
          request: p.content,
          category: "Others",
          likes: p.likes || [],
          is_private: p.is_anonymous || p.isAnonymous || false,
          status: 'active',
          hearts: [],
          answer_comment: null,
          answered_timestamp: null,
          source: "Fusion Camp",
          created_at: p.created_at || (p.timestamp ? new Date(p.timestamp).toISOString() : (typeof p.id === 'number' ? new Date(p.id).toISOString() : new Date().toISOString()))
        }));

      const localFusionPrayers = fusionPrayers.map((p: any) => ({
          id: String(p.id),
          author_id: p.author_id || p.authorId || null,
          author_name: p.author_name || p.username || p.name || "Anonymous Heartist",
          request: p.request || p.content || "",
          category: p.category,
          likes: p.likes || [],
          is_private: p.is_anonymous || p.isAnonymous || false,
          status: p.status || 'active',
          hearts: p.hearts || [],
          answer_comment: p.answerComment || null,
          answered_timestamp: null,
          source: p.source || "Fusion Camp",
          created_at: p.created_at || (p.timestamp ? new Date(p.timestamp).toISOString() : (typeof p.id === 'number' ? new Date(p.id).toISOString() : new Date().toISOString()))
      }));

      localPrayers = [...localCommPrayers, ...localFusionPrayers];
    }

    const allPrayers = [...localPrayers, ...data].sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });
    const uniquePrayers = Array.from(new Map(allPrayers.map(item => [item.id, item])).values()).sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return timeB - timeA;
    });
    
    setPrayers(uniquePrayers);
  };

  useEffect(() => {
    // Auth Protection
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
        window.location.href = "/login";
        return;
      }
      const au = localStorage.getItem("activeUser");
      if (au) {
        const parsed = JSON.parse(au);
        setActiveUser(parsed);
        setName(`${parsed.firstName} ${parsed.lastName || ''}`.trim());
      }
    }

    loadPrayers();

    const channel = supabase.channel('public-prayers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayers' }, (payload) => {
        loadPrayers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        loadPrayers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        loadPrayers();
      })
      // Broadcast fallback just in case table realtime is off
      .on('broadcast', { event: 'sync_prayers' }, (payload) => {
        loadPrayers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (reactionsModalUsers || prayerToDelete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [reactionsModalUsers, prayerToDelete]);

  const timeAgo = (timestamp: string) => {
  const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (days < 28) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
};

  const handlePost = async () => {
    if (!content.trim()) {
      setError("Please write your prayer request.");
      return;
    }
    if (!isAnonymous && !name.trim()) {
      setError("Please enter your name or post anonymously.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const insertedPrayer = await submitPrayerToSupabase(
        activeUser?.id || null,
        isAnonymous ? "Anonymous Heartist" : name,
        content,
        category,
        isAnonymous
      );
      
      // Update local state directly so it shows immediately in Prayer Room
      if (insertedPrayer) {
        setPrayers(prev => [insertedPrayer, ...prev]);
      } else {
        // Fallback: reload prayers from Supabase if returned object is somehow missing
        loadPrayers();
      }
      
      setContent("");
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to post prayer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeletePrayer = async () => {
    if (!prayerToDelete) return;
    try {
      const p = prayers.find(p => p.id === prayerToDelete);
      
      // Update Supabase
      await supabase.from("prayers").update({ status: 'trashed' }).eq("id", prayerToDelete);
      
      // Update Local UI
      setPrayers(prev => prev.filter(p => p.id !== prayerToDelete));
      
      // Sync Deletion to Canvas (communityPosts and fusionPrayers)
      const cPosts = JSON.parse(localStorage.getItem("communityPosts") || "[]");
      const fPrayers = JSON.parse(localStorage.getItem("fusionPrayers") || "[]");
      const updatedCPosts = cPosts.filter((cp: any) => String(cp.id) !== String(prayerToDelete));
      const updatedFPrayers = fPrayers.filter((fp: any) => String(fp.id) !== String(prayerToDelete));
      
      let storageUpdated = false;
      if (updatedCPosts.length !== cPosts.length) {
        localStorage.setItem("communityPosts", JSON.stringify(updatedCPosts));
        storageUpdated = true;
      }
      if (updatedFPrayers.length !== fPrayers.length) {
        localStorage.setItem("fusionPrayers", JSON.stringify(updatedFPrayers));
        storageUpdated = true;
      }
      
      if (storageUpdated) {
        window.dispatchEvent(new Event("storage"));
      }

      setPrayerToDelete(null);
      setToastMessage("Your post has been deleted.");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEditPrayer = async (id: string) => {
    if (isSaving) return;
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 3000);

    if (!editPrayerContent.trim()) {
      setEditError("Content cannot be empty.");
      setTimeout(() => setEditError(""), 3000);
      return;
    }
    
    const prayerToEdit = prayers.find(p => p.id === id);
    if (prayerToEdit && prayerToEdit.request === editPrayerContent.trim()) {
      setEditError("Wala pong binago sa post.");
      setTimeout(() => setEditError(""), 3000);
      return;
    }
    
    const localEdits = JSON.parse(localStorage.getItem("prayerEditCounts") || "{}");
    const currentEdits = localEdits[id] || 0;
    
    if (currentEdits >= 3) {
      setEditError("Maximum of 3 edits reached.");
      setTimeout(() => setEditError(""), 3000);
      return;
    }

    try {
      await supabase.from("prayers").update({ request: editPrayerContent.trim() }).eq("id", id);
      localEdits[id] = currentEdits + 1;
      localStorage.setItem("prayerEditCounts", JSON.stringify(localEdits));
      
      setPrayers(prev => prev.map(p => p.id === id ? { ...p, request: editPrayerContent.trim() } : p));
      setEditPrayerId(null);
      setOpenItemMenuId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReportPrayer = (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    const uName = activeUser?.firstName || "SystemError";
    const limitKey = `reportLimit_${uName}_${id}_${today}`;
    
    const limits = JSON.parse(localStorage.getItem("prayerReportLimits") || "{}");
    const currentCount = limits[limitKey] || 0;
    
    if (currentCount >= 2) {
      setReportLimitReached(true);
      setOpenItemMenuId(null);
      return;
    }

    limits[limitKey] = currentCount + 1;
    localStorage.setItem("prayerReportLimits", JSON.stringify(limits));

    const currentReports = JSON.parse(localStorage.getItem("prayerReportedPosts") || "[]");
    const existing = currentReports.find((r: any) => (typeof r === "string" ? r === id : r.id === id));
    if (!existing) {
      const reporterName = activeUser ? `${activeUser.firstName} ${activeUser.lastName}` : "System Error (Guest)";
      const reporterUsername = activeUser ? activeUser.firstName : "SystemError";
      currentReports.push({ id, reporter: reporterName, reporterUsername });
      localStorage.setItem("prayerReportedPosts", JSON.stringify(currentReports));
    }
    
    setReportedUIState(prev => [...prev, id]);
    setOpenItemMenuId(null);
    setTimeout(() => {
      setReportedUIState(prev => prev.filter(rId => rId !== id));
    }, 3000);
  };

  const handleClickAnswered = (id: string) => {
    setAnsweringPrayerId(id);
    setAnswerCommentInput("");
  };

  const handleConfirmAnswered = async (id: string) => {
    try {
      const comment = answerCommentInput.trim() ? answerCommentInput : "Answered Prayer";
      await markPrayerAsAnswered(id, comment);
        supabase.channel('public-prayers').send({ type: 'broadcast', event: 'sync_prayers', payload: {} });
      
      try {
        const fPrayers = JSON.parse(localStorage.getItem("fusionPrayers") || "[]");
        let modified = false;
        const updatedFPrayers = fPrayers.map((p: any) => {
          if (String(p.id) === String(id)) {
            modified = true;
            return { ...p, status: "answered", answerComment: comment };
          }
          return p;
        });
        
        if (!modified) {
          const pToSync = prayers.find(p => String(p.id) === String(id));
          if (pToSync) {
            updatedFPrayers.push({
              id: pToSync.id,
              author_id: pToSync.author_id,
              author_name: pToSync.author_name,
              request: pToSync.request,
              category: pToSync.category || "Others",
              status: "answered",
              answerComment: comment,
              timestamp: Date.now()
            });
            modified = true;
          }
        }

        if (modified) {
          localStorage.setItem("fusionPrayers", JSON.stringify(updatedFPrayers));
          window.dispatchEvent(new Event("storage"));
        }
      } catch (e) { console.error("Failed to sync answered status to local storage", e); }

      setAnsweringPrayerId(null);
      loadPrayers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelAnswered = () => {
    setAnsweringPrayerId(null);
    setAnswerCommentInput("");
  };

  const togglePraying = async (id: string, currentLikes: string[]) => {
    if (!activeUser) return;
    try {
      const isPraying = currentLikes.includes(activeUser.id);
      await togglePrayerLike(id, activeUser.id, currentLikes);
      
      try {
        const uName = activeUser.firstName || "unknown";
        const cPosts = JSON.parse(localStorage.getItem("communityPosts") || "[]");
        const cIndex = cPosts.findIndex((p: any) => p.id === id);
        if (cIndex !== -1) {
          const cp = cPosts[cIndex];
          let cLikedBy = cp.likedBy || [];
          if (isPraying) {
            cLikedBy = cLikedBy.filter((u: string) => u !== uName);
          } else {
            if (!cLikedBy.includes(uName)) cLikedBy.push(uName);
          }
          cPosts[cIndex] = { ...cp, likedBy: cLikedBy, likesCount: cLikedBy.length, liked: cLikedBy.includes(uName) };
          localStorage.setItem("communityPosts", JSON.stringify(cPosts));
          window.dispatchEvent(new Event("storage"));
        }
      } catch (e) {
        console.error("Failed to sync to Canvas", e);
      }
      
      if (!isPraying) {
        const p = prayers.find(p => p.id === id);
        const fullName = `${activeUser.firstName} ${activeUser.lastName || ''}`.trim();
        if (p && p.author_name !== activeUser.firstName && p.author_name !== fullName && p.author_id !== activeUser.id && p.author_name !== "Anonymous Heartist" && p.author_name !== "Anonymous") {
           const uName = `${activeUser.firstName} ${activeUser.lastName}`.trim() || activeUser.firstName || "Anonymous";
           dispatchNotification({
             id: Date.now().toString(),
             type: "pray",
             fromUser: uName,
             postAuthor: p.author_name,
             postId: id,
             postContent: p.request.substring(0, 40) + (p.request.length > 40 ? "..." : ""),
             read: false,
             timestamp: Date.now()
           });
        }
      }

      loadPrayers();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleHeart = async (id: string, currentHearts: string[]) => {
    if (!activeUser) return;
    try {
      const isHearting = currentHearts.includes(activeUser.id);
      await togglePrayerHeart(id, activeUser.id, currentHearts);
      
      try {
        const uName = activeUser.firstName || "unknown";
        const cPosts = JSON.parse(localStorage.getItem("communityPosts") || "[]");
        const cIndex = cPosts.findIndex((p: any) => p.id === id);
        if (cIndex !== -1) {
          const cp = cPosts[cIndex];
          let cLikedBy = cp.likedBy || [];
          if (isHearting) {
            cLikedBy = cLikedBy.filter((u: string) => u !== uName);
          } else {
            if (!cLikedBy.includes(uName)) cLikedBy.push(uName);
          }
          cPosts[cIndex] = { ...cp, likedBy: cLikedBy, likesCount: cLikedBy.length, liked: cLikedBy.includes(uName) };
          localStorage.setItem("communityPosts", JSON.stringify(cPosts));
          window.dispatchEvent(new Event("storage"));
        }
      } catch (e) {
        console.error("Failed to sync to Canvas", e);
      }
      
      loadPrayers();
    } catch (err) {
      console.error(err);
    }
  };

  const getCategoryColor = (catId: string) => {
    const found = CATEGORIES.find(c => c.id === catId);
    return found ? found.color : "var(--neon-white)";
  };

  const displayedPrayers = prayers.filter(p => p.status === activeTab);

  
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 10000);
        return () => clearInterval(interval);
    }, []);

return (
    
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      {reportLimitReached && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 2000,
          display: "flex", justifyContent: "center", alignItems: "center",
          animation: "fadeIn 0.3s ease"
        }} onClick={() => setReportLimitReached(false)}>
          <div style={{
            background: "var(--card-bg)", border: "1px solid rgba(255,68,68,0.5)",
            borderRadius: "16px", width: "90%", maxWidth: "400px", padding: "25px",
            animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(255,68,68,0.2)",
            textAlign: "center"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>⚠️</div>
            <h3 style={{ margin: "0 0 10px 0", color: "#FF4444", fontFamily: "var(--font-outfit)", fontSize: "1.3rem" }}>
              Report Limit Reached
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "20px" }}>
              You can only report up to 2 items per day to prevent spam.
            </p>
            <button 
              onClick={() => setReportLimitReached(false)}
              style={{ background: "#FF4444", color: "white", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", width: "100%" }}
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Solemn Hero Section */}
      <header className="top-header" style={{ marginBottom: "30px", opacity: 0.9 }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1 className="header-title" style={{ fontFamily: "var(--font-outfit)", fontSize: "2.2rem", marginTop: "15px", letterSpacing: "1px", color: "var(--neon-white)", textShadow: "0 0 10px rgba(255,255,255,0.2)" }}>
          THE PRAYER ROOM
        </h1>
        <p style={{ marginTop: "15px", fontStyle: "italic", color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5", maxWidth: "80%", margin: "15px auto 0" }}>
          "Cast all your anxiety on Him because He cares for you." <br/> <span style={{ color: "var(--neon-yellow)" }}>- 1 Peter 5:7</span>
        </p>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "30px" }}>
        <button 
          onClick={() => setActiveTab("active")}
          style={{ 
            flex: 1, 
            padding: "15px", 
            background: "transparent", 
            border: "none", 
            borderBottom: activeTab === "active" ? "2px solid var(--neon-yellow)" : "2px solid transparent",
            color: activeTab === "active" ? "var(--neon-yellow)" : "var(--text-muted)",
            fontFamily: "var(--font-outfit)",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "all 0.3s"
          }}
        >
          Active Prayers
        </button>
        <button 
          onClick={() => setActiveTab("answered")}
          style={{ 
            flex: 1, 
            padding: "15px", 
            background: "transparent", 
            border: "none", 
            borderBottom: activeTab === "answered" ? "2px solid var(--neon-white)" : "2px solid transparent",
            color: activeTab === "answered" ? "var(--neon-white)" : "var(--text-muted)",
            fontFamily: "var(--font-outfit)",
            fontSize: "1rem",
            cursor: "pointer",
            transition: "all 0.3s"
          }}
        >
          Answered ✨
        </button>
      </div>

      {/* Post a Prayer / Testimony Box (Shows on both tabs) */}
      <section style={{ marginBottom: "40px" }}>
        <div className="card" style={{ background: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
          <h2 style={{ fontFamily: "var(--font-outfit)", fontSize: "1.1rem", marginBottom: "15px", color: "var(--neon-white)" }}>
            {activeTab === "active" ? "Drop a Prayer Request" : "Share a Testimony / Answered Prayer"}
          </h2>
          
          {error && <p style={{ color: "#ff4444", fontSize: "0.85rem", marginBottom: "10px" }}>{error}</p>}

          <textarea 
            placeholder={activeTab === "active" ? "How can we pray for you today?" : "Share how God answered your prayer..."}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ width: "100%", height: "100px", padding: "15px", borderRadius: "10px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", resize: "none", fontFamily: "var(--font-outfit)", marginBottom: "15px" }}
          />

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  background: category === cat.id ? "rgba(255,255,255,0.1)" : "transparent",
                  border: `1px solid ${category === cat.id ? "var(--neon-white)" : "var(--neon-yellow)"}`,
                  color: category === cat.id ? "var(--neon-white)" : "var(--neon-yellow)",
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit)",
                  transition: "all 0.2s ease"
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-muted)", fontSize: "0.9rem", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={isAnonymous}
                onChange={(e) => {
                  setIsAnonymous(e.target.checked);
                  // Name is preserved as the registered name, we just toggle isAnonymous
                }}
                style={{ cursor: "pointer" }}
              />
              Post Anonymously
            </label>
          </div>

          <button 
            onClick={handlePost}
            disabled={isSubmitting}
            className="btn-glow" 
            style={{ width: "100%", padding: "15px", borderRadius: "8px", border: "none", color: "black", fontWeight: "bold", fontSize: "1rem", cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? "Posting..." : (activeTab === "active" ? "Post Prayer Request" : "Share Testimony")}
          </button>
        </div>
      </section>

      {/* Prayer Feed */}
      <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {displayedPrayers.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", marginTop: "20px" }}>
            {activeTab === "active" ? "No active prayers yet. Be the first to share." : "No answered prayers yet. Share a testimony!"}
          </p>
        ) : (
          displayedPrayers.map((prayer) => {
            const catColor = getCategoryColor(prayer.category);
            const isOwner = activeUser && (prayer.author_id === activeUser.id || prayer.author_id === activeUser.firstName || prayer.author_id === `${activeUser.firstName} ${activeUser.lastName}` || prayer.author_name === `${activeUser.firstName} ${activeUser.lastName}` || prayer.author_name === activeUser.firstName);
            const isUserPraying = activeUser && prayer.likes && prayer.likes.includes(activeUser.id);
            const isUserHearting = activeUser && prayer.hearts && prayer.hearts.includes(activeUser.id);

            return (
              <div key={prayer.id} style={{ 
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderLeft: "4px solid var(--neon-yellow)",
                  borderRadius: "15px",
                  backdropFilter: "blur(10px)",
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "15px",
                  transition: "all 0.3s ease",
                  position: "relative",
                  padding: "20px" 
                }}>
                
                  {reportedUIState.includes(prayer.id) && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      background: "rgba(10,10,10,0.85)", backdropFilter: "blur(4px)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: "15px", zIndex: 20,
                      animation: "fadeOutReport 3s forwards"
                    }}>
                      <span style={{ color: "#ff4444", fontWeight: "bold", fontSize: "1.1rem" }}>Report submitted to admin</span>
                    </div>
                  )}

                {(isOwner || activeUser) && (
                  <>
                    <div onClick={() => setOpenItemMenuId(openItemMenuId === `prayer-${prayer.id}` ? null : `prayer-${prayer.id}`)}
                            style={{ position: "absolute", top: "15px", right: "15px", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold", padding: "5px 10px", color: "var(--text-muted)", letterSpacing: "0px", zIndex: 10 }}
                            title="Options"
                          >
                            ...
                    </div>
                    {openItemMenuId === `prayer-${prayer.id}` && (
                      <div style={{ position: "absolute", top: "50px", right: "20px", background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "10px 0", zIndex: 10, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", minWidth: "120px", display: "flex", flexDirection: "column" }}>
                        {isOwner ? (
                          <>
                            {(() => {
                               const localEdits = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("prayerEditCounts") || "{}") : {};
                               const edits = localEdits[prayer.id] || 0;
                               return (
                                  <div onClick={(e) => { 
                                      setOpenItemMenuId(null);
                                      if (edits >= 3) {
                                        e.preventDefault();
                                        return;
                                      }
                                      setEditPrayerId(prayer.id); 
                                      setEditPrayerContent(prayer.request || ""); 
                                    }} 
                                    style={{ padding: "10px 15px", color: "var(--neon-white)", cursor: edits >= 3 ? "not-allowed" : "pointer", fontSize: "0.95rem", opacity: edits >= 3 ? 0.3 : 1 }}
                                    onMouseOver={(e) => { if (edits < 3) e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                                    onMouseOut={(e) => { if (edits < 3) e.currentTarget.style.background = "transparent"; }}
                                  >
                                    Edit Prayer
                                  </div>
                               );
                            })()}
                            <div 
                              onClick={() => { setPrayerToDelete(prayer.id); setOpenItemMenuId(null); }} 
                              style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.95rem" }}
                              onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,68,68,0.1)"; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              Delete
                            </div>
                          </>
                        ) : (
                          <div 
                            onClick={() => handleReportPrayer(prayer.id)} 
                            style={{ padding: "10px 15px", color: "#ff4444", cursor: "pointer", fontSize: "0.95rem" }}
                            onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,68,68,0.1)"; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            Report
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div style={{ display: "flex", gap: "15px", alignItems: "center", width: "100%", justifyContent: "flex-start" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      {(() => {
                        const accounts = allProfiles;
                        const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === prayer.author_name || a.firstName === prayer.author_name || a.firstName === prayer.author_id);
                        let postTeamColor = 'transparent';
                        if (prayer.is_private || prayer.author_name === 'Anonymous' || prayer.author_name === 'Anonymous Heartist') {
                          postTeamColor = 'transparent';
                        } else if (postAcc) {
                          postTeamColor = (postAcc.team && postAcc.team !== 'none') ? postAcc.team : 'transparent';
                        }
                        const avatar = prayer.is_private ? "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" : (postAcc?.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg");
                        return (
                          <div style={{
                            minWidth: "45px", minHeight: "45px", width: "45px", height: "45px", borderRadius: "50%",
                            background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", overflow: "hidden", border: `2px solid ${postTeamColor}`
                          }}>
                            {avatar.length > 10 ? (
                              <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                            ) : (
        <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    )}
  </div>
                        ); 
                      })()}
                      <div style={{ position: "absolute", bottom: "-2px", right: "-4px", fontSize: "1.1rem", background: "var(--bg-main)", borderRadius: "50%", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                        {(() => {
                          const accounts = allProfiles;
                          const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === prayer.author_name || a.firstName === prayer.author_name || a.firstName === prayer.author_id);
                          const isAnon = prayer.is_private || (prayer.author_name && prayer.author_name.toLowerCase().includes('anonymous'));
                          const postRole = isAnon ? 'anonymous' : (postAcc?.badge || "");
                          switch (postRole?.toLowerCase()) {
                            case "first-timer":
                            case "first timer": return "🐣";
                            case "camp-veteran":
                            case "camp veteran": return "🎖️";
                            case "supporter": return "💖";
                            case "pastor": return "📖";
                            case "camp-coordinator":
                            case "camp coordinator": return "🎯";
                            case "facilitator":
                            case "staff / facilitator": return "⭐";
                            case "media-team":
                            case "media team": return "📸";
                            case "music-team":
                            case "music team": return "🎵";
                            case "prayer-team":
                            case "prayer team": return "🙏";
                            case "anonymous":
          return "👤";
                            default: return "";
                          }
                        })()}
                      </div>
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1, textAlign: "left" }}>
                      <h3 style={{ fontSize: "1.1rem", fontFamily: "var(--font-outfit)", color: "var(--neon-white)", margin: 0, display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-start" }}>
                        <span style={{ color: "var(--neon-yellow)" }}>{prayer.is_private ? "Anonymous Heartist" : prayer.author_name}</span>
                        {isOwner && <span style={{ color: "var(--neon-white)", fontSize: "0.9rem", fontWeight: "normal" }}>(you)</span>}
                      </h3>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "left", display: "flex", justifyContent: "flex-start", gap: "6px" }}>
                        <span>{timeAgo(prayer.created_at)}</span> • <span style={{ color: catColor }}>{prayer.category}</span>
                      </div>
                    </div>
                </div>

                {prayer.status === "answered" && prayer.answer_comment && (
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "15px", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.2)", marginBottom: "15px", width: "100%", textAlign: "center" }}>
                    <p style={{ margin: "0 0 5px 0", color: "var(--neon-yellow)", fontWeight: "bold", fontSize: "0.85rem" }}>✨ ANSWERED PRAYER</p>
                    <p style={{ margin: 0, color: "var(--neon-white)", fontSize: "0.95rem", fontStyle: "italic", lineHeight: "1.5" }}>"{prayer.answer_comment}"</p>
                    {prayer.answered_timestamp && (
                      <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)", fontSize: "0.75rem" }}>- {timeAgo(prayer.answered_timestamp)}</p>
                    )}
                  </div>
                )}

                <div style={{ marginBottom: "20px", width: "100%", textAlign: "center" }}>
                  {prayer.status === "answered" && <p style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>Original Request:</p>}
                  
                  {editPrayerId === prayer.id ? (
                    <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                      <textarea 
                        value={editPrayerContent}
                        onChange={(e) => setEditPrayerContent(e.target.value)}
                        style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", padding: "10px", color: "white", outline: "none", fontSize: "0.95rem", minHeight: "80px", resize: "vertical", fontFamily: "var(--font-outfit)" }}
                      />
                      {editError && <div style={{ color: "#FF4444", fontSize: "0.85rem", textAlign: "left" }}>{editError}</div>}
                      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                        <button onClick={() => { setEditPrayerId(null); setEditError(""); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "var(--text-muted)", padding: "6px 15px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
                        <button onClick={() => handleSaveEditPrayer(prayer.id)} disabled={isSaving} style={{ background: "var(--neon-yellow)", color: "black", border: "none", padding: "6px 15px", borderRadius: "6px", cursor: isSaving ? "not-allowed" : "pointer", fontSize: "0.85rem", fontWeight: "bold", opacity: isSaving ? 0.7 : 1 }}>{isSaving ? "Saving..." : "Save"}</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ margin: 0, color: "var(--neon-white)", fontSize: "1rem", lineHeight: "1.6", whiteSpace: "pre-wrap", fontFamily: "var(--font-outfit)", textAlign: "center", width: "100%" }}>
                        {prayer.request}
                      </p>
                      {(() => {
                         const localEdits = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("prayerEditCounts") || "{}") : {};
                         if (localEdits[prayer.id]) {
                           return <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: "5px", display: "block", textAlign: "center" }}>(Edited)</span>;
                         }
                         return null;
                      })()}
                    </>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: !isOwner ? "flex-end" : "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px", flexWrap: "wrap", gap: "10px", width: "100%" }}>
                  
                  {activeTab === "active" ? (
                    <div style={{ display: "flex", gap: "15px" }}>
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "8px", 
                          background: !isOwner ? (isUserPraying ? "rgba(255, 255, 0, 0.1)" : "rgba(255, 255, 255, 0.05)") : "transparent", 
                          border: !isOwner ? (isUserPraying ? "1px solid var(--neon-yellow)" : "1px solid rgba(255, 255, 255, 0.2)") : "none", 
                          padding: !isOwner ? "6px 14px" : "0",
                          borderRadius: !isOwner ? "20px" : "0",
                          color: isUserPraying ? "var(--neon-yellow)" : "var(--text-muted)", 
                          transition: "all 0.2s ease"
                        }}
                      >
                        <button 
                          onClick={() => togglePraying(prayer.id, prayer.likes || [])}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, margin: 0, display: "flex", alignItems: "center" }}
                        >
                          <span style={{ fontSize: "1.2rem" }}>🙏</span>
                        </button>
                        <button 
                          onClick={() => setReactionsModalUsers({ id: prayer.id, type: 'pray', users: prayer.likes || [] })}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, margin: 0, color: "inherit", fontSize: "0.95rem", fontFamily: "inherit" }}
                        >
                          {prayer.likes?.length || 0} {prayer.likes?.length === 1 ? "Praying" : "Praying"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "15px" }}>
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "8px", 
                          background: !isOwner ? (isUserHearting ? "rgba(255, 77, 77, 0.1)" : "rgba(255, 255, 255, 0.05)") : "transparent", 
                          border: !isOwner ? (isUserHearting ? "1px solid #ff4d4d" : "1px solid rgba(255, 255, 255, 0.2)") : "none", 
                          padding: !isOwner ? "6px 14px" : "0",
                          borderRadius: !isOwner ? "20px" : "0",
                          color: isUserHearting ? "#ff4d4d" : "var(--text-muted)", 
                          transition: "all 0.2s ease"
                        }}
                      >
                        <button 
                          onClick={() => toggleHeart(prayer.id, prayer.hearts || [])}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, margin: 0, display: "flex", alignItems: "center" }}
                        >
                          <span style={{ fontSize: "1.2rem" }}>❤️</span>
                        </button>
                        <button 
                          onClick={() => setReactionsModalUsers({ id: prayer.id, type: 'heart', users: prayer.hearts || [] })}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, margin: 0, color: "inherit", fontSize: "0.95rem", fontFamily: "inherit" }}
                        >
                          {prayer.hearts?.length || 0}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === "active" && isOwner && answeringPrayerId !== prayer.id && (
                    <button 
                      onClick={() => handleClickAnswered(prayer.id)}
                      style={{ 
                        background: "rgba(255,255,255,0.1)", 
                        border: "1px solid rgba(255,255,255,0.2)", 
                        color: "var(--neon-white)", 
                        padding: "6px 15px", 
                        borderRadius: "20px", 
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      Mark as Answered ✨
                    </button>
                  )}
                </div>

                {/* Answered Prayer Input Form */}
                {answeringPrayerId === prayer.id && (
                  <div style={{ marginTop: "15px", background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "10px", border: "1px dashed rgba(255,255,255,0.2)" }}>
                    <p style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "var(--neon-yellow)" }}>How did God answer this prayer?</p>
                    <textarea 
                      value={answerCommentInput}
                      onChange={(e) => setAnswerCommentInput(e.target.value)}
                      placeholder="Share your testimony here..."
                      style={{ width: "100%", height: "80px", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "white", outline: "none", resize: "none", fontFamily: "var(--font-outfit)", marginBottom: "10px", fontSize: "0.9rem" }}
                    />
                    <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                      <button 
                        onClick={handleCancelAnswered}
                        style={{ padding: "6px 15px", borderRadius: "20px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleConfirmAnswered(prayer.id)}
                        style={{ padding: "6px 15px", borderRadius: "20px", background: "var(--neon-yellow)", border: "none", color: "black", fontWeight: "bold", cursor: "pointer", fontSize: "0.85rem" }}
                      >
                        Publish Testimony ✨
                      </button>
                    </div>
                  </div>
                )}
                
              </div>
            );
          })
        )}
      </section>

      {toastMessage && (
        <div style={{ position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.9)", border: "1px solid var(--neon-yellow)", color: "white", padding: "12px 20px", borderRadius: "30px", display: "flex", alignItems: "center", gap: "15px", zIndex: 1100, animation: "slideUp 0.3s ease-out, fadeOut 0.3s ease-in 2.7s forwards", boxShadow: "0 4px 15px rgba(255, 234, 0, 0.2)" }}>
          <span style={{ fontSize: "0.95rem" }}>{toastMessage}</span>
          <button onClick={() => window.location.href = "/fusion/trash"} style={{ background: "transparent", border: "none", color: "var(--neon-yellow)", textDecoration: "underline", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>View</button>
        </div>
      )}

      {/* Floating Add Button for Mobile (Optional, currently using the box above) */}
      
      {/* Delete Confirmation Modal */}
      {prayerToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px", animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-main)", width: "100%", maxWidth: "400px", borderTop: "3px solid #FF4444", padding: "20px", animation: "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#FF4444", fontFamily: "var(--font-outfit)" }}>Delete Prayer Request</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.95rem", color: "var(--text-main)" }}>Are you sure you want to delete this prayer?</p>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button onClick={() => setPrayerToDelete(null)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "var(--text-muted)", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}>Cancel</button>
              <button 
                onClick={confirmDeletePrayer}
                onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
                onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                style={{ flex: 1, padding: "10px", background: "#FF4444", border: "1px solid #FF4444", color: "#FFF", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem", fontWeight: "bold", transition: "transform 0.2s" }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reactions Modal */}
      {reactionsModalUsers && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px", animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-main)", width: "100%", maxWidth: "400px", border: `1px solid ${reactionsModalUsers.type === 'pray' ? 'var(--neon-yellow)' : '#ff4d4d'}`, borderTop: `4px solid ${reactionsModalUsers.type === 'pray' ? 'var(--neon-yellow)' : '#ff4d4d'}`, borderRadius: "12px", padding: "20px", animation: "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)", boxShadow: `0 8px 30px ${reactionsModalUsers.type === 'pray' ? 'rgba(255, 255, 0, 0.15)' : 'rgba(255, 77, 77, 0.15)'}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3 style={{ margin: 0, color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                {reactionsModalUsers.type === 'pray' ? '🙏 Praying' : '❤️ Hearts'}
              </h3>
              <button onClick={() => setReactionsModalUsers(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
            </div>
            
            <div style={{ maxHeight: "300px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "5px" }}>
              {reactionsModalUsers.users.length === 0 ? (
                <p style={{ color: "var(--text-muted)", textAlign: "center", fontSize: "0.9rem", margin: "20px 0" }}>No reactions yet.</p>
              ) : (
                reactionsModalUsers.users.map((user, idx) => {
                  let displayName = userProfiles[user] || user;
                  let userAvatar = "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                  let teamColor = "transparent";
                  
                  if (typeof window !== "undefined") {
                    const accounts = allProfiles;
                    const acc = accounts.find((a: any) => a.id === user || a.email === user || a.firstName === user || a.supabase_id === user || `${a.firstName} ${a.lastName || ''}`.trim() === displayName);
                    if (acc) {
                      displayName = `${acc.firstName} ${acc.lastName || ''}`.trim();
                      userAvatar = acc.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                      teamColor = acc.team && acc.team !== 'none' ? acc.team : 'transparent';
                    }
                  }

                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", overflow: "hidden", border: `2px solid ${teamColor}` }}>
                        {(userAvatar && userAvatar.length > 10) ? (
                          <img src={userAvatar} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
        <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    )}
                      </div>
                      <span style={{ color: "var(--neon-white)", fontSize: "0.95rem" }}>{displayName}</span>
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
