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
        age: isAdmin ? "" : (meta.age || ""),
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
    
    if (!regFirstName.trim() || !regLastName.trim() || !regBirthDate || !regEmail.trim() || !regContact.trim() || !regPassword || !regConfirmPassword) {
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
            first_name: regFirstName.trim(),
            middle_name: regMiddleName.trim(),
            last_name: regLastName.trim(),
            birth_date: regBirthDate,
            contact_number: regContact.trim(),
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
                  onChange={(e) => setRegFirstName(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
                  style={{ flex: "1 1 120px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
                <input 
                  type="text" 
                  placeholder="Middle Name (Optional)" 
                  title="Middle Name (Optional for formality)"
                  value={regMiddleName}
                  onChange={(e) => setRegMiddleName(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
                  style={{ flex: "1 1 120px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
                <input 
                  type="text" 
                  placeholder="Last Name" 
                  value={regLastName}
                  onChange={(e) => setRegLastName(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
                  style={{ flex: "1 1 120px", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
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
