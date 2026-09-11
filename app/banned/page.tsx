"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import HeartistLogo from "@/components/HeartistLogo";
import Link from "next/link";

export default function BannedPage() {
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState("");
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);
  
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [isAppealing, setIsAppealing] = useState(false);
  const [appealSuccess, setAppealSuccess] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    const checkBanStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, banned_until, ban_reason, first_name, last_name, id')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setProfileData(profile);
        if (!profile.is_banned || !profile.banned_until) {
          // Not banned, redirect to profile
          window.location.href = "/profile";
          return;
        }

        const bannedUntilTime = new Date(profile.banned_until).getTime();
        const now = Date.now();

        if (now >= bannedUntilTime) {
          // Ban has expired! Clear it from the database to save space!
          await supabase
            .from('profiles')
            .update({
              is_banned: false,
              banned_until: null,
              ban_reason: null
            })
            .eq('id', session.user.id);
          
          window.location.href = "/profile";
          return;
        }

        // Still banned
        setReason(profile.ban_reason || "Violation of community guidelines.");
        
        // Start countdown timer
        const updateTimer = () => {
          const currentNow = Date.now();
          const diff = bannedUntilTime - currentNow;
          
          if (diff <= 0) {
            clearInterval(timerId);
            window.location.reload(); // Reload to trigger the unban logic above
            return;
          }

          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / 1000 / 60) % 60);
          const seconds = Math.floor((diff / 1000) % 60);

          setTimeLeft({ days, hours, minutes, seconds });
        };

        updateTimer();
        timerId = setInterval(updateTimer, 1000);
        setLoading(false);
      } else {
        window.location.href = "/login";
      }
    };

    checkBanStatus();

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("isAdminLoggedIn");
    window.location.href = "/login";
  };

  const handleSubmitAppeal = async () => {
    if (!appealReason.trim() || !profileData) return;
    setIsAppealing(true);
    try {
      const { createAppeal } = await import("@/lib/moderationSync");
      const name = `${profileData.first_name} ${profileData.last_name || ''}`.trim();
      await createAppeal({
        user_id: profileData.id,
        user_name: name,
        reason: appealReason
      });
      setAppealSuccess(true);
      setShowAppeal(false);
    } catch (e) {
      console.error("Failed to submit appeal", e);
    }
    setIsAppealing(false);
  };

  if (loading) {
    return (
      <main className="main-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <HeartistLogo className="animated-glow-text" width={60} height={60} />
      </main>
    );
  }

  return (
    <main className="main-container" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", padding: "20px" }}>
      <div className="card" style={{ maxWidth: "500px", width: "100%", textAlign: "center", borderTop: "4px solid #FF4444", background: "var(--bg-card)" }}>
        <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🚫</div>
        
        <h1 style={{ color: "#FF4444", fontFamily: "var(--font-outfit)", fontSize: "2rem", marginBottom: "15px" }}>
          Account Banned
        </h1>
        
        <p style={{ color: "var(--neon-white)", fontSize: "1.1rem", marginBottom: "20px", lineHeight: "1.6" }}>
          Your account has been temporarily restricted due to the following reason:
        </p>
        
        <div style={{ background: "rgba(255,68,68,0.1)", padding: "15px", borderRadius: "8px", border: "1px solid rgba(255,68,68,0.3)", marginBottom: "30px", color: "white", fontStyle: "italic" }}>
          &quot;{reason}&quot;
        </div>
        
        {timeLeft && (
          <div style={{ marginBottom: "30px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>Time Remaining</p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", fontFamily: "var(--font-outfit)", fontSize: "1.5rem", color: "var(--neon-yellow)" }}>
              <div style={{ background: "rgba(0,0,0,0.5)", padding: "10px 15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div>{timeLeft.days}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>DAYS</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.5)", padding: "10px 15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div>{timeLeft.hours}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>HRS</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.5)", padding: "10px 15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div>{timeLeft.minutes}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>MIN</div>
              </div>
              <div style={{ background: "rgba(0,0,0,0.5)", padding: "10px 15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div>{timeLeft.seconds}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>SEC</div>
              </div>
            </div>
          </div>
        )}
        
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "30px", lineHeight: "1.5" }}>
          If you believe this is a mistake, you can submit an appeal to the Admin. 
          Your account will be automatically restored once the timer expires.
        </p>

        {appealSuccess ? (
          <div style={{ padding: "10px", background: "rgba(0,255,0,0.1)", color: "#00ff00", border: "1px solid #00ff00", borderRadius: "8px", marginBottom: "20px" }}>
            Your appeal has been successfully submitted! Admin will review it shortly.
          </div>
        ) : showAppeal ? (
          <div style={{ marginBottom: "20px", textAlign: "left" }}>
            <textarea 
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              placeholder="Explain why your ban should be lifted..."
              style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", color: "white", minHeight: "80px", marginBottom: "10px", fontFamily: "var(--font-inter)" }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={handleSubmitAppeal}
                disabled={isAppealing || !appealReason.trim()}
                style={{ flex: 1, padding: "10px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "8px", cursor: isAppealing ? "not-allowed" : "pointer", fontWeight: "bold" }}
              >
                {isAppealing ? "Submitting..." : "Submit Appeal"}
              </button>
              <button 
                onClick={() => setShowAppeal(false)}
                style={{ padding: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "8px", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowAppeal(true)}
            style={{ width: "100%", padding: "12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.2)", color: "white", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)", marginBottom: "10px", transition: "all 0.3s ease" }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          >
            Submit an Appeal
          </button>
        )}
        
        
        <button 
          onClick={handleLogout}
          style={{ 
            width: "100%", 
            padding: "12px", 
            background: "transparent", 
            border: "1px solid rgba(255,255,255,0.2)", 
            color: "white", 
            borderRadius: "8px", 
            cursor: "pointer", 
            fontFamily: "var(--font-outfit)",
            transition: "all 0.3s ease"
          }}
          onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
        >
          Logout
        </button>
      </div>
    </main>
  );
}
