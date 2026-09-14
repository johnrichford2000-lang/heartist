"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BlockEnforcer() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't enforce block on login or banned pages to prevent redirect loops
    if (pathname === "/login" || pathname === "/banned") return;

    let isChecking = false;

    const checkBlockStatus = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const activeUserStr = localStorage.getItem("activeUser");
        if (!activeUserStr) {
          isChecking = false;
          return;
        }
        
        const parsedUser = JSON.parse(activeUserStr);
        const uid = parsedUser.id;
        const fname = parsedUser.firstName;

        // 1. Check LocalStorage Blocks (fastest)
        const localBlocks = JSON.parse(localStorage.getItem("communityBlockedUsers") || "[]");
        let isBlocked = false;
        
        if ((uid && localBlocks.includes(uid)) || (fname && localBlocks.includes(fname))) {
          isBlocked = true;
        }

        // 2. Check Supabase (authoritative source)
        if (!isBlocked && uid) {
          const { data, error } = await supabase
            .from("profiles")
            .select("is_banned, banned_until")
            .eq("id", uid)
            .single();
            
          if (!error && data) {
            if (data.is_banned) {
              // If banned_until is null, it's a permanent block. If it has a date, it's a temporary ban.
              // Both should kick the user out of active pages.
              isBlocked = true;
            }
          }
        }

        if (isBlocked) {
          // Log out user and redirect to login
          localStorage.removeItem("isHeartistLoggedIn");
          localStorage.removeItem("isAdminLoggedIn");
          localStorage.removeItem("activeUser");
          await supabase.auth.signOut();
          
          // Pass a query parameter so the login page can display the message
          window.location.href = "/login?blocked=true";
        }
      } catch (err) {
        console.error("Error in BlockEnforcer", err);
      } finally {
        isChecking = false;
      }
    };

    // Check immediately on mount/navigation
    checkBlockStatus();

    // And then check every 15 seconds
    const interval = setInterval(checkBlockStatus, 15000);
    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
