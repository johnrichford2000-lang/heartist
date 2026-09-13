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

  if (!badgeToast) return null;

  return (
    <div 
      style={{
        position: "fixed",
        top: "22px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 999999,
        background: "rgba(14, 14, 18, 0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `2px solid ${badgeToast.badgeColor}`,
        borderRadius: "14px",
        padding: "12px 18px",
        boxShadow: `0 12px 35px rgba(0,0,0,0.85), 0 0 25px ${badgeToast.badgeColor}35`,
        display: "flex",
        alignItems: "center",
        gap: "14px",
        maxWidth: "92vw",
        width: "420px",
        animation: "slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: "auto",
        fontFamily: "var(--font-outfit)"
      }}
    >
      <div 
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          background: `${badgeToast.badgeColor}20`,
          border: `1.5px solid ${badgeToast.badgeColor}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <BadgeIcon badge={badgeToast.badge} size={22} color={badgeToast.badgeColor} />
      </div>

      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: "0.75rem", color: badgeToast.badgeColor, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.6px" }}>
          Role Badge Updated!
        </div>
        <div style={{ fontSize: "0.9rem", color: "#FFFFFF", marginTop: "2px", lineHeight: "1.3" }}>
          {badgeToast.adminName} assigned you the <strong style={{ color: badgeToast.badgeColor }}>{badgeToast.badgeLabel}</strong> badge.
        </div>
      </div>

      <button
        onClick={() => setBadgeToast(null)}
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.6)",
          cursor: "pointer",
          padding: "4px",
          fontSize: "1.1rem",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "color 0.2s"
        }}
        onMouseOver={(e) => e.currentTarget.style.color = "#FFFFFF"}
        onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
