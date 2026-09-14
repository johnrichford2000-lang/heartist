"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import BadgeIcon, { getBadgeDefinition } from '@/components/BadgeIcon';

export default function NotificationListener() {
  const [badgeToast, setBadgeToast] = useState<{
    badge: string;
    badgeLabel: string;
    badgeColor: string;
    adminName: string;
  } | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (badgeToast) {
      timer = setTimeout(() => {
        setBadgeToast(null);
      }, 7000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [badgeToast]);

  useEffect(() => {
    const handleBadgeNotification = (n: any) => {
      const activeStr = localStorage.getItem("activeUser");
      if (!activeStr) return;

      try {
        const pUser = JSON.parse(activeStr);
        const isTargetUser = 
          (n.userId && (n.userId === pUser.id || n.userId === `${pUser.firstName} ${pUser.lastName}`.trim() || n.userId === pUser.firstName)) ||
          (n.recipient_id && (n.recipient_id === pUser.id || n.recipient_id === `${pUser.firstName} ${pUser.lastName}`.trim() || n.recipient_id === pUser.firstName)) ||
          (n.postAuthor && (n.postAuthor === `${pUser.firstName} ${pUser.lastName}`.trim() || n.postAuthor === pUser.firstName));

        if (isTargetUser) {
          // Update activeUser cache immediately
          if (n.badge) pUser.badge = n.badge;
          if (n.team !== undefined) pUser.team = n.team;
          localStorage.setItem("activeUser", JSON.stringify(pUser));
          
          // Update registeredAccounts cache
          const accsStr = localStorage.getItem("registeredAccounts");
          if (accsStr) {
            try {
              const accs = JSON.parse(accsStr);
              const match = accs.find((a: any) => (a.firstName || '').toLowerCase() === (pUser.firstName || '').toLowerCase());
              if (match) {
                if (n.badge) match.badge = n.badge;
                if (n.team !== undefined) match.team = n.team;
                localStorage.setItem("registeredAccounts", JSON.stringify(accs));
              }
            } catch(e) {}
          }

          if (n.badge) {
            const badgeDef = getBadgeDefinition(n.badge);
            setBadgeToast({
              badge: n.badge,
              badgeLabel: badgeDef.label,
              badgeColor: badgeDef.color,
              adminName: n.adminName || n.users?.[0] || "Admin"
            });
          }

          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("badge_updated", { detail: n }));
        }
      } catch (e) {
        console.error("Error handling badge notification", e);
      }
    };

    const processIncomingNotification = (n: any) => {
      if (!n) return;
      try {
        const current = JSON.parse(localStorage.getItem('communityNotifications') || '[]');
        
        // Check if this is a block notification for the active user
        if (n.type && (n.type.toUpperCase() === "BLOCK" || n.type.toUpperCase() === "BLOCKED")) {
          if (typeof window !== "undefined" && (window.location.pathname === "/login" || window.location.pathname === "/banned")) return;
          const activeStr = localStorage.getItem("activeUser");
          if (activeStr && n.recipient_id) {
            const pUser = JSON.parse(activeStr);
            const rId = String(n.recipient_id).trim().toLowerCase();
            const uId = String(pUser.id || "").trim().toLowerCase();
            const uFirst = String(pUser.firstName || "").trim().toLowerCase();
            const uFull = String(pUser.fullName || `${pUser.firstName || ""} ${pUser.lastName || ""}`).trim().toLowerCase();
            const uName = String(pUser.username || "").trim().toLowerCase();

            const isBlockedUser = Boolean(
              (uId && uId === rId) ||
              (uFirst && uFirst === rId) ||
              (uFull && uFull === rId) ||
              (uName && uName === rId)
            );

            if (isBlockedUser) {
              localStorage.removeItem("isHeartistLoggedIn");
              localStorage.removeItem("isAdminLoggedIn");
              localStorage.removeItem("activeUser");
              supabase.auth.signOut().then(() => {
                window.location.href = "/login?blocked=true";
              });
              return;
            }
          }
        }

        // Check if this is a badge or team update for the active user
        if (n.type === "badge_update" || n.type === "badge_and_team_update" || n.type?.includes("badge") || n.type?.includes("team")) {
          handleBadgeNotification(n);
        }
        
        if (n.id && !current.find((x: any) => x.id === n.id)) {
          current.push(n);
          localStorage.setItem('communityNotifications', JSON.stringify(current));
        }

        // Wake up bottom nav and all listeners immediately in realtime
        window.dispatchEvent(new CustomEvent("heartist_notification_event", { detail: n }));
        window.dispatchEvent(new Event("storage"));
      } catch (e) {
        console.error("Broadcast notification error", e);
      }
    };

    // 1. Web BroadcastChannel for same-browser instant sync (0ms)
    let webBc: any = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        webBc = new window.BroadcastChannel("heartist_notifs_sync");
        webBc.onmessage = (ev: MessageEvent) => {
          processIncomingNotification(ev.data);
        };
      } catch (e) {}
    }

    // 2. Canonical Supabase Realtime channel 'public-notifications'
    const channel = supabase.channel('public-notifications')
      .on('broadcast', { event: 'new_notif' }, (payload) => {
        processIncomingNotification(payload.payload);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        try {
          const newRow = payload.new;
          if (newRow) {
            let parsed = newRow;
            if (newRow.message && typeof newRow.message === 'string') {
              try {
                parsed = { ...JSON.parse(newRow.message), supabase_id: newRow.id, recipient_id: newRow.recipient_id };
              } catch (e) {
                parsed = newRow;
              }
            }
            processIncomingNotification(parsed);
          }
        } catch(e) {}
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        try {
          const updatedProfile = payload.new;
          const activeStr = localStorage.getItem("activeUser");
          if (activeStr && updatedProfile) {
            const pUser = JSON.parse(activeStr);
            if (pUser.id === updatedProfile.id && pUser.badge !== updatedProfile.badge) {
              handleBadgeNotification({
                userId: updatedProfile.id,
                badge: updatedProfile.badge,
                adminName: "Admin"
              });
            }
          }
        } catch(e) {}
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (webBc) webBc.close();
    };
  }, []);

  // No intrusive floating popup; notification is displayed as a dedicated card in the Notification navigation section
  return null;
}
