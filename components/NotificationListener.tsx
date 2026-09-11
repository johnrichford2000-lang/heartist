"use client";
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function NotificationListener() {
  useEffect(() => {
    const channel = supabase.channel('public-notifications')
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
            
            if (!current.find((x: any) => x.id === n.id)) {
              current.push(n);
              localStorage.setItem('communityNotifications', JSON.stringify(current));
              window.dispatchEvent(new Event("storage"));
            }
        } catch (e) {
            console.error("Broadcast notification error", e);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
