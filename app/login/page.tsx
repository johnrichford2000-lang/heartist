"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import { supabase } from "@/lib/supabase";
import { fetchSystemSetting } from "@/lib/fusionSync";
import CustomDropdown from "@/components/CustomDropdown";

const DEFAULT_AVATAR = "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
const ROLES = [
  { id: "first-timer", title: "First-timer", emoji: "🐣", label: "First-timer 🐣" },
  { id: "camp-veteran", title: "Camp Veteran", emoji: "🎖️", label: "Camp Veteran 🎖️" },
  { id: "supporter", title: "Supporter", emoji: "💖", label: "Supporter 💖" },
];

export function calculateAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const birth = new Date(birthDateString);
  if (isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export function formatCapitalizedName(value: string): string {
  if (!value) return "";
  const clean = value.replace(/[^A-Za-z\s]/g, "");
  return clean.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "verify">("login");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [verificationCode, setVerificationCode] = useState("");

  // Loading states
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Guidelines & Terms of Service
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false);

  // Verification timers (2-minute code expiration, 1-minute resend cooldown)
  const [codeExpiry, setCodeExpiry] = useState(120);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let timer: any = null;
    if (activeTab === "verify") {
      timer = setInterval(() => {
        setCodeExpiry((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeTab]);

  useEffect(() => {
    const saved = localStorage.getItem("registeredAccounts");
    if (saved) {
      setAccounts(JSON.parse(saved));
    }
  }, []);
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  
  // Register fields
  const [regFirstName, setRegFirstName] = useState("");
  const [regMiddleName, setRegMiddleName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regBadge, setRegBadge] = useState(ROLES[0].id);
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [showRegPwd, setShowRegPwd] = useState(false);
  const [showRegConfirmPwd, setShowRegConfirmPwd] = useState(false);

  // Check if registration form is incomplete or terms are not accepted
  const isRegisterFormIncomplete = 
    !regFirstName.trim() || 
    !regLastName.trim() || 
    !regBirthDate || 
    !regEmail.trim() || 
    !regPassword || 
    !regConfirmPassword;

  const isRegisterDisabled = 
    isRegistering || 
    isRegisterFormIncomplete || 
    !agreeToTerms ||
    regPassword.length < 6 ||
    regPassword !== regConfirmPassword;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image file size should be less than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 300;
          let w = img.width;
          let h = img.height;
          if (w > MAX_SIZE || h > MAX_SIZE) {
            const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
            w = w * ratio;
            h = h * ratio;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            setSelectedAvatar(canvas.toDataURL("image/jpeg", 0.85));
          } else {
            setSelectedAvatar(reader.result as string);
          }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("blocked") === "true") {
        setError("Your account has been blocked from posting on the Canvas due to repeated violations.");
        // Optional: clear the param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const processPostLogin = async (user: any) => {
    let adminEmails = await fetchSystemSetting("admin_emails");
    if (typeof adminEmails === "string") {
      try { adminEmails = JSON.parse(adminEmails); } catch(e) {}
    }
    if (!Array.isArray(adminEmails)) adminEmails = ["heartistrichford@gmail.com"];
    const isAdmin = adminEmails.includes(user.email);

    // Fetch profile
    let { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    // If profile doesn't exist yet (first login after email verification)
    if (!profileData) {
      const meta = user.user_metadata;
      const newProfile = {
        id: user.id,
        first_name: isAdmin ? "Admin" : (meta.first_name || ""),
        last_name: isAdmin ? "" : (meta.last_name || ""),
        email: user.email || "",
        age: isAdmin ? "" : (meta.age || (meta.birth_date ? String(calculateAge(meta.birth_date)) : "")),
        birth_date: isAdmin ? null : (meta.birth_date || null),
        contact_number: isAdmin ? "" : (meta.contact_number || ""),
        badge: isAdmin ? "Admin" : (meta.badge || "first-timer"),
        avatar_url: isAdmin ? "👑" : (meta.avatar_url || DEFAULT_AVATAR)
      };
      
      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();
        
      if (insertError) throw insertError;
      profileData = insertedProfile;
    } else if (profileData.is_banned) {
      if (profileData.banned_until) {
        const bannedUntilTime = new Date(profileData.banned_until).getTime();
        if (Date.now() < bannedUntilTime) {
          window.location.href = "/banned";
          return;
        } else {
          // Ban expired, clean it up
          await supabase.from("profiles").update({ is_banned: false, banned_until: null, ban_reason: null }).eq("id", user.id);
          profileData.is_banned = false;
        }
      } else {
        // Permanent block
        setError("Your account has been blocked from posting on the Canvas due to repeated violations.");
        await supabase.auth.signOut();
        return;
      }
    }
    
    // Also check local storage blocks just in case
    const localBlocks = JSON.parse(localStorage.getItem("communityBlockedUsers") || "[]");
    if (localBlocks.includes(profileData.id) || localBlocks.includes(profileData.first_name)) {
      setError("Your account has been blocked from posting on the Canvas due to repeated violations.");
      await supabase.auth.signOut();
      return;
    }

    // Auto-heal admin badge if incorrect
    if (isAdmin && (profileData.badge !== "admin" && profileData.badge !== "Admin")) {
      await supabase.from("profiles").update({ badge: "Admin", avatar_url: "👑" }).eq("id", profileData.id);
      profileData.badge = "Admin";
      profileData.avatar_url = "👑";
    }

    // Keep localStorage activeUser for now as a cache to ease migration of other components
    const userObj = {
      id: profileData.id,
      avatar: profileData.avatar_url,
      firstName: profileData.first_name,
      middleName: user.user_metadata?.middle_name || "",
      lastName: profileData.last_name,
      age: profileData.age,
      birthDate: profileData.birth_date,
      email: profileData.email,
      contact: profileData.contact_number,
      badge: profileData.badge,
      team: profileData.team || "none"
    };
    localStorage.setItem("isHeartistLoggedIn", "true");
    localStorage.setItem("activeUser", JSON.stringify(userObj));
    
    if (isAdmin) {
      localStorage.setItem("isAdminLoggedIn", "true");
      window.location.href = "/admin";
      return;
    }

    window.location.href = "/";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setError("");
    
    try {
      let emailToUse = loginIdentifier.trim();
      
      // If it doesn't look like an email, assume it's a first name
      if (!emailToUse.includes("@")) {
        const { data: profile, error: lookupError } = await supabase
          .from("profiles")
          .select("email")
          .ilike("first_name", emailToUse)
          .single();
          
        if (profile && profile.email) {
          emailToUse = profile.email;
        } else {
          setError("User not found with that First Name.");
          return;
        }
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: loginPassword,
      });

      if (authError) throw authError;

      if (data.user) {
        await processPostLogin(data.user);
      }
    } catch (err: any) {
      setError(err.message || "Account not found or incorrect password.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) return;
    setError("");
    
    if (!regFirstName.trim() || !regLastName.trim() || !regBirthDate || !regEmail.trim() || !regPassword || !regConfirmPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(regFirstName.trim()) || !nameRegex.test(regLastName.trim())) {
      setError("First Name and Last Name must only contain letters.");
      return;
    }

    if (regMiddleName.trim() && !nameRegex.test(regMiddleName.trim())) {
      setError("Middle Name must only contain letters.");
      return;
    }

    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError("Passwords do not match. Please verify your password.");
      return;
    }

    if (!agreeToTerms) {
      setError("Please agree to the Terms of Service & Community Guidelines to continue.");
      return;
    }

    setIsRegistering(true);
    try {
      let adminEmails = await fetchSystemSetting("admin_emails");
      if (typeof adminEmails === "string") {
        try { adminEmails = JSON.parse(adminEmails); } catch(e) {}
      }
      if (!Array.isArray(adminEmails)) adminEmails = ["heartistrichford@gmail.com"];
      
      if (adminEmails.includes(regEmail.trim())) {
        setError("This email is reserved for administrators.");
        return;
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", regEmail.trim())
        .maybeSingle();

      if (existingUser) {
        setError("This email is already registered. Please use a different email or log in.");
        return;
      }

      const computedAge = calculateAge(regBirthDate);

      // 1. Create user in auth and store custom data in meta_data
      const { error: authError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: {
            first_name: formatCapitalizedName(regFirstName.trim()),
            middle_name: formatCapitalizedName(regMiddleName.trim()),
            last_name: formatCapitalizedName(regLastName.trim()),
            birth_date: regBirthDate,
            age: computedAge > 0 ? String(computedAge) : "",
            contact_number: regContact.trim(),
            badge: regBadge,
            avatar_url: selectedAvatar
          }
        }
      });

      if (authError) throw authError;

      setActiveTab("verify");
      setCodeExpiry(120);
      setResendCooldown(60);
      setVerificationCode("");
      setMessage("Success! A 6-digit verification code has been sent to your email. Please enter it below.");

    } catch (err: any) {
      const msg = err.message || "Failed to register.";
      if (/rate limit|rate exceeded|too many requests/i.test(msg)) {
        setError("Email rate limit reached. Please wait a few minutes before trying to register again.");
      } else {
        setError(msg);
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    if (codeExpiry === 0) {
      setError("The verification code has expired. Please check the resend box below to get a new code.");
      return;
    }
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }
    
    setIsVerifying(true);
    setError("");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: regEmail.trim(),
        token: verificationCode,
        type: 'signup'
      });

      if (verifyError) throw verifyError;

      if (data.user) {
        await processPostLogin(data.user);
      }
    } catch(err: any) {
      setError(err.message || "Invalid or expired code.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setError("");
    setMessage("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: regEmail.trim(),
      });
      if (resendError) throw resendError;
      setMessage("A new 6-digit verification code has been sent to your email.");
      setCodeExpiry(120);
      setResendCooldown(60);
      setVerificationCode("");
    } catch (err: any) {
      const msg = err.message || "Failed to resend code. Please try again.";
      if (/rate limit|rate exceeded|too many requests/i.test(msg)) {
        setError("Email rate limit reached. Please wait a few minutes before requesting another code.");
      } else {
        setError(msg);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="main-container" style={{ padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <HeartistLogo className="animated-glow-text" width={60} height={60} />
      <h1 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "20px", marginBottom: "30px", textTransform: "uppercase" }}>
        Heartist Portal
      </h1>
      
      <div className="card" style={{ width: "100%", maxWidth: "450px", padding: "0", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,234,0,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {/* Tabs / Header */}
        {activeTab === "verify" ? (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            padding: "16px 24px", 
            borderBottom: "1px solid rgba(255,255,255,0.1)", 
            background: "rgba(255,234,0,0.06)" 
          }}>
            <span style={{ color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "0.95rem", letterSpacing: "1px" }}>
              EMAIL VERIFICATION
            </span>
            <button
              type="button"
              onClick={() => { setActiveTab("register"); setError(""); setMessage(""); }}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline", fontFamily: "var(--font-outfit)" }}
            >
              Back to Register
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <button 
              type="button"
              onClick={() => { setActiveTab("login"); setError(""); }}
              style={{ 
                flex: 1, 
                padding: "15px", 
                background: activeTab === "login" ? "rgba(255,234,0,0.1)" : "transparent",
                color: activeTab === "login" ? "var(--neon-yellow)" : "var(--text-muted)",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: activeTab === "login" ? "2px solid var(--neon-yellow)" : "2px solid transparent",
                fontFamily: "var(--font-outfit)",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
            >
              LOGIN
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab("register"); setError(""); }}
              style={{ 
                flex: 1, 
                padding: "15px", 
                background: activeTab === "register" ? "rgba(255,234,0,0.1)" : "transparent",
                color: activeTab === "register" ? "var(--neon-yellow)" : "var(--text-muted)",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                borderBottom: activeTab === "register" ? "2px solid var(--neon-yellow)" : "2px solid transparent",
                fontFamily: "var(--font-outfit)",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.3s"
              }}
            >
              REGISTER
            </button>
          </div>
        )}

        {/* Forms Container */}
        <div style={{ 
          padding: activeTab === "verify" ? "28px 24px" : "30px", 
          overflowY: activeTab === "verify" ? "visible" : "auto", 
          maxHeight: activeTab === "verify" ? "none" : "65vh" 
        }}>
          {error && <p style={{ color: "#FF6B6B", textAlign: "center", fontSize: "0.85rem", marginTop: 0, marginBottom: "15px", background: "rgba(255,107,107,0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,107,107,0.2)" }}>{error}</p>}
          {message && <p style={{ color: "#00FF80", textAlign: "center", fontSize: "0.85rem", marginTop: 0, marginBottom: "15px", background: "rgba(0,255,128,0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,255,128,0.2)" }}>{message}</p>}

          {activeTab === "verify" ? (
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", width: "100%" }}>
              
              {/* Info Box */}
              <div style={{ 
                width: "100%", 
                background: "rgba(255, 234, 0, 0.04)", 
                border: "1px solid rgba(255, 234, 0, 0.15)", 
                borderRadius: "12px", 
                padding: "18px 16px", 
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--neon-yellow)", textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "bold" }}>
                    Verification Code Sent
                  </span>
                  <span style={{ 
                    fontSize: "0.78rem", 
                    color: codeExpiry === 0 ? "#FF6B6B" : codeExpiry <= 30 ? "#FFA500" : "var(--neon-yellow)", 
                    fontFamily: "monospace, var(--font-outfit)", 
                    fontWeight: "bold",
                    background: "rgba(0, 0, 0, 0.4)",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    border: codeExpiry === 0 ? "1px solid rgba(255, 107, 107, 0.4)" : "1px solid rgba(255, 234, 0, 0.3)"
                  }}>
                    {codeExpiry > 0 ? (
                      `Expires: ${Math.floor(codeExpiry / 60).toString().padStart(2, "0")}:${(codeExpiry % 60).toString().padStart(2, "0")}`
                    ) : (
                      "Expired"
                    )}
                  </span>
                </div>

                <p style={{ color: "var(--text-main)", fontSize: "1rem", margin: 0, wordBreak: "break-all", fontFamily: "var(--font-outfit)" }}>
                  <strong style={{ color: "#fff" }}>{regEmail}</strong>
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", margin: "2px 0 0 0", lineHeight: "1.4" }}>
                  {codeExpiry > 0 
                    ? "Please check your inbox (and spam folder) for the 6-digit code."
                    : "The 6-digit code has expired. Check the resend box below to request a new code."
                  }
                </p>
              </div>

              {/* 6-Digit Code Input */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                  Enter 6-Digit Code
                </label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="------" 
                  value={verificationCode}
                  disabled={codeExpiry === 0}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  maxLength={6}
                  style={{ 
                    width: "100%",
                    maxWidth: "260px",
                    textAlign: "center", 
                    letterSpacing: "12px", 
                    padding: "14px 10px", 
                    borderRadius: "10px", 
                    background: codeExpiry === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.6)", 
                    border: codeExpiry === 0 
                      ? "1px solid rgba(255,107,107,0.3)" 
                      : verificationCode.length === 6 
                        ? "1px solid var(--neon-yellow)" 
                        : "1px solid rgba(255,255,255,0.25)", 
                    color: codeExpiry === 0 ? "#FF6B6B" : "var(--neon-yellow)", 
                    outline: "none", 
                    fontFamily: "monospace, var(--font-outfit)", 
                    fontSize: "1.8rem", 
                    fontWeight: "bold",
                    boxShadow: verificationCode.length === 6 && codeExpiry > 0 ? "0 0 15px rgba(255, 234, 0, 0.25)" : "none",
                    transition: "all 0.3s"
                  }}
                />
              </div>

              {/* Resend Action Box */}
              <div style={{ 
                width: "100%", 
                background: "rgba(255, 255, 255, 0.03)", 
                border: "1px solid rgba(255, 255, 255, 0.1)", 
                borderRadius: "8px", 
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px"
              }}>
                <span style={{ 
                  fontSize: "0.85rem", 
                  color: "var(--neon-white)",
                  fontFamily: "var(--font-outfit)"
                }}>
                  Didn&apos;t get a code?
                </span>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendOtp}
                  style={{
                    background: resendCooldown > 0 || isResending ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 234, 0, 0.12)",
                    border: resendCooldown > 0 || isResending ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid var(--neon-yellow)",
                    borderRadius: "6px",
                    padding: "7px 14px",
                    color: resendCooldown > 0 || isResending ? "var(--text-muted)" : "var(--neon-yellow)",
                    fontSize: "0.82rem",
                    fontFamily: "var(--font-outfit)",
                    fontWeight: "bold",
                    cursor: resendCooldown > 0 || isResending ? "not-allowed" : "pointer",
                    transition: "all 0.3s",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isResending ? (
                    <>
                      <span className="heartist-spinner" style={{ width: "12px", height: "12px", borderWidth: "1.5px" }} />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    "Resend Code"
                  )}
                </button>
              </div>

              {/* Action Button */}
              <button 
                type="submit"
                disabled={isVerifying || verificationCode.length !== 6 || codeExpiry === 0}
                className={verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "glow-text-yellow" : ""}
                style={{ 
                  width: "100%",
                  padding: "14px", 
                  background: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "rgba(255,234,0,0.12)" : "rgba(255,255,255,0.03)", 
                  color: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "var(--neon-yellow)" : "rgba(255,255,255,0.3)", 
                  border: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.15)", 
                  borderRadius: "8px", 
                  fontFamily: "var(--font-outfit)", 
                  fontWeight: "bold", 
                  fontSize: "1.05rem", 
                  cursor: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "pointer" : "not-allowed", 
                  opacity: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.3s",
                  boxShadow: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "0 0 15px rgba(255, 234, 0, 0.2)" : "none"
                }}
              >
                {isVerifying && <span className="heartist-spinner" />}
                {isVerifying 
                  ? "Verifying Code..." 
                  : codeExpiry === 0 
                    ? "Code Expired - Please Resend" 
                    : "Verify & Enter"}
              </button>

              <button
                type="button"
                onClick={() => {
                   setActiveTab("register");
                   setMessage("");
                   setError("");
                }}
                style={{ 
                  background: "transparent", 
                  border: "none", 
                  color: "var(--text-muted)", 
                  cursor: "pointer", 
                  textDecoration: "underline", 
                  fontSize: "0.85rem", 
                  fontFamily: "var(--font-outfit)",
                  padding: "4px 8px"
                }}
              >
                Wrong email? Go back to edit
              </button>
            </form>
          ) : activeTab === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <input 
                type="text" 
                placeholder="Email or First Name" 
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                style={{ padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
              />
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input 
                  type={showLoginPwd ? "text" : "password"} 
                  placeholder="Password" 
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ width: "100%", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "15px", paddingRight: "45px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
                <button 
                  type="button"
                  onClick={() => setShowLoginPwd(!showLoginPwd)}
                  style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "5px" }}
                >
                  {showLoginPwd ? "💛" : "💔"}
                </button>
              </div>
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="glow-text-yellow"
                style={{ 
                  marginTop: "10px", 
                  padding: "15px", 
                  background: isLoggingIn ? "rgba(255,234,0,0.1)" : "transparent", 
                  color: "var(--neon-yellow)", 
                  border: "1px solid var(--neon-yellow)", 
                  borderRadius: "8px", 
                  fontFamily: "var(--font-outfit)", 
                  fontWeight: "bold", 
                  fontSize: "1.1rem", 
                  cursor: isLoggingIn ? "not-allowed" : "pointer", 
                  opacity: isLoggingIn ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.3s" 
                }}
              >
                {isLoggingIn && <span className="heartist-spinner" />}
                {isLoggingIn ? "Entering Portal..." : "Enter Portal"}
              </button>

              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "5px", fontFamily: "var(--font-outfit)" }}>
                Don&apos;t have an account yet?{" "}
                <span 
                  onClick={() => { setActiveTab("register"); setError(""); setMessage(""); }}
                  style={{ color: "var(--neon-yellow)", cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
                >
                  Register here
                </span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              
              {/* Profile Picture Section */}
              <div style={{ textAlign: "center", marginBottom: "10px" }}>
                <p style={{ color: "var(--neon-white)", fontSize: "0.85rem", marginBottom: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold" }}>
                  Profile
                </p>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <div 
                    onClick={() => document.getElementById("reg-avatar-upload")?.click()}
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      border: "2px solid var(--neon-yellow)",
                      position: "relative",
                      cursor: "pointer",
                      overflow: "hidden",
                      boxShadow: "0 0 15px rgba(255, 234, 0, 0.2)",
                      background: "#000",
                      transition: "transform 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    title="Click to change profile picture"
                  >
                    <img 
                      src={selectedAvatar} 
                      alt="Profile" 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                    <div style={{ 
                      position: "absolute", 
                      bottom: "0", 
                      left: "0", 
                      right: "0", 
                      background: "rgba(0,0,0,0.65)", 
                      color: "var(--neon-yellow)", 
                      fontSize: "0.68rem", 
                      padding: "2px 0",
                      textAlign: "center",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold"
                    }}>
                      Edit
                    </div>
                  </div>

                  <input 
                    type="file" 
                    id="reg-avatar-upload" 
                    accept="image/*" 
                    style={{ display: "none" }} 
                    onChange={handleAvatarUpload} 
                  />

                  {selectedAvatar && selectedAvatar !== DEFAULT_AVATAR ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", marginTop: "4px" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: 0, fontFamily: "var(--font-outfit)" }}>
                        Revert to Default:
                      </p>
                      <div 
                        onClick={() => setSelectedAvatar(DEFAULT_AVATAR)}
                        style={{ 
                          width: "45px", 
                          height: "45px", 
                          borderRadius: "50%", 
                          cursor: "pointer", 
                          border: "1px solid rgba(255,255,255,0.2)", 
                          overflow: "hidden", 
                          transition: "transform 0.2s",
                          boxShadow: "0 0 10px rgba(0,0,0,0.5)"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        title="Revert to Default Profile Picture"
                      >
                        <img 
                          src={DEFAULT_AVATAR} 
                          alt="Default Avatar" 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-outfit)" }}>
                      Default Profile Picture
                    </span>
                  )}
                </div>
              </div>

              {/* Name Fields: First, Middle, Last */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input 
                  type="text" 
                  placeholder="First Name" 
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(formatCapitalizedName(e.target.value))}
                  style={{ flex: "1 1 120px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem", textTransform: "capitalize" }}
                />
                <input 
                  type="text" 
                  placeholder="Middle Name (Optional)" 
                  title="Middle Name (Optional for formality)"
                  value={regMiddleName}
                  onChange={(e) => setRegMiddleName(formatCapitalizedName(e.target.value))}
                  style={{ flex: "1 1 120px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem", textTransform: "capitalize" }}
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  value={regLastName}
                  onChange={(e) => setRegLastName(formatCapitalizedName(e.target.value))}
                  style={{ flex: "1 1 120px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem", textTransform: "capitalize" }}
                />
              </div>

              {/* Birthday Field (Dedicated Row) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                    Birthday
                  </label>
                  {regBirthDate && calculateAge(regBirthDate) > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "var(--neon-yellow)", fontWeight: "bold", fontFamily: "var(--font-outfit)" }}>
                      {calculateAge(regBirthDate)} yrs old
                    </span>
                  )}
                </div>
                <input 
                  type="date" 
                  title="Birthday"
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", colorScheme: "dark", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
              </div>

              {/* Contact Number Field (Dedicated New Line) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", width: "100%" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                  Contact Number (Optional)
                </label>
                <input 
                  type="tel" 
                  placeholder="09XX XXX XXXX (Optional)" 
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value.replace(/[^0-9+\-\s]/g, '').slice(0, 16))}
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
              </div>

              <input 
                type="email" 
                placeholder="Email Address" 
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
              />

              {/* Camper Badge Uniform Custom Dropdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                  Camper Badge
                </label>
                <CustomDropdown 
                  options={ROLES.map(r => ({
                    value: r.id,
                    label: r.label,
                    renderLabel: (
                      <span style={{ fontWeight: "bold", fontFamily: "var(--font-outfit)" }}>
                        <strong style={{ color: "var(--neon-yellow)", fontWeight: "bold", marginRight: "8px" }}>
                          {r.title}
                        </strong>
                        <span>{r.emoji}</span>
                      </span>
                    )
                  }))}
                  value={regBadge}
                  onChange={(val) => setRegBadge(val)}
                />
                <p style={{ fontSize: "0.75rem", color: "var(--canary-yellow)", margin: "4px 0 2px 4px", fontStyle: "italic", lineHeight: "1.3" }}>
                  {regBadge === "first-timer" && "Para sa mga unang beses pa lang sasali sa ating camps o events."}
                  {regBadge === "camp-veteran" && "Para sa mga batikan na at naka-attend na ng mga nakaraang Fusion Camps."}
                  {regBadge === "supporter" && "Para sa mga magulang, sponsors, o kaibigan na sumusuporta sa kabataan."}
                </p>
              </div>
              
              {/* Create Password */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input 
                  type={showRegPwd ? "text" : "password"} 
                  placeholder="Create Password (min. 6 chars)" 
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={{ width: "100%", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "15px", paddingRight: "45px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
                <button 
                  type="button"
                  onClick={() => setShowRegPwd(!showRegPwd)}
                  style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "5px" }}
                  title={showRegPwd ? "Hide password" : "Show password"}
                >
                  {showRegPwd ? "💛" : "💔"}
                </button>
              </div>

              {/* Confirm Password */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input 
                  type={showRegConfirmPwd ? "text" : "password"} 
                  placeholder="Confirm Password" 
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  style={{ 
                    width: "100%", 
                    paddingTop: "12px", 
                    paddingBottom: "12px", 
                    paddingLeft: "15px", 
                    paddingRight: "45px", 
                    borderRadius: "8px", 
                    background: "rgba(0,0,0,0.5)", 
                    border: regConfirmPassword && regPassword !== regConfirmPassword 
                      ? "1px solid #FF4D4D" 
                      : regConfirmPassword && regPassword === regConfirmPassword 
                        ? "1px solid #00FF88" 
                        : "1px solid rgba(255,255,255,0.2)", 
                    color: "white", 
                    outline: "none", 
                    fontFamily: "var(--font-outfit)", 
                    fontSize: "1rem" 
                  }}
                />
                <button 
                  type="button"
                  onClick={() => setShowRegConfirmPwd(!showRegConfirmPwd)}
                  style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "5px" }}
                  title={showRegConfirmPwd ? "Hide password" : "Show password"}
                >
                  {showRegConfirmPwd ? "💛" : "💔"}
                </button>
              </div>

              {regConfirmPassword && regPassword !== regConfirmPassword && (
                <p style={{ color: "#FF6B6B", fontSize: "0.75rem", margin: "-8px 0 0 5px", fontFamily: "var(--font-outfit)" }}>
                  Passwords do not match
                </p>
              )}

              {/* Terms of Service & Community Guidelines Checkbox */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginTop: "6px" }}>
                <input 
                  type="checkbox"
                  id="agree-terms"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  style={{ width: "18px", height: "18px", marginTop: "2px", cursor: "pointer", accentColor: "var(--neon-yellow)" }}
                />
                <label htmlFor="agree-terms" style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", cursor: "pointer", lineHeight: "1.4" }}>
                  I agree to the{" "}
                  <span 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowGuidelinesModal(true);
                    }}
                    style={{ color: "var(--neon-yellow)", textDecoration: "underline", cursor: "pointer", fontWeight: "bold" }}
                  >
                    Terms of Service & Heartist Community Guidelines
                  </span>
                </label>
              </div>

              <button 
                type="submit"
                disabled={isRegisterDisabled}
                className={isRegisterDisabled ? "" : "glow-text-yellow"}
                title={
                  isRegistering
                    ? "Creating your account..."
                    : isRegisterFormIncomplete
                      ? "Paki-fill up ang lahat ng impormasyon para makapag-sign up."
                      : regPassword.length < 6
                        ? "Ang password ay dapat hindi bababa sa 6 characters."
                        : regPassword !== regConfirmPassword
                          ? "Hindi magkatugma ang password at confirm password."
                          : !agreeToTerms
                            ? "Paki-check at tanggapin ang Terms of Service & Community Guidelines bago mag-sign up."
                            : "Sign Up & Enter"
                }
                style={{ 
                  marginTop: "10px", 
                  padding: "15px", 
                  background: isRegisterDisabled ? "rgba(255,255,255,0.03)" : "rgba(255,234,0,0.12)", 
                  color: isRegisterDisabled ? "rgba(255,255,255,0.3)" : "var(--neon-yellow)", 
                  border: isRegisterDisabled ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--neon-yellow)", 
                  borderRadius: "8px", 
                  fontFamily: "var(--font-outfit)", 
                  fontWeight: "bold", 
                  fontSize: "1.1rem", 
                  cursor: isRegisterDisabled ? "not-allowed" : "pointer", 
                  opacity: isRegisterDisabled ? 0.45 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.3s",
                  boxShadow: isRegisterDisabled ? "none" : "0 0 15px rgba(255, 234, 0, 0.25)"
                }}
              >
                {isRegistering && <span className="heartist-spinner" />}
                {isRegistering ? "Creating Account..." : "Sign Up & Enter"}
              </button>

              <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "5px", fontFamily: "var(--font-outfit)" }}>
                Already have an account?{" "}
                <span 
                  onClick={() => { setActiveTab("login"); setError(""); setMessage(""); }}
                  style={{ color: "var(--neon-yellow)", cursor: "pointer", fontWeight: "bold", textDecoration: "underline" }}
                >
                  Log In
                </span>
              </p>
            </form>
          )}
        </div>
      </div>
      
      <Link href="/" className="nav-item" style={{ marginTop: "30px", padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)" }}>
        Back to Dashboard
      </Link>

      {/* Heartist Community Guidelines & Code of Honor Modal */}
      {showGuidelinesModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowGuidelinesModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "rgba(18, 18, 20, 0.98)",
              border: "1px solid var(--neon-yellow)",
              borderRadius: "16px",
              padding: "28px 24px",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 0 35px rgba(255, 234, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              color: "#fff",
              fontFamily: "var(--font-outfit)",
              position: "relative"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", color: "var(--neon-yellow)", margin: "0 0 4px 0" }}>
                  Heartist Code of Honor
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Community Guidelines & Terms of Service
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setShowGuidelinesModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  lineHeight: "1",
                  padding: "0 4px"
                }}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Intro */}
            <div style={{ background: "rgba(255, 234, 0, 0.05)", borderLeft: "3px solid var(--neon-yellow)", padding: "10px 14px", borderRadius: "0 8px 8px 0" }}>
              <p style={{ fontSize: "0.88rem", margin: 0, color: "var(--neon-white)", lineHeight: "1.5" }}>
                Welcome sa <strong>Heartist</strong>! Ang portal na ito ay nilikha para sa ating pananampalataya, paglikha ng sining, at pagkakaisa bilang mga tagasunod ni Kristo.
              </p>
            </div>

            {/* Sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.88rem", lineHeight: "1.6", color: "#ddd" }}>
              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  01. Christ-Centered & Safe Space
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Panatilihing magalang, mapagpakumbaba, at nakapagpapatibay ang bawat interaksyon. Mahigpit na ipinagbabawal ang anumang pambu-bully, paninirang-puri, masasamang salita, o bastos na komento.
                </p>
              </div>

              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  02. Authentic & God-Honoring Creativity
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Ibahagi ang iyong mga sining, debosyon, at panalangin nang may katapatan at pagpupuri sa Diyos. Igalang ang gawa ng iba at huwag mag-post ng hindi naaangkop o hindi sa iyo nang walang pahintulot.
                </p>
              </div>

              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  03. Peace, Prayer & Fellowship
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Ang prayer wall at community spaces ay para sa pagtutulungan at pagdarasal sa isa&apos;t isa. Panatilihing sagrado at mapayapa ang mga talakayan.
                </p>
              </div>

              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  04. Privacy & Account Responsibility
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Ingatan ang iyong password at impormasyon. Igalang din ang pribadong impormasyon at prayer requests ng iyong mga kasama sa camp.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button
                type="button"
                onClick={() => {
                  setAgreeToTerms(true);
                  setShowGuidelinesModal(false);
                }}
                className="glow-text-yellow"
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "var(--neon-yellow)",
                  color: "#000",
                  border: "none",
                  borderRadius: "8px",
                  fontFamily: "var(--font-outfit)",
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  transition: "opacity 0.2s"
                }}
              >
                I Agree & Accept
              </button>
              <button
                type="button"
                onClick={() => setShowGuidelinesModal(false)}
                style={{
                  padding: "12px 18px",
                  background: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  borderRadius: "8px",
                  fontFamily: "var(--font-outfit)",
                  fontSize: "0.95rem",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
