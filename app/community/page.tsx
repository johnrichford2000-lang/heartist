"use client";
import { dispatchNotification } from "@/lib/notificationsSync";
import MentionTextarea from "../../components/MentionTextarea";
import { useState, useEffect, useRef } from "react";
import {
  fetchCommunityPosts,
  submitPostToSupabase,
  submitCommentToSupabase,
  submitReplyToSupabase,
  deleteCommentFromSupabase,
  togglePostLike,
  toggleCommentLike,
  toggleReplyLike,
  editCommentInSupabase,
  editPostInSupabase,
} from "@/lib/communitySync";
import { submitPrayerToSupabase, togglePrayerLike } from "@/lib/prayerSync";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/authHelper";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";

const LiveTimer = ({
  expiry,
  onExpire,
}: {
  expiry: number;
  onExpire?: () => void;
}) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = expiry - Date.now();
      if (diff <= 0) {
        setTimeLeft("0s");
        if (onExpire) onExpire();
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
  }, [expiry, onExpire]);
  return (
    <span
      style={{ fontFamily: "monospace", fontSize: "1.2em", fontWeight: "bold" }}
    >
      {timeLeft}
    </span>
  );
};

const IsolatedMentionTextarea = ({
  id,
  clearKey,
  onSubmit,
  placeholder,
  style,
  buttonStyle,
  buttonText,
  avatar,
  isReply = false,
  initialValue = "",
}: any) => {
  const [content, setContent] = useState(initialValue);

  useEffect(() => {
    setContent(initialValue);
  }, [clearKey, initialValue]);

  return (
    <div
      style={
        isReply
          ? {
              display: "flex",
              gap: "10px",
              marginTop: "10px",
              marginLeft: "20px",
            }
          : {
              flexShrink: 0,
              display: "flex",
              gap: "10px",
              marginTop: "10px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "15px",
              zIndex: 10,
              background: "var(--card-bg)",
            }
      }
    >
      {!isReply && (
        <div
          style={{
            width: "35px",
            height: "35px",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            overflow: "hidden",
          }}
        >
          {avatar &&
          typeof avatar === "string" &&
          (avatar.startsWith("data:image") || avatar.startsWith("http")) ? (
            <img
              src={avatar}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
      <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
  )}
        </div>
      )}
      <MentionTextarea
        id={id}
        value={content}
        onChange={(e: any) => setContent(e.target.value)}
        placeholder={placeholder}
        style={style}
        onKeyDown={(e: any) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSubmit(content);
          }
        }}
      />
      <button onClick={() => onSubmit(content)} style={buttonStyle}>
        {buttonText}
      </button>
    </div>
  );
};

const EditPostArea = ({ initialContent, onSave, onCancel, isSaving }: any) => {
  const [localContent, setLocalContent] = useState(initialContent);

  return (
    <div style={{ marginTop: "15px" }}>
      <textarea
        value={localContent}
        onChange={(e) => setLocalContent(e.target.value)}
        style={{
          width: "100%",
          minHeight: "80px",
          background: "rgba(0,0,0,0.5)",
          border: "1px solid var(--neon-yellow)",
          borderRadius: "8px",
          padding: "10px",
          color: "white",
          fontFamily: "inherit",
          resize: "vertical",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: "10px", marginTop: "10px", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{ background: "transparent", border: "1px solid transparent", color: "var(--text-muted)", padding: "6px 15px", borderRadius: "8px", cursor: "pointer", transition: "all 0.2s" }}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(localContent)}
          disabled={isSaving}
          style={{ background: "var(--neon-yellow)", color: "#000", border: "none", padding: "6px 15px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

const EditItemArea = ({ initialContent, onSave, onCancel, isSaving }: any) => {
  const [localContent, setLocalContent] = useState(initialContent);

  return (
    <div style={{ marginTop: "10px" }}>
      <MentionTextarea
        value={localContent}
        onChange={(e: any) => setLocalContent(e.target.value)}
      />
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end",
          marginTop: "10px",
        }}
      >
        <button
          onClick={onCancel}
          style={{
            background: "transparent",
            color: "var(--neon-white)",
            border: "none",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Cancel
        </button>
        <button
          disabled={isSaving}
          onClick={() => onSave(localContent)}
          style={{
            background: "var(--neon-white)",
            color: "#000",
            border: "none",
            padding: "5px 12px",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: isSaving ? "not-allowed" : "pointer",
            fontSize: "0.85rem",
            opacity: isSaving ? 0.5 : 1,
          }}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
};

export default function CanvasPage() {
  const CATEGORIES = [
    {
      id: "General Chat",
      label: "General Chat ⚪",
      color: "var(--neon-white)",
    },
    {
      id: "Prayer Request",
      label: "Prayer Request 🟡",
      color: "var(--neon-yellow)",
    },
  ];

  const INITIAL_POSTS = [
    {
      id: Date.now() - 2 * 60 * 60 * 1000,
      name: "Kuya Khen",
      avatar: "🧑‍🏫",
      role: "Staff / Facilitator",
      category: "General Chat",
      content: "Super excited for our next camp! Are you guys ready?!",
      timestamp:
        new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + " (2 hours ago)",
      liked: false,
      likesCount: 12,
      likes: [
        "Althea",
        "Mark",
        "Sarah",
        "John",
        "Jessica",
        "James",
        "Lily",
        "David",
        "Emma",
        "Daniel",
        "Chloe",
        "Michael",
      ],
      comments: [],
      reports: [],
      isEdited: false,
      realName: "Kuya Khen",
      username: "khen123",
      authorId: "khen123",
      isAnonymous: false,
    },
    {
      id: Date.now() - 5 * 60 * 60 * 1000,
      name: "Ate Sarah",
      avatar: "👩‍💼",
      role: "Staff / Facilitator",
      category: "Announcements",
      content: "Please submit your reflection papers by tonight. God bless!",
      timestamp:
        new Date(Date.now() - 5 * 60 * 60 * 1000).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + " (5 hours ago)",
      liked: false,
      likesCount: 8,
      likes: [
        "Mark",
        "John",
        "Jessica",
        "James",
        "Lily",
        "David",
        "Emma",
        "Daniel",
      ],
      comments: [],
      reports: [],
      isEdited: false,
      realName: "Ate Sarah",
      username: "sarah_staff",
      authorId: "sarah_staff",
      isAnonymous: false,
    },
    {
      id: Date.now() - 24 * 60 * 60 * 1000,
      name: "Anonymous Heartist",
      avatar: <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />,
      role: "Anonymous",
      category: "Prayer Request",
      content: "Please pray for my upcoming board exams...",
      timestamp:
        new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }) + " (1 day ago)",
      liked: true,
      likesCount: 45,
      likes: [],
      comments: [],
      reports: [],
      isEdited: false,
      realName: "Anonymous Heartist",
      username: "anonymous_heartist",
      authorId: "anonymous_heartist",
      isAnonymous: true,
    },
    {
      id: Date.now() - 25 * 60 * 60 * 1000,
      name: "Ate Bea",
      avatar: "👩🏽‍🦰",
      role: "camp-veteran",
      category: "General Chat",
      content:
        "Naalala niyo pa ba nung nadapa ako sa Team Games? Hahaha, the best memories!",
      timestamp: "1 day ago",
      liked: false,
      likesCount: 5,
      likes: [],
      comments: [],
      reports: [],
      isEdited: false,
      realName: "Ate Bea",
      username: "bea_vet",
      authorId: "bea_vet",
      isAnonymous: false,
    },
  ];

  const [posts, setPosts] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [penalties, setPenalties] = useState<Record<string, number>>({});
  const [warnedPosts, setWarnedPosts] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [clearKey, setClearKey] = useState(0);

  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [filterCategory, setFilterCategory] = useState<
    "All" | "Your Posts" | string
  >("All");

  const [editPostId, setEditPostId] = useState<string | number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [userPostToDelete, setUserPostToDelete] = useState<
    string | number | null
  >(null);
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [appealCooldown, setAppealCooldown] = useState<string | number | null>(
    null,
  );

  const [activeUser, setActiveUser] = useState<any>(null);

  const [isBlockedUser, setIsBlockedUser] = useState(false);
  const [penaltyExpiry, setPenaltyExpiry] = useState<number | null>(null);
  const [pendingAppeal, setPendingAppeal] = useState<any>(null);

  const [openItemMenuId, setOpenItemMenuId] = useState<string | number | null>(
    null,
  );
  const [editItem, setEditItem] = useState<any>(null);
  const [editItemContent, setEditItemContent] = useState("");
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const isSelf = (authorName: string) => {
    if (!activeUser) return false;
    const fullName =
      `${(activeUser?.firstName || "")} ${activeUser.lastName || ""}`.trim();
    return (
      (activeUser?.firstName || "") === authorName ||
      fullName === authorName ||
      activeUser.id === authorName
    );
  };

  const isPostAuthor = (post: any) => {
    if (!activeUser || !post) return false;
    const fullName = `${(activeUser?.firstName || "")} ${activeUser.lastName || ""}`.trim();
    if (activeUser.id && (String(post.authorId) === String(activeUser.id) || String(post.author_id) === String(activeUser.id))) {
      return true;
    }
    if (post.authorId && (post.authorId === (activeUser?.firstName || "") || post.authorId === fullName)) {
      return true;
    }
    if (post.username && (post.username === (activeUser?.firstName || "") || post.username === `@${(activeUser?.firstName || "").toLowerCase()}`)) {
      return true;
    }
    if (post.realName && (post.realName === fullName || post.realName === (activeUser?.firstName || ""))) {
      return true;
    }
    if (post.name && post.name !== "Anonymous" && post.name !== "Anonymous Heartist" && (post.name === fullName || post.name === (activeUser?.firstName || ""))) {
      return true;
    }
    if (post.author && isSelf(post.author)) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, avatar_url, badge, team, is_banned, banned_until",
        )
        .then(({ data, error }) => {
          if (data && !error) {
            const accounts = data.map((p) => ({
              id: p.id,
              firstName: p.first_name,
              lastName: p.last_name,
              avatar: p.avatar_url,
              badge: p.badge,
              team: p.team,
            }));
            localStorage.setItem(
              "registeredAccounts",
              JSON.stringify(accounts),
            );

            const blocks: string[] = [];
            const pens: Record<string, number> = {};
            data.forEach((p) => {
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
            });

            import("@/lib/moderationSync").then(({ fetchPenalties }) => {
              fetchPenalties().then((activePenalties) => {
                activePenalties.forEach((penalty) => {
                  if (penalty.type === "cooldown" && penalty.expires_at) {
                    const pTime = new Date(penalty.expires_at).getTime();
                    if (pTime > Date.now()) {
                      pens[penalty.user_id] = pTime;
                      const prof = data.find((p) => p.id === penalty.user_id);
                      if (prof) pens[prof.first_name] = pTime;
                    }
                  }
                });
                setPenalties({ ...pens });
              });
            });

            setBlockedUsers(blocks);
            setPenalties(pens);

            // Auto-heal activeUser in case team is missing
            const auStr = localStorage.getItem("activeUser");
            if (auStr) {
              const au = JSON.parse(auStr);
              const match = accounts.find(
                (a) =>
                  a.firstName === au.firstName && a.lastName === au.lastName,
              );
              if (
                match &&
                (au.team !== match.team || au.avatar !== match.avatar)
              ) {
                au.team = match.team || "none";
                au.avatar = match.avatar || au.avatar;
                localStorage.setItem("activeUser", JSON.stringify(au));
                setActiveUser(au);
              }
            }
          }
        });

      const loadPosts = async () => {
        try {
          const { fetchWarnings } = await import("@/lib/moderationSync");
          const dbWarnings = await fetchWarnings();
          setWarnedPosts(dbWarnings.map((w) => w.post_id));
        } catch (e) {
          console.error("Failed to load warnings", e);
        }
        try {
          const { fetchCommunityPosts } = await import("@/lib/communitySync");
          const dbPosts = await fetchCommunityPosts();
          
          // Also fetch profiles to keep reaction modal avatars updated
          const { data: profData } = await supabase.from("profiles").select("id, first_name, last_name, avatar_url, badge, team, is_banned, banned_until");
          if (profData) {
            const accounts = profData.map((p) => ({
              id: p.id,
              firstName: p.first_name,
              lastName: p.last_name,
              avatar: p.avatar_url,
              badge: p.badge,
              team: p.team,
            }));
            localStorage.setItem("registeredAccounts", JSON.stringify(accounts));
            setAllProfiles(accounts);
          }

          const validCanvasCategories = [
            "General Chat",
            "Prayer Request",
            "Testimony",
            "Announcement",
            "Announcements",
            "General",
            "Prayer",
          ];

          let cleaned = dbPosts.filter(
            (p: any) =>
              p.status !== "trashed" &&
              (validCanvasCategories.includes(p.category) || !p.category),
          );
          setPosts(cleaned);
        } catch (e) {
          console.error("Failed to load posts from DB", e);
        }

        let parsed: any = null;
        try {
          const loggedInUser = await getCurrentUser();
          if (loggedInUser) {
            parsed = {
              id: loggedInUser.id,
              firstName: loggedInUser.firstName,
              lastName: loggedInUser.lastName,
              email: loggedInUser.email,
              avatar: loggedInUser.avatar,
              badge: loggedInUser.badge,
              team: loggedInUser.team,
              role: loggedInUser.isAdmin ? "Admin" : "Heartist",
            };
          }
        } catch {}

        if (!parsed) {
          const au = localStorage.getItem("activeUser");
          if (au) {
            try {
              parsed = JSON.parse(au);
            } catch {}
          }
        }

        if (parsed) {
          setActiveUser(parsed);
          setName(`${parsed.firstName || ""} ${parsed.lastName || ""}`.trim());

          const username = parsed.firstName;

          const { fetchUserBanStatus } = await import("@/lib/moderationSync");
          const banStatus = await fetchUserBanStatus(parsed.id || username);

          if (banStatus && banStatus.is_banned) {
            setIsBlockedUser(true);
          } else {
            setIsBlockedUser(false);
          }

          if (banStatus && banStatus.banned_until) {
            const time = new Date(banStatus.banned_until).getTime();
            if (time > Date.now()) {
              setPenaltyExpiry(time);
            } else {
              setPenaltyExpiry(null);
            }
          } else {
            setPenaltyExpiry(null);
          }

          const cooldowns = JSON.parse(
            localStorage.getItem("communityAppealCooldowns") || "{}",
          );
          if (cooldowns[username] && cooldowns[username] > Date.now()) {
            setAppealCooldown(cooldowns[username]);
          } else {
            setAppealCooldown(null);
          }

          // Mark canvasSeen on notifications
          try {
            const notifs = JSON.parse(
              localStorage.getItem("communityNotifications") || "[]",
            );
            let changed = false;
            const updatedNotifs = notifs.map((n: any) => {
              const cUserFullName =
                `${parsed.firstName} ${parsed.lastName}`.trim();
              const isTargetUser =
                n.postAuthor === parsed.firstName ||
                n.postAuthor === cUserFullName ||
                n.userId === parsed.firstName ||
                n.userId === cUserFullName;
              if (isTargetUser && !n.canvasSeen) {
                changed = true;
                return { ...n, canvasSeen: true };
              }
              return n;
            });
            if (changed) {
              localStorage.setItem(
                "communityNotifications",
                JSON.stringify(updatedNotifs),
              );
              window.dispatchEvent(new Event("storage"));
            }
          } catch (e) {}
        }
      };

      loadPosts();
      
      const channel = supabase.channel('community_posts_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
          loadPosts();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
          loadPosts();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          loadPosts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Smooth scroll to announcement target post with top-to-bottom animation
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const scrollId = params.get("scrollTo");
    if (!scrollId || posts.length === 0 || hasScrolledRef.current) return;

    // Switch filter to "All" if post might be in another category
    const targetPost = posts.find((p: any) => String(p.id) === String(scrollId));
    if (targetPost && filterCategory !== "All") {
      setFilterCategory("All");
    }

    let attempts = 0;
    const maxAttempts = 40;
    const interval = setInterval(() => {
      attempts++;
      const el = document.getElementById("post-" + scrollId);
      if (el) {
        clearInterval(interval);
        hasScrolledRef.current = true;

        // Guarantee start from top
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });

        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          const startY = window.scrollY || window.pageYOffset || 0;
          const targetY = Math.max(0, rect.top + startY - 110);
          const distance = targetY - startY;
          const duration = Math.min(Math.max(Math.abs(distance) * 0.7, 1400), 2800);
          let startTime: number | null = null;

          const easeInOutCubic = (t: number) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

          const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const percent = Math.min(elapsed / duration, 1);

            window.scrollTo(0, startY + distance * easeInOutCubic(percent));

            if (elapsed < duration) {
              window.requestAnimationFrame(step);
            } else {
              // Smooth highlight pulse animation
              const originalTransition = el.style.transition;
              const originalTransform = el.style.transform;
              const originalBoxShadow = el.style.boxShadow;
              const originalBorder = el.style.borderColor;

              el.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
              el.style.transform = "scale(1.02)";
              el.style.boxShadow = "0 0 25px rgba(255, 234, 0, 0.6), inset 0 0 10px rgba(255, 234, 0, 0.2)";
              el.style.borderColor = "var(--neon-yellow)";

              setTimeout(() => {
                el.style.transform = originalTransform || "";
                el.style.boxShadow = originalBoxShadow || "";
                el.style.borderColor = originalBorder || "";
                setTimeout(() => {
                  el.style.transition = originalTransition || "";
                }, 500);
              }, 2000);
            }
          };

          window.requestAnimationFrame(step);
        }, 150);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [posts, filterCategory]);

  const [error, setError] = useState("");

  const safeSavePosts = (newPosts: any[]) => {
    return newPosts;
  };
  const [toastMessage, setToastMessage] = useState("");
  const [deletedUIItems, setDeletedUIItems] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [openCommentId, setOpenCommentId] = useState<string | number | null>(
    null,
  );
  const [isClosingModal, setIsClosingModal] = useState(false);

  const handleCloseCommentModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setOpenCommentId(null);
      setIsClosingModal(false);
    }, 400);
  };

  const [reactionModalPost, setReactionModalPost] = useState<
    string | number | null
  >(null);
  const [reactionModalUsers, setReactionModalUsers] = useState<string[] | null>(null);
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
  }, [allProfiles]); // Only depend on allProfiles to avoid loop


  useEffect(() => {
    if (
      openCommentId !== null ||
      reactionModalPost !== null ||
      reactionModalUsers !== null
    ) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [openCommentId, reactionModalPost, reactionModalUsers]);

  const [commentContent, setCommentContent] = useState("");
  const [clearCommentKey, setClearCommentKey] = useState(0);
  const [replyCommentId, setReplyCommentId] = useState<string | number | null>(
    null,
  );
  const [closingReplyCommentId, setClosingReplyCommentId] = useState<
    string | number | null
  >(null);

  const closeReplyBox = (id: string | number) => {
    setClosingReplyCommentId(id);
    setReplyCommentId(null);
    setTimeout(() => {
      setClosingReplyCommentId(null);
    }, 150);
  };
  const [replyContent, setReplyContent] = useState("");
  const [clearReplyKey, setClearReplyKey] = useState(0);
  const [replyDefaultValue, setReplyDefaultValue] = useState("");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [adminHighlight, setAdminHighlight] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<(string | number)[]>([]);
  const [expandedComments, setExpandedComments] = useState<(string | number)[]>(
    [],
  );
  const [expandedNames, setExpandedNames] = useState<(string | number)[]>([]);
  const [reportLimitReached, setReportLimitReached] = useState(false);
  const [reportedUIState, setReportedUIState] = useState<(string | number)[]>(
    [],
  );
  const [reportPostId, setReportPostId] = useState<string | number | null>(
    null,
  );
  const [reportItemDetails, setReportItemDetails] = useState<{
    id: string | number;
    type: "post" | "comment" | "reply";
  } | null>(null);
  const [reportCategory, setReportCategory] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | string | null>(null);
  const [closingMenuId, setClosingMenuId] = useState<number | string | null>(
    null,
  );
  const [expandedRepliesForComment, setExpandedRepliesForComment] = useState<
    (string | number)[]
  >([]);

  const openMenuIdRef =
    typeof window !== "undefined"
      ? require("react").useRef(openMenuId)
      : { current: openMenuId };
  if (typeof window !== "undefined") {
    require("react").useEffect(() => {
      openMenuIdRef.current = openMenuId;
    }, [openMenuId]);
  }

  const closeMenu = (id: string | number) => {
    setClosingMenuId(id);
    setOpenMenuId(null);
    setTimeout(() => {
      setClosingMenuId((prev) => (prev === id ? null : prev));
    }, 150);
  };

  useEffect(() => {
    const handleGlobalClick = (e: any) => {
      if (e.target.closest && e.target.closest(".menu-exclude")) return;
      if (openMenuIdRef.current) closeMenu(openMenuIdRef.current);
    };
    const handleGlobalScroll = (e: any) => {
      if (e.target.closest && e.target.closest(".menu-exclude-scroll")) return;
      if (openMenuIdRef.current) closeMenu(openMenuIdRef.current);
    };

    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("scroll", handleGlobalScroll, { capture: true });

    return () => {
      document.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("scroll", handleGlobalScroll, {
        capture: true,
      });
    };
  }, []);

  const toggleCommentExpand = (id: string | number) => {
    setExpandedComments((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const toggleRepliesExpand = (id: string | number) => {
    setExpandedRepliesForComment((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case "first-timer":
      case "first timer":
        return "🐣";
      case "camp-veteran":
      case "camp veteran":
        return "🎖️";
      case "supporter":
        return "💖";
      case "pastor":
        return "📖";
      case "camp-coordinator":
      case "camp coordinator":
        return "🎯";
      case "facilitator":
        return "⭐";
      case "media-team":
      case "media team":
        return "📸";
      case "music-team":
      case "music team":
        return "🎵";
      case "dance-ministry":
      case "dance ministry":
        return "💃";
      case "anonymous":
          return "👤";
      case "admin":
        return "👑";
      default:
        return "";
    }
  };

  const renderAuthorName = (
    name: string,
    role: string = "Heartist",
    isCurrentUser: boolean = false,
  ) => {
    return (
      <span style={{ fontWeight: "bold" }}>
        {name} {isCurrentUser && <span style={{ opacity: 0.7 }}>(You)</span>}{" "}
        <span
          style={{
            opacity: 0.7,
            fontWeight: "normal",
            fontSize: "0.85em",
            marginLeft: "4px",
          }}
          title={role}
        >
          {getRoleIcon(role)}
        </span>
      </span>
    );
  };

  const triggerMentionNotifications = (
    contentStr: string,
    type: "post" | "comment" | "reply",
    sourceName: string,
    postId: string | number,
  ): Set<string> => {
    const accounts = allProfiles;

    const validMentionsMap = new Map<string, string>();
    accounts.forEach((a: any) => {
      const fullName = `${a.firstName} ${a.lastName}`.trim();
      const parts = fullName.split(" ");
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j <= parts.length; j++) {
          validMentionsMap.set(
            parts.slice(i, j).join(" ").toLowerCase(),
            fullName,
          );
        }
      }
    });

    const sortedMentions = Array.from(validMentionsMap.keys()).sort(
      (a, b) => b.length - a.length,
    );
    let notifs = JSON.parse(
      localStorage.getItem("communityNotifications") || "[]",
    );
    const mentionedUsers = new Set<string>();

    if (sortedMentions.length > 0) {
      const escapedMentions = sortedMentions.map((name) =>
        name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      );
      const combinedRegex = new RegExp(
        `@\\u200B(${escapedMentions.join("|")})(?=[\\s\\.,!?]|$)`,
        "gi",
      );

      let match;
      while ((match = combinedRegex.exec(contentStr)) !== null) {
        const matchedName = match[1].toLowerCase();
        const targetUserId = validMentionsMap.get(matchedName);
        if (targetUserId) {
          mentionedUsers.add(targetUserId);
        }
      }
    }

    mentionedUsers.forEach((userId) => {
      if (userId && userId !== sourceName) {
        notifs.unshift({
          id: Date.now() + Math.random(),
          type: "mention",
          mentionType: type === "post" ? "post" : "comment",
          userId: userId,
          sourceName: sourceName,
          postId: postId,
          postContent: contentStr,
          read: false,
          timestamp: Date.now(),
        });
      }
    });

    localStorage.setItem("communityNotifications", JSON.stringify(notifs));
    try {
      if (notifs.length > 0)
        supabase.channel("public-notifications").send({
          type: "broadcast",
          event: "new_notif",
          payload: notifs[notifs.length - 1],
        });
    } catch (e) {}
    window.dispatchEvent(new Event("storage"));
    return mentionedUsers;
  };

  const renderWithMentions = (contentStr: string) => {
    if (!contentStr) return null;
    let html = contentStr;
    html = html
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    if (typeof window !== "undefined") {
      let accs = [];
      accs = allProfiles;
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
      validMentions.add("everyone");
      const sortedMentions = Array.from(validMentions).sort(
        (a, b) => b.length - a.length,
      );
      let baseRegexStr = "[a-zA-Z0-9_.-]+(?:\\s[a-zA-Z0-9_.-]+)?";
      if (sortedMentions.length > 0) {
        const escapedMentions = sortedMentions.map((name) =>
          name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        );
        baseRegexStr = `${escapedMentions.join("|")}|[a-zA-Z0-9_.-]+(?:\\s[a-zA-Z0-9_.-]+)?`;
      }
      const combinedRegex = new RegExp(
        `@\\u200B?(${baseRegexStr})(?=[\\s\\.,!?]|$)`,
        "gi",
      );
      html = html.replace(
        combinedRegex,
        '<span style="background: rgba(255,234,0,0.3); color: var(--neon-yellow); border-radius: 4px; padding: 2px 0; font-weight: bold; transition: all 0.3s ease; box-decoration-break: clone; -webkit-box-decoration-break: clone;">$&</span>',
      );
    }
    html = html.replace(/\n/g, "<br/>");
    return (
      <span
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const formatTimeAgo = (timestamp: any, fallbackStr: string = '') => {
  let ts = Number(timestamp);
  let validTs = false;
  
  if (!isNaN(ts) && ts > 100000000000) {
    validTs = true;
  } else if (!isNaN(Number(fallbackStr)) && Number(fallbackStr) > 100000000000) {
    ts = Number(fallbackStr);
    validTs = true;
  } else if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      ts = parsed;
      validTs = true;
    }
  } else if (typeof fallbackStr === 'string' && fallbackStr) {
    const cleanDateStr = fallbackStr.split(" (")[0];
    const parsed = Date.parse(cleanDateStr);
    if (!isNaN(parsed)) {
      ts = parsed;
      validTs = true;
    }
  }

  if (!validTs) {
    if (typeof timestamp === 'string') {
      const match = timestamp.match(/\((.*?)\)/);
      if (match) return match[1];
      return timestamp;
    }
    return typeof fallbackStr === 'string' ? fallbackStr : "Unknown Date";
  }

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


  const handlePost = async () => {
    if (!content.trim()) {
      setError("Ay naku, Heartist! Wala pa po kayong laman.");
      return;
    }

    if (content.length > 300) {
      setError("Please limit your post to 300 characters.");
      return;
    }

    const uid = activeUser?.id || "anonymous";
    const penalties = JSON.parse(
      localStorage.getItem("communityPenalties") || "{}"
    );
    let hasPenalty = false;
    let penaltyExpiry = 0;

    if (penalties && penalties[uid] && penalties[uid] > Date.now()) {
      hasPenalty = true;
      penaltyExpiry = penalties[uid];
    } else {
      const fallbackUid = activeUser?.firstName || "anonymous";
      if (
        penalties &&
        penalties[fallbackUid] &&
        penalties[fallbackUid] > Date.now()
      ) {
        hasPenalty = true;
        penaltyExpiry = penalties[fallbackUid];
      }
    }

    if (hasPenalty) {
      const date = new Date(penaltyExpiry).toLocaleString();
      setError(`You have a penalty. You cannot post or comment until ${date}.`);
      return;
    }

    setIsSaving(true);
    let generatedId = Date.now();
    try {
      const authorId = activeUser?.id || "anonymous";
      const uName = activeUser ? `${activeUser.firstName || ''} ${activeUser.lastName || ''}`.trim() : "SystemError";
      const userTeam = activeUser?.team || "none";
      const realName = activeUser ? `${activeUser.firstName || ''} ${activeUser.lastName || ''}`.trim() : "Heartist";
      
      const newPost = {
        id: generatedId,
        authorId: authorId,
        username: isAnonymous ? "Anonymous Heartist" : uName,
        name: isAnonymous ? "Anonymous Heartist" : realName,
        isAnonymous: isAnonymous,
        avatar: activeUser?.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg",
        team: userTeam,
        content: content,
        category: category,
        timestamp: Date.now(),
        liked: false,
        realName: realName,
        likesCount: 0,
        commentsCount: 0,
        comments: [],
        editHistory: [],
        disableComments: category === "Prayer Request",
        commentsDisabled: category === "Prayer Request"
      };

      const updatedPosts = [newPost, ...posts];
      triggerMentionNotifications(content, "post", realName, newPost.id);
      try {
        setPosts(safeSavePosts(updatedPosts));
      } catch (e) {
        setToastMessage("Storage full! Failed to save.");
      }

      setContent("");
      setIsAnonymous(false);
      setError("");
      
      try {
        const payload = {
          author_id: activeUser?.id,
          author_name: isAnonymous ? "Anonymous Heartist" : uName,
          is_anonymous: isAnonymous,
          content: content,
          category: category,
          created_at: new Date().toISOString(),
          disable_comments: category === "Prayer Request"
        };
        const { error } = await supabase.from('posts').insert(payload);
        if (error) console.error("Supabase post error", error);
      } catch (err) {
        console.error("Supabase post err", err);
      }
      
    } catch (error) {
      console.error(error);
      setError("An unexpected error occurred while posting.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReport = async (id: string | number) => {
    const today = new Date().toISOString().split("T")[0];
    const uName = activeUser?.firstName || "SystemError";
    const limitKey = `reportLimit_${uName}_${id}_${today}`;

    const limits = JSON.parse(
      localStorage.getItem("communityReportLimits") || "{}",
    );
    const currentCount = limits[limitKey] || 0;

    if (currentCount >= 2) {
      setReportLimitReached(true);
      setOpenMenuId(null);
      return;
    }

    limits[limitKey] = currentCount + 1;
    localStorage.setItem("communityReportLimits", JSON.stringify(limits));

    const currentReports = JSON.parse(
      localStorage.getItem("communityReportedPosts") || "[]",
    );
    const existing = currentReports.find((r: any) =>
      typeof r === "number" ? r === id : r.id === id,
    );
    if (!existing) {
      const reporterName = activeUser
        ? `${(activeUser?.firstName || "")} ${activeUser.lastName}`
        : "System Error (Guest)";
      const reporterUsername = activeUser
        ? (activeUser?.firstName || "")
        : "SystemError";
      const reporterId = activeUser
        ? activeUser.id || reporterUsername
        : reporterUsername;

      try {
        const { createReport } = await import("@/lib/moderationSync");
        await createReport({
          reporter_id: reporterId,
          reporter_name: reporterName,
          post_id: typeof id === "string" && id.length === 36 ? id : undefined,
          reason: "User reported post",
        });
      } catch (err) {
        console.error("Failed to submit report to Supabase", err);
      }

      currentReports.push({ id, reporter: reporterName, reporterUsername });
      localStorage.setItem(
        "communityReportedPosts",
        JSON.stringify(currentReports),
      );
    }
    setReportedUIState((prev) => [...prev, id as string | number]);
    setOpenMenuId(null);
    setTimeout(() => {
      setReportedUIState((prev) => prev.filter((rId) => rId !== id));
    }, 3000);
  };

  const handleInstantReport = async (
    postId: string | number,
    itemType: "post" | "comment" | "reply",
    itemId: string | number,
  ) => {
    const p = posts.find((x: any) => x.id === postId);
    if (p) {
      try {
        const reporterName = activeUser
          ? `${(activeUser?.firstName || "")} ${activeUser.lastName}`
          : "Anonymous";
        const reporterUsername = activeUser
          ? (activeUser?.firstName || "")
          : "Anonymous";
        const reporterId = activeUser
          ? activeUser.id || reporterUsername
          : reporterUsername;
        let prefix = "";
        if (itemType === "comment") prefix = `[Comment ${itemId}] `;
        if (itemType === "reply") prefix = `[Reply ${itemId}] `;

        const { createReport } = await import("@/lib/moderationSync");
        await createReport({
          reporter_id: reporterId,
          reporter_name: reporterName,
          post_id:
            typeof p.id === "string" && p.id.length === 36 ? p.id : undefined,
          reason: prefix + "Reported instantly via UI.",
        });

        const currentReports = JSON.parse(
          localStorage.getItem("communityReportedPosts") || "[]",
        );
        const existing = currentReports.find(
          (r: any) => String(r.id || r) === String(itemId),
        );
        if (!existing) {
          currentReports.push({
            id: itemId,
            reporter: reporterName,
            reporterUsername,
          });
          localStorage.setItem(
            "communityReportedPosts",
            JSON.stringify(currentReports),
          );
        }
      } catch (e) {
        console.error(e);
      }
    }

    setReportedUIState((prev) => [...prev, itemId as string | number]);
    setOpenMenuId(null);
    setTimeout(() => {
      setReportedUIState((prev) => prev.filter((rId) => rId !== itemId));
    }, 3000);
  };

  const toggleLike = async (postId: string | number) => {
    const uName = activeUser?.firstName || "SystemError";
    if (!uName || uName === "SystemError") return;

    const p = posts.find((p) => p.id === postId);
    if (!p) return;

    const likes = p.likes || [];
    const isLiking = !likes.includes(uName);

    const updated = posts.map((p) => {
      if (p.id === postId) {
        if (isLiking) {
          return { ...p, likes: [...likes, uName] };
        } else {
          return { ...p, likes: likes.filter((n: string) => n !== uName) };
        }
      }
      return p;
    });

    try {
      setPosts(safeSavePosts(updated));
    } catch (e) {
      setToastMessage("Storage full! Failed to save.");
      return;
    }
    window.dispatchEvent(new Event("storage"));

    try {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(String(postId))) {
        await togglePostLike(postId.toString(), likes, uName);
      }
    } catch (e) {
      console.error("Failed to sync post like:", e);
    }

    if (
      isLiking &&
      p.authorId &&
      !isSelf(p.authorId) &&
      p.authorId !== "Anonymous"
    ) {
      dispatchNotification({
        id: Date.now(),
        type: "like",
        fromUser: uName,
        postAuthor: p.authorId,
        postId: postId,
        timestamp: Date.now(),
        read: false,
        message: `${uName} liked your post`,
      });
    }
  };

  const checkCommentLiked = (comment: any) => {
    const uName = activeUser?.firstName || "SystemError";
    return comment.likes && comment.likes.includes(uName);
  };

  const handleCommentLike = (
    postId: string | number,
    commentId: string | number,
  ) => {
    const uName = activeUser?.firstName || "SystemError";
    if (!uName || uName === "SystemError") return;

    const updated = posts.map((p) => {
      if (p.id === postId && p.comments) {
        const newComments = p.comments.map((c: any) => {
          if (c.id === commentId) {
            const likes = c.likes || [];
            if (likes.includes(uName)) {
              return {
                ...c,
                likes: likes.filter((n: string) => n !== uName),
              };
            } else {
              return { ...c, likes: [...likes, uName] };
            }
          }
          return c;
        });
        return { ...p, comments: newComments };
      }
      return p;
    });
    try {
      setPosts(safeSavePosts(updated));
    } catch (e) {
      setToastMessage("Storage full! Failed to save.");
      return;
    }
    window.dispatchEvent(new Event("storage"));

    const syncComment = async () => {
      try {
        const oldComment = posts
          .find((p) => p.id === postId)
          ?.comments?.find((c: any) => c.id === commentId);
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (oldComment && activeUser?.firstName) {
          if (uuidRegex.test(String(commentId))) {
            await toggleCommentLike(
              commentId.toString(),
              oldComment.likes || [],
              (activeUser?.firstName || ""),
            );
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncComment();

    const p = posts.find((p) => p.id === postId);
    if (p && p.authorId && !isSelf(p.authorId) && p.authorId !== "Anonymous") {
      const isLiking = updated
        .find((p) => p.id === postId)
        ?.comments?.find((c: any) => c.id === commentId)
        ?.likes?.includes(uName);
      if (isLiking) {
        dispatchNotification({
          id: Date.now(),
          type: "comment_like",
          fromUser: uName,
          postAuthor: p.authorId,
          postId: postId,
          commentId: commentId,
          timestamp: Date.now(),
          read: false,
          message: `${uName} liked your comment`,
        });
      }
    }
  };

  const checkReplyLiked = (reply: any) => {
    const uName = activeUser?.firstName || "SystemError";
    return reply.likes && reply.likes.includes(uName);
  };

  const handleReplyLike = (
    postId: string | number,
    commentId: string | number,
    replyId: string | number,
  ) => {
    const uName = activeUser?.firstName || "SystemError";
    if (!uName || uName === "SystemError") return;

    const updated = posts.map((p) => {
      if (p.id === postId && p.comments) {
        const newComments = p.comments.map((c: any) => {
          if (c.id === commentId && c.replies) {
            const newReplies = c.replies.map((r: any) => {
              if (r.id === replyId) {
                const likes = r.likes || [];
                if (likes.includes(uName)) {
                  return {
                    ...r,
                    likes: likes.filter((n: string) => n !== uName),
                  };
                } else {
                  return { ...r, likes: [...likes, uName] };
                }
              }
              return r;
            });
            return { ...c, replies: newReplies };
          }
          return c;
        });
        return { ...p, comments: newComments };
      }
      return p;
    });

    try {
      setPosts(safeSavePosts(updated));
    } catch (e) {
      setToastMessage("Storage full! Failed to save.");
      return;
    }
    window.dispatchEvent(new Event("storage"));
  };

  const handleEditCommentSubmit = async (
    postId: string | number,
    commentId: string | number,
    newContent: string,
    currentEditCount: number,
  ) => {
    if (!newContent.trim()) {
      setError("Content cannot be empty.");
      return;
    }
    if (currentEditCount >= 3) {
      setError("Edit limit reached.");
      return;
    }
    setError("");

    let previousContent = "";
    let currentEditHistory: any[] = [];
    const post = posts.find(p => String(p.id) === String(postId));
    if (post && post.comments) {
      for (const c of post.comments) {
        if (String(c.id) === String(commentId)) {
          previousContent = c.content;
          currentEditHistory = c.editHistory || [];
          break;
        }
        if (c.replies) {
          const r = c.replies.find((rep: any) => String(rep.id) === String(commentId));
          if (r) {
            previousContent = r.content;
            currentEditHistory = r.editHistory || [];
            break;
          }
        }
      }
    }

    const newHistoryEntry = { content: previousContent, timestamp: new Date().toISOString() };
    const newHistory = previousContent ? [...currentEditHistory, newHistoryEntry] : currentEditHistory;

    try {
      await editCommentInSupabase(
        String(commentId),
        newContent,
        currentEditCount,
        previousContent,
        currentEditHistory
      );

      const updated = posts.map((p) => {
        if (p.id === postId && p.comments) {
          const newComments = p.comments.map((c: any) => {
            if (c.id === commentId) {
              return {
                ...c,
                content: newContent,
                isEdited: true,
                editCount: currentEditCount + 1,
                editHistory: newHistory,
              };
            }
            if (c.replies) {
              const newReplies = c.replies.map((r: any) => {
                if (r.id === commentId) {
                  return {
                    ...r,
                    content: newContent,
                    isEdited: true,
                    editCount: currentEditCount + 1,
                    editHistory: newHistory,
                  };
                }
                return r;
              });
              return { ...c, replies: newReplies };
            }
            return c;
          });
          return { ...p, comments: newComments };
        }
        return p;
      });

      setPosts(safeSavePosts(updated));
      window.dispatchEvent(new Event("storage"));
      setEditItem(null);
    } catch (error) {
      console.error("Failed to edit:", error);
      setError("Failed to edit. Please try again.");
    }
  };

  const handleCommentSubmit = async (
    postId: string | number,
    content: string = commentContent,
  ) => {
    if (!content.trim()) {
      setError("Please enter a comment.");
      return;
    }
    setError("");

    const uName = activeUser?.firstName || "Anonymous";
    const uId = activeUser?.id || uName;

    try {
      const insertedComment = await submitCommentToSupabase(
        String(postId),
        content,
        uId,
      );

      const newComment = {
        id: insertedComment.id,
        author: uName,
        authorId: uId,
        content: content,
        timestamp: Date.now(),
        likes: [],
        replies: [],
      };

      const updated = posts.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            comments: p.comments ? [...p.comments, newComment] : [newComment],
          };
        }
        return p;
      });

      try {
        setPosts(safeSavePosts(updated));
      } catch (e) {
        setToastMessage("Storage full! Failed to save.");
        return;
      }
      window.dispatchEvent(new Event("storage"));
      setCommentContent("");
      setClearCommentKey((k) => k + 1);

      const p = posts.find((p) => p.id === postId);
      if (
        p &&
        p.authorId &&
        !isSelf(p.authorId) &&
        p.authorId !== "Anonymous"
      ) {
        dispatchNotification({
          id: Date.now(),
          type: "comment",
          fromUser: uName,
          postAuthor: p.authorId,
          postId: postId,
          commentId: newComment.id,
          timestamp: Date.now(),
          read: false,
          message: `${uName} commented on your post`,
        });
      }
    } catch (error) {
      console.error("Failed to submit comment:", error);
      setError("Failed to submit comment. Please try again.");
    }
  };

  const handleReplySubmit = async (
    postId: string | number,
    commentId: string | number,
    content: string = replyContent,
  ) => {
    if (!content.trim()) {
      setError("Please enter a reply.");
      return;
    }
    setError("");

    const uName = activeUser?.firstName || "Anonymous";
    const uId = activeUser?.id || uName;

    try {
      const insertedReply = await submitReplyToSupabase(
        String(postId),
        String(commentId),
        content,
        uId,
      );

      const newReply = {
        id: insertedReply.id,
        author: uName,
        authorId: uId,
        content: content,
        timestamp: Date.now(),
        likes: [],
      };

      const updated = posts.map((p) => {
        if (p.id === postId && p.comments) {
          const newComments = p.comments.map((c: any) => {
            if (c.id === commentId) {
              return {
                ...c,
                replies: c.replies ? [...c.replies, newReply] : [newReply],
              };
            }
            return c;
          });
          return { ...p, comments: newComments };
        }
        return p;
      });

      try {
        setPosts(safeSavePosts(updated));
      } catch (e) {
        setToastMessage("Storage full! Failed to save.");
        return;
      }
      window.dispatchEvent(new Event("storage"));
      setReplyContent("");
      setClearReplyKey((k) => k + 1);

      const p = posts.find((p) => p.id === postId);
      const c = p?.comments?.find((c: any) => c.id === commentId);
      if (
        c &&
        c.authorId &&
        !isSelf(c.authorId) &&
        c.authorId !== "Anonymous"
      ) {
        dispatchNotification({
          id: Date.now(),
          type: "reply",
          fromUser: uName,
          postAuthor: c.authorId,
          postId: postId,
          commentId: commentId,
          replyId: newReply.id,
          timestamp: Date.now(),
          read: false,
          message: `${uName} replied to your comment`,
        });
      }
    } catch (error) {
      console.error("Failed to submit reply:", error);
      setError("Failed to submit reply. Please try again.");
    }
  };

  const handleSaveEdit = async (id: string | number, newContent: string) => {
    if (isSaving || !newContent.trim()) return;
    setIsSaving(true);

    const currentPost = posts.find((p) => String(p.id) === String(id));
    if (currentPost) {
      if ((currentPost.editCount || 0) >= 3) {
        setToastMessage("Maximum of 3 edits reached.");
        setTimeout(() => setToastMessage(""), 3000);
        setIsSaving(false);
        return;
      }
      if (currentPost.content === newContent.trim()) {
        setToastMessage("Wala pong binago sa post.");
        setTimeout(() => setToastMessage(""), 3000);
        setIsSaving(false);
        return;
      }
    }

    try {
      if (currentPost) {
        await editPostInSupabase(
          String(id), 
          newContent.trim(), 
          currentPost.editCount || 0,
          currentPost.content,
          currentPost.editHistory || []
        );
      }
      const updated = posts.map((p) => {
        if (String(p.id) === String(id)) {
          const newHistory = [...(p.editHistory || []), { content: p.content, timestamp: new Date().toISOString() }];
          return {
            ...p,
            content: newContent.trim(),
            isEdited: true,
            editCount: (p.editCount || 0) + 1,
            editHistory: newHistory
          };
        }
        return p;
      });
      setPosts(safeSavePosts(updated));
      window.dispatchEvent(new Event("storage"));
      setEditPostId(null);
      setEditContent("");
    } catch (e) {
      console.error("Error editing post:", e);
      setToastMessage("Failed to edit post. Please try again.");
      setTimeout(() => setToastMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmUserDelete = async () => {
    if (!userPostToDelete) return;
    const id = String(userPostToDelete);
    const postToTrash = posts.find((p) => String(p.id) === id);
    if (postToTrash) {
      try {
        if (
          postToTrash.category === "Prayer Request" ||
          postToTrash.type === "prayer"
        ) {
          await supabase.from("prayers").delete().eq("id", userPostToDelete);
          const fPrayers = JSON.parse(
            localStorage.getItem("fusionPrayers") || "[]",
          );
          const updatedFPrayers = fPrayers.filter(
            (fp: any) => String(fp.id) !== id,
          );
          if (updatedFPrayers.length !== fPrayers.length) {
            localStorage.setItem(
              "fusionPrayers",
              JSON.stringify(updatedFPrayers),
            );
          }
        } else {
          await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", userPostToDelete);
          await supabase
            .from("comments")
            .delete()
            .eq("post_id", userPostToDelete);
          await supabase
            .from("reports")
            .delete()
            .eq("post_id", userPostToDelete);
          await supabase.from("posts").delete().eq("id", userPostToDelete);
        }
      } catch (err) {
        console.error("Failed to sync post deletion", err);
      }
    }

    setDeletedUIItems((prev) => [...prev, id]);
    setUserPostToDelete(null);
    setToastMessage("Your post has been deleted.");
    setTimeout(() => setToastMessage(""), 3000);

    setTimeout(() => {
      setPosts((prev) => {
        const updated = prev.filter((p) => String(p.id) !== id);
        try {
          safeSavePosts(updated);
        } catch (e) {}
        window.dispatchEvent(new Event("storage"));
        return updated;
      });
    }, 2000);
  };

  const confirmItemDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.replyId
      ? String(itemToDelete.replyId)
      : String(itemToDelete.commentId);

    try {
      if (
        !itemToDelete.replyId &&
        String(itemToDelete.commentId).length === 36
      ) {
        await deleteCommentFromSupabase(String(itemToDelete.commentId));
      } else if (
        itemToDelete.replyId &&
        String(itemToDelete.replyId).length === 36
      ) {
        await deleteCommentFromSupabase(String(itemToDelete.replyId));
      }
    } catch (e) {
      console.error("Failed to delete from Supabase", e);
    }

    setDeletedUIItems((prev) => [...prev, id]);
    const currentItemToDelete = itemToDelete;
    setItemToDelete(null);
    setToastMessage("Your post has been deleted.");
    setTimeout(() => setToastMessage(""), 3000);

    setTimeout(() => {
      setPosts((prev) => {
        const updated = prev.map((p) => {
          if (p.id === currentItemToDelete.postId && p.comments) {
            if (!currentItemToDelete.replyId) {
              return {
                ...p,
                comments: p.comments.filter(
                  (c: any) =>
                    String(c.id) !== String(currentItemToDelete.commentId),
                ),
              };
            } else {
              const newComments = p.comments.map((c: any) => {
                if (c.id === currentItemToDelete.commentId && c.replies) {
                  return {
                    ...c,
                    replies: c.replies.filter(
                      (r: any) =>
                        String(r.id) !== String(currentItemToDelete.replyId),
                    ),
                  };
                }
                return c;
              });
              return { ...p, comments: newComments };
            }
          }
          return p;
        });

        try {
          safeSavePosts(updated);
        } catch (e) {}
        window.dispatchEvent(new Event("storage"));
        return updated;
      });
    }, 2000);
  };

  const handleSaveEditItem = async (newContent: string) => {
    if (isSaving || !editItem || !newContent.trim()) return;
    setIsSaving(true);

    let isUnchanged = false;
    let overLimit = false;
    let targetIdToEdit = editItem.replyId || editItem.commentId;
    let currentEditCount = 0;
    let prevContent = "";
    let currentEditHistory: any[] = [];

    const updated = posts.map((p) => {
      if (p.id === editItem.postId && p.comments) {
        if (!editItem.replyId) {
          const newComments = p.comments.map((c: any) => {
            if (c.id === editItem.commentId) {
              if ((c.editCount || 0) >= 3) {
                overLimit = true;
                return c;
              }
              if (c.content === newContent.trim()) {
                isUnchanged = true;
                return c;
              }
              currentEditCount = c.editCount || 0;
              prevContent = c.content;
              currentEditHistory = c.editHistory || [];
              const newHistory = [...currentEditHistory, { content: prevContent, timestamp: new Date().toISOString() }];
              return {
                ...c,
                content: newContent.trim(),
                isEdited: true,
                editCount: currentEditCount + 1,
                editHistory: newHistory
              };
            }
            return c;
          });
          return { ...p, comments: newComments };
        } else {
          const newComments = p.comments.map((c: any) => {
            if (c.id === editItem.commentId && c.replies) {
              const newReplies = c.replies.map((r: any) => {
                if (r.id === editItem.replyId) {
                  if ((r.editCount || 0) >= 3) {
                    overLimit = true;
                    return r;
                  }
                  if (r.content === newContent.trim()) {
                    isUnchanged = true;
                    return r;
                  }
                  currentEditCount = r.editCount || 0;
                  prevContent = r.content;
                  currentEditHistory = r.editHistory || [];
                  const newHistory = [...currentEditHistory, { content: prevContent, timestamp: new Date().toISOString() }];
                  return {
                    ...r,
                    content: newContent.trim(),
                    isEdited: true,
                    editCount: currentEditCount + 1,
                    editHistory: newHistory
                  };
                }
                return r;
              });
              return { ...c, replies: newReplies };
            }
            return c;
          });
          return { ...p, comments: newComments };
        }
      }
      return p;
    });

    if (overLimit) {
      setToastMessage("Maximum of 3 edits reached.");
      setTimeout(() => setToastMessage(""), 3000);
      setIsSaving(false);
      return;
    }

    if (isUnchanged) {
      setToastMessage("Wala pong binago sa comment.");
      setTimeout(() => setToastMessage(""), 3000);
      setIsSaving(false);
      return;
    }

    try {
      if (targetIdToEdit) {
        await editCommentInSupabase(String(targetIdToEdit), newContent.trim(), currentEditCount, prevContent, currentEditHistory);
      }
      setPosts(safeSavePosts(updated));
      window.dispatchEvent(new Event("storage"));
      setEditItem(null);
    } catch (e) {
      console.error("Error editing comment/reply:", e);
      setToastMessage("Failed to save edit. Please try again.");
      setTimeout(() => setToastMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryColor = (catId: string) => {
    const found = CATEGORIES.find((c) => c.id === catId);
    return found ? found.color : "var(--neon-white)";
  };

  const isPostPenalized = (post: any) => {
    if (typeof window === "undefined") return false;
    try {
      const uid = post.authorId || post.username;

      if (Array.isArray(warnedPosts) && warnedPosts.includes(post.id))
        return true;
      if (Array.isArray(blockedUsers) && blockedUsers.includes(uid))
        return true;
      if (penalties && penalties[uid] && penalties[uid] > Date.now())
        return true;

      if (post.username === "Anonymous") {
        const accounts = allProfiles;
        const acc = Array.isArray(accounts)
          ? accounts.find(
              (a: any) => `${a.firstName} ${a.lastName}` === post.realName,
            )
          : null;
        const fallbackUid = acc
          ? acc.firstName
          : post.realName
            ? post.realName.split(" ")[0]
            : "";
        if (Array.isArray(blockedUsers) && blockedUsers.includes(fallbackUid))
          return true;
        if (
          penalties &&
          penalties[fallbackUid] &&
          penalties[fallbackUid] > Date.now()
        )
          return true;
      }
    } catch (e) {
      console.error("Error checking penalties", e);
    }
    return false;
  };

  const checkLiked = (post: any) => {
    try {
      const uName = activeUser?.firstName || "SystemError";
      if (Array.isArray(post.likes)) return post.likes.includes(uName);
      if (Array.isArray(post.likedBy)) return post.likedBy.includes(uName);
      return !!post.liked;
    } catch (e) {
      return false;
    }
  };

  const pinnedPosts = posts.filter((p) => p.isPinned && !isPostPenalized(p));

  const filteredPosts = posts
    .filter((p) => !isPostPenalized(p) && !p.isPinned)
    .filter((p) => {
      if (filterCategory === "All") return true;
      if (filterCategory === "Your Posts") {
        return (
          activeUser &&
          (p.username === (activeUser?.firstName || "") ||
            p.authorId === (activeUser?.firstName || ""))
        );
      }
      if (filterCategory === "Top Hearts") return true;
      return p.category === filterCategory;
    })
    .sort((a, b) => {
      const timeA = a.timestamp || (typeof a.id === "number" ? a.id : 0);
      const timeB = b.timestamp || (typeof b.id === "number" ? b.id : 0);
      if (filterCategory === "Top Hearts") {
        return (b.likesCount || 0) - (a.likesCount || 0) || timeB - timeA;
      }
      return timeB - timeA;
    });

  
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 10000);
        return () => clearInterval(interval);
    }, []);

return (
    
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      <style>{`
        @keyframes fadeOutReport {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes slideDownFadeIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: none; }
        }
        @keyframes slideUpFadeOut {
          0% { opacity: 1; transform: none; }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        @keyframes scaleUpHeart {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
      `}</style>
      {/* Header */}
      <header className="top-header" style={{ marginBottom: "30px" }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1
          className="header-title glow-text-white"
          style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "2rem",
            marginTop: "10px",
          }}
        >
          THE CANVAS
        </h1>
        <p className="logo-sub">Community Freedom Wall</p>
      </header>

      {/* 1. Post Creator / Status Banner */}
      <section style={{ marginBottom: "40px" }}>
        <div
          style={{
            backgroundColor: "rgba(20, 20, 20, 0.8)",
            backdropFilter: "blur(10px)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "20px",
            marginBottom: "30px",
            borderTop: `2px solid ${getCategoryColor(category)}`,
            transition: "border-color 0.3s ease",
          }}
        >
          {error && (
            <div
              style={{
                color: "#FF4444",
                marginBottom: "15px",
                fontSize: "0.9rem",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {isBlockedUser ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                background: "rgba(255,0,0,0.1)",
                border: "1px solid #FF4444",
                borderRadius: "8px",
                color: "#FF4444",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>🚫</div>
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontFamily: "var(--font-outfit)",
                }}
              >
                Account Temporarily Blocked
              </h3>
              <p
                style={{
                  margin: "0 0 20px 0",
                  fontSize: "0.9rem",
                  color: "var(--neon-white)",
                }}
              >
                You have been blocked from posting or interacting on the Canvas
                by the Administrator.
              </p>

              <div
                style={{
                  borderTop: "1px solid rgba(255,68,68,0.2)",
                  paddingTop: "15px",
                  marginTop: "10px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    marginBottom: "10px",
                  }}
                >
                  Believe this was a mistake? Send an appeal to the admin:
                </p>
                {appealCooldown ? (
                  <div
                    style={{
                      padding: "15px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--neon-white)",
                    }}
                  >
                    <p style={{ margin: "0 0 10px 0", fontSize: "0.85rem" }}>
                      You recently sent an appeal. Please wait before sending
                      another one to avoid spamming.
                    </p>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        color: "var(--neon-yellow)",
                      }}
                    >
                      Cooldown:{" "}
                      <LiveTimer
                        expiry={Number(appealCooldown)}
                        onExpire={() => setAppealCooldown(null)}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    <MentionTextarea
                      id="appealMsg"
                      defaultValue="I sincerely apologize for my actions. Please reconsider my block and allow me to return to the community."
                      placeholder="Type your appeal here..."
                      style={{
                        width: "100%",
                        minHeight: "80px",
                        padding: "10px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,68,68,0.4)",
                        borderRadius: "6px",
                        color: "white",
                        outline: "none",
                        fontSize: "0.85rem",
                        resize: "none",
                      }}
                    />
                    <div
                      style={{ display: "flex", justifyContent: "flex-end" }}
                    >
                      <button
                        onClick={async () => {
                          const msgEl = document.getElementById(
                            "appealMsg",
                          ) as HTMLTextAreaElement;
                          const msg = msgEl.value;
                          if (!msg.trim()) return;

                          const today = new Date().toISOString().split("T")[0];
                          const appealCountRaw =
                            localStorage.getItem(`appealCount_${today}`) || "0";
                          let appealCount = parseInt(appealCountRaw, 10);

                          if (appealCount >= 3) {
                            setSuccessMsg(
                              "❌ Limit reached! You can only appeal 3 times per day.",
                            );
                            setTimeout(() => setSuccessMsg(""), 4000);
                            return;
                          }

                          try {
                            const { createAppeal } =
                              await import("@/lib/moderationSync");
                            const uid = activeUser
                              ? activeUser.id
                              : "anonymous";
                            const uName = activeUser
                              ? (activeUser?.firstName || "")
                              : name || "unknown";
                            await createAppeal({
                              user_id: uid,
                              user_name: uName,
                              reason: msg,
                            });
                          } catch (e) {
                            console.error("Failed to send appeal:", e);
                          }

                          localStorage.setItem(
                            `appealCount_${today}`,
                            (appealCount + 1).toString(),
                          );
                          const cooldowns = JSON.parse(
                            localStorage.getItem("appealCooldowns") || "{}",
                          );
                          const username = activeUser
                            ? (activeUser?.firstName || "")
                            : name || "unknown";
                          cooldowns[username] = Date.now() + 60000;
                          localStorage.setItem(
                            "appealCooldowns",
                            JSON.stringify(cooldowns),
                          );
                          setAppealCooldown(cooldowns[username]);

                          setSuccessMsg(
                            `Appeal sent successfully! (${3 - (appealCount + 1)} left today)`,
                          );
                          setTimeout(() => setSuccessMsg(""), 4000);
                          msgEl.value = "";
                        }}
                        style={{
                          padding: "10px 20px",
                          background: "#FF4444",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "0.85rem",
                        }}
                      >
                        Send Appeal
                      </button>
                    </div>
                    {successMsg && (
                      <div
                        style={{
                          marginTop: "10px",
                          color: successMsg.includes("Limit")
                            ? "#FF4444"
                            : "#44FF44",
                          fontSize: "0.85rem",
                          textAlign: "right",
                        }}
                      >
                        {successMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : penaltyExpiry ? (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                background: "rgba(255,165,0,0.1)",
                border: "1px solid orange",
                borderRadius: "8px",
                color: "orange",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "10px" }}>⏳</div>
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontFamily: "var(--font-outfit)",
                }}
              >
                Account Penalized
              </h3>
              <p
                style={{
                  margin: "0 0 15px 0",
                  fontSize: "0.9rem",
                  color: "var(--neon-white)",
                }}
              >
                You have been placed on timeout and cannot post at this time.
              </p>
              <div style={{ fontSize: "1.2rem", marginBottom: "20px" }}>
                Time Left:{" "}
                <LiveTimer
                  expiry={Number(penaltyExpiry)}
                  onExpire={() => {
                    setPenaltyExpiry(null);
                    const parsedUser = activeUser ? (activeUser?.firstName || "") : name;
                    const username = parsedUser || "unknown";
                    const penalties = JSON.parse(
                      localStorage.getItem("communityPenalties") || "{}",
                    );
                    delete penalties[username];
                    localStorage.setItem(
                      "communityPenalties",
                      JSON.stringify(penalties),
                    );
                  }}
                />
              </div>

              <div
                style={{
                  borderTop: "1px solid rgba(255,165,0,0.2)",
                  paddingTop: "15px",
                  marginTop: "10px",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    marginBottom: "10px",
                  }}
                >
                  Want to request early lifting of penalty? Send a message to
                  admin:
                </p>
                {appealCooldown ? (
                  <div
                    style={{
                      padding: "15px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "var(--neon-white)",
                    }}
                  >
                    <p style={{ margin: "0 0 10px 0", fontSize: "0.85rem" }}>
                      You recently sent an appeal. Please wait before sending
                      another one to avoid spamming.
                    </p>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        color: "var(--neon-yellow)",
                      }}
                    >
                      Cooldown:{" "}
                      <LiveTimer
                        expiry={Number(appealCooldown)}
                        onExpire={() => setAppealCooldown(null)}
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "10px",
                    }}
                  >
                    {successMsg ? (
                      <div
                        style={{
                          padding: "15px",
                          background: "rgba(0,255,0,0.1)",
                          border: "1px solid #00FF00",
                          borderRadius: "8px",
                          color: "#00FF00",
                          fontWeight: "bold",
                          textAlign: "center",
                          animation: "fadeIn 0.5s ease-in",
                        }}
                      >
                        ✅ {successMsg}
                      </div>
                    ) : (
                      <>
                        <MentionTextarea
                          id="appealMsgPenalty"
                          defaultValue="I apologize for my violation. I have reflected on my actions and kindly request an early lifting of my penalty."
                          placeholder="Type your apology/appeal here..."
                          style={{
                            width: "100%",
                            minHeight: "80px",
                            padding: "10px",
                            background: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(255,165,0,0.4)",
                            borderRadius: "6px",
                            color: "white",
                            outline: "none",
                            fontSize: "0.85rem",
                            resize: "none",
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            onClick={async () => {
                              const msgEl = document.getElementById(
                                "appealMsgPenalty",
                              ) as HTMLTextAreaElement;
                              const msg = msgEl.value;
                              if (!msg.trim()) return;

                              const today = new Date()
                                .toISOString()
                                .split("T")[0];
                              const appealCountRaw =
                                localStorage.getItem(`appealCount_${today}`) ||
                                "0";
                              let appealCount = parseInt(appealCountRaw, 10);

                              if (appealCount >= 3) {
                                setSuccessMsg(
                                  "❌ Limit reached! You can only appeal 3 times per day.",
                                );
                                setTimeout(() => setSuccessMsg(""), 4000);
                                return;
                              }

                              try {
                                const { createAppeal } =
                                  await import("@/lib/moderationSync");
                                const uid = activeUser
                                  ? activeUser.id
                                  : "anonymous";
                                const uName = activeUser
                                  ? (activeUser?.firstName || "")
                                  : name || "unknown";
                                await createAppeal({
                                  user_id: uid,
                                  user_name: uName,
                                  reason: msg,
                                });
                              } catch (e) {
                                console.error("Failed to send appeal:", e);
                              }

                              localStorage.setItem(
                                `appealCount_${today}`,
                                (appealCount + 1).toString(),
                              );
                              const cooldowns = JSON.parse(
                                localStorage.getItem("appealCooldowns") || "{}",
                              );
                              const username = activeUser
                                ? (activeUser?.firstName || "")
                                : name || "unknown";
                              cooldowns[username] = Date.now() + 60000;
                              localStorage.setItem(
                                "appealCooldowns",
                                JSON.stringify(cooldowns),
                              );
                              setAppealCooldown(cooldowns[username]);

                              setSuccessMsg(
                                `Appeal sent successfully! (${3 - (appealCount + 1)} left today)`,
                              );
                              setTimeout(() => setSuccessMsg(""), 4000);
                              msgEl.value = "";
                            }}
                            style={{
                              padding: "10px 20px",
                              background: "orange",
                              color: "black",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "0.85rem",
                            }}
                          >
                            Send Appeal
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <h2
                style={{
                  fontFamily: "var(--font-outfit)",
                  fontSize: "1.2rem",
                  marginBottom: "15px",
                  color: "var(--neon-white)",
                  transition: "color 0.3s ease",
                }}
              >
                Write a Shoutout
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
                  id="shoutoutMsg"
                  placeholder="What's on your mind? Drop a prayer, praise report, or camp moment!"
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
                  value={content}
                  onChange={(e: any) => {
                    e.target.style.height = "auto";
                    e.target.style.height =
                      Math.min(e.target.scrollHeight, 250) + "px";
                    setContent(e.target.value);
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
                    <strong
                      style={{
                        color:
                          isAnonymous && category === "Prayer Request"
                            ? "var(--text-muted)"
                            : "var(--neon-yellow)",
                        fontStyle:
                          isAnonymous && category === "Prayer Request"
                            ? "italic"
                            : "normal",
                      }}
                    >
                      {isAnonymous && category === "Prayer Request"
                        ? "Anonymous Heartist"
                        : activeUser
                          ? `${(activeUser?.firstName || "")} ${activeUser.lastName}`
                          : "Unknown User"}
                    </strong>
                  </div>
                  {category === "Prayer Request" && (
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        style={{ accentColor: "var(--neon-yellow)" }}
                      />
                      Post Anonymously
                    </label>
                  )}
                </div>

                {/* Category Dropdown for Post Creator */}
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    position: "relative",
                    flex: 1,
                    zIndex: 10,
                  }}
                >
                  <div
                    onClick={() =>
                      setIsCategoryDropdownOpen(!isCategoryDropdownOpen)
                    }
                    style={{
                      flex: 1,
                      minWidth: "150px",
                      background: "rgba(0,0,0,0.5)",
                      border: `1px solid ${getCategoryColor(category)}`,
                      boxShadow: isCategoryDropdownOpen
                        ? `0 0 10px ${getCategoryColor(category).replace("var(--neon-yellow)", "rgba(255,234,0,0.3)").replace("var(--neon-white)", "rgba(255,255,255,0.3)")}`
                        : "none",
                      borderRadius: "8px",
                      padding: "10px 15px",
                      color: getCategoryColor(category),
                      fontFamily: "var(--font-outfit)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {CATEGORIES.find((c) => c.id === category)?.label ||
                        category}
                    </span>
                    <span
                      style={{
                        transform: isCategoryDropdownOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.3s",
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {isCategoryDropdownOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        width: "100%",
                        background: "rgba(15,15,15,0.98)",
                        border: "1px solid transparent",
                        borderRadius: "8px",
                        marginTop: "8px",
                        overflow: "hidden",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.8)",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setCategory(c.id);
                            setIsCategoryDropdownOpen(false);
                          }}
                          style={{
                            padding: "10px 15px",
                            cursor: "pointer",
                            color:
                              category === c.id ? c.color : "var(--neon-white)",
                            background:
                              category === c.id
                                ? c.id === "Prayer Request"
                                  ? "rgba(255,234,0,0.1)"
                                  : "rgba(255,255,255,0.05)"
                                : "transparent",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            fontFamily: "var(--font-outfit)",
                            transition: "background 0.2s",
                          }}
                          onMouseOver={(e) => {
                            if (category !== c.id)
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.05)";
                          }}
                          onMouseOut={(e) => {
                            if (category !== c.id)
                              e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {c.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handlePost}
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
                }}
              >
                Post to Canvas
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
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "var(--neon-white)",
                    }}
                  ></span>
                  General Chat
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: "var(--neon-yellow)",
                    }}
                  ></span>
                  Prayer Request
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 2. The Canvas Feed */}
      {!isBlockedUser && !penaltyExpiry && (
        <section>
          {[
            {
              title: "Featured Posts",
              items: pinnedPosts,
              showDropdown: false,
            },
            {
              title: "Community Feed",
              items: filteredPosts,
              showDropdown: true,
            },
          ].map((feedSection, secIdx) => {
            if (feedSection.items.length === 0 && !feedSection.showDropdown)
              return null;
            return (
              <div
                key={feedSection.title}
                style={{
                  marginBottom: feedSection.showDropdown ? "0" : "50px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "30px",
                  }}
                >
                  <h2 className="section-title" style={{ margin: 0 }}>
                    {feedSection.title}
                  </h2>
                </div>

                {feedSection.showDropdown && (
                  <div
                    style={{
                      position: "relative",
                      marginBottom: "30px",
                      zIndex: 5,
                    }}
                  >
                    <div
                      onClick={() =>
                        setIsFilterDropdownOpen(!isFilterDropdownOpen)
                      }
                      style={{
                        width: "100%",
                        maxWidth: "250px",
                        padding: "12px 15px",
                        background: "rgba(0,0,0,0.5)",
                        border:
                          isFilterDropdownOpen || filterCategory !== "All"
                            ? `1px solid ${filterCategory === "Your Posts" ? "var(--neon-white)" : filterCategory === "Top Hearts" ? "#ff69b4" : getCategoryColor(filterCategory)}`
                            : "1px solid transparent",
                        color:
                          isFilterDropdownOpen || filterCategory !== "All"
                            ? filterCategory === "Your Posts"
                              ? "var(--neon-white)"
                              : filterCategory === "Top Hearts"
                                ? "#ff69b4"
                                : getCategoryColor(filterCategory)
                            : "var(--neon-white)",
                        boxShadow:
                          isFilterDropdownOpen || filterCategory !== "All"
                            ? `0 0 15px ${filterCategory === "Your Posts" ? "rgba(255,255,255,0.3)" : filterCategory === "Top Hearts" ? "rgba(255,105,180,0.3)" : getCategoryColor(filterCategory).replace("var(--neon-yellow)", "rgba(255,234,0,0.3)").replace("var(--neon-white)", "rgba(255,255,255,0.3)").replace("var(--neon-gold)", "rgba(204,164,0,0.3)")}`
                            : "none",
                        borderRadius: "12px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontFamily: "var(--font-outfit)",
                        fontSize: "0.95rem",
                      }}
                    >
                      <span>
                        {(() => {
                          if (filterCategory === "All") return "All Posts";
                          if (filterCategory === "General Chat")
                            return "⚪ General Chat";
                          if (filterCategory === "Prayer Request")
                            return "🟡 Prayer Request";
                          if (filterCategory === "Top Hearts")
                            return "💖 Top Hearts";
                          return filterCategory;
                        })()}
                      </span>
                      <span
                        style={{
                          transform: isFilterDropdownOpen
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.3s",
                        }}
                      >
                        ▼
                      </span>
                    </div>

                    {isFilterDropdownOpen && (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          width: "100%",
                          maxWidth: "250px",
                          background: "rgba(15,15,15,0.98)",
                          border: "1px solid transparent",
                          borderRadius: "12px",
                          marginTop: "8px",
                          overflow: "hidden",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.8)",
                          display: "flex",
                          flexDirection: "column",
                          maxHeight: "300px",
                          overflowY: "auto",
                        }}
                        className="custom-scrollbar"
                      >
                        {[
                          "All",
                          "Your Posts",
                          "Top Hearts",
                          ...CATEGORIES.map((c) => c.id),
                        ].map((option) => (
                          <div
                            key={option}
                            onClick={() => {
                              setFilterCategory(option);
                              setIsFilterDropdownOpen(false);
                            }}
                            style={{
                              padding: "12px 15px",
                              cursor: "pointer",
                              color:
                                filterCategory === option
                                  ? option === "Your Posts"
                                    ? "var(--neon-white)"
                                    : option === "Top Hearts"
                                      ? "#ff69b4"
                                      : getCategoryColor(option)
                                  : "var(--neon-white)",
                              background:
                                filterCategory === option
                                  ? option === "Prayer Request"
                                    ? "rgba(255,234,0,0.1)"
                                    : option === "Top Hearts"
                                      ? "rgba(255,105,180,0.1)"
                                      : "rgba(255,255,255,0.05)"
                                  : "transparent",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              fontFamily: "var(--font-outfit)",
                              fontSize: "0.9rem",
                              transition: "background 0.2s",
                            }}
                            onMouseOver={(e) => {
                              if (filterCategory !== option)
                                e.currentTarget.style.background =
                                  "rgba(255,255,255,0.05)";
                            }}
                            onMouseOut={(e) => {
                              if (filterCategory !== option)
                                e.currentTarget.style.background =
                                  "transparent";
                            }}
                          >
                            {(() => {
                              if (option === "All") return "All Posts";
                              if (option === "General Chat")
                                return "⚪ General Chat";
                              if (option === "Prayer Request")
                                return "🟡 Prayer Request";
                              if (option === "Top Hearts")
                                return "💖 Top Hearts";
                              return option;
                            })()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Feed */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {feedSection.items.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "var(--text-muted)",
                      }}
                    >
                      No shouts in this category yet. Be the first!
                    </div>
                  ) : (
                    (() => {
                      const accounts = allProfiles;
                      return feedSection.items.map((post) => {
                        if (deletedUIItems.includes(String(post.id))) {
                          return (
                            <div
                              key={post.id}
                              style={{
                                padding: "20px",
                                margin: "15px 0",
                                background: "rgba(255, 68, 68, 0.1)",
                                border: "1px dashed #FF4444",
                                borderRadius: "12px",
                                color: "#FF4444",
                                textAlign: "center",
                                fontStyle: "italic",
                                animation: "fadeIn 0.3s ease",
                              }}
                            >
                              This post has been deleted.
                            </div>
                          );
                        }
                        return (
                          <div
                            id={"post-" + post.id}
                            key={post.id}
                            onClick={(e) => {
                              // Prevent toggling if clicking on interactive elements like buttons, inputs, textareas, etc.
                              const target = e.target as HTMLElement;
                              if (
                                [
                                  "BUTTON",
                                  "INPUT",
                                  "TEXTAREA",
                                  "SPAN",
                                ].includes(target.tagName) &&
                                target.style.cursor === "pointer"
                              )
                                return;
                              if (
                                target.closest("button") ||
                                target.closest(".interactive-element")
                              )
                                return;

                              if (highlightId === String(post.id)) {
                                setHighlightId(null);
                                const url = new URL(window.location.href);
                                url.searchParams.delete("highlight");
                                window.history.replaceState({}, "", url);
                              } else {
                                setHighlightId(String(post.id));
                              }
                            }}
                            style={{
                              position: "relative",
                              padding: "20px",
                              cursor: "pointer",
                              borderRadius: "16px",
                              backdropFilter: "blur(10px)",
                              ...(feedSection.title === "Featured Posts"
                                ? {
                                    border: "1px solid #ff3366",
                                    boxShadow:
                                      "0 0 15px rgba(255, 51, 102, 0.4), inset 0 0 5px rgba(255, 51, 102, 0.1)",
                                    background: "rgba(0,0,0,0.6)",
                                  }
                                : highlightId === String(post.id) &&
                                    !adminHighlight
                                  ? {
                                      borderTop: "1px solid var(--neon-yellow)",
                                      borderRight:
                                        "1px solid var(--neon-yellow)",
                                      borderBottom:
                                        "1px solid var(--neon-yellow)",
                                      borderLeft:
                                        "4px solid var(--neon-yellow)",
                                      boxShadow:
                                        "0 0 30px rgba(255, 234, 0, 0.8), inset 0 0 15px rgba(255, 234, 0, 0.2)",
                                      transform: "scale(1.02)",
                                      background: "rgba(20, 20, 0, 0.9)",
                                      borderRadius: "15px",
                                      backdropFilter: "blur(10px)",
                                      zIndex: 10,
                                    }
                                  : {
                                      background: "rgba(0, 0, 0, 0.4)",
                                      borderTop:
                                        "1px solid rgba(255, 255, 255, 0.1)",
                                      borderRight:
                                        "1px solid rgba(255, 255, 255, 0.1)",
                                      borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.1)",
                                      borderLeft: `4px solid ${post.category === "Prayer Request" ? "var(--neon-yellow)" : "var(--neon-white)"}`,
                                      borderRadius: "15px",
                                      backdropFilter: "blur(10px)",
                                    }),
                              display: "flex",
                              flexDirection: "column",
                              gap: "15px",
                              transition: "all 0.3s ease",
                            }}
                          >
                            {feedSection.title === "Featured Posts" && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "-15px",
                                  right: "20px",
                                  fontSize: "1.8rem",
                                  zIndex: 5,
                                  textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                                }}
                              >
                                📌
                              </div>
                            )}
                            {reportedUIState.includes(post.id) && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  background: "rgba(10,10,10,0.85)",
                                  backdropFilter: "blur(4px)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderRadius: "16px",
                                  zIndex: 20,
                                  animation: "fadeOutReport 3s forwards",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#ff4444",
                                    fontWeight: "bold",
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  Report submitted to admin
                                </span>
                              </div>
                            )}
                            {!(
                              feedSection.title === "Featured Posts" &&
                              (!activeUser || activeUser.role !== "Admin")
                            ) && (
                              <div
                                className="menu-exclude"
                                onClick={() =>
                                  openMenuId === post.id
                                    ? closeMenu(post.id)
                                    : setOpenMenuId(post.id)
                                }
                                style={{
                                  position: "absolute",
                                  top: "15px",
                                  right: "15px",
                                  cursor: "pointer",
                                  fontSize: "1.2rem",
                                  fontWeight: "bold",
                                  padding: "5px 10px",
                                  color: "var(--text-muted)",
                                  letterSpacing: "0px",
                                }}
                              >
                                ...
                              </div>
                            )}

                            {post.isEdited && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "8px",
                                  right: "25px",
                                  fontSize: "0.75rem",
                                  fontStyle: "italic",
                                  opacity: 0.7,
                                  color: "var(--text-muted)",
                                  fontWeight: "normal",
                                }}
                              >
                                (Edited)
                              </div>
                            )}

                            {(openMenuId === post.id ||
                              closingMenuId === post.id) && (
                              <div
                                className="menu-exclude"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: "absolute",
                                  top: "50px",
                                  right: "20px",
                                  background: "rgba(10,10,10,0.95)",
                                  border: "1px solid transparent",
                                  borderRadius: "8px",
                                  padding: "10px 0",
                                  zIndex: 10,
                                  boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
                                  minWidth: "120px",
                                  display: "flex",
                                  flexDirection: "column",
                                  animation:
                                    closingMenuId === post.id
                                      ? "slideUpFadeOut 0.15s ease-in forwards"
                                      : "slideDownFadeIn 0.15s ease-out",
                                }}
                              >
                                {activeUser &&
                                  activeUser.role === "Admin" &&
                                  feedSection.title === "Featured Posts" && (
                                    <div
                                      onClick={async () => {
                                        closeMenu(post.id);
                                        const isFeatured =
                                          feedSection.title ===
                                            "Featured Posts" ||
                                          post.category === "Featured Posts" ||
                                          post.isPinned;

                                        try {
                                          const { createAnnouncement } =
                                            await import("@/lib/announcementsSync");
                                          await createAnnouncement({
                                            author_id:
                                              activeUser.id ||
                                              (activeUser?.firstName || ""),
                                            author_name:
                                              (activeUser?.firstName || "") +
                                              " " +
                                              activeUser.lastName,
                                            content: post.content,
                                            post_id:
                                              typeof post.id === "string" &&
                                              post.id.length === 36
                                                ? post.id
                                                : undefined,
                                            is_featured: isFeatured,
                                          });
                                        } catch (e) {
                                          console.error(e);
                                        }

                                        const existing = JSON.parse(
                                          localStorage.getItem(
                                            "communityAnnouncements",
                                          ) || "[]",
                                        );
                                        existing.push({
                                          id: Date.now(),
                                          content: post.content,
                                          timestamp: Date.now(),
                                          postId: post.id,
                                          isFeatured,
                                        });
                                        localStorage.setItem(
                                          "communityAnnouncements",
                                          JSON.stringify(existing),
                                        );
                                        window.dispatchEvent(
                                          new Event("storage"),
                                        );
                                        setToastMessage(
                                          "Added to announcements!",
                                        );
                                        setTimeout(
                                          () => setToastMessage(""),
                                          3000,
                                        );
                                      }}
                                      style={{
                                        padding: "10px 15px",
                                        color: "var(--neon-yellow)",
                                        cursor: "pointer",
                                        fontSize: "0.95rem",
                                        borderBottom:
                                          "1px solid rgba(255,255,255,0.1)",
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.background =
                                          "rgba(255,255,255,0.1)";
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.background =
                                          "transparent";
                                      }}
                                    >
                                      Add to Announcement
                                    </div>
                                  )}

                                {activeUser &&
                                (post.authorId === activeUser.id ||
                                  post.authorId === (activeUser?.firstName || "") ||
                                  post.username === (activeUser?.firstName || "") ||
                                  post.realName ===
                                    `${(activeUser?.firstName || "")} ${activeUser.lastName}`) ? (
                                  <>
                                    <div
                                      onClick={(e) => {
                                        closeMenu(post.id);
                                        if ((post.editCount || 0) >= 3) {
                                          e.preventDefault();
                                          return;
                                        }
                                        setEditPostId(post.id);
                                        setEditContent(post.content);
                                      }}
                                      style={{
                                        padding: "10px 15px",
                                        color: "var(--neon-white)",
                                        cursor:
                                          (post.editCount || 0) >= 3
                                            ? "not-allowed"
                                            : "pointer",
                                        fontSize: "0.95rem",
                                        opacity:
                                          (post.editCount || 0) >= 3 ? 0.3 : 1,
                                      }}
                                      onMouseOver={(e) => {
                                        if ((post.editCount || 0) < 3)
                                          e.currentTarget.style.background =
                                            "rgba(255,255,255,0.1)";
                                      }}
                                      onMouseOut={(e) => {
                                        if ((post.editCount || 0) < 3)
                                          e.currentTarget.style.background =
                                            "transparent";
                                      }}
                                    >
                                      Edit Post
                                    </div>
                                    <div
                                      onClick={() => {
                                        closeMenu(post.id);
                                        setUserPostToDelete(post.id);
                                      }}
                                      style={{
                                        padding: "10px 15px",
                                        color: "#FF4444",
                                        cursor: "pointer",
                                        fontSize: "0.95rem",
                                      }}
                                      onMouseOver={(e) => {
                                        e.currentTarget.style.background =
                                          "rgba(255,68,68,0.1)";
                                      }}
                                      onMouseOut={(e) => {
                                        e.currentTarget.style.background =
                                          "transparent";
                                      }}
                                    >
                                      Delete
                                    </div>
                                  </>
                                ) : (
                                  <div
                                    onClick={() => {
                                      closeMenu(post.id);
                                      handleInstantReport(
                                        post.id,
                                        "post",
                                        post.id,
                                      );
                                    }}
                                    style={{
                                      padding: "10px 15px",
                                      color: "#ff4444",
                                      cursor: "pointer",
                                      fontSize: "0.95rem",
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.background =
                                        "rgba(255,68,68,0.1)";
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.background =
                                        "transparent";
                                    }}
                                  >
                                    Report
                                  </div>
                                )}
                              </div>
                            )}
                            <div
                              style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "flex-start",
                                textAlign: "left",
                                width: "100%",
                              }}
                            >
                              <div
                                style={{
                                  position: "relative",
                                  flexShrink: 0,
                                }}
                              >
                                {(() => {
                                  const postAcc = accounts.find(
                                    (a: any) =>
                                      `${a.firstName} ${a.lastName || ""}`.trim() ===
                                        post.name ||
                                      a.firstName === post.name ||
                                      a.firstName === post.authorId,
                                  );
                                  let postTeamColor = "transparent";
                                  if (
                                    post.name === "Anonymous" ||
                                    post.name === "Anonymous Heartist" ||
                                    post.author === "Anonymous" ||
                                    post.author === "Anonymous Heartist"
                                  ) {
                                    postTeamColor = "transparent";
                                  } else if (postAcc) {
                                    postTeamColor =
                                      postAcc.team && postAcc.team !== "none"
                                        ? postAcc.team
                                        : "transparent";
                                  } else {
                                    postTeamColor =
                                      post.team && post.team !== "none"
                                        ? post.team
                                        : "transparent";
                                  }
                                  return (
                                    <div
                                      style={{
                                        minWidth: "45px",
                                        minHeight: "45px",
                                        width: "45px",
                                        height: "45px",
                                        borderRadius: "50%",
                                        background: "rgba(255,255,255,0.1)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "1.8rem",
                                        overflow: "hidden",
                                        border: `2px solid ${postTeamColor}`,
                                      }}
                                    >
                                      {post.name === "Anonymous" ||
                                      post.name === "Anonymous Heartist" ||
                                      post.author === "Anonymous" ||
                                      post.author === "Anonymous Heartist" ? (
                                        <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                                      ) : post.avatar &&
                                        post.avatar.length > 10 ? (
                                        <img
                                          src={post.avatar}
                                          alt="Avatar"
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                          }}
                                        />
                                      ) : (
      <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
  )}
                                    </div>
                                  );
                                })()}
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: "-2px",
                                    right: "-4px",
                                    fontSize: "1.1rem",
                                    background: "var(--bg-main)",
                                    borderRadius: "50%",
                                    padding: "2px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    lineHeight: 1,
                                  }}
                                >
                                  {(() => {
                                    const postAcc = accounts.find(
                                      (a: any) =>
                                        `${a.firstName} ${a.lastName || ""}`.trim() ===
                                          post.name ||
                                        a.firstName === post.name ||
                                        a.firstName === post.authorId,
                                    );
                                    const postRole =
                                      post.name === "Anonymous" ||
                                      post.name === "Anonymous Heartist" ||
                                      post.author === "Anonymous" ||
                                      post.author === "Anonymous Heartist"
                                        ? "anonymous"
                                        : postAcc?.badge ||
                                          post.role ||
                                          "Heartist";
                                    return getRoleIcon(postRole);
                                  })()}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "2px",
                                  flex: 1,
                                  textAlign: "left",
                                }}
                              >
                                <h3
                                  style={{
                                    fontSize: "1.1rem",
                                    fontFamily: "var(--font-outfit)",
                                    color: "var(--neon-white)",
                                    margin: 0,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    flexWrap: "wrap",
                                    justifyContent: "flex-start",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "var(--neon-yellow)",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {post.name}
                                  </span>
                                  {isPostAuthor(post) && (
                                    <span
                                      style={{
                                        color: "var(--neon-white)",
                                        fontSize: "0.85rem",
                                        fontWeight: "normal",
                                        opacity: 0.8,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      (you)
                                    </span>
                                  )}
                                </h3>
                                <div
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "var(--text-muted)",
                                    textAlign: "left",
                                    display: "flex",
                                    justifyContent: "flex-start",
                                  }}
                                >
                                  {formatTimeAgo(post.timestamp, "Just now")}
                                </div>
                              </div>
                            </div>

                            {editPostId === post.id ? (
                              <EditPostArea
                                initialContent={post.content}
                                isSaving={isSaving}
                                onSave={(newContent: string) => handleSaveEdit(post.id, newContent)}
                                onCancel={() => setEditPostId(null)}
                              />
                            ) : (
                              <>
                                <p
                                  style={{
                                    color: "var(--text-main)",
                                    fontSize: "1.05rem",
                                    lineHeight: "1.5",
                                    marginTop: "15px",
                                    whiteSpace: "pre-wrap",
                                    textAlign: "center",
                                    width: "100%",
                                  }}
                                >
                                  {post.content.length > 100 &&
                                  !expandedPosts.includes(post.id) ? (
                                    <>
                                      {renderWithMentions(
                                        post.content.substring(0, 100),
                                      )}
                                      <span
                                        onClick={() =>
                                          setExpandedPosts((prev) => [
                                            ...prev,
                                            post.id,
                                          ])
                                        }
                                        style={{
                                          color: "var(--neon-yellow)",
                                          fontWeight: "bold",
                                          cursor: "pointer",
                                          marginLeft: "5px",
                                          fontSize: "0.95rem",
                                        }}
                                      >
                                        See more
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      {renderWithMentions(post.content)}
                                      {post.content.length > 100 && (
                                        <span
                                          onClick={() =>
                                            setExpandedPosts((prev) =>
                                              prev.filter(
                                                (id) => id !== post.id,
                                              ),
                                            )
                                          }
                                          style={{
                                            color: "var(--neon-yellow)",
                                            fontWeight: "bold",
                                            cursor: "pointer",
                                            display: "block",
                                            marginTop: "8px",
                                            fontSize: "0.9rem",
                                          }}
                                        >
                                          See less
                                        </span>
                                      )}
                                    </>
                                  )}
                                </p>
                              </>
                            )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "center",
                                marginTop: "15px",
                                gap: "15px",
                                width: "100%",
                              }}
                            >
                              <div style={{ display: "flex", gap: "10px" }}>
                                <div
                                  style={{
                                    background: checkLiked(post)
                                      ? "rgba(255, 234, 0, 0.1)"
                                      : "rgba(255, 255, 255, 0.05)",
                                    border: checkLiked(post)
                                      ? "1px solid var(--neon-yellow)"
                                      : "1px solid rgba(255, 255, 255, 0.1)",
                                    boxShadow: checkLiked(post)
                                      ? "0 0 15px rgba(255, 234, 0, 0.5)"
                                      : "none",
                                    borderRadius: "20px",
                                    padding: "6px 16px",
                                    color: checkLiked(post)
                                      ? "var(--neon-yellow)"
                                      : "var(--text-muted)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontFamily: "var(--font-outfit)",
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLike(post.id);
                                    }}
                                    onMouseOver={(e) =>
                                      (e.currentTarget.style.opacity = "0.7")
                                    }
                                    onMouseOut={(e) =>
                                      (e.currentTarget.style.opacity = "1")
                                    }
                                    style={{
                                      cursor: "pointer",
                                      fontSize: "1.2rem",
                                      filter: "none",
                                      transform: checkLiked(post)
                                        ? "scale(1.1)"
                                        : "scale(1)",
                                      transition:
                                        "transform 0.3s, opacity 0.2s",
                                    }}
                                  >
                                    {post.category === "Prayer Request"
                                      ? "🙏"
                                      : checkLiked(post)
                                        ? "💛"
                                        : "🤍"}
                                  </span>
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReactionModalUsers(
                                        Array.isArray(post.likes)
                                          ? post.likes
                                          : [],
                                      );
                                    }}
                                    onMouseOver={(e) =>
                                      (e.currentTarget.style.textDecoration =
                                        "underline")
                                    }
                                    onMouseOut={(e) =>
                                      (e.currentTarget.style.textDecoration =
                                        "none")
                                    }
                                    style={{
                                      cursor: "pointer",
                                      transition: "all 0.2s ease",
                                    }}
                                  >
                                    {post.likes ? post.likes.length : 0}
                                  </span>
                                </div>

                                {!post.disableComments && !post.commentsDisabled && post.category !== "Prayer Request" && (
                                  <button
                                    onClick={() => {
                                      setOpenCommentId(post.id);
                                    }}
                                    style={{
                                      background: "rgba(255, 255, 255, 0.05)",
                                      border:
                                        "1px solid rgba(255, 255, 255, 0.1)",
                                      borderRadius: "20px",
                                      padding: "6px 16px",
                                      color: "var(--text-muted)",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      fontSize: "0.95rem",
                                      transition: "all 0.2s ease",
                                    }}
                                    onMouseOver={(e) => {
                                      e.currentTarget.style.background =
                                        "rgba(255, 255, 255, 0.1)";
                                      e.currentTarget.style.color = "white";
                                    }}
                                    onMouseOut={(e) => {
                                      e.currentTarget.style.background =
                                        "rgba(255, 255, 255, 0.05)";
                                      e.currentTarget.style.color =
                                        "var(--text-muted)";
                                    }}
                                  >
                                    <span style={{ fontSize: "1.2rem" }}>💬</span>
                                    <span>
                                      {(post.comments?.length || 0) +
                                        (post.comments?.reduce(
                                          (acc: number, c: any) =>
                                            acc + (c.replies?.length || 0),
                                          0,
                                        ) || 0)}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {userPostToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "20px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-main)",
              width: "100%",
              maxWidth: "400px",
              borderTop: "3px solid #FF4444",
              padding: "20px",
              animation: "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          >
            <h3
              style={{
                margin: "0 0 10px 0",
                color: "#FF4444",
                fontFamily: "var(--font-outfit)",
              }}
            >
              Delete Post
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "0.95rem",
                color: "var(--text-main)",
              }}
            >
              Are you sure you want to permanently delete this post?
            </p>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                onClick={() => setUserPostToDelete(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid transparent",
                  color: "var(--text-muted)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUserDelete}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.95)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#FF4444",
                  border: "1px solid #FF4444",
                  color: "#FFF",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  transition: "transform 0.2s",
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment/Reply Delete Confirmation Modal */}
      {itemToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "20px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-main)",
              width: "100%",
              maxWidth: "400px",
              borderTop: "3px solid #FF4444",
              padding: "20px",
              animation: "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          >
            <h3
              style={{
                margin: "0 0 10px 0",
                color: "#FF4444",
                fontFamily: "var(--font-outfit)",
              }}
            >
              Delete {itemToDelete.replyId ? "Reply" : "Comment"}
            </h3>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "0.95rem",
                color: "var(--text-main)",
              }}
            >
              Are you sure you want to permanently delete this{" "}
              {itemToDelete.replyId ? "reply" : "comment"}?
            </p>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                onClick={() => setItemToDelete(null)}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "transparent",
                  border: "1px solid transparent",
                  color: "var(--text-muted)",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmItemDelete}
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.95)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#FF4444",
                  border: "1px solid #FF4444",
                  color: "#FFF",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  transition: "transform 0.2s",
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Message */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "var(--neon-yellow)",
            color: "black",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: "bold",
            zIndex: 9999,
            animation: "fadeIn 0.3s ease",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}
        >
          {toastMessage}
        </div>
      )}
      {/* Reaction Modal */}
      {reactionModalUsers && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "20px",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-main)",
              width: "100%",
              maxWidth: "400px",
              border: "1px solid var(--neon-yellow)",
              borderTop: "4px solid var(--neon-yellow)",
              borderRadius: "12px",
              padding: "20px",
              animation: "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              boxShadow: "0 8px 30px rgba(255, 255, 0, 0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: "var(--neon-white)",
                  fontFamily: "var(--font-outfit)",
                }}
              >
                💛 Reactions
              </h3>
              <button
                onClick={() => setReactionModalUsers(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
              >
                x
              </button>
            </div>

            <div
              style={{
                maxHeight: "300px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                paddingRight: "5px",
              }}
            >
              {(() => {
                if (reactionModalUsers?.length === 0) {
                  return (
                    <p
                      style={{
                        color: "var(--text-muted)",
                        textAlign: "center",
                        fontSize: "0.9rem",
                        margin: "20px 0",
                      }}
                    >
                      No reactions yet.
                    </p>
                  );
                }
                const accounts = allProfiles;
                return reactionModalUsers?.map((user, idx) => {
                  const acc = accounts.find(
                    (a: any) =>
                      `${a.firstName} ${a.lastName || ""}`.trim() === user ||
                      a.firstName === user,
                  );
                  const fullName = acc
                    ? `${acc.firstName} ${acc.lastName || ""}`.trim()
                    : user;
                  const avatar = acc?.avatar;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px",
                        borderRadius: "8px",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      <div
                        style={{
                          width: "35px",
                          height: "35px",
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.2rem",
                          overflow: "hidden",
                          border: `2px solid ${acc?.team && acc.team !== "none" ? acc.team : "transparent"}`,
                        }}
                      >
                        {avatar &&
                        avatar.length > 10 &&
                        (avatar.startsWith("data:image") ||
                          avatar.startsWith("http")) ? (
                          <img
                            src={avatar}
                            alt="Avatar"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "1.2rem" }}>{fullName === "Anonymous Heartist" || !avatar || avatar.length < 10 ? <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <img src={avatar} alt="Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</span>
                        )}
                      </div>
                      <span
                        style={{
                          color: "var(--neon-white)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {fullName}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
      {/* Comment Modal */}
      {(() => {
        const modalPost =
          openCommentId !== null
            ? posts.find((p) => p.id === openCommentId)
            : null;
        if (!modalPost) return null;
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(5px)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "center",
              zIndex: 1050,
              overflowY: "auto",
              opacity: isClosingModal ? 0 : 1,
              transition: "opacity 0.4s ease",
            }}
          >
            <style>{`
              @keyframes modalSlideDown {
                0% { transform: translateY(100vh); opacity: 0; }
                100% { transform: translateY(0); opacity: 1; }
              }
              @keyframes modalSlideUp {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(100vh); opacity: 0; }
              }
            `}</style>
            <div
              style={{
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                background: "var(--card-bg)",
                width: "92%",
                maxWidth: "600px",
                height: "88vh",
                marginBottom: "2vh",
                padding: "20px",
                borderRadius: "24px",
                borderStyle: "solid",
                borderWidth: "1px",
                borderColor: "rgba(255,234,0,0.3)",
                boxShadow:
                  "0 0 30px rgba(0,0,0,0.5), 0 0 15px rgba(255,234,0,0.15)",
                animation: isClosingModal
                  ? "modalSlideUp 0.3s ease forwards"
                  : "modalSlideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                  paddingBottom: "15px",
                  zIndex: 10,
                  background: "var(--card-bg)",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: "var(--neon-white)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontFamily: "var(--font-outfit)",
                    fontSize: "1.5rem",
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>💬</span> Comments
                </h3>
                <button
                  onClick={handleCloseCommentModal}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "2rem",
                    lineHeight: 1,
                    transition: "color 0.2s",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = "white")}
                  onMouseOut={(e) =>
                    (e.currentTarget.style.color = "var(--text-muted)")
                  }
                >
                  &times;
                </button>
              </div>

              <div
                className="custom-scrollbar"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  paddingTop: "25px",
                  paddingRight: "10px",
                  paddingBottom: "10px",
                }}
              >
                {modalPost.comments && modalPost.comments.length > 0 ? (
                  (() => {
                    const accounts = allProfiles;
                    return modalPost.comments.map((comment: any) => {
                      const commentAcc = accounts.find(
                        (a: any) =>
                          `${a.firstName} ${a.lastName || ""}`.trim() ===
                            comment.author?.trim() || a.firstName === comment.author?.trim(),
                      );
                      const cRole = commentAcc?.badge || "Heartist";
                      const cTeam = commentAcc?.team || comment.team;
                      const isAnon = comment.author === "Anonymous Heartist";
                      const cAvatar = commentAcc?.avatar || comment.avatar;
                      const cName = commentAcc ? `${commentAcc.firstName || ""} ${commentAcc.lastName || ""}`.trim() : comment.author;

                      return (
                        <div
                          key={comment.id}
                          style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "flex-start",
                            position: "relative",
                            marginBottom: "15px",
                          }}
                        >
                          {reportedUIState.includes(comment.id) && (
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: "rgba(10,10,10,0.85)",
                                backdropFilter: "blur(4px)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: "12px",
                                zIndex: 20,
                                animation: "fadeOutReport 3s forwards",
                              }}
                            >
                              <span
                                style={{
                                  color: "#ff4444",
                                  fontWeight: "bold",
                                  fontSize: "1rem",
                                }}
                              >
                                Report submitted to admin
                              </span>
                            </div>
                          )}

                          {comment.replies && comment.replies.length > 0 && (
                            <div
                              style={{
                                position: "absolute",
                                left: "17px",
                                top: "36px",
                                bottom: "20px",
                                width: "2px",
                                background: "rgba(255,255,255,0.15)",
                                zIndex: 0,
                              }}
                            ></div>
                          )}

                          <div
                            style={{
                              position: "relative",
                              flexShrink: 0,
                              zIndex: 2,
                            }}
                          >
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.1)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                border: `2px solid ${cTeam && cTeam !== "none" ? cTeam : "transparent"}`,
                              }}
                            >
                              {cAvatar &&
                              typeof cAvatar === "string" &&
                              (cAvatar.startsWith("data:image") ||
                                cAvatar.startsWith("http")) ? (
                                <img
                                  src={cAvatar}
                                  alt="avatar"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : ( <span style={{fontSize: "1rem"}}>{cName === "Anonymous Heartist" || !cAvatar || cAvatar.length < 10 ? <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <img src={cAvatar} alt="Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</span> )}
                            </div>
                            <div
                              style={{
                                position: "absolute",
                                bottom: "-2px",
                                right: "-4px",
                                fontSize: "0.8rem",
                                background: "var(--bg-main)",
                                borderRadius: "50%",
                                padding: "2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                lineHeight: 1,
                              }}
                            >
                              {getRoleIcon(cRole)}
                            </div>
                          </div>

                          <div
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                background: "rgba(255,255,255,0.05)",
                                borderRadius: "16px",
                                padding: "10px 15px",
                                border: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  marginBottom: "8px",
                                  position: "relative",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: "bold",
                                      color: "var(--neon-white)",
                                      fontSize: "0.95rem",
                                    }}
                                  >
                                    {isAnon
                                      ? "Anonymous Heartist"
                                      : cName}
                                  </span>
                                  {(isSelf(comment.author) || (activeUser && (comment.authorId === activeUser.id || comment.authorId === (activeUser?.firstName || "")))) && (
                                    <span
                                      style={{
                                        color: "var(--neon-white)",
                                        fontSize: "0.85rem",
                                        fontWeight: "normal",
                                        opacity: 0.8,
                                      }}
                                    >
                                      (you)
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    position: "absolute",
                                    top: 0,
                                    right: 0,
                                  }}
                                >
                                  <div
                                    className="menu-exclude"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openMenuId === comment.id
                                        ? closeMenu(comment.id)
                                        : setOpenMenuId(comment.id);
                                    }}
                                    style={{
                                      cursor: "pointer",
                                      fontSize: "1.2rem",
                                      fontWeight: "bold",
                                      padding: "0 5px",
                                      color: "var(--text-muted)",
                                      letterSpacing: "0px",
                                    }}
                                  >
                                    ...
                                  </div>
                                  {(openMenuId === comment.id ||
                                    closingMenuId === comment.id) && (
                                    <div
                                      className="menu-exclude"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        position: "absolute",
                                        top: "100%",
                                        right: "0",
                                        background: "#222",
                                        border: "1px solid #444",
                                        borderRadius: "8px",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                                        zIndex: 100,
                                        overflow: "hidden",
                                        minWidth: "120px",
                                        textAlign: "left",
                                        animation:
                                          closingMenuId === comment.id
                                            ? "slideUpFadeOut 0.15s ease-in forwards"
                                            : "slideDownFadeIn 0.15s ease-out",
                                      }}
                                    >
                                      {activeUser?.role === "admin" ||
                                      isSelf(comment.author) ? (
                                        <>
                                          <div
                                            onClick={() => {
                                              closeMenu(comment.id);
                                              if (comment.editCount >= 3)
                                                return;
                                              setEditItem({
                                                id: comment.id,
                                                type: "comment",
                                                content: comment.content,
                                                editCount:
                                                  comment.editCount || 0,
                                              });
                                            }}
                                            style={{
                                              padding: "10px 15px",
                                              color:
                                                comment.editCount >= 3
                                                  ? "#555"
                                                  : "var(--neon-white)",
                                              cursor:
                                                comment.editCount >= 3
                                                  ? "not-allowed"
                                                  : "pointer",
                                              fontSize: "0.95rem",
                                              borderBottom: "1px solid #333",
                                            }}
                                          >
                                            {comment.editCount >= 3
                                              ? "Edit Limit Reached"
                                              : "Edit"}
                                          </div>
                                          <div
                                            onClick={() => {
                                              closeMenu(comment.id);
                                              setItemToDelete({
                                                postId: modalPost.id,
                                                commentId: comment.id,
                                              });
                                            }}
                                            style={{
                                              padding: "10px 15px",
                                              color: "#FF4444",
                                              cursor: "pointer",
                                              fontSize: "0.95rem",
                                            }}
                                          >
                                            Delete
                                          </div>
                                        </>
                                      ) : (
                                        <div
                                          onClick={() => {
                                            closeMenu(comment.id);
                                            handleInstantReport(
                                              modalPost.id,
                                              "comment",
                                              comment.id,
                                            );
                                          }}
                                          style={{
                                            padding: "10px 15px",
                                            color: "#FFaa00",
                                            cursor: "pointer",
                                            fontSize: "0.95rem",
                                          }}
                                        >
                                          Report
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div
                                onClick={() => {
                                  if (comment.content.length > 100)
                                    toggleCommentExpand(comment.id);
                                }}
                                style={{
                                  cursor:
                                    comment.content.length > 100
                                      ? "pointer"
                                      : "default",
                                }}
                              >
                                {editItem?.id === comment.id &&
                                editItem?.type === "comment" ? (
                                  <EditItemArea
                                    initialContent={editItem.content}
                                    isSaving={isSaving}
                                    onSave={(newContent: string) => handleEditCommentSubmit(modalPost.id, comment.id, newContent, editItem.editCount)}
                                    onCancel={() => setEditItem(null)}
                                  />
                                ) : (
                                  <>
                                    <div
                                      style={{
                                        color: "rgba(255,255,255,0.85)",
                                        fontSize: "0.95rem",
                                        lineHeight: 1.5,
                                        whiteSpace: "pre-wrap",
                                        maxHeight:
                                          !expandedComments.includes(
                                            comment.id,
                                          ) && comment.content.length > 100
                                            ? "68px"
                                            : "1000px",
                                        overflow: "hidden",
                                        transition: "max-height 0.4s ease",
                                        position: "relative",
                                      }}
                                    >
                                      {renderWithMentions(comment.content)}
                                    </div>
                                    {comment.content.length > 100 && (
                                      <div
                                        style={{
                                          color: "var(--neon-yellow)",
                                          fontWeight: "bold",
                                          marginTop: "5px",
                                          fontSize: "0.9rem",
                                        }}
                                      >
                                        {expandedComments.includes(comment.id)
                                          ? "See less"
                                          : "See more..."}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "flex-end",
                                  alignItems: "center",
                                  marginTop: "4px",
                                  gap: "5px",
                                }}
                              >
                                {comment.isEdited && (
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      fontStyle: "italic",
                                      opacity: 0.7,
                                      color: "var(--text-muted)",
                                      marginRight: "4px",
                                    }}
                                  >
                                    (Edited)
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {formatTimeAgo(comment.timestamp, "Just now")}
                                </span>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: "15px",
                                marginTop: "10px",
                                fontSize: "0.85rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <span
                                  onClick={() =>
                                    handleCommentLike(modalPost.id, comment.id)
                                  }
                                  style={{
                                    cursor: "pointer",
                                    fontSize: "1.1rem",
                                    transition: "transform 0.2s ease",
                                  }}
                                  onMouseDown={(e) =>
                                    (e.currentTarget.style.transform =
                                      "scale(0.8)")
                                  }
                                  onMouseUp={(e) =>
                                    (e.currentTarget.style.transform =
                                      "scale(1)")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.transform =
                                      "scale(1)")
                                  }
                                >
                                  {checkCommentLiked(comment) ? "💛" : "🤍"}
                                </span>
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setReactionModalUsers(
                                      Array.isArray(comment.likes)
                                        ? comment.likes
                                        : [],
                                    );
                                  }}
                                  onMouseOver={(e) =>
                                    (e.currentTarget.style.textDecoration =
                                      "underline")
                                  }
                                  onMouseOut={(e) =>
                                    (e.currentTarget.style.textDecoration =
                                      "none")
                                  }
                                  style={{
                                    cursor: "pointer",
                                    transition: "all 0.2s ease",
                                  }}
                                >
                                  {comment.likes ? comment.likes.length : 0}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  const mentionStr = isSelf(comment.author)
                                    ? ""
                                    : `@\u200B${isAnon ? "Anonymous Heartist" : comment.author} `;
                                  if (
                                    replyCommentId === comment.id &&
                                    replyDefaultValue === mentionStr
                                  ) {
                                    closeReplyBox(comment.id);
                                  } else {
                                    setReplyCommentId(comment.id);
                                    setReplyDefaultValue(mentionStr);
                                    setClearReplyKey((k) => k + 1);
                                  }
                                }}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  fontSize: "0.85rem",
                                }}
                              >
                                Reply
                              </button>
                            </div>

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "12px",
                                  marginTop: "8px",
                                  marginLeft: "-12px",
                                  position: "relative",
                                }}
                              >
                                {(() => {
                                  const isExpanded =
                                    expandedRepliesForComment.includes(
                                      comment.id,
                                    );
                                  const visibleReplies = isExpanded
                                    ? comment.replies
                                    : comment.replies.slice(0, 1);
                                  return (
                                    <>
                                      {visibleReplies.map((reply: any) => {
                                        const replyAcc = accounts.find(
                                          (a: any) =>
                                            `${a.firstName} ${a.lastName || ""}`.trim() ===
                                              reply.author?.trim() ||
                                            a.firstName === reply.author?.trim(),
                                        );
                                        const rRole =
                                          replyAcc?.badge || "Heartist";
                                        const rTeam =
                                          replyAcc?.team || reply.team;
                                        const isRAnon =
                                          reply.author === "Anonymous Heartist";
                                        const rAvatar = replyAcc?.avatar || reply.avatar;
                                        const rName = replyAcc ? `${replyAcc.firstName || ""} ${replyAcc.lastName || ""}`.trim() : reply.author;

                                        return (
                                          <div
                                            key={reply.id}
                                            style={{
                                              display: "flex",
                                              gap: "10px",
                                              alignItems: "flex-start",
                                              position: "relative",
                                            }}
                                          >
                                            {reportedUIState.includes(
                                              reply.id,
                                            ) && (
                                              <div
                                                style={{
                                                  position: "absolute",
                                                  top: 0,
                                                  left: 0,
                                                  right: 0,
                                                  bottom: 0,
                                                  background:
                                                    "rgba(10,10,10,0.85)",
                                                  backdropFilter: "blur(4px)",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  borderRadius: "12px",
                                                  zIndex: 20,
                                                  animation:
                                                    "fadeOutReport 3s forwards",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    color: "#ff4444",
                                                    fontWeight: "bold",
                                                    fontSize: "0.9rem",
                                                  }}
                                                >
                                                  Report submitted to admin
                                                </span>
                                              </div>
                                            )}
                                            {/* Horizontal Line perfectly connecting to vertical line (at 18px relative to main container) */}
                                            <div
                                              style={{
                                                position: "absolute",
                                                left: "-18px",
                                                top: "16px",
                                                width: "18px",
                                                height: "2px",
                                                background:
                                                  "rgba(255,255,255,0.15)",
                                                zIndex: 0,
                                              }}
                                            ></div>

                                            <div
                                              style={{
                                                position: "relative",
                                                flexShrink: 0,
                                                zIndex: 2,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  width: "32px",
                                                  height: "32px",
                                                  borderRadius: "50%",
                                                  background:
                                                    "rgba(255,255,255,0.1)",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  overflow: "hidden",
                                                  fontSize: "1.1rem",
                                                  border: `2px solid ${rTeam && rTeam !== "none" ? rTeam : "transparent"}`,
                                                }}
                                              >
                                                {rAvatar &&
                                                typeof rAvatar ===
                                                  "string" &&
                                                (rAvatar.startsWith(
                                                  "data:image",
                                                ) ||
                                                  rAvatar.startsWith(
                                                    "http",
                                                  )) ? (
                                                  <img
                                                    src={rAvatar}
                                                    alt="Avatar"
                                                    style={{
                                                      width: "100%",
                                                      height: "100%",
                                                      objectFit: "cover",
                                                    }}
                                                  />
                                                ) : ( <span style={{fontSize: "0.9rem"}}>{isRAnon || !rAvatar || rAvatar.length < 10 ? <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <img src={rAvatar} alt="Avatar" style={{width:"100%",height:"100%",objectFit:"cover"}}/>}</span> )}
                                              </div>
                                              <div
                                                style={{
                                                  position: "absolute",
                                                  bottom: "-2px",
                                                  right: "-4px",
                                                  fontSize: "0.75rem",
                                                  background: "var(--bg-main)",
                                                  borderRadius: "50%",
                                                  padding: "2px",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                  lineHeight: 1,
                                                }}
                                              >
                                                {getRoleIcon(rRole)}
                                              </div>
                                            </div>
                                            <div
                                              style={{
                                                flex: 1,
                                                minWidth: 0,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  width: "100%",
                                                  display: "flex",
                                                  flexDirection: "column",
                                                  background:
                                                    "rgba(255,255,255,0.03)",
                                                  border:
                                                    "1px solid rgba(255,255,255,0.05)",
                                                  padding: "10px 15px",
                                                  borderRadius: "12px",
                                                  borderTopLeftRadius: "2px",
                                                  marginBottom: "4px",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    marginBottom: "8px",
                                                    position: "relative",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: "8px",
                                                    }}
                                                  >
                                                    <span
                                                      style={{
                                                        fontWeight: "bold",
                                                        fontSize: "0.9rem",
                                                        color:
                                                          "var(--neon-white)",
                                                      }}
                                                    >
                                                      {isRAnon
                                                        ? "Anonymous Heartist"
                                                        : rName}
                                                    </span>
                                                    {(isSelf(reply.author) || (activeUser && (reply.authorId === activeUser.id || reply.authorId === (activeUser?.firstName || "")))) && (
                                                      <span
                                                        style={{
                                                          color: "var(--neon-white)",
                                                          fontSize: "0.85rem",
                                                          fontWeight: "normal",
                                                          opacity: 0.8,
                                                        }}
                                                      >
                                                        (you)
                                                      </span>
                                                    )}
                                                  </div>

                                                  <div
                                                    style={{
                                                      position: "absolute",
                                                      top: 0,
                                                      right: 0,
                                                    }}
                                                  >
                                                    <div
                                                      className="menu-exclude"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openMenuId === reply.id
                                                          ? closeMenu(reply.id)
                                                          : setOpenMenuId(
                                                              reply.id,
                                                            );
                                                      }}
                                                      style={{
                                                        cursor: "pointer",
                                                        fontSize: "1.2rem",
                                                        fontWeight: "bold",
                                                        padding: "0 5px",
                                                        color:
                                                          "var(--text-muted)",
                                                        letterSpacing: "0px",
                                                      }}
                                                    >
                                                      ...
                                                    </div>
                                                    {(openMenuId === reply.id ||
                                                      closingMenuId ===
                                                        reply.id) && (
                                                      <div
                                                        className="menu-exclude"
                                                        onClick={(e) =>
                                                          e.stopPropagation()
                                                        }
                                                        style={{
                                                          position: "absolute",
                                                          top: "100%",
                                                          right: "0",
                                                          background: "#222",
                                                          border:
                                                            "1px solid #444",
                                                          borderRadius: "8px",
                                                          boxShadow:
                                                            "0 4px 12px rgba(0,0,0,0.5)",
                                                          zIndex: 100,
                                                          overflow: "hidden",
                                                          minWidth: "120px",
                                                          textAlign: "left",
                                                          animation:
                                                            closingMenuId ===
                                                            reply.id
                                                              ? "slideUpFadeOut 0.15s ease-in forwards"
                                                              : "slideDownFadeIn 0.15s ease-out",
                                                        }}
                                                      >
                                                        {activeUser?.role ===
                                                          "admin" ||
                                                        isSelf(reply.author) ? (
                                                          <>
                                                            <div
                                                              onClick={() => {
                                                                closeMenu(
                                                                  reply.id,
                                                                );
                                                                if (
                                                                  reply.editCount >=
                                                                  3
                                                                )
                                                                  return;
                                                                setEditItem({
                                                                  id: reply.id,
                                                                  type: "reply",
                                                                  content:
                                                                    reply.content,
                                                                  editCount:
                                                                    reply.editCount ||
                                                                    0,
                                                                });
                                                              }}
                                                              style={{
                                                                padding:
                                                                  "10px 15px",
                                                                color:
                                                                  reply.editCount >=
                                                                  3
                                                                    ? "#555"
                                                                    : "var(--neon-white)",
                                                                cursor:
                                                                  reply.editCount >=
                                                                  3
                                                                    ? "not-allowed"
                                                                    : "pointer",
                                                                fontSize:
                                                                  "0.95rem",
                                                                borderBottom:
                                                                  "1px solid #333",
                                                              }}
                                                            >
                                                              {reply.editCount >=
                                                              3
                                                                ? "Edit Limit Reached"
                                                                : "Edit"}
                                                            </div>
                                                            <div
                                                              onClick={() => {
                                                                closeMenu(
                                                                  reply.id,
                                                                );
                                                                setItemToDelete(
                                                                  {
                                                                    postId:
                                                                      modalPost.id,
                                                                    commentId:
                                                                      comment.id,
                                                                    replyId:
                                                                      reply.id,
                                                                  },
                                                                );
                                                              }}
                                                              style={{
                                                                padding:
                                                                  "10px 15px",
                                                                color:
                                                                  "#FF4444",
                                                                cursor:
                                                                  "pointer",
                                                                fontSize:
                                                                  "0.95rem",
                                                              }}
                                                            >
                                                              Delete
                                                            </div>
                                                          </>
                                                        ) : (
                                                          <div
                                                            onClick={() =>
                                                              handleInstantReport(
                                                                modalPost.id,
                                                                "reply",
                                                                reply.id,
                                                              )
                                                            }
                                                            style={{
                                                              padding:
                                                                "10px 15px",
                                                              color: "#FFaa00",
                                                              cursor: "pointer",
                                                              fontSize:
                                                                "0.95rem",
                                                            }}
                                                          >
                                                            Report
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                <div
                                                  onClick={() => {
                                                    if (
                                                      reply.content.length > 100
                                                    )
                                                      toggleCommentExpand(
                                                        reply.id,
                                                      );
                                                  }}
                                                  style={{
                                                    cursor:
                                                      reply.content.length > 100
                                                        ? "pointer"
                                                        : "default",
                                                  }}
                                                >
                                                  {editItem?.id === reply.id &&
                                                  editItem?.type === "reply" ? (
                                                    <EditItemArea
                                                      initialContent={editItem.content}
                                                      isSaving={isSaving}
                                                      onSave={(newContent: string) => handleEditCommentSubmit(modalPost.id, reply.id, newContent, editItem.editCount)}
                                                      onCancel={() => setEditItem(null)}
                                                    />
                                                  ) : (
                                                    <>
                                                      <div
                                                        style={{
                                                          fontSize: "0.95rem",
                                                          color:
                                                            "var(--text-main)",
                                                          lineHeight: "1.5",
                                                          wordBreak:
                                                            "break-word",
                                                          whiteSpace:
                                                            "pre-wrap",
                                                          maxHeight:
                                                            !expandedComments.includes(
                                                              reply.id,
                                                            ) &&
                                                            reply.content
                                                              .length > 100
                                                              ? "68px"
                                                              : "1000px",
                                                          overflow: "hidden",
                                                          transition:
                                                            "max-height 0.4s ease",
                                                          position: "relative",
                                                        }}
                                                      >
                                                        {renderWithMentions(
                                                          reply.content,
                                                        )}
                                                      </div>
                                                      {reply.content.length >
                                                        100 && (
                                                        <div
                                                          style={{
                                                            color:
                                                              "var(--neon-yellow)",
                                                            fontWeight: "bold",
                                                            marginTop: "5px",
                                                            fontSize: "0.9rem",
                                                          }}
                                                        >
                                                          {expandedComments.includes(
                                                            reply.id,
                                                          )
                                                            ? "See less"
                                                            : "See more..."}
                                                        </div>
                                                      )}
                                                    </>
                                                  )}
                                                </div>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    justifyContent: "flex-end",
                                                    alignItems: "center",
                                                    marginTop: "4px",
                                                    gap: "5px",
                                                  }}
                                                >
                                                  {reply.isEdited && (
                                                    <span
                                                      style={{
                                                        fontSize: "0.7rem",
                                                        fontStyle: "italic",
                                                        opacity: 0.7,
                                                        color:
                                                          "var(--text-muted)",
                                                        marginRight: "4px",
                                                      }}
                                                    >
                                                      (Edited)
                                                    </span>
                                                  )}
                                                  <span
                                                    style={{
                                                      fontSize: "0.75rem",
                                                      color:
                                                        "var(--text-muted)",
                                                    }}
                                                  >
                                                    {formatTimeAgo(
                                                      reply.timestamp,
                                                      "Just now",
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: "15px",
                                                  marginTop: "4px",
                                                  paddingLeft: "10px",
                                                  paddingRight: "10px",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "5px",
                                                    fontSize: "0.85rem",
                                                    color: "var(--text-muted)",
                                                  }}
                                                >
                                                  <span
                                                    onClick={() =>
                                                      handleReplyLike(
                                                        modalPost.id,
                                                        comment.id,
                                                        reply.id,
                                                      )
                                                    }
                                                    style={{
                                                      cursor: "pointer",
                                                      fontSize: "1.1rem",
                                                      transition:
                                                        "transform 0.2s ease",
                                                    }}
                                                    onMouseDown={(e) =>
                                                      (e.currentTarget.style.transform =
                                                        "scale(0.8)")
                                                    }
                                                    onMouseUp={(e) =>
                                                      (e.currentTarget.style.transform =
                                                        "scale(1)")
                                                    }
                                                    onMouseLeave={(e) =>
                                                      (e.currentTarget.style.transform =
                                                        "scale(1)")
                                                    }
                                                  >
                                                    {checkReplyLiked(reply)
                                                      ? "💛"
                                                      : "🤍"}
                                                  </span>
                                                  <span
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setReactionModalUsers(
                                                        Array.isArray(
                                                          reply.likes,
                                                        )
                                                          ? reply.likes
                                                          : [],
                                                      );
                                                    }}
                                                    onMouseOver={(e) =>
                                                      (e.currentTarget.style.textDecoration =
                                                        "underline")
                                                    }
                                                    onMouseOut={(e) =>
                                                      (e.currentTarget.style.textDecoration =
                                                        "none")
                                                    }
                                                    style={{
                                                      cursor: "pointer",
                                                      transition:
                                                        "all 0.2s ease",
                                                    }}
                                                  >
                                                    {reply.likes
                                                      ? reply.likes.length
                                                      : 0}
                                                  </span>
                                                </div>
                                                <button
                                                  onClick={() => {
                                                    const mentionStr = isSelf(
                                                      rName,
                                                    )
                                                      ? ""
                                                      : `@\u200B${isRAnon ? "Anonymous Heartist" : rName} `;
                                                    if (
                                                      replyCommentId ===
                                                        comment.id &&
                                                      replyDefaultValue ===
                                                        mentionStr
                                                    ) {
                                                      closeReplyBox(comment.id);
                                                    } else {
                                                      setReplyCommentId(
                                                        comment.id,
                                                      );
                                                      setReplyDefaultValue(
                                                        mentionStr,
                                                      );
                                                      setClearReplyKey(
                                                        (k) => k + 1,
                                                      );
                                                    }
                                                  }}
                                                  style={{
                                                    background: "transparent",
                                                    border: "none",
                                                    color: "var(--text-muted)",
                                                    cursor: "pointer",
                                                    fontSize: "0.85rem",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    padding: 0,
                                                  }}
                                                >
                                                  Reply
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {comment.replies.length > 1 && (
                                        <div
                                          style={{
                                            marginLeft: "55px",
                                            marginTop: "5px",
                                            marginBottom: "5px",
                                          }}
                                        >
                                          <button
                                            onClick={() =>
                                              setExpandedRepliesForComment(
                                                (prev) =>
                                                  prev.includes(comment.id)
                                                    ? prev.filter(
                                                        (id) =>
                                                          id !== comment.id,
                                                      )
                                                    : [...prev, comment.id],
                                              )
                                            }
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: "var(--neon-white)",
                                              fontSize: "0.85rem",
                                              cursor: "pointer",
                                              opacity: 0.7,
                                              padding: 0,
                                            }}
                                          >
                                            {isExpanded
                                              ? "Hide replies"
                                              : `See ${comment.replies.length - 1} more repl${comment.replies.length - 1 > 1 ? "ies" : "y"}...`}
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Reply Input Box */}
                            {(replyCommentId === comment.id ||
                              closingReplyCommentId === comment.id) && (
                              <div
                                style={{
                                  animation:
                                    closingReplyCommentId === comment.id
                                      ? "slideUpFadeOut 0.15s ease-in forwards"
                                      : "slideDownFadeIn 0.15s ease-out forwards",
                                  transformOrigin: "top",
                                }}
                              >
                                <IsolatedMentionTextarea
                                  id="replyInput"
                                  avatar={activeUser?.avatar}
                                  clearKey={clearReplyKey}
                                  onSubmit={(content: string) =>
                                    handleReplySubmit(
                                      modalPost.id,
                                      comment.id,
                                      content,
                                    )
                                  }
                                  placeholder="Write a reply..."
                                  style={{
                                    flex: 1,
                                    background: "rgba(0,0,0,0.2)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "8px",
                                    padding: "10px",
                                    color: "white",
                                    fontSize: "0.9rem",
                                    resize: "none",
                                    minHeight: "40px",
                                    fontFamily: "var(--font-outfit)",
                                  }}
                                  buttonStyle={{
                                    background: "var(--neon-yellow)",
                                    color: "black",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "0 15px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                  }}
                                  buttonText="Reply"
                                  isReply={true}
                                  initialValue={replyDefaultValue}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()
                ) : (
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.9rem",
                      textAlign: "center",
                      fontStyle: "italic",
                    }}
                  >
                    No comments yet. Be the first to comment!
                  </p>
                )}
              </div>

              {/* Add Comment Input */}
              <IsolatedMentionTextarea
                id="commentInput"
                avatar={activeUser?.avatar}
                clearKey={clearCommentKey}
                onSubmit={(content: string) =>
                  handleCommentSubmit(modalPost.id, content)
                }
                placeholder="Add a comment..."
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "10px",
                  color: "white",
                  fontSize: "0.95rem",
                  resize: "none",
                  minHeight: "45px",
                  fontFamily: "var(--font-outfit)",
                }}
                buttonStyle={{
                  background: "var(--neon-yellow)",
                  color: "black",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0 20px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
                buttonText="Send"
                isReply={false}
              />
            </div>
          </div>
        );
      })()}
    </main>
  );
}
