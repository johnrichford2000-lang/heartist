"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import { supabase } from "@/lib/supabase";
import { fetchSystemSetting } from "@/lib/fusionSync";

const AVATARS = ["👦🏽", "👧🏻", "👨🏼‍🦱", "👩🏽‍🦰", "🧑🏽", "👱🏼‍♂️", "👱🏻‍♀️", "🧔🏽‍♂️"];
const ROLES = [
  { id: "first-timer", label: "First-timer 🐣" },
  { id: "camp-veteran", label: "Camp Veteran 🎖️" },
  { id: "supporter", label: "Supporter 💖" },
];

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "verify">("login");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [verificationCode, setVerificationCode] = useState("");

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
  const [regLastName, setRegLastName] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBadge, setRegBadge] = useState(ROLES[0].id);
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [showRegPwd, setShowRegPwd] = useState(false);

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
        age: isAdmin ? "" : (meta.age || ""),
        birth_date: isAdmin ? null : (meta.birth_date || null),
        contact_number: isAdmin ? "" : (meta.contact_number || ""),
        badge: isAdmin ? "Admin" : (meta.badge || "first-timer"),
        avatar_url: isAdmin ? "👑" : (meta.avatar_url || "👦🏽")
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
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!regFirstName || !regLastName || !regBirthDate || !regEmail || !regContact || !regPassword) {
      setError("Please fill in all fields.");
      return;
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(regFirstName.trim()) || !nameRegex.test(regLastName.trim())) {
      setError("First Name and Last Name must only contain letters.");
      return;
    }

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

      // 1. Create user in auth and store custom data in meta_data
      const { error: authError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: {
            first_name: regFirstName,
            last_name: regLastName,
            birth_date: regBirthDate,
            contact_number: regContact,
            badge: regBadge,
            avatar_url: selectedAvatar
          }
        }
      });

      if (authError) throw authError;

      setActiveTab("verify");
      setMessage("Success! A 6-digit verification code has been sent to your email. Please enter it below.");

    } catch (err: any) {
      setError(err.message || "Failed to register.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }
    
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
    }
  };

  return (
    <main className="main-container" style={{ padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <HeartistLogo className="animated-glow-text" width={60} height={60} />
      <h1 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "20px", marginBottom: "30px", textTransform: "uppercase" }}>
        Heartist Portal
      </h1>
      
      <div className="card" style={{ width: "100%", maxWidth: "450px", padding: "0", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,234,0,0.3)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <button 
            onClick={() => { setActiveTab("login"); setError(""); }}
            style={{ 
              flex: 1, 
              padding: "15px", 
              background: activeTab === "login" ? "rgba(255,234,0,0.1)" : "transparent",
              color: activeTab === "login" ? "var(--neon-yellow)" : "var(--text-muted)",
              border: "none",
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
            onClick={() => { setActiveTab("register"); setError(""); }}
            style={{ 
              flex: 1, 
              padding: "15px", 
              background: activeTab === "register" ? "rgba(255,234,0,0.1)" : "transparent",
              color: activeTab === "register" ? "var(--neon-yellow)" : "var(--text-muted)",
              border: "none",
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

        {/* Forms Container */}
        <div style={{ padding: "30px", overflowY: "auto", maxHeight: "65vh" }}>
          {error && <p style={{ color: "red", textAlign: "center", fontSize: "0.85rem", marginTop: 0, marginBottom: "15px" }}>{error}</p>}
          {message && <p style={{ color: "#00FF80", textAlign: "center", fontSize: "0.85rem", marginTop: 0, marginBottom: "15px", background: "rgba(0,255,128,0.1)", padding: "10px", borderRadius: "8px" }}>{message}</p>}

          {activeTab === "verify" ? (
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ textAlign: "center", marginBottom: "15px" }}>
                <p style={{ color: "var(--text-main)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>
                  Sent to: <strong>{regEmail}</strong>
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "5px" }}>
                  Please check your inbox (and spam folder) for the 6-digit code.
                </p>
              </div>
              <input 
                type="text" 
                placeholder="0 0 0 0 0 0" 
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                maxLength={6}
                style={{ textAlign: "center", letterSpacing: "15px", padding: "15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "var(--neon-yellow)", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1.8rem", fontWeight: "bold" }}
              />
              <button 
                type="submit"
                className="glow-text-yellow"
                style={{ marginTop: "15px", padding: "15px", background: "rgba(255,234,0,0.1)", color: "var(--neon-yellow)", border: "1px solid var(--neon-yellow)", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "1.1rem", cursor: "pointer", transition: "all 0.3s" }}
              >
                Verify & Enter
              </button>
              <button
                type="button"
                onClick={() => {
                   setActiveTab("register");
                   setMessage("");
                }}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", textDecoration: "underline", marginTop: "10px", fontFamily: "var(--font-outfit)" }}
              >
                Entered wrong email? Go back
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
                className="glow-text-yellow"
                style={{ marginTop: "10px", padding: "15px", background: "transparent", color: "var(--neon-yellow)", border: "1px solid var(--neon-yellow)", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "1.1rem", cursor: "pointer", transition: "all 0.3s" }}
              >
                Enter Portal
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              
              <div style={{ textAlign: "center", marginBottom: "10px" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "10px", fontFamily: "var(--font-outfit)" }}>Choose an Avatar</p>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
                  {AVATARS.map(avatar => (
                    <div 
                      key={avatar} 
                      onClick={() => setSelectedAvatar(avatar)}
                      style={{
                        fontSize: "1.8rem",
                        padding: "5px",
                        cursor: "pointer",
                        border: selectedAvatar === avatar ? "2px solid var(--neon-yellow)" : "2px solid transparent",
                        borderRadius: "50%",
                        background: selectedAvatar === avatar ? "rgba(255,234,0,0.1)" : "transparent",
                        transition: "all 0.2s"
                      }}
                    >
                      {avatar}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input 
                  type="text" 
                  placeholder="First Name" 
                  value={regFirstName}
                  onChange={(e) => setRegFirstName(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
                  style={{ flex: "1 1 140px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
                  style={{ flex: "1 1 140px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <input 
                  type="date" 
                  title="Birthday"
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  style={{ flex: "1 1 140px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
                <input 
                  type="tel" 
                  placeholder="Contact Number" 
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value)}
                  style={{ flex: "2 1 160px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
              </div>

              <input 
                type="email" 
                placeholder="Email Address" 
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>Camper Badge</label>
                <select 
                  value={regBadge}
                  onChange={(e) => setRegBadge(e.target.value)}
                  style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                >
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
                <p style={{ fontSize: "0.75rem", color: "var(--canary-yellow)", margin: "2px 0 5px 5px", fontStyle: "italic", lineHeight: "1.3" }}>
                  {regBadge === "first-timer" && "Para sa mga unang beses pa lang sasali sa ating camps o events."}
                  {regBadge === "camp-veteran" && "Para sa mga batikan na at naka-attend na ng mga nakaraang Fusion Camps."}
                  {regBadge === "supporter" && "Para sa mga magulang, sponsors, o kaibigan na sumusuporta sa kabataan."}
                </p>
              </div>
              
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input 
                  type={showRegPwd ? "text" : "password"} 
                  placeholder="Create Password" 
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={{ width: "100%", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "15px", paddingRight: "45px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
                <button 
                  type="button"
                  onClick={() => setShowRegPwd(!showRegPwd)}
                  style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "5px" }}
                >
                  {showRegPwd ? "💛" : "💔"}
                </button>
              </div>

              <button 
                type="submit"
                className="glow-text-white"
                style={{ marginTop: "10px", padding: "15px", background: "transparent", color: "var(--neon-white)", border: "1px solid var(--neon-white)", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "1.1rem", cursor: "pointer", transition: "all 0.3s" }}
              >
                Sign Up & Enter
              </button>
            </form>
          )}
        </div>
      </div>
      
      <Link href="/" className="nav-item" style={{ marginTop: "30px", padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)" }}>
        Back to Dashboard
      </Link>
    </main>
  );
}
