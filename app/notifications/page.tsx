"use client";

import React, { useEffect, useState } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import BadgeIcon, { getBadgeDefinition } from "@/components/BadgeIcon";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCapitalizedName, formatFullName } from "@/utils/formatName";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("isHeartistLoggedIn") && !localStorage.getItem("isAdminLoggedIn")) {
        window.location.href = "/login";
        return;
      }
      setIsAuthorized(true);
    }

    const activeUserStr = localStorage.getItem("activeUser");
    if (!activeUserStr) {
      window.location.href = "/login";
      return;
    } else {
      const currentUserObj = JSON.parse(activeUserStr);
      const currentUser = currentUserObj.firstName;
      const currentUserFullName = `${currentUserObj.firstName} ${currentUserObj.lastName}`.trim();

      const rawAccs = JSON.parse(localStorage.getItem("registeredAccounts") || "[]");
      const accs = rawAccs.map((a: any) => ({
        ...a,
        firstName: formatCapitalizedName(a.firstName),
        lastName: formatCapitalizedName(a.lastName)
      }));
      setAccounts(accs);

      const fetchInbox = async () => {
          try {
              let userUuid = currentUserObj.id;
              if (!userUuid || !userUuid.includes("-")) {
                const foundAcc = accs.find((a: any) => 
                  (currentUser && a.firstName?.toLowerCase() === currentUser?.toLowerCase()) &&
                  (currentUserObj.lastName && a.lastName?.toLowerCase() === currentUserObj.lastName?.toLowerCase())
                );
                if (foundAcc?.id) userUuid = foundAcc.id;
              }

              const targetIds = Array.from(new Set([
                currentUserObj.id,
                userUuid,
                currentUser,
                currentUserFullName,
                currentUser?.toLowerCase(),
                currentUserFullName?.toLowerCase(),
                currentUserObj.email?.toLowerCase()
              ])).filter(Boolean);

              const { data: directData } = await supabase.from('notifications').select('*').in('recipient_id', targetIds).order('created_at', { ascending: false });
              const { data: everyoneData } = await supabase.from('notifications').select('*').eq('recipient_id', 'everyone').order('created_at', { ascending: false });
              
              const seenMsgIds = new Set<string>();
              const seenPayloadIds = new Set<string>();
              const rawData = [...(directData || []), ...(everyoneData || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              const data = rawData.filter((msg: any) => {
                if (seenMsgIds.has(msg.id)) return false;
                seenMsgIds.add(msg.id);
                return true;
              });
             
             if (data) {
               const adminNotifs: any[] = [];
               const regularNotifs: any[] = [];

               data.forEach((msg: any) => {
                 const t = msg.type ? msg.type.toUpperCase() : "MESSAGE";
                 const isGetInvolved =
                   t.includes("GET_INVOLVED") ||
                   msg.sender_name === "Heartist Team" ||
                   (typeof msg.message === "string" && (
                     msg.message.includes("reach out to get involved") ||
                     msg.message.includes("part of our journey") ||
                     msg.message.includes("heart to serve") ||
                     (msg.message.includes("Heartist") && msg.message.includes("next steps"))
                   ));

                 if (isGetInvolved) {
                   adminNotifs.push({
                     id: `get_involved_${msg.id}`,
                     supabase_id: msg.id,
                     isInboxItem: true,
                     type: "GET_INVOLVED",
                     targetUrl: `/get-involved?scrollTo=my-entries&subId=${msg.post_id || ""}`,
                     filterCategory: "Get Involved",
                     timestamp: new Date(msg.created_at).getTime(),
                     read: msg.is_read,
                     content: msg.message,
                     senderName: "Heartist Team"
                   });
                 } else if (t.includes("WARN") || t.includes("PENALTY") || t.includes("MESSAGE") || t.includes("APPEAL") || t.includes("ALERT") || t.includes("MODERATION") || t.includes("UNBLOCKED")) {
                   let filterCategory = "Others";
                   if (t.includes("WARN") || t.includes("MESSAGE") || t.includes("MODERATION") || t.includes("UNBLOCKED")) filterCategory = "Warnings";
                   else if (t.includes("PENALTY")) filterCategory = "Penalties";
                   else if (t.includes("APPEAL")) filterCategory = "Reports";
                   else if (t.includes("ALERT")) filterCategory = "Deleted";
                   
                   adminNotifs.push({
                     id: `inbox_${msg.id}`,
                     supabase_id: msg.id,
                     isInboxItem: true,
                     type: msg.type,
                     filterCategory,
                     timestamp: new Date(msg.created_at).getTime(),
                     read: msg.is_read,
                     content: msg.message,
                   });
                 } else {
                   try {
                     const parsedNotif = JSON.parse(msg.message);
                     const pKey = parsedNotif.id || `${parsedNotif.type}_${parsedNotif.timestamp}`;
                     if (!seenPayloadIds.has(pKey)) {
                       seenPayloadIds.add(pKey);
                       parsedNotif.supabase_id = msg.id;
                       parsedNotif.read = msg.is_read;
                       regularNotifs.push(parsedNotif);
                     }
                   } catch(e) {}
                 }
               });

                try {
                  const localNotifs = JSON.parse(localStorage.getItem("communityNotifications") || "[]");
                  localNotifs.forEach((ln: any) => {
                    if (ln && !regularNotifs.some((rn: any) => rn.id === ln.id || (ln.supabase_id && rn.supabase_id === ln.supabase_id))) {
                      regularNotifs.push(ln);
                    }
                  });
                } catch(e) {}
               
               const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
               const myInbox = [
                 ...(inboxData[currentUser] || []),
                 ...(inboxData[currentUserFullName] || []),
               ].filter((v, i, a) => a.findIndex((t: any) => t.id === v.id) === i);
               
               const legacyInbox = myInbox.map((msg: any) => {
                 let filterCategory = "Others";
                 const t = msg.type || "MESSAGE";
                 if (t.includes("WARN")) filterCategory = "Warnings";
                 else if (t.includes("PENALTY")) filterCategory = "Penalties";
                 else if (t.includes("REPORT")) filterCategory = "Reports";
                 else if (t.includes("DELETE")) filterCategory = "Deleted";

                 let contentStr = "";
                 if (typeof msg.content === "object")
                   contentStr = msg.content.action || "Update on your post.";
                 else contentStr = msg.content;

                  let tsVal = Date.now();
                  if (typeof msg.timestamp === "number" && !isNaN(msg.timestamp)) {
                    tsVal = msg.timestamp;
                  } else if (typeof msg.timestamp === "string") {
                    const parsedTs = Date.parse(msg.timestamp);
                    if (!isNaN(parsedTs)) tsVal = parsedTs;
                  } else if (typeof msg.id === "number" && !isNaN(msg.id) && msg.id > 100000000000) {
                    tsVal = msg.id;
                  }

                  return {
                    id: `inbox_${msg.id}`,
                    isInboxItem: true,
                    type: msg.type,
                    filterCategory,
                    timestamp: tsVal,
                    read: msg.read,
                    content: contentStr,
                  };
               });

               const finalAdminNotifs = [...adminNotifs, ...legacyInbox].sort((a, b) => b.timestamp - a.timestamp);

               let modified = false;
               regularNotifs.forEach((n: any) => {
                 if (
                   (n.type === "badge_update" ||
                     n.type === "badge_and_team_update" ||
                     n.type === "team_add" ||
                     n.type === "team_remove" ||
                     n.type === "prayer_deleted" ||
                     n.type === "post_deleted" || n.type === "comment_deleted") &&
                   (!n.users || n.users[0] === "Admin" || !n.users[0])
                 ) {
                   const adminAcc = accs.find((a: any) => a.badge === "admin" && a.firstName);
                   const adminName = adminAcc ? adminAcc.firstName : "AdminRichford";
                   n.users = [adminName, n.postAuthor];
                   modified = true;
                 }
               });

               const myNotifs = regularNotifs.filter(
                 (n: any) =>
                   n.supabase_id ||
                   n.postAuthor === currentUser ||
                   n.postAuthor === currentUserFullName ||
                   n.postAuthor === currentUserObj?.id ||
                   n.userId === currentUserFullName ||
                   n.userId === currentUser ||
                   n.userId === currentUserObj?.id ||
                   n.recipient_id === currentUserObj?.id ||
                   n.recipient_id === currentUser ||
                   n.recipient_id === currentUserFullName ||
                   n.userId === "everyone"
               );

               myNotifs.sort((a: any, b: any) => a.timestamp - b.timestamp);
                const roleUpdates: any[] = [];
                const regularInteractions: any[] = [];

                myNotifs.forEach((n: any) => {
                  const isRoleUpdate = 
                    n.type === "badge_and_team_update" || 
                    n.type === "badge_update" || 
                    n.type === "team_add" || 
                    n.type === "team_remove" || 
                    n.type === "team_update" || 
                    n.type?.includes("badge") || 
                    n.type?.includes("team");

                  if (isRoleUpdate) {
                    roleUpdates.push({
                      id: n.supabase_id || n.id,
                      supabase_id: n.supabase_id,
                      category: "Updates",
                      type: n.type,
                      postContent: n.postContent,
                      postId: "profile",
                      timestamp: n.timestamp,
                      read: !!n.read,
                      users: n.users && n.users.length > 0 ? n.users : [n.adminName || "Admin"],
                      badge: n.badge,
                      badgeLabel: n.badgeLabel || (n.badge ? getBadgeDefinition(n.badge).label : ""),
                      badgeColor: n.badgeColor || (n.badge ? getBadgeDefinition(n.badge).color : ""),
                      team: n.team,
                      oldBadge: n.oldBadge,
                      oldTeam: n.oldTeam,
                      badgeChanged: n.badgeChanged,
                      teamChanged: n.teamChanged,
                      adminName: n.adminName || (n.users && n.users[0]) || "Admin",
                    });
                  } else {
                    regularInteractions.push(n);
                  }
                });

                const allGroups: any[][] = [];
                const keyMap = new Map<string, { mainGroup: any[]; standaloneGroups: any[][]; seenUsers: Set<string> }>();

                regularInteractions.forEach((n: any) => {
                  const key = (n.postContent || "unknown_post") + "_" + (n.type || "reaction");
                  if (!keyMap.has(key)) {
                    keyMap.set(key, { mainGroup: [], standaloneGroups: [], seenUsers: new Set<string>() });
                  }

                  const state = keyMap.get(key)!;
                  const user = n.fromUser || n.sourceName;

                  if (user && !state.seenUsers.has(user)) {
                    state.seenUsers.add(user);
                    state.mainGroup.push(n);
                  } else {
                    state.standaloneGroups.push([n]);
                  }
                });

                keyMap.forEach((state) => {
                  if (state.mainGroup.length > 0) allGroups.push(state.mainGroup);
                  state.standaloneGroups.forEach((group) => allGroups.push(group));
                });

                const mappedNotifications = allGroups.map((group) => {
                  const recentNotif = group[group.length - 1];
                  const uniqueUsers = Array.from(new Set(group.map((n: any) => formatCapitalizedName(n.fromUser || n.sourceName)))).filter(Boolean);

                  let category = "Interactions";
                  if (recentNotif.type.includes("mention")) category = "Mentions";
                  else if (recentNotif.type === "pray" || recentNotif.type === "prayer_deleted") category = "Prayers";
                  else if (recentNotif.type.includes("team") || recentNotif.type.includes("badge")) category = "Updates";
                  
                  return {
                    id: recentNotif.supabase_id || recentNotif.id,
                    supabase_id: recentNotif.supabase_id,
                    category: category,
                    type: recentNotif.type || "reaction",
                    mentionType: recentNotif.mentionType,
                    postContent: recentNotif.postContent,
                    postId: recentNotif.postId,
                    timestamp: recentNotif.timestamp,
                    read: group.every((n: any) => n.read),
                    users: uniqueUsers,
                  };
                });

                const combinedNotifications = [...roleUpdates, ...mappedNotifications, ...finalAdminNotifs];
                setNotifications(combinedNotifications.sort((a: any, b: any) => b.timestamp - a.timestamp));
            }
         } catch (e) {
             console.error("Failed to load inbox", e);
         }
      };

      fetchInbox();

      // Realtime subscription for instant updates on incoming notifications
      const notifsSub = supabase
        .channel(`notifications_inbox_${currentUserObj.id || currentUser}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
          },
          () => {
            fetchInbox();
          }
        )
        .subscribe();

      let webBc: any = null;
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          webBc = new window.BroadcastChannel("heartist_notifs_sync");
          webBc.onmessage = () => {
            fetchInbox();
          };
        } catch (e) {}
      }

      const broadcastSub = supabase
        .channel("public-notifications")
        .on("broadcast", { event: "new_notif" }, () => {
          fetchInbox();
        })
        .subscribe();

      const handleLiveEvent = () => {
        fetchInbox();
      };
      window.addEventListener("storage", handleLiveEvent);
      window.addEventListener("badge_updated", handleLiveEvent);
      window.addEventListener("heartist_notification_event", handleLiveEvent);

      return () => {
        supabase.removeChannel(notifsSub);
        supabase.removeChannel(broadcastSub);
        window.removeEventListener("storage", handleLiveEvent);
        window.removeEventListener("badge_updated", handleLiveEvent);
        window.removeEventListener("heartist_notification_event", handleLiveEvent);
        if (webBc) webBc.close();
      };
    }
  }, []);

  const formatTimeAgo = (timestampMs: any) => {
    if (!timestampMs) return "just now";
    let ts = Number(timestampMs);
    if (isNaN(ts) || ts <= 0) {
      if (typeof timestampMs === "string") {
        const parsed = Date.parse(timestampMs);
        if (!isNaN(parsed) && parsed > 0) {
          ts = parsed;
        } else {
          return "just now";
        }
      } else {
        return "just now";
      }
    }

    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (isNaN(years) || isNaN(days) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
      return "just now";
    }

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

  const getRoleIcon = (role: string) => {
    if (!role) return null;
    return <BadgeIcon badge={role} size={14} />;
  };

  const getUserDetails = (username: string) => {
    const acc = accounts.find(
      (a) =>
        a.firstName?.toLowerCase() === username?.toLowerCase() ||
        `${a.firstName} ${a.lastName}`.trim().toLowerCase() === username?.toLowerCase(),
    );
    if (acc) {
      return {
        fullName: formatFullName(acc.firstName, acc.lastName),
        avatar: acc.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg",
        team: acc.team || "none",
        badge: acc.badge || "Heartist",
      };
    }
    return {
      fullName: formatCapitalizedName(username),
      avatar: "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg",
      team: "none",
      badge: "Heartist",
    };
  };

  if (!isAuthorized) return null;

  return (
    <main
      className="app-container"
      style={{
        paddingBottom: "120px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        className="top-header"
        style={{ marginBottom: "20px", position: "relative" }}
      >
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1
          className="header-title glow-text-white"
          style={{
            fontFamily: "var(--font-outfit)",
            fontSize: "2rem",
            marginTop: "10px",
          }}
        >
          NOTIFICATIONS
        </h1>
        <p className="logo-sub">Your recent alerts</p>
      </header>

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => {
            const activeUserStr = localStorage.getItem("activeUser");
            if (!activeUserStr) return;
            const currentUserObj = JSON.parse(activeUserStr);
            const currentUser = currentUserObj.firstName;
            const currentUserFullName =
              `${currentUserObj.firstName} ${currentUserObj.lastName}`.trim();

            const allNotifs = JSON.parse(
              localStorage.getItem("communityNotifications") || "[]",
            );
            const remainingNotifs = allNotifs.filter((n: any) => {
              const isTargetUser =
                n.postAuthor === currentUser ||
                n.postAuthor === currentUserFullName ||
                n.userId === currentUserFullName ||
                n.userId === currentUser;
              return !isTargetUser;
            });
            localStorage.setItem(
              "communityNotifications",
              JSON.stringify(remainingNotifs),
            );
            window.dispatchEvent(new Event("storage"));
            const displayedSupaIds = notifications.filter((n: any) => n.supabase_id).map((n: any) => n.supabase_id);
            if (displayedSupaIds.length > 0) {
              const deleteSupa = async () => {
                try { await supabase.from('notifications').delete().in('id', displayedSupaIds); } catch(e){}
              };
              deleteSupa();
            }
            setNotifications([]);
          }}
          style={{
            flex: 1,
            padding: "10px",
            background: "rgba(255, 68, 68, 0.2)",
            border: "1px solid #FF4444",
            borderRadius: "8px",
            color: "var(--neon-white)",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Delete All
        </button>
        <button
          onClick={async () => {
            const activeUserStr = localStorage.getItem("activeUser");
            if (!activeUserStr) return;
            const currentUserObj = JSON.parse(activeUserStr);
            const currentUser = currentUserObj.firstName;
            const currentUserFullName =
              `${currentUserObj.firstName} ${currentUserObj.lastName}`.trim();
            const currentUserId = currentUserObj.id;

            // 1. Mark in Supabase across all recipient keys for this user
            const targetIds = Array.from(new Set([
              currentUserId,
              currentUser,
              currentUserFullName,
              currentUser?.toLowerCase(),
              currentUserFullName?.toLowerCase(),
              currentUserObj.email?.toLowerCase(),
            ])).filter(Boolean);

            try {
              const { markAllNotificationsRead } = await import("@/lib/notificationsSync");
              await markAllNotificationsRead(targetIds);
            } catch (e) {
              try {
                await supabase
                  .from("notifications")
                  .update({ is_read: true })
                  .in("recipient_id", targetIds)
                  .eq("is_read", false);
              } catch(err) {}
            }

            // 2. Mark all communityNotifications in localStorage
            const allNotifs = JSON.parse(
              localStorage.getItem("communityNotifications") || "[]",
            );
            const updatedNotifs = allNotifs.map((n: any) => {
              const isTargetUser =
                n.postAuthor === currentUser ||
                n.postAuthor === currentUserFullName ||
                n.userId === currentUserFullName ||
                n.userId === currentUser ||
                n.userId === currentUserId ||
                n.recipient_id === currentUserId ||
                n.recipient_id === currentUser ||
                n.recipient_id === currentUserFullName;
              if (isTargetUser) {
                return { ...n, read: true };
              }
              return n;
            });
            localStorage.setItem(
              "communityNotifications",
              JSON.stringify(updatedNotifs),
            );

            // 3. Mark all fusionInbox in localStorage
            try {
              const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
              let inboxChanged = false;
              [currentUser, currentUserFullName, currentUserId].filter(Boolean).forEach((k: string) => {
                if (inboxData[k] && Array.isArray(inboxData[k])) {
                  inboxData[k] = inboxData[k].map((m: any) => ({ ...m, read: true }));
                  inboxChanged = true;
                }
              });
              if (inboxChanged) {
                localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
              }
            } catch(e) {}

            // 4. Update bottom nav timestamp so badge is cleared
            localStorage.setItem(`navBadgeClearedAt_${currentUser}`, Date.now().toString());

            // 5. Update local state and trigger global refresh
            setNotifications((prev) => prev.map((p) => ({ ...p, read: true })));
            window.dispatchEvent(new Event("storage"));
            window.dispatchEvent(new CustomEvent("heartist_notification_event", { detail: { type: "mark_all_read" } }));
          }}
          style={{
            flex: 1,
            padding: "10px",
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid var(--neon-white)",
            borderRadius: "8px",
            color: "var(--neon-white)",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Mark All as Read
        </button>
      </div>

      <section>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {notifications.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "var(--text-muted)",
              }}
            >
              No notifications yet.
            </div>
          ) : (
            notifications.map((notif) => {
              if (notif.isInboxItem) {
                return (
                  <div
                    key={notif.id}
                    onClick={async () => {
                      if (!notif.read) {
                        if (notif.supabase_id) {
                          const { markNotificationRead } = await import('@/lib/notificationsSync');
                          await markNotificationRead(notif.supabase_id);
                        }
                        const allNotifs = JSON.parse(localStorage.getItem("communityNotifications") || "[]");
                        const updated = allNotifs.map((n: any) => (n.id === notif.id || `inbox_${n.id}` === notif.id) ? { ...n, read: true } : n);
                        localStorage.setItem("communityNotifications", JSON.stringify(updated));

                        try {
                          const inboxData = JSON.parse(localStorage.getItem("fusionInbox") || "{}");
                          let inboxChanged = false;
                          const rawId = notif.id.replace("inbox_", "");
                          Object.keys(inboxData).forEach((k) => {
                            if (Array.isArray(inboxData[k])) {
                              inboxData[k] = inboxData[k].map((m: any) => {
                                if (String(m.id) === rawId || `inbox_${m.id}` === notif.id) {
                                  inboxChanged = true;
                                  return { ...m, read: true };
                                }
                                return m;
                              });
                            }
                          });
                          if (inboxChanged) {
                            localStorage.setItem("fusionInbox", JSON.stringify(inboxData));
                          }
                        } catch(e) {}

                        setNotifications((prev) => prev.map((p) => p.id === notif.id ? { ...p, read: true } : p));
                        window.dispatchEvent(new Event("storage"));
                        window.dispatchEvent(new CustomEvent("heartist_notification_event", { detail: { type: "item_read", id: notif.id } }));
                      }
                      if (notif.type === "badge_update" || notif.type?.includes("badge")) {
                        router.push("/profile?scrollTo=badge");
                        return;
                      }
                      if (notif.type === "team_add" || notif.type === "team_remove" || notif.type === "team_update" || notif.type?.includes("team")) {
                        router.push("/profile");
                        return;
                      }
                      if (notif.type === "GET_INVOLVED" || notif.targetUrl) {
                        router.push(notif.targetUrl || "/get-involved?scrollTo=my-entries");
                        return;
                      }
                      router.push("/fusion/inbox?filter=" + notif.filterCategory);
                    }}
                    className="card"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "15px",
                      borderLeft: notif.type === "GET_INVOLVED"
                        ? "4px solid #EAB308"
                        : (notif.filterCategory === "Deleted" || notif.type?.includes("DELETE") || notif.type === "WARNING")
                        ? "4px solid #FF4444"
                        : "4px solid #FF3366",
                      animation: "fadeIn 0.3s ease",
                      gap: "6px",
                      cursor: "pointer",
                      transition:
                        "transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease, opacity 0.3s ease",
                      position: "relative",
                      background: notif.type === "GET_INVOLVED"
                        ? (notif.read ? "rgba(234, 179, 8, 0.05)" : "rgba(234, 179, 8, 0.16)")
                        : notif.read
                        ? "rgba(255, 51, 102, 0.03)"
                        : "rgba(255, 51, 102, 0.15)",
                      opacity: notif.read ? 0.6 : 1,
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.transform = "scale(1.02)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    {!notif.read && (
                      <div
                        style={{
                          position: "absolute",
                          top: "15px",
                          right: "15px",
                          width: "10px",
                          height: "10px",
                          background: notif.type === "GET_INVOLVED" ? "#EAB308" : "#FF3366",
                          borderRadius: "50%",
                        }}
                      ></div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "12px",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          minWidth: "40px",
                          minHeight: "40px",
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: notif.type === "GET_INVOLVED" ? "rgba(234, 179, 8, 0.2)" : "rgba(255,51,102,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem",
                        }}
                      >
                        <span style={{ marginTop: "0px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {notif.type === "GET_INVOLVED" ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                          ) : notif.type?.toUpperCase() === "PENALTY" ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                            </svg>
                          ) : notif.type?.toUpperCase() === "PENALTY LIFTED" || notif.type?.toUpperCase() === "UNBLOCKED" ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                            </svg>
                          ) : notif.filterCategory === "Deleted" || notif.type?.toUpperCase().includes("DELETE") || notif.type?.toUpperCase() === "WARNING" ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                              <line x1="12" y1="9" x2="12" y2="13" />
                              <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                          ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                            </svg>
                          )}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            color: "var(--neon-white)",
                            fontWeight: "bold",
                          }}
                        >
                          {notif.type === "GET_INVOLVED"
                            ? <span>Heartist Team replied to your Get Involved submission: <span style={{ fontWeight: "normal", color: "#FDE68A" }}>{notif.content}</span></span>
                            : notif.type?.toUpperCase() === "WARNING" 
      ? <span>Admin <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 3px" }}><BadgeIcon badge="admin" size={14} /></span> gave you a warning: <span style={{ fontWeight: "normal" }}>{notif.content || "regarding your post or behavior."}</span></span>
      : notif.type?.toUpperCase() === "PENALTY"
      ? <span>Admin <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 3px" }}><BadgeIcon badge="admin" size={14} /></span> placed your account on penalty: <span style={{ fontWeight: "normal" }}>{notif.content}</span></span>
      : notif.type?.toUpperCase() === "PENALTY LIFTED"
      ? <span>Admin <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 3px" }}><BadgeIcon badge="admin" size={14} /></span> lifted your penalty: <span style={{ fontWeight: "normal" }}>{notif.content}</span></span>
      : notif.type?.toUpperCase() === "UNBLOCKED"
      ? <span>Admin <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 3px" }}><BadgeIcon badge="admin" size={14} /></span> unblocked your account: <span style={{ fontWeight: "normal" }}>{notif.content}</span></span>
      : notif.filterCategory === "Deleted" || notif.type?.toUpperCase().includes("DELETE")
      ? <span>Admin <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 3px" }}><BadgeIcon badge="admin" size={14} /></span> deleted your post/comment: <span style={{ fontWeight: "normal" }}>{notif.content}</span></span>
      : notif.type?.toUpperCase().includes("REPORT") || notif.type?.toUpperCase().includes("MODERATION")
      ? <span>Admin <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 3px" }}><BadgeIcon badge="admin" size={14} /></span> sent an update on your report/appeal: <span style={{ fontWeight: "normal" }}>{notif.content}</span></span>
      : <span>Admin <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 3px" }}><BadgeIcon badge="admin" size={14} /></span> sent a message: <span style={{ fontWeight: "normal" }}>{notif.content || `New Message in ${notif.filterCategory === "prayer" ? "Prayer Request" : "General Chat"}`}</span></span>}
                        </div>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            marginTop: "4px",
                          }}
                        >
                          {formatTimeAgo(notif.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              let {
                fullName: recentFullName,
                avatar,
                team,
                badge,
              } = getUserDetails(notif.users[0] || notif.postAuthor || "User");

              const isRoleOrTeamUpdate =
                notif.type === "badge_and_team_update" ||
                notif.type === "badge_update" ||
                notif.type === "team_add" ||
                notif.type === "team_remove" ||
                notif.type === "team_update" ||
                notif.type?.includes("badge") ||
                notif.type?.includes("team");

              if (
                isRoleOrTeamUpdate ||
                notif.type === "prayer_deleted" ||
                notif.type === "post_deleted" || notif.type === "comment_deleted"
              ) {
                badge = "admin";

                // For admin actions, the actor is the admin, not the postAuthor.
                const adminAcc = accounts.find(
                  (a) => a.badge === "admin" && a.firstName,
                );
                if (adminAcc) {
                  recentFullName = adminAcc.firstName;
                  avatar = adminAcc.avatar || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                } else {
                  recentFullName = notif.adminName || "Admin";
                  avatar = "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
                }
                team = "none";
              }

              const teamColor = team && team !== "none" ? team : "transparent";

              let actorsText = (
                <span>
                  {recentFullName}{" "}
                  <span
                    style={{
                      opacity: 0.7,
                      fontWeight: "normal",
                      fontSize: "0.85em",
                      marginLeft: "4px",
                    }}
                    title={badge}
                  >
                    {getRoleIcon(badge)}
                  </span>
                </span>
              );
              const isAdminAction =
                isRoleOrTeamUpdate ||
                notif.type === "prayer_deleted" ||
                notif.type === "post_deleted" ||
                notif.type === "comment_deleted";
              if (notif.users.length === 2 && !isAdminAction) {
                const { fullName: secondFullName, badge: secondBadge } =
                  getUserDetails(notif.users[1]);
                actorsText = (
                  <span>
                    {recentFullName}{" "}
                    <span
                      style={{
                        opacity: 0.7,
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        marginLeft: "4px",
                      }}
                      title={badge}
                    >
                      {getRoleIcon(badge)}
                    </span>{" "}
                    and {secondFullName}{" "}
                    <span
                      style={{
                        opacity: 0.7,
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        marginLeft: "4px",
                      }}
                      title={secondBadge}
                    >
                      {getRoleIcon(secondBadge)}
                    </span>
                  </span>
                );
              } else if (notif.users.length > 2 && !isAdminAction) {
                const { fullName: secondFullName, badge: secondBadge } =
                  getUserDetails(notif.users[1]);
                actorsText = (
                  <span>
                    {recentFullName}{" "}
                    <span
                      style={{
                        opacity: 0.7,
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        marginLeft: "4px",
                      }}
                      title={badge}
                    >
                      {getRoleIcon(badge)}
                    </span>
                    , {secondFullName}{" "}
                    <span
                      style={{
                        opacity: 0.7,
                        fontWeight: "normal",
                        fontSize: "0.85em",
                        marginLeft: "4px",
                      }}
                      title={secondBadge}
                    >
                      {getRoleIcon(secondBadge)}
                    </span>{" "}
                    and {notif.users.length - 2} others
                  </span>
                );
              }

              return (
                <div
                  key={notif.id}
                  onClick={async () => {
                    const activeUserStr = localStorage.getItem("activeUser");
                    if (!activeUserStr) return;
                    const cUser = JSON.parse(activeUserStr).firstName;

                    if (!notif.read) {
                      if (notif.supabase_id) {
                         const { markNotificationRead } = await import('@/lib/notificationsSync');
                         await markNotificationRead(notif.supabase_id);
                      }
                      const allNotifs = JSON.parse(localStorage.getItem("communityNotifications") || "[]");
                      const updated = allNotifs.map((n: any) => 
                        (n.id === notif.id || (n.postId && n.postId === notif.postId && (n.type === notif.type || notif.type.includes(n.type)))) ? { ...n, read: true } : n
                      );
                      localStorage.setItem("communityNotifications", JSON.stringify(updated));
                      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
                      window.dispatchEvent(new Event("storage"));
                      window.dispatchEvent(new CustomEvent("heartist_notification_event", { detail: { type: "item_read", id: notif.id } }));
                    }

                    if (notif.type === "GET_INVOLVED" || notif.type === "get_involved_response") {
                      router.push("/get-involved?scrollTo=my-entries" + (notif.postId ? `&subId=${notif.postId}` : ""));
                      return;
                    }

                    if (isRoleOrTeamUpdate) {
                      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
                      router.push("/profile?scrollTo=badge");
                      return;
                    }

                    if (notif.type === "pray") {
                      router.push("/prayer");
                    } else if (
                      notif.type.includes("comment") ||
                      notif.type.includes("reply")
                    ) {
                      router.push(
                        `/community?highlight=${notif.postId}&admin=${cUser === "Admin"}`
                      );
                    } else {
                      router.push(
                        `/community?highlight=${notif.postId}&admin=${cUser === "Admin"}`
                      );
                    }
                  }}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: "15px",
                    borderLeft:
                      notif.type === "prayer_deleted" ||
                      notif.type === "post_deleted" || notif.type === "comment_deleted" ||
                      notif.type === "warning" ||
                      notif.type === "penalty"
                        ? "4px solid #FF4444"
                        : notif.type === "pray"
                          ? "4px solid var(--neon-yellow)"
                          : isRoleOrTeamUpdate
                            ? `4px solid ${notif.badgeColor || "var(--neon-yellow)"}`
                            : "4px solid var(--neon-white)",
                    animation: "fadeIn 0.3s ease",
                    gap: "6px",
                    cursor: "pointer",
                    transition:
                      "transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease, opacity 0.3s ease",
                    position: "relative",
                    background: notif.read
                      ? "rgba(255, 255, 255, 0.02)"
                      : "rgba(255, 255, 255, 0.08)",
                    opacity: notif.read ? 0.6 : 1,
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.transform = "scale(1.02)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.transform = "scale(1)")
                  }
                >
                  {!notif.read && (
                    <div
                      style={{
                        position: "absolute",
                        top: "15px",
                        right: "15px",
                        width: "10px",
                        height: "10px",
                        background: "#FF4444",
                        borderRadius: "50%",
                      }}
                    ></div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: "12px",
                      width: "100%",
                    }}
                  >
                    {/* Avatar Wrapper with Overlapping Reaction */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div
                        style={{
                          minWidth: "40px",
                          minHeight: "40px",
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.5rem",
                          overflow: "hidden",
                          border: `2px solid ${teamColor}`,
                        }}
                      >
                        {avatar && avatar.length > 10 ? (
                          <img
                            src={avatar}
                            alt={recentFullName}
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
        <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
    )}
                      </div>

                      {/* Overlapping Badge / Action Icon */}
                      <div
                        style={{
                          position: "absolute",
                          bottom: "-2px",
                          right: "-2px",
                          background: "var(--bg-color, #111)",
                          borderRadius: "50%",
                          padding: "3px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "2px solid rgba(10, 10, 10, 0.95)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                        }}
                      >
                        {notif.type === "pray" ? (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M12 2V6M10 4H14"
                              stroke="#FACC15"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                            <path
                              d="M7 21L10 11C10.5 9 11.2 7 12 7C12.8 7 13.5 9 14 11L17 21"
                              stroke="#FACC15"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M12 7V21M9 13H15M7.5 17H16.5"
                              stroke="#FACC15"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                              opacity="0.6"
                            />
                          </svg>
                        ) : notif.type === "comment" ||
                          notif.type === "comment_reply" ||
                          (notif.type === "mention" && notif.mentionType === "post") ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#60A5FA"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        ) : notif.type === "mention" && notif.mentionType !== "post" ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#F87171"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="4" />
                            <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                          </svg>
                        ) : isRoleOrTeamUpdate ? (
                          <BadgeIcon badge="admin" size={13} />
                        ) : notif.type === "prayer_deleted" ||
                          notif.type === "post_deleted" ||
                          notif.type === "comment_deleted" ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#EF4444"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        ) : (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="#FACC15"
                            stroke="#FACC15"
                            strokeWidth="1.5"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* Content Block (Name + Action + Time) */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        marginTop: "9px",
                        textAlign: "justify",
                      }}
                    >
                      {isRoleOrTeamUpdate ? (
                        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                          <div style={{ fontSize: "0.95rem", color: "var(--neon-white)", lineHeight: "1.4" }}>
                            <span style={{ fontWeight: "bold", fontSize: "0.95rem", marginRight: "4px" }}>
                              {actorsText}
                            </span>
                            <span style={{ opacity: 0.95 }}>
                              {notif.type === "badge_and_team_update"
                                ? "updated your role badge and team color!"
                                : notif.type === "badge_update" || notif.type?.includes("badge")
                                ? "updated your role badge!"
                                : notif.type === "team_remove" || notif.team === "none"
                                ? "removed your team color."
                                : "assigned you a new team color!"}
                            </span>
                          </div>

                          {/* Dedicated Info Box for Badge or Team */}
                          {(() => {
                            const isBadge = notif.type === "badge_and_team_update" || notif.type === "badge_update" || (Boolean(notif.badge) && !notif.type?.includes("team"));
                            const isTeam = notif.type === "badge_and_team_update" || notif.type === "team_add" || notif.type === "team_remove" || notif.type === "team_update" || (notif.team !== undefined && notif.team !== null && !notif.type?.includes("badge"));

                            const boxBorderColor = isBadge && notif.badgeColor
                              ? `${notif.badgeColor}40`
                              : isTeam && notif.team && notif.team !== "none"
                              ? `${notif.team}40`
                              : "rgba(255, 255, 255, 0.12)";

                            const boxGlowColor = isBadge && notif.badgeColor
                              ? `0 0 15px ${notif.badgeColor}15`
                              : isTeam && notif.team && notif.team !== "none"
                              ? `0 0 15px ${notif.team}15`
                              : "none";

                            const accentColor = isBadge && notif.badgeColor
                              ? notif.badgeColor
                              : isTeam && notif.team && notif.team !== "none"
                              ? notif.team
                              : "var(--neon-yellow)";

                            return (
                              <div
                                style={{
                                  background: "rgba(255, 255, 255, 0.04)",
                                  border: `1px solid ${boxBorderColor}`,
                                  borderRadius: "10px",
                                  padding: "10px 14px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                  boxShadow: boxGlowColor,
                                }}
                              >
                                {/* Role Badge Info - ONLY displayed if this notification is for badge */}
                                {isBadge && (
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                      Role Badge:
                                    </span>
                                    {(() => {
                                      const bDef = notif.badge ? getBadgeDefinition(notif.badge) : (notif.postContent ? getBadgeDefinition(notif.postContent) : null);
                                      const bId = notif.badge || (bDef ? bDef.id : "Heartist");
                                      const bColor = notif.badgeColor || (bDef ? bDef.color : "#22C55E");
                                      const bLabel = notif.badgeLabel || (bDef ? bDef.label : (notif.postContent || "Member"));
                                      return (
                                        <div
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "4px 12px",
                                            borderRadius: "14px",
                                            background: `${bColor}20`,
                                            border: `1px solid ${bColor}66`,
                                          }}
                                        >
                                          <BadgeIcon badge={bId} size={15} color={bColor} />
                                          <span style={{ color: bColor, fontWeight: "bold", fontSize: "0.85rem" }}>
                                            {bLabel}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* Team Color Info - ONLY displayed if this notification is for team color */}
                                {isTeam && (
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                      Team Color:
                                    </span>
                                    {notif.team && notif.team !== "none" ? (
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "7px",
                                          padding: "4px 12px",
                                          borderRadius: "14px",
                                          background: `${notif.team}22`,
                                          border: `1px solid ${notif.team}66`,
                                          boxShadow: `0 0 8px ${notif.team}33`,
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "50%",
                                            background: notif.team,
                                            border: "1px solid rgba(255, 255, 255, 0.6)",
                                            display: "inline-block",
                                          }}
                                        />
                                        <span style={{ color: notif.team, fontWeight: "bold", fontSize: "0.85rem", textTransform: "capitalize" }}>
                                          Team {notif.team}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                        None
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Tap callout */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    marginTop: "2px",
                                    fontSize: "0.78rem",
                                    color: accentColor,
                                    fontWeight: "600",
                                  }}
                                >
                                  <span>Tap to view in your profile</span>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6" />
                                  </svg>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.9rem",
                            color: "var(--neon-white)",
                            lineHeight: "1.4",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "bold",
                              fontSize: "0.95rem",
                              marginRight: "4px",
                            }}
                          >
                            {actorsText}
                          </span>
                          {notif.type === "comment" ||
                          notif.type === "comment_reply" ? (
                            <span style={{ opacity: 0.9 }}>
                              {notif.type === "comment_reply"
                                ? "replied to a comment on a post"
                                : "commented on a post"}
                              {notif.postContent && (
                                <>
                                  :{" "}
                                  <span
                                    style={{
                                      fontStyle: "italic",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    "{notif.postContent}"
                                  </span>
                                </>
                              )}
                            </span>
                          ) : notif.type === "prayer_deleted" ? (
                            <span style={{ opacity: 0.9 }}>
                              deleted your prayer request for violating guidelines.
                            </span>
                          ) : notif.type === "post_deleted" || notif.type === "comment_deleted" ? (
                            <span style={{ opacity: 0.9 }}>
                              deleted your post/comment for violating guidelines.
                            </span>
                          ) : notif.type === "pray" ? (
                            <span style={{ opacity: 0.9 }}>
                              prayed for you
                              {notif.postContent ? (
                                <>
                                  :{" "}
                                  <span
                                    style={{
                                      fontStyle: "italic",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    "{notif.postContent}"
                                  </span>
                                </>
                              ) : (
                                "."
                              )}
                            </span>
                          ) : notif.type.includes("mention") ? (
                            <span style={{ opacity: 0.9 }}>
                              mentioned you in a {notif.mentionType}
                              {notif.postContent ? (
                                <>
                                  :{" "}
                                  <span
                                    style={{
                                      fontStyle: "italic",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    "{notif.postContent}"
                                  </span>
                                </>
                              ) : (
                                "."
                              )}
                            </span>
                          ) : (
                            <span style={{ opacity: 0.9 }}>
                              reacted to a post
                              {notif.postContent && (
                                <>
                                  :{" "}
                                  <span
                                    style={{
                                      fontStyle: "italic",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    "{notif.postContent}"
                                  </span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                          marginTop: "6px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span style={{ opacity: 0.7 }}>•</span>
                        {formatTimeAgo(notif.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
      <div
        style={{ textAlign: "center", marginTop: "auto", paddingTop: "40px" }}
      >
        <button
          onClick={() => router.back()}
          className="nav-item"
          style={{
            padding: "10px 20px",
            background: "transparent",
            border: "1px solid var(--neon-yellow)",
            borderRadius: "8px",
            color: "var(--neon-yellow)",
            fontFamily: "var(--font-outfit)",
            cursor: "pointer",
            fontSize: "1rem",
            transition: "all 0.3s ease-in-out",
          }}
        >
          Go Back
        </button>
      </div>
    </main>
  );
}
