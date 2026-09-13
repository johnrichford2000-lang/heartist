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
          (n.userId && n.userId === pUser.id) ||
          (n.recipient_id && (n.recipient_id === pUser.id || n.recipient_id === pUser.firstName)) ||
          (n.postAuthor && (n.postAuthor === `${pUser.firstName} ${pUser.lastName}`.trim() || n.postAuthor === pUser.firstName));

        if (isTargetUser && n.badge) {
          const badgeDef = getBadgeDefinition(n.badge);
          
          // Update activeUser cache immediately
          pUser.badge = n.badge;
          localStorage.setItem("activeUser", JSON.stringify(pUser));
          
          // Update registeredAccounts cache
          const accsStr = localStorage.getItem("registeredAccounts");
          if (accsStr) {
            try {
              const accs = JSON.parse(accsStr);
              const match = accs.find((a: any) => (a.firstName || '').toLowerCase() === (pUser.firstName || '').toLowerCase());
              if (match) {
                match.badge = n.badge;
                localStorage.setItem("registeredAccounts", JSON.stringify(accs));
              }
            } catch(e) {}
          }

          // Trigger live toast notification
          setBadgeToast({
            badge: n.badge,
            badgeLabel: badgeDef.label,
            badgeColor: badgeDef.color,
            adminName: n.adminName || n.users?.[0] || "Admin"
          });

          window.dispatchEvent(new Event("storage"));
          window.dispatchEvent(new CustomEvent("badge_updated", { detail: n }));
        }
      } catch (e) {
        console.error("Error handling badge notification", e);
      }
    };

    const channelId = `realtime_notifs_listener_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase.channel(channelId)
      .on('broadcast', { event: 'new_notif' }, (payload) => {
        try {
          const n = payload.payload;
          const current = JSON.parse(localStorage.getItem('communityNotifications') || '[]');
          
          // Check if this is a block notification for the active user
          if (n.type && n.type.toUpperCase() === "BLOCK") {
            const activeStr = localStorage.getItem("activeUser");
            if (activeStr) {
              const pUser = JSON.parse(activeStr);
              if (pUser.id === n.recipient_id || pUser.firstName === n.recipient_id) {
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

          // Check if this is a badge update for the active user
          if (n.type === "badge_update") {
            handleBadgeNotification(n);
          }
          
          if (!current.find((x: any) => x.id === n.id)) {
            current.push(n);
            localStorage.setItem('communityNotifications', JSON.stringify(current));
            window.dispatchEvent(new Event("storage"));
          }
        } catch (e) {
            console.error("Broadcast notification error", e);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        try {
          const newRow = payload.new;
          if (newRow && newRow.type === "badge_update" && newRow.message) {
            try {
              const parsed = JSON.parse(newRow.message);
              handleBadgeNotification(parsed);
            } catch(e) {}
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
    };
  }, []);

  // No intrusive floating popup; notification is displayed as a dedicated card in the Notification navigation section
  return null;
}
