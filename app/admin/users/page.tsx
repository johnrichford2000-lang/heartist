// @ts-nocheck
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import AdminBottomNav from "@/components/AdminBottomNav";
import { supabase } from "@/lib/supabase";
import { formatCapitalizedName, formatFullName } from "@/utils/formatName";
import BadgeIcon, { BadgePill, BADGE_DEFINITIONS, getBadgeDefinition, normalizeBadgeId } from "@/components/BadgeIcon";

const ROLES = BADGE_DEFINITIONS;
const BASE_BADGE_IDS = ["first-timer", "camp-veteran", "supporter"];

const TEAMS = [
  "none", "green", "red", "blue", "yellow", "brown", 
  "black", "white", "skyblue", "pink", "orange"
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [userDefaultBadges, setUserDefaultBadges] = useState<Record<string, string>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [windowOrigin, setWindowOrigin] = useState("");

  const getUserDefaultBadge = (userId: string, currentBadge?: string): string => {
    if (userDefaultBadges[userId]) {
      return userDefaultBadges[userId];
    }
    const clean = normalizeBadgeId(currentBadge);
    if (clean && BASE_BADGE_IDS.includes(clean)) {
      return clean;
    }
    return "first-timer";
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowOrigin(window.location.origin);

      const defaultBadgesChannel = supabase
        .channel('user_default_badges_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'system_settings',
            filter: 'id=eq.user_default_badges'
          },
          (payload: any) => {
            if (payload.new?.value && typeof payload.new.value === 'object') {
              setUserDefaultBadges(payload.new.value);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(defaultBadgesChannel);
      };
    }
  }, []);

  const handleCopyInviteLink = () => {
    const origin = windowOrigin || (typeof window !== "undefined" ? window.location.origin : "");
    const link = `${origin}/login?invite=admin`;
    navigator.clipboard.writeText(link);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };
  
  // Modals state
  const [manageUser, setManageUser] = useState<any | null>(null);
  const [editBadge, setEditBadge] = useState("");
  const [isEditBadgeDropdownOpen, setIsEditBadgeDropdownOpen] = useState(false);
  const [editTeam, setEditTeam] = useState("");
  const [isEditTeamDropdownOpen, setIsEditTeamDropdownOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [banUser, setBanUser] = useState<any | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState("3");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent"); // "recent", "name", "age", "badge", "team"
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  
  const [ageFilter, setAgeFilter] = useState("all");
  const [isAgeDropdownOpen, setIsAgeDropdownOpen] = useState(false);
  
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [isBadgeDropdownOpen, setIsBadgeDropdownOpen] = useState(false);
  
  const [teamFilter, setTeamFilter] = useState("all");
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);

  
  useEffect(() => {
    if (manageUser || banUser) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
    }
    return () => { 
      document.body.style.overflow = "auto"; 
      document.documentElement.style.overflow = "auto";
    };
  }, [manageUser, banUser]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (data && !error) {
        // Auto-heal profiles in database if any names start with small letters
        const needHeal = data.filter(p => 
          (p.first_name && p.first_name !== formatCapitalizedName(p.first_name)) ||
          (p.last_name && p.last_name !== formatCapitalizedName(p.last_name))
        );
        if (needHeal.length > 0) {
          needHeal.forEach(async (p) => {
            await supabase.from('profiles').update({
              first_name: formatCapitalizedName(p.first_name || ""),
              last_name: formatCapitalizedName(p.last_name || "")
            }).eq('id', p.id);
          });
        }

        const mappedUsers = data.map(p => ({
          id: p.id,
          firstName: formatCapitalizedName(p.first_name || ""),
          lastName: formatCapitalizedName(p.last_name || ""),
          email: p.email,
          contact: p.contact_number,
          age: p.age,
          birthDate: p.birth_date,
          badge: p.badge,
          avatar: p.avatar_url,
          isBanned: p.is_banned,
          bannedUntil: p.banned_until,
          team: p.team || "none"
        }));
        setUsers(mappedUsers);

        // Fetch user default badges mapping from system_settings
        let defaultBadgesMap: Record<string, string> = {};
        try {
          const { data: defaultBadgesSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('id', 'user_default_badges')
            .maybeSingle();

          if (defaultBadgesSetting?.value && typeof defaultBadgesSetting.value === 'object') {
            defaultBadgesMap = { ...defaultBadgesSetting.value };
          }
        } catch(e) {}

        let mapChanged = false;
        data.forEach(p => {
          const norm = normalizeBadgeId(p.badge);
          if (!defaultBadgesMap[p.id] && norm && BASE_BADGE_IDS.includes(norm)) {
            defaultBadgesMap[p.id] = norm;
            mapChanged = true;
          }
        });
        if (mapChanged) {
          try {
            await supabase.from('system_settings').upsert({
              id: 'user_default_badges',
              value: defaultBadgesMap,
              updated_at: new Date().toISOString()
            });
          } catch(e) {}
        }
        setUserDefaultBadges(defaultBadgesMap);
      }
    } catch(e) {
      console.error("Error fetching users", e);
    }
  };

  
  const handleSaveUserUpdates = async () => {
    if (!manageUser) return;
    setIsSavingUser(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ badge: editBadge, team: editTeam })
        .eq('id', manageUser.id);
      
      if (!error) {
        // Send separate notifications if badge or team color changed
        const mBadge = manageUser.badge || "first-timer";
        const mTeam = manageUser.team || "none";
        const badgeChanged = normalizeBadgeId(mBadge) !== normalizeBadgeId(editBadge);
        const teamChanged = mTeam !== editTeam;

        if (badgeChanged || teamChanged) {
          const notifs = JSON.parse(localStorage.getItem("communityNotifications") || "[]");
          const activeAdmin = localStorage.getItem("activeAdmin");
          const activeUserStr = localStorage.getItem("activeUser");
          let adminName = activeAdmin || "Admin";
          if (activeAdmin && activeUserStr) {
             const au = JSON.parse(activeUserStr);
             if (au.id === `admin_${activeAdmin}`) {
               adminName = au.firstName || adminName;
             }
          } else if (activeUserStr) {
             adminName = JSON.parse(activeUserStr).firstName || "Admin";
          }
          const targetUserName = formatFullName(manageUser.firstName, manageUser.lastName);
          const badgeDef = getBadgeDefinition(editBadge);

          const itemsToSend: any[] = [];

          // 1. Separate notification for role badge change (contains only badge info)
          if (badgeChanged) {
            itemsToSend.push({
              id: `badge_update_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              type: "badge_update",
              fromUser: adminName,
              sourceName: adminName,
              users: [adminName, targetUserName],
              postAuthor: targetUserName,
              postContent: badgeDef.label,
              timestamp: Date.now(),
              read: false,
              postId: null,
              userId: manageUser.id,
              recipient_id: manageUser.id,
              badge: editBadge,
              badgeLabel: badgeDef.label,
              badgeColor: badgeDef.color,
              oldBadge: mBadge,
              badgeChanged: true,
              adminName
            });
          }

          // 2. Separate notification for team color change (contains only team info)
          if (teamChanged) {
            itemsToSend.push({
              id: `team_update_${Date.now() + 1}_${Math.random().toString(36).substring(2, 7)}`,
              type: editTeam === "none" ? "team_remove" : "team_add",
              fromUser: adminName,
              sourceName: adminName,
              users: [adminName, targetUserName],
              postAuthor: targetUserName,
              postContent: editTeam === "none" ? "None" : `Team ${editTeam}`,
              timestamp: Date.now() + 1,
              read: false,
              postId: null,
              userId: manageUser.id,
              recipient_id: manageUser.id,
              team: editTeam,
              oldTeam: mTeam,
              teamChanged: true,
              adminName
            });
          }

          for (const notifItem of itemsToSend) {
            notifs.push(notifItem);

            // 1. Insert into Supabase notifications table for user ID and Full Name with post_id: null (prevent uuid syntax error)
            try {
              const rowsToInsert: any[] = [
                {
                  sender_id: "admin",
                  sender_name: adminName,
                  recipient_id: manageUser.id,
                  type: notifItem.type,
                  message: JSON.stringify(notifItem),
                  is_read: false,
                  post_id: null
                }
              ];
              if (targetUserName && targetUserName !== manageUser.id) {
                rowsToInsert.push({
                  sender_id: "admin",
                  sender_name: adminName,
                  recipient_id: targetUserName,
                  type: notifItem.type,
                  message: JSON.stringify(notifItem),
                  is_read: false,
                  post_id: null
                });
              }
              await supabase.from('notifications').insert(rowsToInsert);
            } catch (err) {
              console.error("Error inserting notification", err);
            }

            // 2. Broadcast realtime event on public-notifications channel
            try {
              supabase.channel('public-notifications').send({
                type: 'broadcast',
                event: 'new_notif',
                payload: notifItem
              });
            } catch (err) {}
          }

          localStorage.setItem("communityNotifications", JSON.stringify(notifs));
          window.dispatchEvent(new Event("storage"));
        }

        setUsers(users.map(u => u.id === manageUser.id ? { ...u, badge: editBadge, team: editTeam } : u));

        // Update userDefaultBadges map in system_settings if needed
        const updatedDefaultBadges = { ...userDefaultBadges };
        const normCurrent = normalizeBadgeId(mBadge);
        const normEdit = normalizeBadgeId(editBadge);

        if (!updatedDefaultBadges[manageUser.id] && BASE_BADGE_IDS.includes(normCurrent)) {
          updatedDefaultBadges[manageUser.id] = normCurrent;
        }
        if (BASE_BADGE_IDS.includes(normEdit)) {
          updatedDefaultBadges[manageUser.id] = normEdit;
        }
        setUserDefaultBadges(updatedDefaultBadges);
        try {
          await supabase.from('system_settings').upsert({
            id: 'user_default_badges',
            value: updatedDefaultBadges,
            updated_at: new Date().toISOString()
          });
        } catch(e) {}

        setManageUser(null);
        
        // Broadcast the team change globally for real-time update
        const accsStr = localStorage.getItem("registeredAccounts");
        if (accsStr) {
          let accs = JSON.parse(accsStr);
          const match = accs.find((a: any) => (a.firstName || '').toLowerCase() === (manageUser.firstName || '').toLowerCase() && (a.lastName || '').toLowerCase() === (manageUser.lastName || '').toLowerCase());
          if (match) {
            match.badge = editBadge;
            match.team = editTeam;
          } else {
             accs.push({ firstName: formatCapitalizedName(manageUser.firstName), lastName: formatCapitalizedName(manageUser.lastName), avatar: manageUser.avatar || manageUser.avatar_url, badge: editBadge, team: editTeam });
          }
          localStorage.setItem("registeredAccounts", JSON.stringify(accs));
          
          // ALSO UPDATE communityPosts locally!
          let postsStr = localStorage.getItem("communityPosts");
          if (postsStr) {
            let posts = JSON.parse(postsStr);
            const enrich = (item: any, nameProp="name") => {
                if (item[nameProp] === `${manageUser.firstName} ${manageUser.lastName}` || item[nameProp] === manageUser.firstName || item.authorId === manageUser.firstName) {
                    item.team = editTeam;
                    item.role = editBadge;
                }
            };
            posts.forEach((post: any) => {
              enrich(post, "name");
              (post.comments || []).forEach((comment: any) => {
                enrich(comment, "author");
                (comment.replies || []).forEach((reply: any) => {
                  enrich(reply, "author");
                });
              });
            });
            localStorage.setItem("communityPosts", JSON.stringify(posts));
          }
          window.dispatchEvent(new Event("storage"));
        }
      }
    } catch(e) {
      console.error("Error updating user", e);
    }
    setIsSavingUser(false);
  };

  useEffect(() => {
    if (localStorage.getItem("isAdminLoggedIn") !== "true") {
      window.location.href = "/login";
    } else {
      setIsLoggedIn(true);
      fetchUsers();
    }
  }, []);

  const handleBanSubmit = async () => {
    if (!banUser) return;
    
    const days = parseInt(banDays);
    const bannedUntil = new Date();
    bannedUntil.setDate(bannedUntil.getDate() + days);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: true,
          banned_until: bannedUntil.toISOString(),
          ban_reason: banReason || "Violation of community guidelines."
        })
        .eq('id', banUser.id);
        
      if (!error) {
        setBanUser(null);
        setBanReason("");
        setBanDays("3");
        fetchUsers(); // Refresh the list
      } else {
        showToast("Failed to ban user.");
      }
    } catch (e) {
      console.error(e);
      showToast("Error processing ban.");
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: false,
          banned_until: null,
          ban_reason: null
        })
        .eq('id', userId);
        
      if (!error) {
        fetchUsers(); // Refresh the list
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ----- RENDERING LOGIC & HELPER -----

  
  const calculateAge = (birthDate, legacyAge) => {
    if (birthDate) {
      const birth = new Date(birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age;
    }
    return parseInt(legacyAge) || -1;
  };

  const getAgeBracket = (ageStr: string | number) => {
    const age = parseInt(ageStr) || -1;
    if (age < 0) return "Unknown";
    if (age <= 9) return "0-9";
    if (age <= 19) return "10-19";
    if (age <= 29) return "20-29";
    if (age <= 39) return "30-39";
    if (age <= 49) return "40-49";
    if (age <= 59) return "50-59";
    return "60+";
  };

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === "name") {
      const nameA = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
      const nameB = `${b.firstName || ""} ${b.lastName || ""}`.toLowerCase();
      return nameA.localeCompare(nameB);
    } else if (sortBy === "age") {
      const ageA = calculateAge(a.birthDate, a.age) === -1 ? 999 : calculateAge(a.birthDate, a.age);
      const ageB = calculateAge(b.birthDate, b.age) === -1 ? 999 : calculateAge(b.birthDate, b.age);
      return ageA - ageB;
    } else if (sortBy === "badge") {
      const badgeA = a.badge || "";
      const badgeB = b.badge || "";
      return badgeA.localeCompare(badgeB);
    } else if (sortBy === "team") {
      const teamA = a.team || "none";
      const teamB = b.team || "none";
      return teamA.localeCompare(teamB);
    }
    return 0; // "recent"
  });

  // Apply search filter
  let displayUsers = sortedUsers.filter(u => `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase().includes(searchTerm.toLowerCase()));

  // Apply age bracket filter if active
  if (sortBy === "age" && ageFilter !== "all") {
    displayUsers = displayUsers.filter(u => getAgeBracket(calculateAge(u.birthDate, u.age)) === ageFilter);
  }
  
  // Apply badge filter if active
  if (sortBy === "badge" && badgeFilter !== "all") {
    displayUsers = displayUsers.filter(u => (u.badge || "") === badgeFilter);
  }
  
  // Apply team filter if active
  if (sortBy === "team" && teamFilter !== "all") {
    displayUsers = displayUsers.filter(u => (u.team || "none").toLowerCase() === teamFilter.toLowerCase());
  }

  const renderUserCard = (user: any) => (
    <div key={user.id} className="card" style={{ 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center", 
      padding: "20px", 
      background: user.isBanned ? "rgba(255,0,0,0.05)" : "var(--bg-card)",
      border: user.isBanned ? "1px solid rgba(255,0,0,0.3)" : "1px solid rgba(255,255,255,0.1)",
      borderRadius: "15px",
      flexWrap: "wrap",
      gap: "20px"
    }}>
      
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        {/* Avatar with Badge */}
        <div style={{ position: "relative", width: "60px", height: "60px" }}>
          {typeof user.avatar === 'string' && user.avatar.startsWith('http') ? (
            <img 
              src={user.avatar} 
              alt={user.firstName} 
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: `2px solid ${user.team && user.team !== 'none' ? user.team : 'transparent'}` }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "transparent", color: "var(--neon-yellow)", display: "flex", justifyContent: "center", alignItems: "center", fontWeight: "900", textTransform: "uppercase", fontSize: "2rem", fontFamily: "var(--font-outfit)", border: `2px solid ${user.team && user.team !== 'none' ? user.team : 'transparent'}` }}>
              {((user.firstName?.[0] || "") + (user.lastName?.[0] || "")).toUpperCase()}
            </div>
          )}
          
          {/* Small Badge icon on bottom right */}
          <div 
            title={getBadgeDefinition(user.badge).label}
            style={{
              position: "absolute",
              bottom: "-5px",
              right: "-5px",
              background: "rgba(10, 10, 14, 0.95)",
              borderRadius: "50%",
              padding: "4px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              border: `1px solid ${getBadgeDefinition(user.badge).color}80`,
              boxShadow: `0 0 8px ${getBadgeDefinition(user.badge).color}33`
            }}
          >
            <BadgeIcon badge={user.badge} size={14} color={getBadgeDefinition(user.badge).color} />
          </div>
        </div>

        {/* Name and Badge */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h4 style={{ margin: 0, color: user.isBanned ? "#FF4444" : "var(--neon-white)", fontSize: "1.2rem", fontFamily: "var(--font-outfit)", textTransform: "capitalize" }}>
              {formatFullName(user.firstName, user.lastName)} {user.isBanned && "(BANNED)"}
            </h4>
            <BadgePill badge={user.badge} size={13} />
          </div>
          <p style={{ margin: "5px 0 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {user.email}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button 
          onClick={() => {
            setManageUser(user);
            setEditBadge(user.badge || "first-timer");
            setEditTeam(user.team || "none");
            setIsEditBadgeDropdownOpen(false);
            setIsEditTeamDropdownOpen(false);
          }}
          style={{ 
            padding: "8px 15px", 
            background: "rgba(0, 100, 255, 0.1)", 
            border: "1px solid var(--neon-blue)", 
            color: "var(--neon-blue)", 
            borderRadius: "20px", 
            cursor: "pointer", 
            fontSize: "0.85rem",
            fontWeight: "bold",
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(0, 100, 255, 0.3)"}
          onMouseOut={(e) => e.currentTarget.style.background = "rgba(0, 100, 255, 0.1)"}
        >
          Manage User
        </button>
        
        {user.isBanned ? (
          <button 
            onClick={() => handleUnban(user.id)}
            style={{ 
              padding: "8px 15px", 
              background: "rgba(255, 255, 255, 0.1)", 
              border: "1px solid white", 
              color: "white", 
              borderRadius: "20px", 
              cursor: "pointer", 
              fontSize: "0.85rem",
              fontWeight: "bold",
              transition: "all 0.3s ease"
            }}
          >
            Unban User
          </button>
        ) : (
          <button 
            onClick={() => setBanUser(user)}
            style={{ 
              padding: "8px 15px", 
              background: "rgba(255, 68, 68, 0.1)", 
              border: "1px solid #FF4444", 
              color: "#FF4444", 
              borderRadius: "20px", 
              cursor: "pointer", 
              fontSize: "0.85rem",
              fontWeight: "bold",
              transition: "all 0.3s ease"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255, 68, 68, 0.3)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(255, 68, 68, 0.1)"}
          >
            Ban
          </button>
        )}
      </div>
    </div>
  );

  if (!isLoggedIn) return null;

  return (
    <main className="main-container" style={{ padding: "80px 20px", paddingBottom: "120px" }}>
      {toastMessage && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#d50000", color: "white", padding: "10px 20px", borderRadius: "8px", zIndex: 9999, fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toastMessage}
        </div>
      )}
      <header style={{ marginBottom: "40px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1 
          className="header-title glow-text-yellow" 
          style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}
        >
          Manage Users
        </h1>
        <h2 style={{ color: "var(--text-muted)", fontSize: "1.1rem", marginTop: "10px", fontFamily: "var(--font-outfit)" }}>
          View, manage, and penalize registered users.
        </h2>
      </header>

      <section style={{ maxWidth: "800px", margin: "0 auto", padding: "0 10px" }}>
        {/* Admin Invite Link Action Box */}
        <div style={{
          background: "rgba(255, 234, 0, 0.05)",
          border: "1px solid rgba(255, 234, 0, 0.3)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "25px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ color: "var(--neon-yellow)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div>
              <h4 style={{ margin: 0, color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", fontSize: "1.05rem" }}>
                Admin Invite Link
              </h4>
              <p style={{ margin: "2px 0 0 0", color: "var(--neon-white)", fontSize: "0.82rem", opacity: 0.85 }}>
                Share this link to invite and onboard new administrators.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyInviteLink}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              background: copyFeedback ? "rgba(0, 255, 136, 0.15)" : "var(--neon-yellow)",
              color: copyFeedback ? "#00FF88" : "#000",
              border: copyFeedback ? "1px solid #00FF88" : "1px solid var(--neon-yellow)",
              fontFamily: "var(--font-outfit)",
              fontWeight: "bold",
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all 0.2s ease"
            }}
          >
            {copyFeedback ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy Admin Invite Link</span>
              </>
            )}
          </button>
        </div>
        
        {/* Title and Total Badge on same line */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "15px" }}>
          <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", margin: 0 }}>
            Registered Users
          </h3>
          <span style={{ background: "rgba(255,255,255,0.1)", padding: "5px 15px", borderRadius: "20px", fontSize: "0.85rem", color: "white" }}>
            Total: {displayUsers.length}
          </span>
        </div>

        {/* Search on a new line */}
        <div style={{ marginBottom: "15px" }}>
          <input 
            type="text" 
            placeholder="Search user by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 15px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(0,0,0,0.5)",
              color: "white",
              outline: "none",
              fontFamily: "var(--font-outfit)"
            }}
          />
        </div>
            
        {/* Filters on a new line */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginBottom: "30px" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Filter / Sort by:</span>
          
          {/* Custom Sort Dropdown */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              onBlur={() => setTimeout(() => setIsSortDropdownOpen(false), 200)}
              style={{
                padding: "8px 15px",
                borderRadius: "20px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(0,0,0,0.5)",
                color: "white",
                outline: "none",
                fontFamily: "var(--font-outfit)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                minWidth: "150px",
                justifyContent: "space-between"
              }}
            >
              {sortBy === "recent" ? "Recently Added" : sortBy === "name" ? "Name (A-Z)" : sortBy === "age" ? "Age" : sortBy === "badge" ? "Badge" : "Team"}
              <span style={{ fontSize: "0.7rem", transition: "transform 0.3s", transform: isSortDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </button>
            
            {isSortDropdownOpen && (
              <div style={{
                position: "absolute",
                top: "110%",
                left: 0,
                width: "100%",
                background: "var(--bg-card)",
                border: "1px solid var(--neon-blue)",
                borderRadius: "10px",
                overflow: "hidden",
                zIndex: 50,
                boxShadow: "0 5px 15px rgba(0,0,0,0.5)"
              }}>
                {[
                  {id: "recent", label: "Recently Added"}, 
                  {id: "name", label: "Name (A-Z)"}, 
                  {id: "age", label: "Age"},
                  {id: "badge", label: "Badge"},
                  {id: "team", label: "Team"}
                ].map(opt => (
                  <div 
                    key={opt.id}
                    onClick={() => { setSortBy(opt.id); setIsSortDropdownOpen(false); }}
                    style={{
                      padding: "10px 15px",
                      cursor: "pointer",
                      color: sortBy === opt.id ? "var(--neon-yellow)" : "white",
                      background: sortBy === opt.id ? "rgba(255,255,255,0.05)" : "transparent",
                      fontFamily: "var(--font-outfit)",
                      fontSize: "0.9rem",
                      borderBottom: "1px solid rgba(255,255,255,0.05)"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                    onMouseOut={(e) => e.currentTarget.style.background = sortBy === opt.id ? "rgba(255,255,255,0.05)" : "transparent"}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Age Filter Dropdown (shows only if sortBy === 'age') */}
          {sortBy === "age" && (
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setIsAgeDropdownOpen(!isAgeDropdownOpen)}
                onBlur={() => setTimeout(() => setIsAgeDropdownOpen(false), 200)}
                style={{
                  padding: "8px 15px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.5)",
                  color: "white",
                  outline: "none",
                  fontFamily: "var(--font-outfit)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: "120px",
                  justifyContent: "space-between"
                }}
              >
                {ageFilter === "all" ? "All Ages" : ageFilter}
                <span style={{ fontSize: "0.7rem", transition: "transform 0.3s", transform: isAgeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </button>
              
              {isAgeDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "110%",
                  left: 0,
                  width: "100%",
                  background: "var(--bg-card)",
                  border: "1px solid var(--neon-blue)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  zIndex: 50,
                  maxHeight: "200px",
                  overflowY: "auto",
                  boxShadow: "0 5px 15px rgba(0,0,0,0.5)"
                }}>
                  {["all", "0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60+"].map(opt => (
                    <div 
                      key={opt}
                      onClick={() => { setAgeFilter(opt); setIsAgeDropdownOpen(false); }}
                      style={{
                        padding: "10px 15px",
                        cursor: "pointer",
                        color: ageFilter === opt ? "var(--neon-yellow)" : "white",
                        background: ageFilter === opt ? "rgba(255,255,255,0.05)" : "transparent",
                        fontFamily: "var(--font-outfit)",
                        fontSize: "0.9rem",
                        borderBottom: "1px solid rgba(255,255,255,0.05)"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                      onMouseOut={(e) => e.currentTarget.style.background = ageFilter === opt ? "rgba(255,255,255,0.05)" : "transparent"}
                    >
                      {opt === "all" ? "All Ages" : opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Badge Filter Dropdown (shows only if sortBy === 'badge') */}
          {sortBy === "badge" && (
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setIsBadgeDropdownOpen(!isBadgeDropdownOpen)}
                onBlur={() => setTimeout(() => setIsBadgeDropdownOpen(false), 200)}
                style={{
                  padding: "8px 15px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.5)",
                  color: "white",
                  outline: "none",
                  fontFamily: "var(--font-outfit)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: "150px",
                  justifyContent: "space-between"
                }}
              >
                {badgeFilter === "all" ? "All Badges" : ROLES.find(r => r.id === badgeFilter)?.label || badgeFilter}
                <span style={{ fontSize: "0.7rem", transition: "transform 0.3s", transform: isBadgeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </button>
              
              {isBadgeDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "110%",
                  left: 0,
                  width: "100%",
                  background: "var(--bg-card)",
                  border: "1px solid var(--neon-blue)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  zIndex: 50,
                  maxHeight: "200px",
                  overflowY: "auto",
                  boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
                  minWidth: "150px"
                }}>
                  {[{id: "all", label: "All Badges"}, ...ROLES].map(opt => (
                    <div 
                      key={opt.id}
                      onClick={() => { setBadgeFilter(opt.id); setIsBadgeDropdownOpen(false); }}
                      style={{
                        padding: "10px 15px",
                        cursor: "pointer",
                        color: badgeFilter === opt.id ? "var(--neon-yellow)" : "white",
                        background: badgeFilter === opt.id ? "rgba(255,255,255,0.05)" : "transparent",
                        fontFamily: "var(--font-outfit)",
                        fontSize: "0.9rem",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                      onMouseOut={(e) => e.currentTarget.style.background = badgeFilter === opt.id ? "rgba(255,255,255,0.05)" : "transparent"}
                    >
                      {opt.id !== "all" && <BadgeIcon badge={opt.id} size={15} />}
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Team Filter Dropdown (shows only if sortBy === 'team') */}
          {sortBy === "team" && (
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                onBlur={() => setTimeout(() => setIsTeamDropdownOpen(false), 200)}
                style={{
                  padding: "8px 15px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.5)",
                  color: "white",
                  outline: "none",
                  fontFamily: "var(--font-outfit)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: "120px",
                  justifyContent: "space-between",
                  textTransform: "capitalize"
                }}
              >
                {teamFilter === "all" ? "All Teams" : teamFilter}
                <span style={{ fontSize: "0.7rem", transition: "transform 0.3s", transform: isTeamDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
              </button>
              
              {isTeamDropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "110%",
                  left: 0,
                  width: "100%",
                  background: "var(--bg-card)",
                  border: "1px solid var(--neon-blue)",
                  borderRadius: "10px",
                  overflow: "hidden",
                  zIndex: 50,
                  maxHeight: "200px",
                  overflowY: "auto",
                  boxShadow: "0 5px 15px rgba(0,0,0,0.5)"
                }}>
                  {["all", ...TEAMS].map(opt => (
                    <div 
                      key={opt}
                      onClick={() => { setTeamFilter(opt); setIsTeamDropdownOpen(false); }}
                      style={{
                        padding: "10px 15px",
                        cursor: "pointer",
                        color: teamFilter === opt ? "var(--neon-yellow)" : "white",
                        background: teamFilter === opt ? "rgba(255,255,255,0.05)" : "transparent",
                        fontFamily: "var(--font-outfit)",
                        fontSize: "0.9rem",
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        textTransform: "capitalize"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                      onMouseOut={(e) => e.currentTarget.style.background = teamFilter === opt ? "rgba(255,255,255,0.05)" : "transparent"}
                    >
                      {opt === "all" ? "All Teams" : opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* LIST RENDERING */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {displayUsers.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontStyle: "italic", background: "rgba(255,255,255,0.02)", borderRadius: "10px" }}>
              No users found.
            </div>
          )}

          {(() => {
            if (sortBy === "name") {
              const grouped: { [key: string]: any[] } = {};
              displayUsers.forEach(u => {
                const firstChar = (u.firstName || u.lastName || "?").charAt(0).toUpperCase();
                const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";
                if (!grouped[letter]) grouped[letter] = [];
                grouped[letter].push(u);
              });
              
              return Object.keys(grouped).sort().map(groupKey => (
                <div key={groupKey} style={{ marginBottom: "20px" }}>
                  <h2 style={{ 
                    color: "var(--neon-yellow)", 
                    fontFamily: "var(--font-outfit)", 
                    borderBottom: "1px solid rgba(255,255,255,0.1)", 
                    paddingBottom: "5px",
                    marginBottom: "15px",
                    marginTop: 0
                  }}>
                    {groupKey}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {grouped[groupKey].map(user => renderUserCard(user))}
                  </div>
                </div>
              ));
            } else if (sortBy === "age") {
              const grouped: { [key: string]: any[] } = {};
              displayUsers.forEach(u => {
                const exactAge = calculateAge(u.birthDate, u.age);
                let groupKey = getAgeBracket(exactAge);
                
                if (ageFilter !== "all" && ageFilter !== "60+" && exactAge !== -1) {
                  groupKey = exactAge.toString();
                } else if (ageFilter === "60+") {
                  groupKey = "60+";
                }
                
                if (!grouped[groupKey]) grouped[groupKey] = [];
                grouped[groupKey].push(u);
              });
              
              let keys = Object.keys(grouped);
              if (ageFilter === "all") {
                const ageOrder = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60+", "Unknown"];
                keys = ageOrder.filter(k => grouped[k]);
              } else {
                 keys.sort((a,b) => parseInt(a) - parseInt(b));
              }

              return keys.map(groupKey => (
                <div key={groupKey} style={{ marginBottom: "20px" }}>
                  <h2 style={{ 
                    color: "var(--neon-yellow)", 
                    fontFamily: "var(--font-outfit)", 
                    borderBottom: "1px solid rgba(255,255,255,0.1)", 
                    paddingBottom: "5px",
                    marginBottom: "15px",
                    marginTop: 0
                  }}>
                    {groupKey === "Unknown" ? "Unknown Age" : `Age ${groupKey}`}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {grouped[groupKey].map(user => renderUserCard(user))}
                  </div>
                </div>
              ));
            } else if (sortBy === "badge") {
              const grouped: { [key: string]: any[] } = {};
              displayUsers.forEach(u => {
                const badgeId = u.badge || "none";
                if (!grouped[badgeId]) grouped[badgeId] = [];
                grouped[badgeId].push(u);
              });
              
              return Object.keys(grouped).map(groupKey => {
                const badgeLabel = ROLES.find(r => r.id === groupKey)?.label || "No Badge";
                return (
                  <div key={groupKey} style={{ marginBottom: "20px" }}>
                    <h2 style={{ 
                      color: getBadgeDefinition(groupKey).color || "var(--neon-yellow)", 
                      fontFamily: "var(--font-outfit)", 
                      borderBottom: "1px solid rgba(255,255,255,0.1)", 
                      paddingBottom: "8px",
                      marginBottom: "15px",
                      marginTop: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "10px"
                    }}>
                      <BadgeIcon badge={groupKey} size={22} color={getBadgeDefinition(groupKey).color} />
                      <span>{badgeLabel}</span>
                    </h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                      {grouped[groupKey].map(user => renderUserCard(user))}
                    </div>
                  </div>
                );
              });
            } else if (sortBy === "team") {
              const grouped: { [key: string]: any[] } = {};
              displayUsers.forEach(u => {
                const teamId = (u.team || "none").toLowerCase();
                if (!grouped[teamId]) grouped[teamId] = [];
                grouped[teamId].push(u);
              });
              
              return Object.keys(grouped).sort().map(groupKey => (
                <div key={groupKey} style={{ marginBottom: "20px" }}>
                  <h2 style={{ 
                    color: "var(--neon-yellow)", 
                    fontFamily: "var(--font-outfit)", 
                    borderBottom: "1px solid rgba(255,255,255,0.1)", 
                    paddingBottom: "5px",
                    marginBottom: "15px",
                    marginTop: 0,
                    textTransform: "capitalize"
                  }}>
                    {groupKey === "none" ? "No Team" : `${groupKey} Team`}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {grouped[groupKey].map(user => renderUserCard(user))}
                  </div>
                </div>
              ));
            } else {
              return displayUsers.map(user => renderUserCard(user));
            }
          })()}
        </div>

      </section>

      {/* MANAGE USER MODAL */}
      {manageUser && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ maxWidth: "400px", width: "100%", background: "var(--bg-card)", border: "1px solid var(--neon-blue)", position: "relative" }}>
            <button 
              onClick={() => setManageUser(null)}
              style={{ position: "absolute", top: "15px", right: "20px", background: "transparent", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer" }}
            >&times;</button>
            
            <h2 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", marginBottom: "20px", marginTop: 0 }}>User Details</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                <span style={{ color: "var(--text-muted)" }}>Full Name:</span>
                <span style={{ fontWeight: "bold", color: "white", textTransform: "capitalize" }}>{formatFullName(manageUser.firstName, manageUser.lastName)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", position: "relative" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Badge:</span>
                  <span style={{ fontSize: "0.72rem", color: getBadgeDefinition(editBadge).color, maxWidth: "160px", lineHeight: "1.3" }}>
                    {getBadgeDefinition(editBadge).description}
                  </span>
                  {(() => {
                    const targetUserDefaultBadge = getUserDefaultBadge(manageUser.id, manageUser.badge);
                    if (normalizeBadgeId(editBadge) !== targetUserDefaultBadge) {
                      return (
                        <span style={{ fontSize: "0.68rem", color: "var(--neon-yellow)", fontStyle: "italic", marginTop: "2px" }}>
                          User Default: {getBadgeDefinition(targetUserDefaultBadge).label}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div style={{ position: "relative" }}>
                  <div 
                    onClick={() => { setIsEditBadgeDropdownOpen(!isEditBadgeDropdownOpen); setIsEditTeamDropdownOpen(false); }}
                    style={{ 
                      background: "rgba(0,0,0,0.6)", 
                      border: `1px solid ${getBadgeDefinition(editBadge).color}`, 
                      color: getBadgeDefinition(editBadge).color, 
                      padding: "6px 12px", 
                      borderRadius: "8px", 
                      cursor: "pointer", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "8px",
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      boxShadow: `0 0 10px ${getBadgeDefinition(editBadge).color}26`
                    }}
                  >
                    <BadgeIcon badge={editBadge} size={16} color={getBadgeDefinition(editBadge).color} />
                    <span>{getBadgeDefinition(editBadge).label}</span>
                    <span style={{ fontSize: "0.7rem", marginLeft: "4px", transition: "transform 0.2s", transform: isEditBadgeDropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>
                  {isEditBadgeDropdownOpen && (
                    <div style={{ 
                      position: "absolute", 
                      top: "100%", 
                      right: 0, 
                      width: "260px", 
                      background: "rgba(10,10,14,0.98)", 
                      border: "1px solid var(--neon-yellow)", 
                      borderRadius: "10px", 
                      marginTop: "6px", 
                      zIndex: 30, 
                      maxHeight: "320px", 
                      overflowY: "auto",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.8)"
                    }}>
                      {/* Section: Member Badge (Only User's Chosen Default Badge) */}
                      <div style={{ padding: "8px 12px 4px 12px", fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                        Member Badge
                      </div>
                      {(() => {
                        const targetUserDefaultBadge = getUserDefaultBadge(manageUser.id, manageUser.badge);
                        const defaultBadgeDef = getBadgeDefinition(targetUserDefaultBadge);
                        const isSelected = normalizeBadgeId(editBadge) === targetUserDefaultBadge;
                        return (
                          <div 
                            key={targetUserDefaultBadge} 
                            onClick={() => { setEditBadge(targetUserDefaultBadge); setIsEditBadgeDropdownOpen(false); }}
                            style={{ 
                              padding: "10px 12px", 
                              cursor: "pointer", 
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              background: isSelected ? "rgba(255,234,0,0.12)" : "transparent",
                              color: isSelected ? "var(--neon-yellow)" : "white",
                              transition: "background 0.15s"
                            }}
                            onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                            onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                          >
                            <BadgeIcon badge={targetUserDefaultBadge} size={18} color={defaultBadgeDef.color} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "0.9rem", fontWeight: isSelected ? "bold" : "normal" }}>{defaultBadgeDef.label}</span>
                                <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px", background: `${defaultBadgeDef.color}25`, color: defaultBadgeDef.color, fontWeight: "600" }}>Default</span>
                              </div>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: "1.2" }}>{defaultBadgeDef.description.slice(0, 48)}...</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Section: Leadership & Ministry Badges (Excludes Admin) */}
                      <div style={{ padding: "8px 12px 4px 12px", fontSize: "0.7rem", fontWeight: "bold", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", marginTop: "4px" }}>
                        Leadership & Ministry Badges
                      </div>
                      {ROLES.filter(r => r.category === "leadership" && r.id.toLowerCase() !== "admin").map(r => {
                        const isSelected = editBadge === r.id;
                        return (
                          <div 
                            key={r.id} 
                            onClick={() => { setEditBadge(r.id); setIsEditBadgeDropdownOpen(false); }}
                            style={{ 
                              padding: "10px 12px", 
                              cursor: "pointer", 
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              background: isSelected ? "rgba(255,234,0,0.12)" : "transparent",
                              color: isSelected ? "var(--neon-yellow)" : "white",
                              transition: "background 0.15s"
                            }}
                            onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
                            onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
                          >
                            <BadgeIcon badge={r.id} size={18} color={r.color} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "0.9rem", fontWeight: isSelected ? "bold" : "normal" }}>{r.label}</span>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: "1.2" }}>{r.description.slice(0, 48)}...</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", position: "relative" }}>
                <span style={{ color: "var(--text-muted)" }}>Team:</span>
                <div style={{ position: "relative" }}>
                  <div 
                    onClick={() => { setIsEditTeamDropdownOpen(!isEditTeamDropdownOpen); setIsEditBadgeDropdownOpen(false); }}
                    style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: editTeam === "none" ? "var(--text-muted)" : editTeam, padding: "5px 10px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", textTransform: "capitalize", fontWeight: "bold" }}
                  >
                    {editTeam === "none" ? "Remove Team" : editTeam} <span>▼</span>
                  </div>
                  {isEditTeamDropdownOpen && (
                    <div style={{ position: "absolute", top: "100%", right: 0, width: "150px", background: "rgba(0,0,0,0.9)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", marginTop: "5px", zIndex: 10, maxHeight: "150px", overflowY: "auto" }}>
                      {TEAMS.map(t => (
                        <div 
                          key={t} 
                          onClick={() => { setEditTeam(t); setIsEditTeamDropdownOpen(false); }}
                          style={{ padding: "10px", color: t === "none" ? "var(--text-muted)" : t, cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.1)", textTransform: "capitalize", fontWeight: "bold" }}
                          onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                        >
                          {t === "none" ? "Remove Team" : t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                <span style={{ color: "var(--text-muted)" }}>Email:</span>
                <span style={{ color: "white" }}>{manageUser.email || "N/A"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                <span style={{ color: "var(--text-muted)" }}>Phone Number:</span>
                <span style={{ color: "white" }}>{manageUser.contact || "N/A"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Age:</span>
                <span style={{ color: "white" }}>{calculateAge(manageUser.birthDate, manageUser.age) !== -1 ? calculateAge(manageUser.birthDate, manageUser.age) : "N/A"}</span>
              </div>
            </div>
            
            <div style={{ marginTop: "30px", textAlign: "right" }}>
              <button 
                onClick={handleSaveUserUpdates}
                disabled={isSavingUser}
                style={{ padding: "10px 20px", background: "var(--neon-yellow)", border: "none", color: "black", borderRadius: "8px", fontWeight: "bold", cursor: isSavingUser ? "wait" : "pointer" }}
              >
                {isSavingUser ? "Saving..." : "Save Updates"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BAN USER MODAL */}
      {banUser && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px" }}>
          <div className="card" style={{ maxWidth: "400px", width: "100%", background: "var(--bg-card)", border: "1px solid #FF4444", position: "relative" }}>
            <button 
              onClick={() => { setBanUser(null); setBanReason(""); }}
              style={{ position: "absolute", top: "15px", right: "20px", background: "transparent", border: "none", color: "white", fontSize: "1.5rem", cursor: "pointer" }}
            >&times;</button>
            
            <h2 style={{ color: "#FF4444", fontFamily: "var(--font-outfit)", marginBottom: "10px", marginTop: 0 }}>Ban User</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px" }}>
              Are you sure you want to ban <strong style={{ textTransform: "capitalize" }}>{formatFullName(banUser.firstName, banUser.lastName)}</strong>?
            </p>
            
            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", color: "var(--neon-white)", fontSize: "0.9rem" }}>Ban Reason</label>
              <input 
                type="text" 
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Violation of Community Guidelines"
                style={{ width: "100%", padding: "10px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "8px", outline: "none" }}
              />
            </div>

            <div style={{ marginBottom: "30px" }}>
              <label style={{ display: "block", marginBottom: "10px", color: "var(--neon-white)", fontSize: "0.9rem" }}>Ban Duration</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                {[
                  { value: "1", label: "1 Day" },
                  { value: "3", label: "3 Days" },
                  { value: "7", label: "7 Days" },
                  { value: "30", label: "30 Days" },
                  { value: "36500", label: "Permanent" }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBanDays(opt.value)}
                    style={{
                      flex: "1 1 calc(33.333% - 10px)",
                      padding: "10px 5px",
                      background: banDays === opt.value ? "rgba(255, 68, 68, 0.2)" : "rgba(0,0,0,0.5)",
                      border: banDays === opt.value ? "1px solid #FF4444" : "1px solid rgba(255,255,255,0.2)",
                      color: banDays === opt.value ? "#FF4444" : "var(--text-muted)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontFamily: "var(--font-outfit)",
                      fontSize: "0.85rem",
                      fontWeight: banDays === opt.value ? "bold" : "normal",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button 
                onClick={() => { setBanUser(null); setBanReason(""); }}
                style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "8px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button 
                onClick={handleBanSubmit}
                style={{ padding: "10px 20px", background: "#FF4444", border: "none", color: "white", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: "40px", paddingBottom: "100px" }}>
        <Link href="/admin" className="nav-item" style={{ padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)" }}>
          Back to Admin Dashboard
        </Link>
      </div>

      <AdminBottomNav />
    </main>
  );
}
