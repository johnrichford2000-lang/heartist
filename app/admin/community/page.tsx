"use client";
import { formatCapitalizedName } from "@/utils/formatName";
import { dispatchNotification } from "@/lib/notificationsSync";
import MentionTextarea from '../../../components/MentionTextarea';


import { useState, useEffect } from "react";
import { fetchCommunityPosts, deletePostFromSupabase, deleteCommentFromSupabase } from "@/lib/communitySync";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import BadgeIcon from "@/components/BadgeIcon";

const LiveTimer = ({ expiry }: { expiry: number }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = expiry - Date.now();
      if (diff <= 0) {
        setTimeLeft("0s");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiry]);
  return <span style={{ fontFamily: "monospace", fontSize: "1.1em", color: "orange" }}>{timeLeft}</span>;
};

const AdminWriteCanvas = ({ onSubmit }: { onSubmit: (content: string, disableComments: boolean) => Promise<boolean> }) => {
  const [content, setContent] = useState("");
  const [disableComments, setDisableComments] = useState(false);
  const [clearKey, setClearKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePost = async () => {
    setIsSubmitting(true);
    const success = await onSubmit(content, disableComments);
    if (success) {
      setContent("");
      setClearKey(k => k + 1);
    }
    setIsSubmitting(false);
  };

  return (
    <div
      style={{
        background: "linear-gradient(145deg, rgba(20,20,20,0.8) 0%, rgba(5,5,5,0.9) 100%)",
        border: "1px solid rgba(255, 255, 0, 0.15)",
        borderRadius: "16px",
        padding: "25px",
        marginBottom: "40px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Subtle glow accent at top */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, var(--neon-yellow), transparent)", opacity: 0.5 }}></div>

      <h2
        style={{
          fontFamily: "var(--font-outfit)",
          fontSize: "1.3rem",
          marginBottom: "20px",
          color: "var(--neon-white)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          textShadow: "0 0 10px rgba(255,255,255,0.2)"
        }}
      >
        Write a Canvas
      </h2>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "15px",
          marginBottom: "20px",
        }}
      >
        <MentionTextarea
          key={clearKey}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's on your mind? Drop a prayer, praise report, or camp moment as Admin!"
          style={{
            width: "100%",
            minHeight: "100px",
            background: "rgba(0,0,0,0.5)",
            border: "1px solid transparent",
            borderRadius: "8px",
            padding: "15px",
            color: "white",
            fontFamily: "inherit",
            fontSize: "16px",
            resize: "none",
            outline: "none",
          }}
          onInput={(e: any) => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 250) + "px";
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: "var(--neon-white)",
              fontSize: "0.95rem",
            }}
          >
            Posting as:{" "}
            <strong style={{ color: "var(--neon-yellow)" }}>Admin</strong>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={disableComments}
              onChange={(e) => setDisableComments(e.target.checked)}
              style={{
                accentColor: "var(--neon-yellow)",
                width: "16px",
                height: "16px",
                cursor: "pointer",
              }}
            />
            Disable Comments
          </label>
        </div>
      </div>

      <button
        onClick={handlePost}
        disabled={isSubmitting}
        className="glow-text-yellow"
        style={{
          width: "100%",
          padding: "12px",
          background: "transparent",
          border: "1px solid var(--neon-yellow)",
          borderRadius: "8px",
          cursor: "pointer",
          fontFamily: "var(--font-outfit)",
          fontWeight: "bold",
          fontSize: "1rem",
          transition: "all 0.3s",
          opacity: isSubmitting ? 0.6 : 1,
        }}
        onMouseOver={(e) => {
          if (!isSubmitting) {
            e.currentTarget.style.background = "var(--neon-yellow)";
            e.currentTarget.style.color = "#000";
          }
        }}
        onMouseOut={(e) => {
          if (!isSubmitting) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--neon-yellow)";
          }
        }}
      >
        {isSubmitting ? "Posting..." : "Post to Canvas"}
      </button>

      <div
        style={{
          marginTop: "15px",
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          width: "100%",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "var(--neon-cyan)",
            }}
          ></span>
          General Chat
        </div>
      </div>
    </div>
  );
};

export default function AdminCanvasPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [penalties, setPenalties] = useState<any>({});
  const [warningCounts, setWarningCounts] = useState<Record<string, number>>({});
  const [penaltyCounts, setPenaltyCounts] = useState<Record<string, number>>({});
  const [appeals, setAppeals] = useState<any[]>([]);
  
  const [toastMessage, setToastMessage] = useState("");
  const [expandedPosts, setExpandedPosts] = useState<(string | number)[]>([]);
  
  const toggleExpand = (id: number | string) => {
    setExpandedPosts(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  const getRoleIcon = (role: string) => {
    return <BadgeIcon badge={role} size={15} />;
  };
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null); // holds post/user info for moderation
  const [moderateAction, setModerateAction] = useState<"warning" | "penalty" | "block" | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [penaltyDuration, setPenaltyDuration] = useState("10"); // in minutes
  const [activeTab, setActiveTab] = useState<"live" | "warning" | "penalty" | "block" | "appeals" | "reported">("live");
  const [seenWarningCount, setSeenWarningCount] = useState(0);
  useEffect(() => { setSeenWarningCount(parseInt(localStorage.getItem("adminWarningZoneSeenCount") || "0", 10)); }, []);
  const [seenPenaltyCount, setSeenPenaltyCount] = useState(0);
  const [seenAppealsCount, setSeenAppealsCount] = useState(0);
  const [seenReportedCount, setSeenReportedCount] = useState(0);
  useEffect(() => { 
    setSeenPenaltyCount(parseInt(localStorage.getItem("adminPenaltyZoneSeenCount") || "0", 10)); 
    setSeenAppealsCount(parseInt(localStorage.getItem("adminAppealsSeenCount") || "0", 10)); 
    setSeenReportedCount(parseInt(localStorage.getItem("adminReportedSeenCount") || "0", 10));
  }, []);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [reportedItems, setReportedItems] = useState<{ id: number | string, reporter: string }[]>([]);
  const [reportFilter, setReportFilter] = useState("All");

  // Resolution Modal State (Unblock / Remove Penalty)
  const [resolutionTarget, setResolutionTarget] = useState<{ user: string, type: "penalty" | "block" } | null>(null);
  const [resolutionMessage, setResolutionMessage] = useState("Your appeal has been granted. Your account is fully restored. Please adhere to the community guidelines.");
  const [highlightUser, setHighlightUser] = useState<string | null>(null);

  // Delete Modal State
  const [postToDelete, setPostToDelete] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [warnedPosts, setWarnedPosts] = useState<number[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState<Record<string | number, boolean>>({});
  const [adminOpenCommentId, setAdminOpenCommentId] = useState<string | number | null>(null);
  const [expandedRepliesForComment, setExpandedRepliesForComment] = useState<(string | number)[]>([]);
  
  const toggleReplies = (commentId: number | string) => {
    setExpandedRepliesForComment(prev => 
      prev.includes(commentId) ? prev.filter(id => id !== commentId) : [...prev, commentId]
    );
  };
  const [showCommentEditHistory, setShowCommentEditHistory] = useState<Record<string, boolean>>({});
  const [reactionModalPost, setReactionModalPost] = useState<number | null>(null);
  const [reactionModalUsers, setReactionModalUsers] = useState<string[] | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  const [closingMenuId, setClosingMenuId] = useState<string | number | null>(null);
  const closeMenu = (id: string | number) => {
    setClosingMenuId(id);
    setTimeout(() => {
      setOpenMenuId(null);
      setClosingMenuId(null);
    }, 200);
  };

  useEffect(() => {
    const isModalOpen = selectedUser !== null || 
                        resolutionTarget !== null || 
                        postToDelete !== null || 
                        adminOpenCommentId !== null ||
                        reactionModalPost !== null;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [selectedUser, resolutionTarget, postToDelete, adminOpenCommentId, reactionModalPost]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  

  const formatTimeAgo = (timestampMs: any, fallbackStr: any) => {
  let ts = Number(timestampMs);
  let validTs = false;
  
  if (!isNaN(ts) && ts > 100000000000) {
    validTs = true;
  } else if (!isNaN(Number(fallbackStr)) && Number(fallbackStr) > 100000000000) {
    ts = Number(fallbackStr);
    validTs = true;
  } else if (typeof fallbackStr === 'string' && fallbackStr) {
    const cleanDateStr = fallbackStr.split(" (")[0];
    const parsed = Date.parse(cleanDateStr);
    if (!isNaN(parsed)) {
      ts = parsed;
      validTs = true;
    }
  }

  if (!validTs) return "Unknown Date";

  const seconds = Math.floor((Date.now() - ts) / 1000);
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

  const toggleShowEditHistory = (id: number | string) => setShowEditHistory(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleShowCommentEditHistory = (id: number | string) => setShowCommentEditHistory(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("isAdminLoggedIn") !== "true") {
        window.location.href = "/login";
        return;
      }
      setIsAdmin(true);
      
      supabase.from("profiles").select("first_name, last_name, avatar_url, badge, team").then(({ data, error }) => {
        if (data && !error) {
          const accounts = data.map(p => ({ firstName: p.first_name, lastName: p.last_name, avatar: p.avatar_url, badge: p.badge, team: p.team }));
          localStorage.setItem("registeredAccounts", JSON.stringify(accounts));
        }
      });

      const loadData = async () => {
        try {
          const { fetchCommunityPosts } = await import("@/lib/communitySync");
          const { fetchAppeals, fetchReports, fetchWarnings } = await import("@/lib/moderationSync");

          const dbPosts = await fetchCommunityPosts();
          setPosts(dbPosts.filter(p => p.status !== 'trashed'));

          const dbAppeals = await fetchAppeals();
          setAppeals(dbAppeals.filter(a => a.status === 'pending').map(a => ({
             id: a.id,
             user: a.user_name,
             message: a.reason,
             timestamp: a.created_at,
             status: a.status
          })));

          const dbReports = await fetchReports();
          const dbMapped = dbReports.filter(r => r.status === 'pending').map(r => ({
             id: r.post_id || r.id, 
             reporter: r.reporter_name,
             dbId: r.id,
             status: r.status
          }));
          const localReports = JSON.parse(localStorage.getItem("communityReportedPosts") || "[]").map((r: any) => ({
             id: r.id || r,
             reporter: r.reporter || "Unknown",
             dbId: r.id || r,
             status: 'pending'
          }));
          
          const mergedReports = [...dbMapped];
          localReports.forEach((lr: any) => {
            if (!mergedReports.some(m => String(m.id) === String(lr.id))) {
               mergedReports.push(lr);
            }
          });
          setReportedItems(mergedReports);

          const dbWarnings = await fetchWarnings();
          setWarnedPosts(dbWarnings.map(w => w.post_id));

        } catch (e) {
          console.error("Failed to fetch from Supabase:", e);
        }

        const { data: profilesData } = await supabase.from("profiles").select("id, first_name, last_name, is_banned, banned_until, warning_count");
        if (profilesData) {
          const blocks: string[] = [];
          const pens: Record<string, number> = {};
          const wCounts: Record<string, number> = {};
          profilesData.forEach(p => {
             const uName = p.first_name;
             if (p.is_banned) {
               blocks.push(uName);
               blocks.push(p.id);
             }
             if (p.banned_until) {
               const time = new Date(p.banned_until).getTime();
               if (time > Date.now()) {
                 pens[uName] = time;
                 pens[p.id] = time;
               }
             }
             if (p.warning_count) {
               wCounts[uName] = p.warning_count;
               wCounts[p.id] = p.warning_count;
             }
          });
          
          try {
             const { fetchPenalties } = await import("@/lib/moderationSync");
             const activePenalties = await fetchPenalties();
             activePenalties.forEach(penalty => {
                 if (penalty.type === 'cooldown' && penalty.expires_at) {
                     const pTime = new Date(penalty.expires_at).getTime();
                     if (pTime > Date.now()) {
                         pens[penalty.user_id] = pTime;
                         // also map to username if possible
                         const prof = profilesData.find(p => p.id === penalty.user_id);
                         if (prof) pens[prof.first_name] = pTime;
                     }
                 }
             });
          } catch(e) {}
          
          setBlockedUsers(blocks);
          setPenalties(pens);
          setWarningCounts(wCounts);
        }

        const savedPenaltyCounts = JSON.parse(localStorage.getItem("communityPenaltyCounts") || "{}") || {};
        setPenaltyCounts(savedPenaltyCounts);
      };

      loadData();

      window.addEventListener("storage", loadData);
      return () => window.removeEventListener("storage", loadData);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const scrollId = params.get("scrollTo");
      
      if (scrollId) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        
        let attempts = 0;
        const maxAttempts = 40;
        const interval = setInterval(() => {
          attempts++;
          const el = document.getElementById("post-" + scrollId);
          if (el) {
            clearInterval(interval);
            
            setTimeout(() => {
              const startY = window.scrollY || window.pageYOffset || 0;
              const targetY = Math.max(0, el.getBoundingClientRect().top + startY - 120);
              const distance = targetY - startY;
              const duration = Math.min(Math.max(Math.abs(distance) * 0.7, 1400), 2800); 
              let start: number | null = null;

              const step = (timestamp: number) => {
                if (!start) start = timestamp;
                const progress = timestamp - start;
                const easeInOutCubic = (t: number) => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
                const percent = Math.min(progress / duration, 1);
                
                window.scrollTo(0, startY + distance * easeInOutCubic(percent));
                
                if (progress < duration) {
                  window.requestAnimationFrame(step);
                } else {
                  const originalTransition = el.style.transition;
                  const originalTransform = el.style.transform;
                  const originalBoxShadow = el.style.boxShadow;
                  const originalBorder = el.style.borderColor;
                  
                  el.style.transition = "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)";
                  el.style.transform = "scale(1.02)";
                  el.style.boxShadow = "0 0 25px rgba(255, 234, 0, 0.6), inset 0 0 10px rgba(255, 234, 0, 0.2)";
                  el.style.borderColor = "var(--neon-yellow)";
                  
                  setTimeout(() => {
                    el.style.transform = originalTransform || "";
                    el.style.boxShadow = originalBoxShadow || "";
                    el.style.borderColor = originalBorder || "";
                    
                    setTimeout(() => {
                      el.style.transition = originalTransition || "";
                    }, 600);
                  }, 2000);
                }
              };
              window.requestAnimationFrame(step);
            }, 100);
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
          }
        }, 50);
      }
    }
  }, []);

  const getTargetUserId = (post: any) => {
    if (post.authorId) return post.authorId;
    if (post.username !== "Anonymous" && post.username !== "Unknown") return post.username;
    
    const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
    const acc = accounts.find((a: any) => `${a.firstName} ${a.lastName}` === post.realName);
    if (acc) return acc.firstName;
    
    return post.realName ? post.realName.split(" ")[0] : (post.username || "unknown");
  };

  const isPostByAdmin = (post: any) => {
    if (post.name === "Admin" || post.authorId === "Admin") return true;
    if (post.role?.toLowerCase() === "admin") return true;
    
    if (typeof window !== "undefined") {
      const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
      const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
      if (postAcc?.badge === "Admin") return true;
    }
    
    return false;
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;

    if (String(postToDelete.id).length === 36) {
      try {
        await deletePostFromSupabase(String(postToDelete.id));
      } catch (e) {
        console.error("Failed to delete from Supabase:", e);
      }
    }

    const updatedPosts = posts.filter(p => p.id !== postToDelete.id);
    setPosts(updatedPosts);
    localStorage.setItem("communityPosts", JSON.stringify(updatedPosts));

    const reportInfo = reportedItems.find(r => r.id === postToDelete.id);
    if (reportInfo) {
       try {
           const { updateReportStatus } = await import("@/lib/moderationSync");
           await updateReportStatus((reportInfo as any).dbId || String(reportInfo.id), "reviewed"); 
       } catch (e) {
           console.error("Failed to update report status:", e);
       }
       
       let targetUname = (reportInfo as any).reporterUsername;
       if (!targetUname) {
           const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
           const acc = accounts.find((a: any) => `${a.firstName} ${a.lastName}` === reportInfo.reporter);
           if (acc) targetUname = acc.firstName;
       }
       if (targetUname && targetUname !== "SystemError") {
           try {
               const { createNotification } = await import("@/lib/notificationsSync");
               await createNotification({
                   sender_id: "admin",
                   sender_name: "Admin",
                   recipient_id: targetUname,
                   type: "REPORT SUCCESS",
                   message: `Thank you for reporting "${postToDelete.content.substring(0, 30)}...": The post you flagged has been removed for violating our community guidelines. (Keeping the Canvas safe)`,
               });
           } catch (e) {
               console.error("Failed to send report success notification:", e);
           }

           const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
           if (!inboxData[targetUname]) inboxData[targetUname] = [];
           inboxData[targetUname].push({
               id: Date.now() + Math.random(),
               type: "REPORT SUCCESS",
               content: {
                   text: "Thank you for reporting",
                   snippet: `"${postToDelete.content.substring(0, 30)}..."`,
                   action: "The post you flagged has been removed for violating our community guidelines.",
                   reason: "Keeping the Canvas safe"
               },
               timestamp: new Date().toLocaleString(),
               read: false
           });
           localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
       }
    }

    const updatedReports = reportedItems.filter(r => r.id !== postToDelete.id);
    setReportedItems(updatedReports);
    
    const storedReports = JSON.parse(localStorage.getItem("communityReportedPosts") || "[]");
    const newStoredReports = storedReports.filter((r: any) => String(r.id) !== String(postToDelete.id));
    localStorage.setItem("communityReportedPosts", JSON.stringify(newStoredReports));
    
    setSeenReportedCount(prev => {
        const newCount = Math.max(0, prev - 1);
        localStorage.setItem("adminReportedSeenCount", newCount.toString());
        return newCount;
    });

    const u = getTargetUserId(postToDelete);
    if (u && u !== "unknown") {
      const reasonText = deleteReason || "Violation of community guidelines.";
      
      try {
          const { createNotification } = await import("@/lib/notificationsSync");
          await createNotification({
              sender_id: "admin",
              sender_name: "Admin",
              recipient_id: u,
              type: "POST DELETED",
              message: `Your post "${postToDelete.content.substring(0, 30)}..." was removed by an Admin. Reason: ${reasonText}`,
          });
      } catch (e) {
          console.error("Failed to send post deleted notification:", e);
      }
      
      const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
      if (!inboxData[u]) inboxData[u] = [];
      
      inboxData[u].push({
        id: Date.now(),
        type: "POST DELETED",
        content: {
          text: "Your post",
          snippet: postToDelete.content.substring(0, 30) + "...",
          action: "was removed by an Admin.",
          reason: reasonText
        },
        timestamp: new Date().toLocaleString(),
        read: false
      });
      localStorage.setItem("fusionInbox", JSON.stringify(inboxData));

      dispatchNotification({
        id: Date.now() + 5,
        type: "post_deleted",
        message: `Your post was removed by an Admin. Reason: ${reasonText}`,
        userId: u,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      
      // dispatch removed
    }

    setPostToDelete(null);
    setDeleteReason("");
  };

  const adminDeleteComment = async (postId: number | string | string, commentId: number | string | string, replyId?: number | string) => {
    const targetId = replyId || commentId;
    try { await supabase.from('comments').delete().eq('id', targetId); } catch(e){}
    
    // Add warning post if not already warned
    if (!warnedPosts.includes(targetId as number)) {
       setWarnedPosts([...warnedPosts, targetId as number]);
    }
    const reportEntry = reportedItems.find((r: any) => String(r.id) === String(targetId));

    const notifyUsers = (reportedUsername: string) => {
      const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
      const notifs = JSON.parse(localStorage.getItem("communityNotifications") || "[]");

      if (reportedUsername) {
        if (!inboxData[reportedUsername]) inboxData[reportedUsername] = [];
        inboxData[reportedUsername].push({
          id: Date.now(),
          type: "COMMENT DELETED",
          content: {
            text: "System Notice:",
            snippet: "We deleted your comment because it violated our community guidelines.",
            action: "",
            reason: ""
          },
          timestamp: new Date().toLocaleString(),
          read: false
        });
        
        dispatchNotification({
          id: Date.now() + 1,
          type: "comment_deleted",
          message: "We deleted your comment because it violated our community guidelines.",
          userId: reportedUsername,
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      if (reportEntry && (reportEntry as any).reporterUsername) {
        const reporterUname = (reportEntry as any).reporterUsername;
        if (!inboxData[reporterUname]) inboxData[reporterUname] = [];
        inboxData[reporterUname].push({
          id: Date.now() + 2,
          type: "REPORT ACTION",
          content: {
            text: "Report Update:",
            snippet: "Thank you for keeping our community safe. We have reviewed and deleted the comment you reported.",
            action: "",
            reason: ""
          },
          timestamp: new Date().toLocaleString(),
          read: false
        });
        notifs.push({
          id: Date.now() + 3,
          type: "report_action",
          message: "Thank you for keeping our community safe. We have reviewed and deleted the comment you reported.",
          targetUser: reporterUname,
          timestamp: new Date().toISOString(),
          read: false
        });
      }

      localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
    };

    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        if (replyId) {
          const updatedComments = post.comments.map((c: any) => {
            if (c.id === commentId) {
              const replyToDelete = c.replies?.find((r: any) => r.id === replyId);
              if (replyToDelete) {
                 let targetUname = replyToDelete.author.split(" ")[0];
                 const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
                 const acc = accounts.find((a: any) => `${a.firstName} ${a.lastName}` === replyToDelete.author);
                 if (acc) targetUname = acc.firstName;
                 
                 notifyUsers(targetUname);
              }
              return { ...c, replies: c.replies.filter((r: any) => r.id !== replyId) };
            }
            return c;
          });
          return { ...post, comments: updatedComments };
        } else {
          const commentToDelete = post.comments?.find((c: any) => c.id === commentId);
          if (commentToDelete) {
             let targetUname = commentToDelete.author.split(" ")[0];
             const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
             const acc = accounts.find((a: any) => `${a.firstName} ${a.lastName}` === commentToDelete.author);
             if (acc) targetUname = acc.firstName;

             notifyUsers(targetUname);
          }
          return { ...post, comments: post.comments.filter((c: any) => c.id !== commentId) };
        }
      }
      return post;
    });

    setPosts(updatedPosts);
    localStorage.setItem("communityPosts", JSON.stringify(updatedPosts));
    
    const updatedReports = reportedItems.filter((r: any) => String(r.id) !== String(targetId));
    setReportedItems(updatedReports);

    // dispatch removed
  };

  const handleWarnUser = async () => {
    if (!selectedUser) return;
    
    const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
    const u = getTargetUserId(selectedUser);
    
    if (!inboxData[u]) inboxData[u] = [];
    
    const messageToSend = warningMessage.trim() || "Warning: You have violated community guidelines.";
    
    try {
        const { createNotification } = await import("@/lib/notificationsSync");
        await createNotification({
            sender_id: "admin",
            sender_name: "Admin",
            recipient_id: u,
            type: "WARNING",
            message: messageToSend,
        });
    } catch (e) {
        console.error("Failed to send warning notification:", e);
    }

    inboxData[u].push({
      id: Date.now(),
      type: "WARNING",
      content: messageToSend,
      timestamp: new Date().toLocaleString(),
      read: false
    });
    
    localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
    
    const currentCount = warningCounts[u] || 0;
    const updatedCounts = { ...warningCounts, [u]: currentCount + 1 };
    setWarningCounts(updatedCounts);
    
    const postId = selectedUser.id;
    if (!warnedPosts.includes(postId)) {
      const updatedWarnings = [...warnedPosts, postId];
      setWarnedPosts(updatedWarnings);
      try {
        const { createWarning, incrementWarningCount } = await import("@/lib/moderationSync");
        await createWarning({ post_id: String(postId), user_id: u });
        await incrementWarningCount(u);
      } catch (e) {
        console.error("Failed to save warning to Supabase:", e);
      }
    }

    setWarningMessage("");
    setSelectedUser(null);
  };

  const handleClearWarning = async (postId: number | string) => {
    const updated = warnedPosts.filter(w => w !== postId);
    setWarnedPosts(updated);
    try {
      const { deleteWarning } = await import("@/lib/moderationSync");
      await deleteWarning(String(postId));
    } catch (e) {
      console.error("Failed to delete warning from Supabase:", e);
    }
  };

  const handleApplyPenalty = async () => {
    if (!selectedUser) return;
    const u = getTargetUserId(selectedUser);
    
    const mins = parseInt(penaltyDuration);
    const expiry = Date.now() + (mins * 60000);
    
    const updated = { ...penalties, [u]: expiry };
    setPenalties(updated);
    localStorage.setItem("communityPenalties", JSON.stringify(updated));
    
    try {
        const { updateUserBanStatus, createPenalty } = await import("@/lib/moderationSync");
        await updateUserBanStatus(u, false, new Date(expiry).toISOString(), "Timeout Penalty");
        await createPenalty({ user_id: u, type: 'cooldown', reason: "Timeout Penalty", expires_at: new Date(expiry).toISOString() });
    } catch (e) {
        console.error("Failed to save penalty to Supabase", e);
    }

    const currentPCount = penaltyCounts[u] || 0;
    const updatedPCounts = { ...penaltyCounts, [u]: currentPCount + 1 };
    setPenaltyCounts(updatedPCounts);
    localStorage.setItem("communityPenaltyCounts", JSON.stringify(updatedPCounts));

    const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
    if (!inboxData[u]) inboxData[u] = [];
    
    let durationText = `${mins} Minute(s)`;
    if (mins === 1440) durationText = "1 Day";
    else if (mins === 4320) durationText = "3 Days";
    else if (mins === 43200) durationText = "1 Month";
    else if (mins === 525600) durationText = "1 Year";

    const penaltyMessage = `You have been penalized with a timeout. Duration: ${durationText}. Please review our community guidelines.`;

    try {
        const { createNotification } = await import("@/lib/notificationsSync");
        await createNotification({
            sender_id: "admin",
            sender_name: "Admin",
            recipient_id: u,
            type: "PENALTY",
            message: penaltyMessage,
        });
    } catch (e) {
        console.error("Failed to send penalty notification:", e);
    }

    inboxData[u].push({
      id: Date.now(),
      type: "PENALTY",
      content: penaltyMessage,
      timestamp: new Date().toLocaleString(),
      read: false
    });
    localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
    // dispatch removed

    setSelectedUser(null);
  };

  const handleRemovePenalty = (u: string) => {
    setResolutionTarget({ user: u, type: "penalty" });
    setResolutionMessage(`Your penalty has been successfully removed. Welcome back! Please be mindful of the guidelines.`);
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    const u = getTargetUserId(selectedUser);
    if (!blockedUsers.includes(u)) {
      const updated = [...blockedUsers, u];
      setBlockedUsers(updated);
      
      try {
          const { updateUserBanStatus, createPenalty } = await import("@/lib/moderationSync");
          await updateUserBanStatus(u, true, null, "Violation of community guidelines");
          await createPenalty({ user_id: u, type: 'blocked', reason: "Violation of community guidelines" });
      } catch (e) {
          console.error("Failed to block user in Supabase", e);
      }
      
      const blockMessage = `Your account has been blocked from posting on the Canvas due to repeated violations.`;
      
      try {
          const { createNotification } = await import("@/lib/notificationsSync");
          await createNotification({
              sender_id: "admin",
              sender_name: "Admin",
              recipient_id: u,
              type: "BLOCK",
              message: blockMessage,
          });
      } catch (e) {
          console.error("Failed to send block notification:", e);
      }

      const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
      if (!inboxData[u]) inboxData[u] = [];
      inboxData[u].push({
        id: Date.now(),
        type: "PENALTY", 
        content: blockMessage,
        timestamp: new Date().toLocaleString(),
        read: false
      });
      localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
      // dispatch removed
    }
    setSelectedUser(null);
  };

  const handleUnblockUser = (u: string) => {
    setResolutionTarget({ user: u, type: "block" });
    setResolutionMessage(`Your account has been unblocked. Welcome back! Please ensure you follow the community guidelines moving forward.`);
  };

  const confirmResolution = async () => {
    if (!resolutionTarget) return;
    const u = resolutionTarget.user;

    try {
      const { updateUserBanStatus, deletePenaltyByUserId } = await import("@/lib/moderationSync");
      if (resolutionTarget.type === "penalty") {
        const updated = { ...penalties };
        delete updated[u];
        setPenalties(updated);
        await updateUserBanStatus(u, false, null, null);
        await deletePenaltyByUserId(u);
      } else if (resolutionTarget.type === "block") {
        const updated = blockedUsers.filter(b => b !== u);
        setBlockedUsers(updated);
        await updateUserBanStatus(u, false, null, null);
        await deletePenaltyByUserId(u);
      }
    } catch(e) { console.error("Error updating resolution", e); }

    if (resolutionMessage.trim()) {
      try {
          const notifType = resolutionTarget.type === 'penalty' ? "PENALTY LIFTED" : "UNBLOCKED";
          const { createNotification } = await import("@/lib/notificationsSync");
          await createNotification({
              sender_id: "admin",
              sender_name: "Admin",
              recipient_id: u,
              type: notifType,
              message: resolutionMessage,
          });
      } catch (e) {
          console.error("Failed to send resolution notification:", e);
      }

      const notifTypeLocal = resolutionTarget.type === 'penalty' ? "PENALTY LIFTED" : "UNBLOCKED";
      const inboxes = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
      if (!inboxes[u]) inboxes[u] = [];
      inboxes[u].push({
        id: Date.now(),
        type: notifTypeLocal,
        content: resolutionMessage,
        timestamp: new Date().toLocaleString(),
        read: false
      });
      localStorage.setItem("fusionInbox", JSON.stringify(inboxes));
    }

    try {
        const { deleteAppeal } = await import("@/lib/moderationSync");
        for (const appeal of appeals) {
            const isSameUser = appeal.user.toLowerCase() === u.toLowerCase() || 
                               posts.some(p => (p.realName === appeal.user || p.name === appeal.user) && getTargetUserId(p) === u);
            if (isSameUser && appeal.id && typeof appeal.id === 'string' && appeal.id.length === 36) {
                await deleteAppeal(appeal.id);
            }
        }
    } catch (e) {
        console.error("Failed to delete appeals:", e);
    }
    
    setAppeals(appeals.filter(a => {
        const isSameUser = a.user.toLowerCase() === u.toLowerCase() || 
                           posts.some(p => (p.realName === a.user || p.name === a.user) && getTargetUserId(p) === u);
        return !isSameUser;
    }));

    setResolutionTarget(null);
  };

  const handleTrashPost = (postId: string | number) => {
    const targetPost = posts.find(p => p.id === postId);
    const postToDelete = targetPost;
    
    if (postToDelete) {
      const reportInfo = reportedItems.find(r => String(r.id) === String(postToDelete.id));
      if (reportInfo) {
         try {
             import("@/lib/moderationSync").then(({ deleteReport }) => {
                 deleteReport((reportInfo as any).dbId || String(postToDelete.id));
             });
         } catch (e) { console.error("Failed to delete report:", e); }
      }
      // logic to remove post...
    }
  };

  const handleDismissReport = async (id: number | string) => {
    const reportInfo = reportedItems.find(r => String(r.id) === String(id));
    if (reportInfo) {
        try {
            const { deleteReport } = await import("@/lib/moderationSync");
            await deleteReport((reportInfo as any).dbId || String(id));
        } catch (e) {
            console.error("Failed to update report status:", e);
        }
        
        const targetPost = posts.find(p => p.id === id);
        if (targetPost) {
           let targetUname = (reportInfo as any).reporterUsername;
           if (!targetUname) {
               const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
               const acc = accounts.find((a: any) => `${a.firstName} ${a.lastName}` === reportInfo.reporter);
               if (acc) targetUname = acc.firstName;
           }
           if (targetUname && targetUname !== "SystemError") {
               try {
                   const { createNotification } = await import("@/lib/notificationsSync");
                   await createNotification({
                       sender_id: "admin",
                       sender_name: "Admin",
                       recipient_id: targetUname,
                       type: "REPORT DISMISSED",
                       message: `Regarding your report on "${targetPost.content.substring(0, 30)}...": After careful review, we have determined that this post is safe and does not violate our guidelines.`,
                   });
               } catch (e) {
                   console.error("Failed to send notification:", e);
               }

               const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
               if (!inboxData[targetUname]) inboxData[targetUname] = [];
               inboxData[targetUname].push({
                   id: Date.now() + Math.random(),
                   type: "REPORT DISMISSED",
                   content: {
                       text: "Regarding your report on",
                       snippet: `"${targetPost.content.substring(0, 30)}..."`,
                       action: "After careful review, we have determined that this post is safe and does not violate our guidelines.",
                       reason: "Report Dismissed"
                   },
                   timestamp: new Date().toLocaleString(),
                   read: false
               });
               localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
           }
        }
    }

    const newReports = reportedItems.filter(r => String(r.id) !== String(id));
    setReportedItems(newReports);
    
    const storedReports = JSON.parse(localStorage.getItem("communityReportedPosts") || "[]");
    const newStoredReports = storedReports.filter((r: any) => String(r.id) !== String(id));
    localStorage.setItem("communityReportedPosts", JSON.stringify(newStoredReports));
    
    setSeenReportedCount(prev => {
        const newCount = Math.max(0, prev - 1);
        localStorage.setItem("adminReportedSeenCount", newCount.toString());
        return newCount;
    });
    // dispatch removed
  };

  if (!isAdmin) return null;

  const isHighlightMatch = (uid: string) => {
    if (!highlightUser) return false;
    if (uid.toLowerCase().includes(highlightUser.toLowerCase())) return true;
    return posts.some(p => (p.realName === highlightUser || p.name === highlightUser) && getTargetUserId(p) === uid);
  };

  const isPostBlocked = (post: any) => {
    const uid = getTargetUserId(post);
    return blockedUsers.includes(uid);
  };

  const isPostPenalized = (post: any) => {
    const uid = getTargetUserId(post);
    return penalties[uid] && penalties[uid] > Date.now();
  };

  const isPostWarned = (post: any) => {
    return warnedPosts.includes(post.id);
  };

  // Penalized posts stay in live feed just like warned posts
  const livePosts = posts.filter(p => !isPostBlocked(p) && !p.isPinned);
  const hiddenPenaltyPosts = posts.filter(p => isPostPenalized(p) && !isPostBlocked(p));
  const hiddenBlockedPosts = posts.filter(p => isPostBlocked(p));
  const warningPosts = posts.filter(p => isPostWarned(p) && !isPostPenalized(p) && !isPostBlocked(p));
  const reportedPostsRaw = posts.filter(p => reportedItems.some(r => String(r.id) === String(p.id)));
  const reportedPosts = reportedPostsRaw.map(p => {
    const rep = reportedItems.find(r => String(r.id) === String(p.id));
    return { ...p, reporterName: rep?.reporter || "Unknown" };
  });

  const reportedCommentsRaw: { post: any, comment: any, reply?: any, reporterName: string }[] = [];
  posts.forEach(p => {
    if (p.comments) {
      p.comments.forEach((c: any) => {
        const repC = reportedItems.find(r => String(r.id) === String(c.id));
        if (repC) reportedCommentsRaw.push({ post: p, comment: c, reporterName: repC.reporter || "Unknown" });
        if (c.replies) {
          c.replies.forEach((r: any) => {
            const repR = reportedItems.find(rep => String(rep.id) === String(r.id));
            if (repR) reportedCommentsRaw.push({ post: p, comment: c, reply: r, reporterName: repR.reporter || "Unknown" });
          });
        }
      });
    }
  });
  const filteredReportedPosts = reportedPosts.filter(p => {
    if (reportFilter === "All") return true;
    if (reportFilter === "Photos") return !!p.photoUrl || !!p.image;
    if (reportFilter === "Videos") return !!p.videoUrl;
    if (reportFilter === "Posts") return !p.photoUrl && !p.image && !p.videoUrl;
    return true;
  });

  const handleLikePost = (id: number | string) => {
    const activeAdmin = localStorage.getItem("activeAdmin") || "Admin";
    const savedActiveUser = localStorage.getItem("activeUser");
    const parsedUser = savedActiveUser ? JSON.parse(savedActiveUser) : null;
    const uName = parsedUser ? `${parsedUser.firstName} ${parsedUser.lastName}` : activeAdmin;

    const updated = posts.map(p => {
      if (p.id === id) {
        const likedBy = Array.isArray(p.likes) ? p.likes : (Array.isArray(p.likedBy) ? p.likedBy : []);
        if (likedBy.includes(uName)) {
          const newLikedBy = likedBy.filter((n: string) => n !== uName);
          return { ...p, likes: newLikedBy, likedBy: newLikedBy, likesCount: newLikedBy.length };
        } else {
          const newLikedBy = [...likedBy, uName];
          return { ...p, likes: newLikedBy, likedBy: newLikedBy, likesCount: newLikedBy.length };
        }
      }
      return p;
    });
    setPosts(updated);
    localStorage.setItem("fusion_posts", JSON.stringify(updated));
  };

  const renderWithMentions = (contentStr: string) => {
    if (!contentStr) return null;
    let html = contentStr;
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    if (typeof window !== "undefined") {
      let accs = []; try { accs = JSON.parse(localStorage.getItem("registeredAccounts") || "[]"); if (!Array.isArray(accs)) accs = []; } catch(e) {}
      const validMentions = new Set<string>();
      accs.forEach((a: any) => {
        const fullName = `${a.firstName} ${a.lastName}`.trim();
        const parts = fullName.split(" ");
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j <= parts.length; j++) {
            validMentions.add(parts.slice(i, j).join(" ").toLowerCase());
          }
        }
      });
      // Add everyone for admin mentions
      validMentions.add("everyone");
      
      const sortedMentions = Array.from(validMentions).sort((a, b) => b.length - a.length);
      
      let baseRegexStr = "[a-zA-Z0-9_.-]+(?:\\s[a-zA-Z0-9_.-]+)?";
      if (sortedMentions.length > 0) {
        const escapedMentions = sortedMentions.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        baseRegexStr = `${escapedMentions.join("|")}|[a-zA-Z0-9_.-]+(?:\\s[a-zA-Z0-9_.-]+)?`;
      }
      const combinedRegex = new RegExp(`@\\u200B?(${baseRegexStr})(?=[\\s\\.,!?]|$)`, 'gi');
      html = html.replace(combinedRegex, '<span style="background: rgba(255,234,0,0.3); color: var(--neon-yellow); border-radius: 4px; padding: 2px 0; font-weight: bold; transition: all 0.3s ease; box-decoration-break: clone; -webkit-box-decoration-break: clone;">$&</span>');
    }

    html = html.replace(/\n/g, '<br/>');
    return <span suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const handleAdminPost = async (currentContent: string, disableComments: boolean) => {
    if (!currentContent.trim()) {
      setToastMessage("Please enter some content for your post.");
      setTimeout(() => setToastMessage(""), 3000);
      return false;
    }

    const savedActiveUser = localStorage.getItem("activeUser");
    const parsedUser = savedActiveUser ? JSON.parse(savedActiveUser) : null;
    const authorId = parsedUser ? parsedUser.id || parsedUser.firstName : "Admin";

    try {
      const { submitPostToSupabase } = await import("@/lib/communitySync");
      await submitPostToSupabase({ content: currentContent, category: "General Chat", isAnonymous: false, disableComments }, authorId);
      
      // Reload posts from Supabase
      const { fetchCommunityPosts } = await import("@/lib/communitySync");
      const dbPosts = await fetchCommunityPosts();
      setPosts(dbPosts.filter((p: any) => p.status !== "trashed"));

      setToastMessage("Post successfully published to Canvas!");
      setTimeout(() => setToastMessage(""), 3000);
      return true;
    } catch (e: any) {
      console.error("Failed to post as admin:", e);
      setToastMessage("Failed to save post.");
      setTimeout(() => setToastMessage(""), 3000);
      return false;
    }
  };

  const handlePinPost = async (id: number | string) => {
    try {
      const post = posts.find(p => p.id === id);
      if (!post) return;
      
      const newPinState = !post.isPinned;
      const { togglePostPin } = await import("@/lib/communitySync");
      
      // Update in Supabase
      if (typeof id === 'string') {
        await togglePostPin(id, newPinState);
      }
      
      // Update local state
      const updatedPosts = posts.map(p => {
        if (p.id === id) {
          return { ...p, isPinned: newPinState };
        }
        return p;
      });
      setPosts(updatedPosts);
      
      setToastMessage(newPinState ? "Post added to featured!" : "Post unpinned.");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (e) {
      console.error("Failed to pin post", e);
      setToastMessage("Failed to pin post.");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const handleAddToAnnouncement = async (post: any) => {
    try {
      const isFeatured = post.category === "Featured Posts" || post.isPinned;
      const { submitAnnouncement } = await import("@/lib/fusionSync");
      
      const announcementData = {
        content: post.content,
        timestamp: new Date().toISOString(),
        postId: post.id,
        isFeatured: isFeatured
      };
      
      await submitAnnouncement(announcementData);
      
      setToastMessage("Added to announcements!");
      setTimeout(() => setToastMessage(""), 3000);
    } catch (e) {
      console.error("Failed to add to announcements", e);
      setToastMessage("Failed to add to announcements.");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

    return (
    <main className="main-container" style={{ padding: "80px 20px", position: "relative" }}>
      {toastMessage && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "rgba(255,234,0,0.9)", color: "black", padding: "10px 20px", borderRadius: "20px", fontWeight: "bold", zIndex: 1000, boxShadow: "0 0 15px rgba(255,234,0,0.5)", animation: "slideDown 0.3s ease-out" }}>
          {toastMessage}
        </div>
      )}
      <header style={{ marginBottom: "40px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1 className="header-title glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}>
          Admin Canvas Moderation
        </h1>
        <h2 style={{ color: "var(--neon-white)", fontSize: "1.2rem", marginTop: "10px", fontFamily: "var(--font-outfit)", fontStyle: "italic" }}>
          Monitor, delete, warn, and penalize Canvas users.
        </h2>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap", marginBottom: "40px" }}>
        <button 
          onClick={() => { setActiveTab("live"); setHighlightUser(null); }}
          style={{ padding: "10px 20px", background: activeTab === "live" ? "var(--neon-yellow)" : "transparent", color: activeTab === "live" ? "#000" : "var(--neon-yellow)", border: "2px solid var(--neon-yellow)", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontFamily: "var(--font-outfit)", fontSize: "1.1rem" }}
        >
          Live Canvas
        </button>
        <button 
          onClick={() => { 
            setActiveTab("warning"); 
            setHighlightUser(null); 
            localStorage.setItem("adminWarningZoneSeenCount", warningPosts.length.toString());
            setSeenWarningCount(warningPosts.length);
          }}
          style={{ position: "relative", padding: "10px 20px", background: activeTab === "warning" ? "#FF9900" : "transparent", color: activeTab === "warning" ? "#FFF" : "#FF9900", border: "2px solid #FF9900", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontFamily: "var(--font-outfit)", fontSize: "1.1rem" }}
        >
          Warning Zone
          {warningPosts.length - seenWarningCount > 0 && (
            <div style={{ position: "absolute", top: "-8px", right: "-8px", background: "#FF4444", color: "white", borderRadius: "50%", minWidth: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold", border: "2px solid var(--bg-main)" }}>
              {warningPosts.length - seenWarningCount}
            </div>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("penalty");
            setHighlightUser(null);
            const pCount = Object.values(penalties).filter(expiry => (expiry as number) > Date.now()).length;
            localStorage.setItem("adminPenaltyZoneSeenCount", pCount.toString());
            setSeenPenaltyCount(pCount);
          }}
          style={{ position: "relative", padding: "10px 20px", background: activeTab === "penalty" ? "orange" : "transparent", color: activeTab === "penalty" ? "#000" : "orange", border: "2px solid orange", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontFamily: "var(--font-outfit)", fontSize: "1.1rem" }}
        >
          Penalty Zone
          {Object.values(penalties).filter(expiry => (expiry as number) > Date.now()).length - seenPenaltyCount > 0 && (
            <div style={{ position: "absolute", top: "-8px", right: "-8px", background: "#FF4444", color: "white", borderRadius: "50%", minWidth: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold", border: "2px solid var(--bg-main)", animation: "pulse 1.5s infinite" }}>
              {Object.values(penalties).filter(expiry => (expiry as number) > Date.now()).length - seenPenaltyCount}
            </div>
          )}
        </button>
        <button 
          onClick={() => { setActiveTab("block"); setHighlightUser(null); }}
          style={{ position: "relative", padding: "10px 20px", background: activeTab === "block" ? "#FF4444" : "transparent", color: activeTab === "block" ? "#FFF" : "#FF4444", border: "2px solid #FF4444", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontFamily: "var(--font-outfit)", fontSize: "1.1rem" }}
        >
          Block Zone
          {hiddenBlockedPosts.length > 0 && (
            <div style={{ position: "absolute", top: "-8px", right: "-8px", background: "#FF4444", color: "white", borderRadius: "50%", minWidth: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold", border: "2px solid var(--bg-main)" }}>
              {hiddenBlockedPosts.length}
            </div>
          )}
        </button>
        <button 
          onClick={() => {
            setActiveTab("appeals");
            setHighlightUser(null);
            const aCount = appeals.length;
            localStorage.setItem("adminAppealsSeenCount", aCount.toString());
            setSeenAppealsCount(aCount);
          }}
          style={{ position: "relative", padding: "10px 20px", background: activeTab === "appeals" ? "white" : "transparent", color: activeTab === "appeals" ? "#000" : "white", border: "2px solid white", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontFamily: "var(--font-outfit)", fontSize: "1.1rem" }}
        >
          Appeals
          {appeals.length - seenAppealsCount > 0 && (
            <div style={{ position: "absolute", top: "-8px", right: "-8px", background: "#FF4444", color: "white", borderRadius: "50%", minWidth: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold", border: "2px solid var(--bg-main)", animation: "pulse 1.5s infinite" }}>
              {appeals.length - seenAppealsCount}
            </div>
          )}
        </button>
        <button 
          onClick={() => { 
            setActiveTab("reported"); 
            setHighlightUser(null); 
            const newCount = reportedPosts.length + reportedCommentsRaw.length;
            setSeenReportedCount(newCount);
            localStorage.setItem("adminReportedSeenCount", newCount.toString());
          }}
          style={{ position: "relative", padding: "10px 20px", background: activeTab === "reported" ? "#8A2BE2" : "transparent", color: activeTab === "reported" ? "#FFF" : "#8A2BE2", border: "2px solid #8A2BE2", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontFamily: "var(--font-outfit)", fontSize: "1.1rem" }}
        >
          Reported Zone
          {(reportedPosts.length + reportedCommentsRaw.length) > seenReportedCount && (
            <div style={{ position: "absolute", top: "-8px", right: "-8px", background: "#FF4444", color: "white", borderRadius: "50%", minWidth: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "bold", border: "2px solid var(--bg-main)", animation: "pulse 1.5s infinite" }}>
              {(reportedPosts.length + reportedCommentsRaw.length) - seenReportedCount}
            </div>
          )}
        </button>
      </div>

      
                        {activeTab === "live" && (
        <div style={{ maxWidth: "1000px", margin: "0 auto 40px" }}>
          <h2 className="section-title" style={{ color: "var(--neon-yellow)", textShadow: "0 0 10px rgba(255,255,0,0.5)" }}>Live Canvas</h2>
          
          <AdminWriteCanvas onSubmit={handleAdminPost} />
          
          {[
            { title: "Featured Posts", items: posts.filter(p => p.isPinned) },
            { title: "Live Canvas", items: livePosts }
          ].map(section => (
            <div key={section.title} style={{ marginBottom: "50px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                <h2 style={{ fontFamily: "var(--font-outfit)", color: "var(--neon-white)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
                   
                  {section.title}
                </h2>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {section.items.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                    No posts in this category yet.
                  </div>
                ) : (
                  section.items.map((post: any) => (
                    <div 
                      key={post.id} 
                      style={{ 
                        position: "relative",
                        padding: "20px", 
                        cursor: "default",
                        borderRadius: "16px",
                        backdropFilter: "blur(10px)",
                        ...(section.title === "Featured Posts"
                          ? {
                              border: "1px solid #ff3366",
                              boxShadow: "0 0 15px rgba(255, 51, 102, 0.4), inset 0 0 5px rgba(255, 51, 102, 0.1)",
                              background: "rgba(0,0,0,0.6)",
                            }
                          : {
                              background: "rgba(0, 0, 0, 0.4)",
                              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRight: "1px solid rgba(255, 255, 255, 0.1)",
                              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                              borderLeft: `4px solid ${post.category === 'Prayer Request' ? 'var(--neon-yellow)' : 'var(--neon-white)'}`,
                              borderRadius: "15px",
                            }),
                        display: "flex", 
                        flexDirection: "column", 
                        gap: "15px",
                        transition: "all 0.3s ease",
                      }}
                    >
                      {section.title === "Featured Posts" && (
                        <div style={{ position: "absolute", top: "-15px", right: "20px", fontSize: "1.8rem", zIndex: 5, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>📌</div>
                      )}
                      
                      <div 
                        onClick={(e) => { e.stopPropagation(); openMenuId === post.id ? closeMenu(post.id) : setOpenMenuId(post.id); }}
                        style={{ position: "absolute", top: "15px", right: "15px", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold", padding: "5px 10px", color: "var(--text-muted)", zIndex: 20 }}
                      >
                        ...
                      </div>

                      {showEditHistory[post.id] && (
                        <div style={{ marginBottom: "15px", padding: "12px 15px", background: "rgba(255,255,255,0.03)", borderLeft: "3px solid var(--text-muted)", borderRadius: "0 6px 6px 0", animation: "fadeIn 0.2s ease", textAlign: "left" }}>
                          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", color: "var(--neon-white)", display: "flex", alignItems: "center", gap: "6px" }}>
                            Original Text
                          </div>
                          {(!post.editHistory || post.editHistory.length === 0) ? (
                            <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic", marginBottom: "5px" }}>
                              No edit history available for this post (edited before history tracking).
                            </div>
                          ) : (
                            post.editHistory.map((entry: any, idx: number) => (
                              <div key={idx} style={{ color: "var(--text-muted)", fontSize: "0.9rem", whiteSpace: "pre-wrap", fontStyle: "italic", marginBottom: "5px" }}>
                                <strong>Edited {idx + 1}:</strong> "{typeof entry === 'string' && entry.startsWith('{') ? JSON.parse(entry).content : (entry.content || entry)}"
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {post.isEdited && (
                        <div 
                          onClick={() => toggleShowEditHistory(post.id)}
                          style={{ position: "absolute", top: "15px", right: "35px", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer", fontStyle: "italic", padding: "2px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", transition: "all 0.2s", zIndex: 20 }}
                          onMouseOver={(e) => { e.currentTarget.style.color = "var(--neon-white)"; e.currentTarget.style.border = "1px solid var(--neon-white)"; }}
                          onMouseOut={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
                        >
                          {showEditHistory[post.id] ? "(Hide Original)" : `(Edited ${post.editCount || 1}x)`}
                        </div>
                      )}

                      {openMenuId === post.id && (
                        <div style={{ position: "absolute", top: "50px", right: "20px", background: "rgba(10,10,10,0.95)", border: "1px solid transparent", borderRadius: "8px", padding: "10px 0", zIndex: 10, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", minWidth: "200px", display: "flex", flexDirection: "column" }}>
                          <div 
                            onClick={() => { setOpenMenuId(null); handlePinPost(post.id); }}
                            style={{ padding: "10px 15px", color: "#FFD700", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s" }}
                            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            {post.isPinned ? "Unpin Post" : "Add to Featured"}
                          </div>
                          <div 
                            onClick={() => { closeMenu(post.id); setSelectedUser(post); }}
                            style={{ padding: "10px 15px", color: "orange", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", fontWeight: "bold" }}
                            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            Penalize / Warn
                          </div>
                          {section.title === "Featured Posts" && (
                            <div 
                              onClick={() => { closeMenu(post.id); handleAddToAnnouncement(post); }}
                              style={{ padding: "10px 15px", color: "#00BFFF", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s" }}
                              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              Push to Announcement
                            </div>
                          )}
                          <div 
                            onClick={() => { closeMenu(post.id); setPostToDelete(post); }}
                            style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            Delete Post
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "15px", alignItems: "flex-start", position: "relative", zIndex: 1 }}>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div style={{ minWidth: "50px", minHeight: "50px", width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", overflow: "hidden", border: `2px solid ${(() => {
                            const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
                            const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
                            return (postAcc?.team && postAcc.team !== 'none') ? postAcc.team : (post.team && post.team !== 'none' ? post.team : 'transparent');
                          })()}` }}>
                            {(post.avatar && post.avatar.length > 10) ? <img src={post.avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : post.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"}
                          </div>
                          <div style={{ position: "absolute", bottom: "-2px", right: "-4px", fontSize: "1.1rem", background: "var(--bg-main)", borderRadius: "50%", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                            {(() => {
                              const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
                              const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
                              const postRole = (post.name === 'Anonymous' || post.name === 'Anonymous Heartist' || post.author === 'Anonymous' || post.author === 'Anonymous Heartist') ? 'anonymous' : (postAcc?.badge || post.role || "Heartist");
                              return getRoleIcon(postRole);
                            })()}
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexGrow: 1 }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <h3 style={{ margin: 0, fontSize: "1.1rem", fontFamily: "var(--font-outfit)", color: "var(--neon-white)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {post.name}
                            </h3>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2px" }}>{formatTimeAgo(post.id, post.timestamp)}</span>
                          </div>
                          {post.isAnonymous && <div style={{ fontSize: "0.85rem", color: "#FF4444", fontWeight: "bold" }}>(Real: {post.realName || post.username})</div>}
                        </div>
                      </div>

                      <div style={{ color: "var(--neon-white)", fontSize: "1rem", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "var(--font-inter)", textAlign: "center", width: "100%", marginTop: "15px" }}>
                        {post.content}
                      </div>
                      
                      {post.imageUrl && (
                        <div style={{ width: "100%", marginTop: "15px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)", display: "flex", justifyContent: "center" }}>
                          <img src={post.imageUrl} alt="Attached" style={{ width: "100%", maxHeight: "500px", objectFit: "contain", display: "block" }} />
                        </div>
                      )}

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "20px", marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "15px" }}>
                        <div 
                          onClick={(e) => { e.stopPropagation(); setReactionModalUsers(Array.isArray(post.likes) ? post.likes : []); }}
                          onMouseOver={(e) => e.currentTarget.style.color = "var(--neon-white)"}
                          onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                          style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "0.9rem", cursor: "pointer", transition: "color 0.2s" }}
                        >
                          <span style={{ cursor: "pointer" }}>❤️</span> <span style={{ cursor: "pointer", transition: "all 0.2s ease" }} onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"} onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}>{(post.likes || []).length}</span>
                        </div>
                        {!post.commentsDisabled && !post.disableComments && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); setAdminOpenCommentId(post.id); }}
                            onMouseOver={(e) => e.currentTarget.style.color = "var(--neon-white)"}
                            onMouseOut={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                            style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "0.9rem", cursor: "pointer", transition: "color 0.2s" }}
                          >
                            <span style={{ cursor: "pointer" }}>💬</span> <span style={{ cursor: "pointer", transition: "all 0.2s ease" }} onMouseOver={(e) => e.currentTarget.style.textDecoration = "underline"} onMouseOut={(e) => e.currentTarget.style.textDecoration = "none"}>{(post.comments?.length || 0) + (post.comments?.reduce((acc: number, c: any) => acc + (c.replies?.length || 0), 0) || 0)}</span>
                          </div>
                        )}
                      </div>

                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

{activeTab === "penalty" && (
        <div style={{ maxWidth: "1000px", margin: "0 auto 40px" }}>
          <h2 className="section-title" style={{ color: "orange", textShadow: "0 0 10px rgba(255,165,0,0.5)" }}>Penalty Zone</h2>
          
          <h3 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>Penalized Users</h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
            <div style={{ flex: "1 1 300px", background: "rgba(0,0,0,0.5)", padding: "15px", borderRadius: "8px", borderTop: "3px solid orange" }}>
              <h4 style={{ color: "orange", marginBottom: "10px" }}>Active Penalties</h4>
              {Object.keys(penalties).length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No active penalties.</p> : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
                  {Object.entries(penalties)
                    .filter(([u]) => u.length === 36)
                    .map(([u, expiry]: [string, any]) => {
                    let uName = posts.find(p => p.authorId === u)?.name;
                    if (!uName) {
                      try {
                        const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
                        const match = accounts.find((a: any) => a.id === u);
                        if (match) uName = match.firstName + " " + (match.lastName || "");
                      } catch(e) {}
                    }
                    uName = uName || u;
                    
                    return (
                    <li key={u} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem", color: "var(--neon-white)", background: isHighlightMatch(u) ? "transparent" : "transparent", padding: "5px", borderRadius: "4px", transition: "background 0.3s" }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>⏳ {uName}</span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Time Left: <LiveTimer expiry={expiry} /></span>
                      </div>
                      <button onClick={() => { handleRemovePenalty(u); setHighlightUser(null); }} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.3)", color: "var(--neon-white)", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", transition: "all 0.2s" }}
                        onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,165,0,0.2)"; e.currentTarget.style.borderColor = "orange"; e.currentTarget.style.color = "orange"; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "var(--neon-white)"; }}
                      >Lift</button>
                    </li>
                  );
                  })}
                </ul>
              )}
            </div>
          </div>

          <h3 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>Hidden Posts (Timeouts)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {hiddenPenaltyPosts.map(post => (
              <div key={post.id} className="card" style={{ borderLeft: "4px solid orange", padding: "20px", background: "rgba(255,165,0,0.05)", opacity: 0.8 }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "15px", position: "relative" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ minWidth: "50px", minHeight: "50px", width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", overflow: "hidden", border: `2px solid ${(() => {
      const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
      const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
      return (postAcc?.team && postAcc.team !== 'none') ? postAcc.team : (post.team && post.team !== 'none' ? post.team : 'transparent');
    })()}` }}>
                        {(post.avatar && post.avatar.length > 10) ? <img src={post.avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : post.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"}
                      </div>
                      <div style={{ position: "absolute", bottom: "-2px", right: "-4px", fontSize: "1.1rem", background: "var(--bg-main)", borderRadius: "50%", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                        {(() => {
    const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
    const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
    const postRole = (post.name === 'Anonymous' || post.name === 'Anonymous Heartist' || post.author === 'Anonymous' || post.author === 'Anonymous Heartist') ? 'anonymous' : (postAcc?.badge || post.role || "Heartist");
    return getRoleIcon(postRole);
  })()}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <h3 style={{ fontSize: "1.1rem", fontFamily: "var(--font-outfit)", color: "var(--neon-white)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {post.name}
                      </h3>
                      {post.isAnonymous && <div style={{ fontSize: "0.85rem", color: "#FF4444", fontWeight: "bold" }}>(Real: {post.realName})</div>}
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{formatTimeAgo(post.id, post.timestamp)}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--neon-gold)" }}>Username: {post.username}</div>
                    </div>
                  </div>

                <div 
                  onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                  style={{ position: "absolute", top: "15px", right: "15px", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold", padding: "5px 10px", color: "var(--text-muted)", letterSpacing: "2px" }}
                >
                  ...
                </div>

                {openMenuId === post.id && (
                  <div style={{ position: "absolute", top: "50px", right: "20px", background: "rgba(10,10,10,0.95)", border: "1px solid transparent", borderRadius: "8px", padding: "10px 0", zIndex: 10, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", minWidth: "150px", display: "flex", flexDirection: "column" }}>
                        {!isPostByAdmin(post) && (
                          <div 
                            onClick={() => { setOpenMenuId(null); setSelectedUser(post); }}
                            style={{ padding: "10px 15px", color: "var(--neon-yellow)", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s" }}
                            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            Moderate User
                          </div>
                        )}
                        <div 
                          onClick={() => { setOpenMenuId(null); setPostToDelete(post); }}
                          style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          Delete Post
                        </div>
                      </div>
                )}
                
                <p style={{ margin: "0 0 15px 0", lineHeight: "1.6", color: "var(--neon-white)", fontSize: "0.95rem", textAlign: "center" }}>
                    {renderWithMentions(post.content)}
                  </p>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px", width: "100%" }}>
                      <div style={{ display: "flex", gap: "15px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button 
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "20px",
                              padding: "6px 16px",
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "default",
                              fontSize: "0.95rem",
                              fontFamily: "var(--font-outfit)",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <span style={{ fontSize: "1.2rem", filter: "none" }}>
                              🤍
                            </span>
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setReactionModalPost(post.id);
                              }}
                              style={{ cursor: "pointer", display: "flex", alignItems: "center", lineHeight: 1, marginTop: "1px", gap: "8px", fontWeight: "500", transition: "color 0.2s" }}
                              onMouseOver={(e) => { e.currentTarget.style.color = "var(--neon-white)"; }}
                              onMouseOut={(e) => { e.currentTarget.style.color = "inherit"; }}
                            >
                              {post.likesCount || 0} 
                            </span>
                          </button>

                          {!post.commentsDisabled && !post.disableComments && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminOpenCommentId(adminOpenCommentId === post.id ? null : post.id);
                              }}
                              style={{
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "20px",
                                padding: "6px 16px",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                fontSize: "0.95rem",
                                fontFamily: "var(--font-outfit)",
                                transition: "all 0.2s ease"
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                e.currentTarget.style.color = "var(--neon-white)";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                e.currentTarget.style.color = "var(--text-muted)";
                              }}
                            >
                              <span style={{ fontSize: "1.2rem" }}>💬</span>
                              <span style={{ fontWeight: "500" }}>{post.comments?.length + (post.comments?.reduce((acc: number, c: any) => acc + (c.replies?.length || 0), 0) || 0) || 0}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
              </div>
            ))}
            {hiddenPenaltyPosts.length === 0 && <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No hidden penalized posts.</p>}
          </div>
        </div>
      )}

      {activeTab === "block" && (
        <div style={{ maxWidth: "1000px", margin: "0 auto 40px" }}>
          <h2 className="section-title" style={{ color: "#FF4444", textShadow: "0 0 10px rgba(255,68,68,0.5)" }}>Block Zone</h2>
          
          <h3 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>Blocked Users</h3>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "40px" }}>
            <div style={{ flex: "1 1 300px", background: "rgba(0,0,0,0.5)", padding: "15px", borderRadius: "8px", borderTop: "3px solid #FF4444" }}>
              <h4 style={{ color: "#FF4444", marginBottom: "10px" }}>Blocked Users</h4>
              {blockedUsers.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>No blocked users.</p> : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "5px" }}>
                  {blockedUsers.map(bu => (
                    <li key={bu} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem", color: "var(--neon-white)", background: isHighlightMatch(bu) ? "transparent" : "transparent", padding: "5px", borderRadius: "4px", transition: "background 0.3s" }}>
                      <span>🚫 {bu}</span>
                      <button onClick={() => { handleUnblockUser(bu); setHighlightUser(null); }} style={{ background: "transparent", border: "1px solid transparent", color: "var(--text-muted)", padding: "2px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}>Unblock</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <h3 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>Hidden Posts (Blocked)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {hiddenBlockedPosts.map(post => (
              <div key={post.id} className="card" style={{ borderLeft: "4px solid #FF4444", padding: "20px", background: "rgba(255,0,0,0.05)", opacity: 0.8 }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "15px", position: "relative" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ minWidth: "50px", minHeight: "50px", width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", overflow: "hidden", border: `2px solid ${(() => {
      const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
      const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
      return (postAcc?.team && postAcc.team !== 'none') ? postAcc.team : (post.team && post.team !== 'none' ? post.team : 'transparent');
    })()}` }}>
                        {(post.avatar && post.avatar.length > 10) ? <img src={post.avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : post.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"}
                      </div>
                      <div style={{ position: "absolute", bottom: "-2px", right: "-4px", fontSize: "1.1rem", background: "var(--bg-main)", borderRadius: "50%", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                        {(() => {
    const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
    const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
    const postRole = postAcc?.badge || post.role || "Heartist";
    return getRoleIcon(postRole);
  })()}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <h3 style={{ fontSize: "1.1rem", fontFamily: "var(--font-outfit)", color: "var(--neon-white)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {post.name}
                      </h3>
                      {post.isAnonymous && <div style={{ fontSize: "0.85rem", color: "#FF4444", fontWeight: "bold" }}>(Real: {post.realName})</div>}
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{formatTimeAgo(post.id, post.timestamp)}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--neon-gold)" }}>Username: {post.username}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                    <button onClick={() => setPostToDelete(post)} style={{ background: "rgba(255,0,0,0.1)", border: "1px solid #FF4444", color: "#FF4444", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                      Delete Post
                    </button>
                  </div>
                
                <p style={{ margin: "0 0 15px 0", lineHeight: "1.6", color: "var(--neon-white)", fontSize: "0.95rem", textAlign: "center" }}>
                    {renderWithMentions(post.content)}
                  </p>
              </div>
            ))}
            {hiddenBlockedPosts.length === 0 && <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No hidden blocked posts.</p>}
          </div>
        </div>
      )}

      {activeTab === "warning" && (
        <div style={{ maxWidth: "1000px", margin: "0 auto 40px" }}>
          <h2 className="section-title" style={{ color: "#FF9900", textShadow: "0 0 10px rgba(255,153,0,0.5)" }}>Warning Zone</h2>
          
          <h3 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>Warned Posts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {warningPosts.map(post => {
              const targetUid = getTargetUserId(post);
              const strikes = warningCounts[targetUid] || 0;
              return (
              <div key={post.id} className="card" style={{ borderLeft: "4px solid #FF9900", padding: "20px", background: "rgba(255,153,0,0.05)", opacity: 0.9, position: "relative" }}>
                {showEditHistory[post.id] && (
                  <div style={{ marginBottom: "15px", padding: "12px 15px", background: "rgba(255,255,255,0.03)", borderLeft: "3px solid var(--text-muted)", borderRadius: "0 6px 6px 0", animation: "fadeIn 0.2s ease", textAlign: "left" }}>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", color: "var(--neon-white)", display: "flex", alignItems: "center", gap: "6px" }}>
                      Original Text
                    </div>
                    {(!post.editHistory || post.editHistory.length === 0) ? (
                      <div style={{ color: "var(--text-muted)", fontSize: "0.9rem", fontStyle: "italic", marginBottom: "5px" }}>
                        No edit history available for this post (edited before history tracking).
                      </div>
                    ) : (
                      post.editHistory.map((entry: any, idx: number) => (
                        <div key={idx} style={{ color: "var(--text-muted)", fontSize: "0.9rem", whiteSpace: "pre-wrap", fontStyle: "italic", marginBottom: "5px" }}>
                          <strong>Edited {idx + 1}:</strong> "{typeof entry === 'string' && entry.startsWith('{') ? JSON.parse(entry).content : (entry.content || entry)}"
                        </div>
                      ))
                    )}
                  </div>
                )}
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "15px", position: "relative" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ minWidth: "50px", minHeight: "50px", width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", overflow: "hidden", border: `2px solid ${(() => {
      const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
      const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
      return (postAcc?.team && postAcc.team !== 'none') ? postAcc.team : (post.team && post.team !== 'none' ? post.team : 'transparent');
    })()}` }}>
                        {(post.avatar && post.avatar.length > 10) ? <img src={post.avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : post.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"}
                      </div>
                      <div style={{ position: "absolute", bottom: "-2px", right: "-4px", fontSize: "1.1rem", background: "var(--bg-main)", borderRadius: "50%", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                        {(() => {
    const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
    const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
    const postRole = postAcc?.badge || post.role || "Heartist";
    return getRoleIcon(postRole);
  })()}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      <h3 style={{ fontSize: "1.1rem", fontFamily: "var(--font-outfit)", color: "var(--neon-white)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {post.name}
                      </h3>
                      {post.isAnonymous && <div style={{ fontSize: "0.85rem", color: "#FF4444", fontWeight: "bold" }}>(Real: {post.realName})</div>}
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{formatTimeAgo(post.id, post.timestamp)}</div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--neon-gold)" }}>Username: {post.username}</div>
                    </div>
                  </div>

                <div 
                  onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                  style={{ position: "absolute", top: "15px", right: "15px", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold", padding: "5px 10px", color: "var(--text-muted)", letterSpacing: "2px" }}
                >
                  ...
                </div>

                {openMenuId === post.id && (
                  <div style={{ position: "absolute", top: "50px", right: "20px", background: "rgba(10,10,10,0.95)", border: "1px solid transparent", borderRadius: "8px", padding: "10px 0", zIndex: 10, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", minWidth: "200px", display: "flex", flexDirection: "column" }}>
                        <div 
                          onClick={() => { closeMenu(post.id); handleClearWarning(post.id); }}
                          style={{ padding: "10px 15px", color: "#FF9900", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s" }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          Lift Warning
                        </div>
                        {strikes >= 3 && (
                          <div 
                            onClick={() => { setOpenMenuId(null); setSelectedUser(post); }}
                            style={{ padding: "10px 15px", color: "orange", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", fontWeight: "bold" }}
                            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            Escalate (Penalty/Block)
                          </div>
                        )}
                        <div 
                          onClick={() => { setOpenMenuId(null); setPostToDelete(post); }}
                          style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          Delete Post
                        </div>
                      </div>
                )}
                
                {post.isEdited && (
                  <div 
                    onClick={() => toggleShowEditHistory(post.id)}
                    style={{ position: "absolute", top: "15px", right: "35px", fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer", fontStyle: "italic", padding: "2px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", transition: "all 0.2s", zIndex: 20 }}
                    onMouseOver={(e) => { e.currentTarget.style.color = "var(--neon-white)"; e.currentTarget.style.border = "1px solid var(--neon-white)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; }}
                  >
                    {showEditHistory[post.id] ? "(Hide Original)" : `(Edited ${post.editCount || 1}x)`}
                  </div>
                )}
                
                <p style={{ margin: "0 0 15px 0", lineHeight: "1.6", color: "var(--neon-white)", fontSize: "0.95rem", whiteSpace: "pre-wrap", textAlign: "center" }}>
                      {post.content.length > 100 && !expandedPosts.includes(post.id) ? (
                        <>
                          {renderWithMentions(post.content.substring(0, 100))}
                          <span 
                            onClick={() => setExpandedPosts(prev => [...prev, post.id])}
                            style={{ color: "var(--neon-yellow)", fontWeight: "bold", cursor: "pointer", marginLeft: "5px", fontSize: "0.95rem" }}
                          >
                            See more
                          </span>
                        </>
                      ) : (
                        <>
                          {renderWithMentions(post.content)}
                          {post.content.length > 100 && (
                            <span 
                              onClick={() => setExpandedPosts(prev => prev.filter(id => id !== post.id))}
                              style={{ color: "var(--neon-yellow)", fontWeight: "bold", cursor: "pointer", display: "block", marginTop: "8px", fontSize: "0.9rem" }}
                            >
                              See less
                            </span>
                          )}
                        </>
                      )}
                </p>
                
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "15px", gap: "15px", width: "100%" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div 
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: "20px",
                          padding: "6px 16px",
                          color: "var(--text-muted)",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontFamily: "var(--font-outfit)",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <span style={{ fontSize: "1.2rem", filter: "none", transform: "scale(1)", transition: "transform 0.3s, opacity 0.2s" }}>
                          {post.category === "Prayer Request" ? "🙏" : "🤍"}
                        </span>
                        <span>{post.likes ? post.likes.length : 0}</span>
                      </div>
                      
                      {!post.commentsDisabled && !post.disableComments && (
                        <button 
                          onClick={() => setAdminOpenCommentId(post.id)}
                          style={{
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "20px",
                            padding: "6px 16px",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "0.95rem",
                            transition: "all 0.2s ease"
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; e.currentTarget.style.color = "white"; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                        >
                          <span style={{ fontSize: "1.2rem" }}>💬</span>
                          <span>{(post.comments?.length || 0) + (post.comments?.reduce((acc: number, c: any) => acc + (c.replies?.length || 0), 0) || 0)}</span>
                        </button>
                      )}
                    </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      )}

      {/* Appeals Zone */}
      {activeTab === "appeals" && (
        <section style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h2 className="section-title" style={{ margin: 0, color: "var(--neon-blue)", textShadow: "0 0 10px rgba(0,195,255,0.5)" }}>Appeals Zone</h2>
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "block", marginTop: "5px" }}>Review user appeals for blocks and penalties</span>
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {appeals.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <span style={{ fontSize: "3rem", display: "block", marginBottom: "15px", opacity: 0.5 }}>⚖️</span>
                <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>No active appeals found.</p>
              </div>
            ) : (
              appeals.map((appeal) => (
                <div key={appeal.id} style={{ background: "rgba(0,195,255,0.05)", border: "1px solid rgba(0,195,255,0.2)", borderRadius: "16px", padding: "20px", position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "15px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                        👤
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: "bold", color: "var(--neon-white)", fontSize: "1.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{appeal.user}</span>
                        <span style={{ color: "var(--neon-blue)", fontSize: "0.85rem", fontWeight: "bold" }}>Appeal Type: {appeal.type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "15px" }}>
                    <p style={{ margin: 0, color: "var(--text-main)", fontSize: "0.95rem", fontStyle: "italic", whiteSpace: "pre-wrap" }}>"{appeal.reason}"</p>
                  </div>
                  
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button 
                      onClick={async () => {
                        try {
                          const { deleteAppeal } = await import("@/lib/moderationSync");
                          if (appeal.id) await deleteAppeal(String(appeal.id));
                        } catch(e) { console.error(e); }
                        const newAppeals = appeals.filter(a => a.id !== appeal.id);
                        setAppeals(newAppeals);
                      }}
                      style={{ background: "transparent", border: "1px solid transparent", color: "var(--text-muted)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}
                    >
                      Dismiss
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (appeal.type === "Block") {
                          setActiveTab("block");
                          setHighlightUser(appeal.user);
                        } else {
                          setActiveTab("penalty");
                          setHighlightUser(appeal.user);
                        }
                      }}
                      style={{ background: "rgba(0,195,255,0.1)", border: "1px solid var(--neon-blue)", color: "var(--neon-blue)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "bold" }}
                    >
                      Locate in {appeal.type === "Block" ? "Block Zone" : "Penalty Zone"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Reported Zone */}
      {activeTab === "reported" && (
        <section style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
            <div>
              <h2 className="section-title" style={{ margin: 0, color: "#8A2BE2", textShadow: "0 0 10px rgba(138,43,226,0.5)" }}>Reported Zone</h2>
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem", display: "block", marginTop: "5px" }}>Review posts reported by users</span>
            </div>
            
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {["All", "Posts", "Photos", "Videos", "Comments"].map(f => (
                <button 
                  key={f}
                  onClick={() => setReportFilter(f)}
                  style={{ 
                    position: "relative",
                    padding: "6px 15px", 
                    borderRadius: "20px", 
                    border: reportFilter === f ? "2px solid #8A2BE2" : (f === "Comments" && reportedCommentsRaw.length > 0 ? "1px solid #FF4444" : "1px solid transparent"), 
                    background: reportFilter === f ? "rgba(138,43,226,0.1)" : "transparent", 
                    color: reportFilter === f ? "#FFF" : (f === "Comments" && reportedCommentsRaw.length > 0 ? "#FF4444" : "var(--text-muted)"), 
                    cursor: "pointer",
                    fontFamily: "var(--font-outfit)",
                    fontWeight: "bold",
                    fontSize: "0.85rem",
                    transition: "all 0.3s ease"
                  }}
                >
                  {f}
                  {f === "Comments" && reportedCommentsRaw.length > 0 && (
                    <span style={{ position: "absolute", top: "-5px", right: "-5px", background: "#FF4444", color: "white", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: "bold" }}>
                      {reportedCommentsRaw.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {filteredReportedPosts.length === 0 && reportedCommentsRaw.length === 0 && reportFilter === "All" && (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", border: "1px dashed transparent", borderRadius: "12px" }}>
                No reported items found. All clear!
              </div>
            )}
            
            {reportFilter !== "Comments" && (
              filteredReportedPosts.length === 0 && reportFilter !== "All" ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", border: "1px dashed transparent", borderRadius: "12px" }}>
                  No reported posts found for "{reportFilter}". All clear!
                </div>
              ) : (
                filteredReportedPosts.map(post => (
                  <div key={post.id} className="card" style={{ borderLeft: "4px solid #8A2BE2", padding: "20px", background: "rgba(138,43,226,0.05)" }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "15px", position: "relative" }}>
                        <div style={{ minWidth: "50px", minHeight: "50px", flexShrink: 0, width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", overflow: "hidden", border: `2px solid ${(() => {
      const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
      const postAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === post.name || a.firstName === post.name || a.firstName === post.authorId);
      return (postAcc?.team && postAcc.team !== 'none') ? postAcc.team : (post.team && post.team !== 'none' ? post.team : 'transparent');
    })()}` }}>
                          {(post.avatar && post.avatar.length > 10) ? <img src={post.avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : post.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <h3 style={{ fontSize: "1.1rem", fontFamily: "var(--font-outfit)", color: "var(--neon-white)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {post.name}
                          </h3>
                          {post.isAnonymous && <div style={{ fontSize: "0.85rem", color: "#FF4444", fontWeight: "bold" }}>(Real: {post.realName})</div>}
                          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{formatTimeAgo(post.id, post.timestamp)}</div>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--neon-gold)" }}>Username: {post.username}</div>
                        </div>
                      </div>

                <div 
                  onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)}
                  style={{ position: "absolute", top: "15px", right: "15px", cursor: "pointer", fontSize: "1.2rem", fontWeight: "bold", padding: "5px 10px", color: "var(--text-muted)", letterSpacing: "2px" }}
                >
                  ...
                </div>

                {openMenuId === post.id && (
                  <div style={{ position: "absolute", top: "50px", right: "20px", background: "rgba(10,10,10,0.95)", border: "1px solid transparent", borderRadius: "8px", padding: "10px 0", zIndex: 10, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", minWidth: "150px", display: "flex", flexDirection: "column" }}>
                            <div 
                              onClick={() => { closeMenu(post.id); handleDismissReport(post.id); }}
                              style={{ padding: "10px 15px", color: "var(--neon-white)", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s" }}
                              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              Dismiss Report
                            </div>
                            {!isPostByAdmin(post) && (
                              <div 
                                onClick={() => { setOpenMenuId(null); setSelectedUser(post); }}
                                style={{ padding: "10px 15px", color: "var(--neon-yellow)", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                                onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                Moderate User
                              </div>
                            )}
                            <div 
                              onClick={() => { setOpenMenuId(null); setPostToDelete(post); }}
                              style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              Delete Post
                            </div>
                          </div>
                )}
                    <div style={{ marginTop: "15px", padding: "10px 15px", background: "rgba(255,68,68,0.1)", borderLeft: "3px solid #ff4444", borderRadius: "0 8px 8px 0" }}>
                      <span style={{ color: "#ff4444", fontWeight: "bold", fontSize: "0.9rem" }}>Reported by: </span>
                      <span style={{ color: "var(--neon-white)", fontSize: "0.9rem", fontWeight: "500" }}>{post.reporterName}</span>
                    </div>
                    <p style={{ margin: "0", fontSize: "1rem", lineHeight: "1.5", whiteSpace: "pre-wrap", textAlign: "center", width: "100%", marginTop: "15px" }}>
                      &quot;{renderWithMentions(post.content)}&quot;
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "15px", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "15px", width: "100%" }}>
                      <div style={{ display: "flex", gap: "15px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {(() => {
                            const activeAdmin = typeof window !== 'undefined' ? localStorage.getItem("activeAdmin") || "Admin" : "Admin";
                            const savedActiveUser = typeof window !== 'undefined' ? localStorage.getItem("activeUser") : null;
                            const parsedUser = savedActiveUser ? JSON.parse(savedActiveUser) : null;
                            const uName = parsedUser ? `${parsedUser.firstName} ${parsedUser.lastName}` : activeAdmin;
                            const likesArr = Array.isArray(post.likes) ? post.likes : (Array.isArray(post.likedBy) ? post.likedBy : []);
                            const hasLiked = likesArr.includes(uName);
                            return (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleLikePost(post.id); }}
                                style={{
                                  background: hasLiked ? "rgba(255, 234, 0, 0.1)" : "rgba(255, 255, 255, 0.05)",
                                  border: hasLiked ? "1px solid var(--neon-yellow)" : "1px solid rgba(255, 255, 255, 0.1)",
                                  borderRadius: "20px",
                                  padding: "6px 16px",
                                  color: hasLiked ? "var(--neon-yellow)" : "var(--text-muted)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  fontSize: "0.95rem",
                                  fontFamily: "var(--font-outfit)",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                <span style={{ fontSize: "1.2rem", filter: "none" }}>
                                  {hasLiked ? "💛" : "🤍"}
                                </span>
                                <span 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReactionModalPost(post.id);
                                  }}
                                  style={{ cursor: "pointer", display: "flex", alignItems: "center", lineHeight: 1, marginTop: "1px", gap: "8px", fontWeight: "500", transition: "color 0.2s" }}
                                  onMouseOver={(e) => { e.currentTarget.style.color = "var(--neon-white)"; }}
                                  onMouseOut={(e) => { e.currentTarget.style.color = "inherit"; }}
                                >
                                  {post.likesCount || 0} 
                                </span>
                              </button>
                            );
                          })()}

                          {!post.commentsDisabled && !post.disableComments && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setAdminOpenCommentId(adminOpenCommentId === post.id ? null : post.id);
                              }}
                              style={{
                                background: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                borderRadius: "20px",
                                padding: "6px 16px",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                fontSize: "0.95rem",
                                fontFamily: "var(--font-outfit)",
                                transition: "all 0.2s ease"
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                                e.currentTarget.style.color = "var(--neon-white)";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                                e.currentTarget.style.color = "var(--text-muted)";
                              }}
                            >
                              <span style={{ fontSize: "1.2rem" }}>💬</span>
                              <span style={{ fontWeight: "500" }}>{post.comments?.length + (post.comments?.reduce((acc: number, c: any) => acc + (c.replies?.length || 0), 0) || 0) || 0}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {(reportFilter === "Comments" || reportFilter === "All") && (
              reportedCommentsRaw.length === 0 && reportFilter === "Comments" ? (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", border: "1px dashed transparent", borderRadius: "12px" }}>
                  No reported comments found. All clear!
                </div>
              ) : (
                reportedCommentsRaw.map((rc, idx) => {
                  const item = rc.reply || rc.comment;
                  const itemType = rc.reply ? "Reply" : "Comment";
                  
                  return (
                    <div key={`${item.id}-${idx}`} className="card" style={{ borderLeft: "4px solid #8A2BE2", padding: "20px", background: "rgba(138,43,226,0.05)", position: "relative" }}>
                      <div style={{ position: "absolute", top: "15px", right: "15px", zIndex: 5 }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `rc-${item.id}` ? null : `rc-${item.id}`); }}
                          style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", display: "flex", flexDirection: "column", gap: "3px", padding: "5px" }}
                        >
                          <div style={{ width: "4px", height: "4px", background: "currentColor", borderRadius: "50%" }}></div>
                          <div style={{ width: "4px", height: "4px", background: "currentColor", borderRadius: "50%" }}></div>
                          <div style={{ width: "4px", height: "4px", background: "currentColor", borderRadius: "50%" }}></div>
                        </button>
                        {openMenuId === `rc-${item.id}` && (
                          <div style={{ position: "absolute", top: "100%", right: 0, background: "rgba(10,10,10,0.95)", border: "1px solid transparent", borderRadius: "8px", padding: "10px 0", zIndex: 10, boxShadow: "0 5px 15px rgba(0,0,0,0.5)", minWidth: "160px", display: "flex", flexDirection: "column" }}>
                            <div 
                              onClick={() => { setAdminOpenCommentId(rc.post.id); setOpenMenuId(null); }}
                              style={{ padding: "10px 15px", color: "white", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s" }}
                              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <span style={{ marginRight: "8px" }}></span> View Comment
                            </div>
                            <div 
                              onClick={() => { handleDismissReport(item.id); setOpenMenuId(null); }}
                              style={{ padding: "10px 15px", color: "white", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              Dismiss Report
                            </div>
                            <div 
                              onClick={() => { adminDeleteComment(rc.post.id, rc.comment.id, rc.reply?.id); setOpenMenuId(null); }}
                              style={{ padding: "10px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.9rem", transition: "background 0.2s", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                              onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              Delete {itemType}
                            </div>
                          </div>
                        )}
                      </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px solid ${item.team && item.team !== 'none' ? item.team : 'transparent'}` }}>
                          {(item.author === 'Anonymous' || item.author === 'Anonymous Heartist' || item.name === 'Anonymous' || item.name === 'Anonymous Heartist') ? <span style={{fontSize: "1rem"}}>👤</span> : (item.avatar && item.avatar.length > 10) ? <img src={item.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{fontSize: "1rem"}}>{item.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"}</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontWeight: "bold", color: "var(--neon-white)", fontSize: "0.95rem" }}>{item.author}</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{itemType} on {rc.post.name}'s post</span>
                        </div>
                      </div>

                      <div style={{ padding: "10px 15px", background: "rgba(255,68,68,0.1)", borderLeft: "3px solid #ff4444", borderRadius: "0 8px 8px 0", marginBottom: "15px", marginRight: "30px" }}>
                        <span style={{ color: "#ff4444", fontWeight: "bold", fontSize: "0.9rem" }}>Reported by: </span>
                        <span style={{ color: "var(--neon-white)", fontSize: "0.9rem", fontWeight: "500" }}>{rc.reporterName}</span>
                      </div>

                      <div style={{ background: "rgba(0,0,0,0.3)", padding: "15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <p style={{ margin: 0, color: "var(--text-main)", fontSize: "0.95rem", fontStyle: "italic", whiteSpace: "pre-wrap" }}>"{item.content}"</p>
                      </div>
                      {item.editHistory && (
                        <div style={{ marginTop: "10px", padding: "10px", background: "rgba(0,0,0,0.5)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.8rem" }}>
                          <div style={{ color: "var(--neon-yellow)", marginBottom: "5px", fontWeight: "bold" }}>Edit History:</div>
                          {item.editHistory.map((entry: any, idx: number) => (
                            <div key={idx} style={{ color: "var(--text-muted)", marginBottom: "4px", paddingBottom: "4px", borderBottom: idx < item.editHistory.length - 1 ? "1px dashed rgba(255,255,255,0.1)" : "none" }}>
                              <strong>V{idx + 1}:</strong> {typeof entry === 'string' && entry.startsWith('{') ? JSON.parse(entry).content : (entry.content || entry)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}
          </div>
        </section>
      )}

      {/* Moderation Modal */}
      {selectedUser && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-main)", width: "100%", maxWidth: "400px", borderTop: "3px solid var(--neon-yellow)", maxHeight: "80vh", padding: "15px" }}>
            <div style={{ position: "relative", marginBottom: "15px", flexShrink: 0, paddingRight: "30px" }}>
              <h3 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", margin: 0, fontSize: "1.2rem" }}>Moderate User</h3>
              <button onClick={() => setSelectedUser(null)} style={{ position: "absolute", right: "-5px", top: "-5px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "2rem", lineHeight: "1", padding: 0 }}>&times;</button>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "5px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "15px" }}>
                Taking action against: <strong style={{ color: "var(--neon-yellow)" }}>{selectedUser.username}</strong> ({selectedUser.realName})
              </p>

              {(() => {
                const targetUid = getTargetUserId(selectedUser);
                const strikes = warningCounts[targetUid] || 0;
                const pStrikes = penaltyCounts[targetUid] || 0;
                return (
                  <div style={{ 
                    marginBottom: "15px", 
                    padding: "12px", 
                    borderRadius: "8px", 
                    background: strikes >= 3 ? "rgba(255,68,68,0.1)" : "rgba(255,255,255,0.05)", 
                    border: strikes >= 3 ? "1px solid #FF4444" : "1px solid transparent",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "8px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Total Warnings</span>
                      <span style={{ color: strikes >= 3 ? "#FF4444" : "var(--neon-yellow)", fontWeight: "bold", fontSize: "1.2rem" }}>{strikes}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Total Penalties</span>
                      <span style={{ color: pStrikes >= 3 ? "#FF4444" : "orange", fontWeight: "bold", fontSize: "1.2rem" }}>{pStrikes}</span>
                    </div>
                    
                    {strikes >= 3 && (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid rgba(255,68,68,0.2)", paddingTop: "10px" }}>
                        <span style={{ width: "100%", color: "#FF4444", fontSize: "0.75rem", fontStyle: "italic", marginBottom: "4px" }}>Frequent warnings detected. Select an escalation action:</span>
                        <button onClick={() => setModerateAction("penalty")} style={{ flex: "1 1 120px", padding: "8px", background: "orange", color: "#000", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.8rem", transition: "0.3s" }}>
                          Penalty
                        </button>
                        <button onClick={() => setModerateAction("block")} style={{ flex: "1 1 120px", padding: "8px", background: "#FF4444", color: "#FFF", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "0.8rem", transition: "0.3s" }}>
                          Block
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ marginBottom: "15px", position: "relative" }}>
                <label style={{ display: "block", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "8px" }}>Select Action:</label>
                <div 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.5)", border: "1px solid transparent", color: "white", borderRadius: "8px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}
                >
                  <span>
                    {moderateAction === "warning" ? "Issue a Warning" : moderateAction === "penalty" ? "Apply Timeout Penalty" : moderateAction === "block" ? "Block" : "Select an action"}
                  </span>
                  <span style={{ transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                </div>
                {isDropdownOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#111", border: "1px solid transparent", borderRadius: "8px", marginTop: "5px", zIndex: 10, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
                    <div 
                      onClick={() => { setModerateAction("warning"); setIsDropdownOpen(false); }}
                      style={{ padding: "12px 10px", cursor: "pointer", background: moderateAction === "warning" ? "rgba(255,255,255,0.1)" : "transparent", color: "white", fontSize: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      Issue a Warning
                    </div>
                    <div 
                      onClick={() => { setModerateAction("penalty"); setIsDropdownOpen(false); }}
                      style={{ padding: "12px 10px", cursor: "pointer", background: moderateAction === "penalty" ? "rgba(255,255,255,0.1)" : "transparent", color: "white", fontSize: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      Apply Timeout Penalty
                    </div>
                    <div 
                      onClick={() => { setModerateAction("block"); setIsDropdownOpen(false); }}
                      style={{ padding: "12px 10px", cursor: "pointer", background: moderateAction === "block" ? "rgba(255,255,255,0.1)" : "transparent", color: "white", fontSize: "0.85rem" }}
                    >
                      Block
                    </div>
                  </div>
                )}
              </div>

              {/* Warning Section */}
              {moderateAction === "warning" && (
                <div style={{ marginBottom: "5px" }}>
                  <MentionTextarea 
                    value={warningMessage}
                    onChange={e => setWarningMessage(e.target.value)}
                    placeholder="Type your warning message here..."
                    style={{ width: "100%", minHeight: "100px", background: "rgba(0,0,0,0.5)", border: "1px solid transparent", borderRadius: "8px", color: "white", padding: "10px", outline: "none", resize: "none", marginBottom: "10px", fontSize: "0.85rem" }}
                  />
                  <button onClick={handleWarnUser} style={{ width: "100%", padding: "10px", background: "rgba(255,234,0,0.1)", border: "1px solid var(--neon-yellow)", color: "var(--neon-yellow)", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>
                    Send Warning to Inbox
                  </button>
                </div>
              )}

              {/* Penalty Section */}
              {moderateAction === "penalty" && (
                <div style={{ marginBottom: "5px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "15px" }}>
                    {[
                      { val: "1", label: "1 Minute" },
                      { val: "10", label: "10 Minutes" },
                      { val: "1440", label: "1 Day" },
                      { val: "4320", label: "3 Days" },
                      { val: "43200", label: "1 Month" },
                      { val: "525600", label: "1 Year" },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        onClick={() => setPenaltyDuration(opt.val)}
                        style={{
                          padding: "10px",
                          background: penaltyDuration === opt.val ? "rgba(255,165,0,0.2)" : "rgba(0,0,0,0.3)",
                          border: penaltyDuration === opt.val ? "1px solid orange" : "1px solid rgba(255,255,255,0.1)",
                          color: penaltyDuration === opt.val ? "orange" : "var(--text-muted)",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontFamily: "var(--font-outfit)",
                          fontSize: "0.85rem",
                          fontWeight: penaltyDuration === opt.val ? "bold" : "normal",
                          transition: "all 0.2s"
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleApplyPenalty} style={{ width: "100%", padding: "10px", background: "rgba(255,165,0,0.1)", border: "1px solid orange", color: "orange", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>
                    Apply Penalty
                  </button>
                </div>
              )}

              {/* Block Section */}
              {moderateAction === "block" && (
                <div style={{ marginBottom: "5px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "10px" }}>This will stop the user from posting on the Canvas indefinitely.</p>
                  <button onClick={handleBlockUser} style={{ width: "100%", padding: "10px", background: "rgba(255,0,0,0.1)", border: "1px solid #FF4444", color: "#FF4444", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>
                    Block User
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resolution/Restore Modal */}
      {resolutionTarget && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-main)", width: "100%", maxWidth: "400px", borderTop: `3px solid ${resolutionTarget.type === 'block' ? '#FF4444' : 'orange'}`, padding: "20px" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
              {resolutionTarget.type === 'block' ? "Unblock User" : "Remove Penalty"}
            </h3>
            <p style={{ margin: "0 0 15px 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              You are about to restore <strong>{resolutionTarget.user}</strong>. Send them a message to let them know.
            </p>
            <MentionTextarea 
              value={resolutionMessage}
              onChange={(e) => setResolutionMessage(e.target.value)}
              style={{ width: "100%", minHeight: "100px", background: "rgba(0,0,0,0.5)", border: "1px solid transparent", borderRadius: "8px", color: "white", padding: "10px", outline: "none", resize: "none", marginBottom: "15px", fontSize: "0.85rem" }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setResolutionTarget(null)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid transparent", color: "var(--text-muted)", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}>Cancel</button>
              <button onClick={confirmResolution} style={{ flex: 1, padding: "10px", background: resolutionTarget.type === 'block' ? "#FF4444" : "orange", border: "none", color: resolutionTarget.type === 'block' ? "white" : "black", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}>
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {postToDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-main)", width: "100%", maxWidth: "400px", borderTop: "3px solid #FF4444", maxHeight: "80vh", padding: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexShrink: 0 }}>
              <h3 style={{ color: "#FF4444", fontFamily: "var(--font-outfit)", margin: 0, fontSize: "1.2rem" }}>Delete Post</h3>
              <button onClick={() => { setPostToDelete(null); setDeleteReason(""); }} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "2rem", lineHeight: "1", padding: 0 }}>&times;</button>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "5px" }}>
              <p style={{ color: "var(--neon-white)", fontSize: "0.9rem", marginBottom: "15px" }}>
                Are you sure you want to delete this post by <strong>{postToDelete.realName}</strong>?
              </p>

              <div style={{ background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "8px", borderLeft: "2px solid transparent", marginBottom: "15px", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                &quot;{postToDelete.content}&quot;
              </div>

              <label style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "block", marginBottom: "5px" }}>Notify the user (Reason for deletion):</label>
              <MentionTextarea 
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="e.g. Please refrain from using inappropriate language."
                style={{ width: "100%", height: "60px", background: "rgba(0,0,0,0.5)", border: "1px solid transparent", borderRadius: "8px", color: "white", padding: "8px", outline: "none", resize: "none", marginBottom: "15px", fontSize: "0.85rem" }}
              />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button onClick={() => { setPostToDelete(null); setDeleteReason(""); }} style={{ padding: "8px 15px", background: "transparent", border: "1px solid transparent", color: "white", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>Cancel</button>
                <button onClick={confirmDeletePost} style={{ padding: "8px 15px", background: "#FF4444", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>Delete Post</button>
              </div>
            </div>
          </div>
        </div>
      )}



      
      {/* Reaction Viewer Modal (Users) */}
      {/* Admin Comment Viewer Modal */}
      {adminOpenCommentId && posts.find(p => p.id === adminOpenCommentId) && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 1250,
          display: "flex", justifyContent: "center", alignItems: "center",
          animation: "fadeIn 0.3s ease"
        }} onClick={() => setAdminOpenCommentId(null)}>
          <div style={{
            background: "var(--card-bg)", border: "1px solid rgba(255,234,0,0.3)",
            borderRadius: "16px", width: "90%", maxWidth: "600px", maxHeight: "80vh", padding: "20px",
            animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(255,234,0,0.1)",
            display: "flex", flexDirection: "column"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "var(--neon-white)", display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-outfit)" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg> Comments
              </h3>
              <button onClick={() => setAdminOpenCommentId(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color="white"} onMouseOut={(e) => e.currentTarget.style.color="var(--text-muted)"}>&times;</button>
            </div>
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "15px" }}>
              {(() => {
                const targetPost = posts.find(p => p.id === adminOpenCommentId);
                if (!targetPost?.comments || targetPost.comments.length === 0) {
                  return <p style={{ color: "var(--text-muted)", textAlign: "center", fontStyle: "italic", margin: "20px 0" }}>No comments on this post yet.</p>;
                }
                const accounts = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
                const getRoleIcon = (role: string) => {
                  return <BadgeIcon badge={role} size={15} />;
                };

                const renderAuthorName = (name: string, role: string = "Heartist") => {
                  return (
                    <span style={{ fontWeight: "bold" }}>
                      {name} <span style={{ opacity: 0.7, fontWeight: "normal", fontSize: "0.85em", marginLeft: "4px" }} title={role}>{getRoleIcon(role)}</span>
                    </span>
                  );
                };

                return targetPost.comments.map((comment: any, idx: number) => {
                  const commentAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName}`.trim() === comment.author.trim() || a.firstName === comment.author);
                  const cAvatar = commentAcc?.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                  const cRole = commentAcc?.badge || "First-Timer";
                  const isAnon = comment.author === "Anonymous Heartist";

                  return (
                    <div key={idx} style={{ display: "flex", gap: "12px", alignItems: "flex-start", position: "relative", marginBottom: "15px" }}>

                      {/* Vertical Line from Main Comment Avatar to bottom of replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div style={{ position: "absolute", left: "17px", top: "36px", bottom: "20px", width: "2px", background: "rgba(255,255,255,0.15)", zIndex: 0 }}></div>
                      )}
                      <div style={{ position: "relative", flexShrink: 0, zIndex: 2 }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px solid ${commentAcc?.team && commentAcc.team !== 'none' ? commentAcc.team : (comment.team && comment.team !== 'none' ? comment.team : 'transparent')}` }}>
                          {isAnon ? "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" : ((cAvatar && cAvatar.length > 10) ? <img src={cAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "1rem" }}>{cAvatar}</span>)}
                        </div>
                        <div style={{ position: "absolute", bottom: "-2px", right: "-4px", fontSize: "0.8rem", background: "var(--bg-main)", borderRadius: "50%", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                          {(() => {
      const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
      const commentAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === comment.author || a.firstName === comment.author);
      const cRoleLive = commentAcc?.badge || cRole || "Heartist";
      return getRoleIcon(cRoleLive);
    })()}
                        </div>
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "10px 15px", border: "1px solid rgba(255,255,255,0.05)" }}>
                          <div style={{ display: "flex", flexDirection: "column", marginBottom: "8px", position: "relative" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: "bold" }}>{isAnon ? "Anonymous Heartist" : formatCapitalizedName(comment.author)}</span>
                            </div>
                            
                            <div style={{ position: "absolute", top: 0, right: 0 }}>
                              <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `comment-${comment.id}` ? null : `comment-${comment.id}`); }} style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem", padding: "0 5px", lineHeight: 1 }}>⋮</div>
                              {openMenuId === `comment-${comment.id}` && (
                                <div style={{ position: "absolute", right: 0, top: "25px", background: "rgba(20, 20, 20, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden", zIndex: 10, minWidth: "100px", boxShadow: "0 4px 15px rgba(0,0,0,0.5)" }}>
                                  <div onClick={() => { adminDeleteComment(targetPost.id, comment.id); setOpenMenuId(null); }} style={{ padding: "8px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.85rem" }} onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,68,68,0.1)"; }} onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}>Delete</div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: "1.5", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{renderWithMentions(comment.content)}</div>
                          
                          {showCommentEditHistory[comment.id] && (
                            <div style={{ marginTop: "10px", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", fontSize: "0.8rem", textAlign: "left" }}>
                              <div style={{ color: "var(--neon-yellow)", marginBottom: "5px", fontWeight: "bold" }}>Edit History:</div>
                              {(!comment.editHistory || comment.editHistory.length === 0) ? (
                                <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No edit history available.</div>
                              ) : (
                                comment.editHistory.map((entry: any, hIdx: number) => (
                                  <div key={hIdx} style={{ color: "var(--text-muted)", marginBottom: "4px", paddingBottom: "4px", borderBottom: hIdx < comment.editHistory.length - 1 ? "1px dashed rgba(255,255,255,0.1)" : "none", whiteSpace: "pre-wrap" }}>
                                    <strong>V{hIdx + 1}:</strong> "{typeof entry === 'string' && entry.startsWith('{') ? JSON.parse(entry).content : (entry.content || entry)}"
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                          
                          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "4px", gap: "5px" }}>
                            {comment.isEdited && (
                              <span 
                                onClick={() => toggleShowCommentEditHistory(comment.id)} 
                                style={{ fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer", fontStyle: "italic" }}
                                onMouseOver={(e) => { e.currentTarget.style.color = "var(--neon-white)"; e.currentTarget.style.textDecoration = "underline"; }}
                                onMouseOut={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.textDecoration = "none"; }}
                              >
                                {showCommentEditHistory[comment.id] ? "(Hide Original)" : `(Edited ${comment.editCount || 1}x)`}
                              </span>
                            )}
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatTimeAgo(Date.now(), comment.timestamp)}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", marginTop: "4px", paddingLeft: "10px", paddingRight: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            <span style={{ opacity: 0.7 }}>{comment.likes && comment.likes.length > 0 ? "💛" : "🤍"}</span>
                            {comment.likes && comment.likes.length > 0 && (
                              <span 
                                onClick={() => setReactionModalUsers(comment.likes)}
                                style={{ cursor: "pointer", fontWeight: "bold", color: "var(--text-main)", transition: "color 0.2s" }}
                                onMouseOver={(e) => e.currentTarget.style.color = "var(--neon-white)"}
                                onMouseOut={(e) => e.currentTarget.style.color = "var(--text-main)"}
                              >
                                {comment.likes.length}
                              </span>
                            )}
                          </div>
                        </div>

                        {comment.replies && comment.replies.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px", marginLeft: "-12px", position: "relative" }}>
                            {(() => {
                              const isExpanded = expandedRepliesForComment.includes(comment.id);
                              const visibleReplies = isExpanded ? comment.replies : comment.replies.slice(0, 1);
                              return (
                                <>
                                  {visibleReplies.map((reply: any, ridx: number) => {
                                    const replyAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName}`.trim() === reply.author.trim() || a.firstName === reply.author);
                                    const rAvatar = replyAcc?.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                                    const rRole = replyAcc?.badge || "First-Timer";
                                    const isRAnon = reply.author === "Anonymous Heartist";

                                    return (
                                      <div key={ridx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", position: "relative" }}>
                                        {/* Horizontal Line perfectly connecting to vertical line (at 18px relative to main container) */}
                                        <div style={{ position: "absolute", left: "-18px", top: "16px", width: "18px", height: "2px", background: "rgba(255,255,255,0.15)", zIndex: 0 }}></div>
                                        
                                        <div style={{ position: "relative", flexShrink: 0, zIndex: 2 }}>
                                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontSize: "1.1rem", border: `2px solid ${replyAcc?.team && replyAcc.team !== 'none' ? replyAcc.team : (reply.team && reply.team !== 'none' ? reply.team : 'transparent')}` }}>
                                            {isRAnon ? "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" : ((rAvatar && rAvatar.length > 10) ? <img src={rAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "0.8rem" }}>{rAvatar}</span>)}
                                          </div>
                                          <div style={{ position: "absolute", bottom: "-2px", right: "-4px", fontSize: "0.75rem", background: "var(--bg-main)", borderRadius: "50%", padding: "2px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                                            {(() => {
      const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
      const replyAcc = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === reply.author || a.firstName === reply.author);
      const rRoleLive = replyAcc?.badge || rRole || "Heartist";
      return getRoleIcon(rRoleLive);
    })()}
                                          </div>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ width: "100%", display: "flex", flexDirection: "column", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "10px 15px", borderRadius: "12px", borderTopLeftRadius: "2px", marginBottom: "4px" }}>
                                            <div style={{ display: "flex", flexDirection: "column", marginBottom: "8px", position: "relative" }}>
                                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ fontWeight: "bold" }}>{isRAnon ? "Anonymous Heartist" : formatCapitalizedName(reply.author)}</span>
                                              </div>
                                              
                                              <div style={{ position: "absolute", top: 0, right: 0 }}>
                                                <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `reply-${reply.id}` ? null : `reply-${reply.id}`); }} style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: "1.2rem", padding: "0 5px", lineHeight: 1 }}>⋮</div>
                                                {openMenuId === `reply-${reply.id}` && (
                                                  <div style={{ position: "absolute", right: 0, top: "20px", background: "rgba(20, 20, 20, 0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", overflow: "hidden", zIndex: 10, minWidth: "100px", boxShadow: "0 4px 15px rgba(0,0,0,0.5)" }}>
                                                    <div onClick={() => { adminDeleteComment(targetPost.id, comment.id, reply.id); setOpenMenuId(null); }} style={{ padding: "8px 15px", color: "#FF4444", cursor: "pointer", fontSize: "0.85rem" }} onMouseOver={(e) => { e.currentTarget.style.background = "rgba(255,68,68,0.1)"; }} onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}>Delete</div>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            <div style={{ fontSize: "0.95rem", color: "var(--text-main)", lineHeight: "1.5", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{renderWithMentions(reply.content)}</div>
                                            
                                            {showCommentEditHistory[reply.id] && (
                                              <div style={{ marginTop: "10px", padding: "10px", background: "rgba(0,0,0,0.2)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", fontSize: "0.8rem", textAlign: "left" }}>
                                                <div style={{ color: "var(--neon-yellow)", marginBottom: "5px", fontWeight: "bold" }}>Edit History:</div>
                                                {(!reply.editHistory || reply.editHistory.length === 0) ? (
                                                  <div style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No edit history available.</div>
                                                ) : (
                                                  reply.editHistory.map((entry: any, hIdx: number) => (
                                                    <div key={hIdx} style={{ color: "var(--text-muted)", marginBottom: "4px", paddingBottom: "4px", borderBottom: hIdx < reply.editHistory.length - 1 ? "1px dashed rgba(255,255,255,0.1)" : "none", whiteSpace: "pre-wrap" }}>
                                                      <strong>V{hIdx + 1}:</strong> "{typeof entry === 'string' && entry.startsWith('{') ? JSON.parse(entry).content : (entry.content || entry)}"
                                                    </div>
                                                  ))
                                                )}
                                              </div>
                                            )}
                                            
                                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: "4px", gap: "5px" }}>
                                              {reply.isEdited && (
                                                <span 
                                                  onClick={() => toggleShowCommentEditHistory(reply.id)} 
                                                  style={{ fontSize: "0.75rem", color: "var(--text-muted)", cursor: "pointer", fontStyle: "italic" }}
                                                  onMouseOver={(e) => { e.currentTarget.style.color = "var(--neon-white)"; e.currentTarget.style.textDecoration = "underline"; }}
                                                  onMouseOut={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.textDecoration = "none"; }}
                                                >
                                                  {showCommentEditHistory[reply.id] ? "(Hide Original)" : `(Edited ${reply.editCount || 1}x)`}
                                                </span>
                                              )}
                                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatTimeAgo(Date.now(), reply.timestamp)}</span>
                                            </div>
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", marginTop: "4px", paddingLeft: "10px", paddingRight: "10px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                              <span style={{ opacity: 0.7 }}>{reply.likes && reply.likes.length > 0 ? "💛" : "🤍"}</span>
                                              {reply.likes && reply.likes.length > 0 && (
                                                <span 
                                                  onClick={() => setReactionModalUsers(reply.likes)}
                                                  style={{ cursor: "pointer", fontWeight: "bold", color: "var(--text-main)", transition: "color 0.2s" }}
                                                  onMouseOver={(e) => e.currentTarget.style.color = "var(--neon-white)"}
                                                  onMouseOut={(e) => e.currentTarget.style.color = "var(--text-main)"}
                                                >
                                                  {reply.likes.length}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {comment.replies.length > 1 && (
                                    <div style={{ marginLeft: "55px", marginTop: "5px", marginBottom: "5px" }}>
                                      <button 
                                        onClick={() => toggleReplies(comment.id)}
                                        style={{ 
                                          background: "none", border: "none", color: "var(--neon-white)", 
                                          fontSize: "0.85rem", cursor: "pointer", opacity: 0.7, padding: 0 
                                        }}
                                      >
                                        {isExpanded ? "Hide replies" : `See ${comment.replies.length - 1} more repl${comment.replies.length - 1 > 1 ? 'ies' : 'y'}...`}
                                      </button>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {reactionModalUsers && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 1300,
          display: "flex", justifyContent: "center", alignItems: "center",
          animation: "fadeIn 0.3s ease"
        }} onClick={() => setReactionModalUsers(null)}>
          <div style={{
            background: "var(--card-bg)", border: "1px solid rgba(255,234,0,0.3)",
            borderRadius: "16px", width: "90%", maxWidth: "350px", padding: "20px",
            animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(255,234,0,0.1)"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "var(--neon-white)", display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-outfit)" }}>
                <span style={{ fontSize: "1.2rem" }}>💛</span> Reactions
              </h3>
              <button onClick={() => setReactionModalUsers(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color="white"} onMouseOut={(e) => e.currentTarget.style.color="var(--text-muted)"}>&times;</button>
            </div>
            <div className="custom-scrollbar" style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {(() => {
                if (reactionModalUsers.length > 0) {
                  const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
                  return reactionModalUsers.map((username: string, idx: number) => {
                    const userAcct = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === username || a.firstName === username);
                    const fullName = userAcct ? `${userAcct.firstName} ${userAcct.lastName || ''}`.trim() : username;
                    const avatar = userAcct?.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background="rgba(255,255,255,0.08)"} onMouseOut={(e) => e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", overflow: "hidden", border: `2px solid ${userAcct?.team && userAcct.team !== 'none' ? userAcct.team : 'transparent'}` }}>
                          {(avatar && avatar.length > 10 && (avatar.startsWith('data:image') || avatar.startsWith('http'))) ? <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : <span style={{fontSize:"1rem"}}>{avatar}</span>}
                        </div>
                        <span style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", fontWeight: "500", fontSize: "0.95rem" }}>
                          {fullName}
                        </span>
                      </div>
                    );
                  });
                }
                return <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>No reactions found.</div>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Reaction Viewer Modal (Admin) */}
      {reactionModalPost && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", zIndex: 1300,
          display: "flex", justifyContent: "center", alignItems: "center",
          animation: "fadeIn 0.3s ease"
        }} onClick={() => setReactionModalPost(null)}>
          <div style={{
            background: "var(--card-bg)", border: "1px solid rgba(255,234,0,0.3)",
            borderRadius: "16px", width: "90%", maxWidth: "350px", padding: "20px",
            animation: "slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(255,234,0,0.1)"
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "var(--neon-white)", display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-outfit)" }}>
                <span style={{ fontSize: "1.2rem" }}>💛</span> Reactions
              </h3>
              <button onClick={() => setReactionModalPost(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color="white"} onMouseOut={(e) => e.currentTarget.style.color="var(--text-muted)"}>&times;</button>
            </div>
            <div className="custom-scrollbar" style={{ maxHeight: "250px", overflowY: "auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "10px" }}>
              {(() => {
                const targetPost = posts.find(p => p.id === reactionModalPost);
                const likesArray = Array.isArray(targetPost?.likes) ? targetPost.likes : (Array.isArray(targetPost?.likedBy) ? targetPost.likedBy : []);
                if (likesArray.length > 0) {
                  const accounts = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
                  return likesArray.map((username: string, idx: number) => {
                    const userAcct = accounts.find((a: any) => `${a.firstName} ${a.lastName || ''}`.trim() === username || a.firstName === username);
                    const fullName = userAcct ? `${userAcct.firstName} ${userAcct.lastName || ''}`.trim() : username;
                    const avatar = userAcct?.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                    return (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px", borderRadius: "12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }} onMouseOver={(e) => e.currentTarget.style.background="rgba(255,255,255,0.08)"} onMouseOut={(e) => e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", overflow: "hidden", border: `2px solid ${userAcct?.team && userAcct.team !== 'none' ? userAcct.team : 'transparent'}` }}>
                          {(avatar && avatar.length > 10 && (avatar.startsWith('data:image') || avatar.startsWith('http'))) ? <img src={avatar} alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : <span style={{fontSize:"1rem"}}>{avatar}</span>}
                        </div>
                        <span style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", fontWeight: "500", fontSize: "0.95rem" }}>
                          {fullName}
                        </span>
                      </div>
                    );
                  });
                }
                return <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>No reactions found.</div>;
              })()}
            </div>
          </div>
        </div>
      )}


      <div style={{ textAlign: "center", marginTop: "40px", paddingBottom: "100px" }}>
        <Link href="/admin" className="nav-item" style={{ padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)" }}>
          Back to Admin Dashboard
        </Link>
      </div>
    </main>
  );
}
