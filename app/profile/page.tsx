"use client";
import EmojiPicker, { Theme } from 'emoji-picker-react';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from "@/utils/cropImage";
import { supabase } from "@/lib/supabase";
import { fetchSystemSetting } from "@/lib/fusionSync";


const ROLES = [
  { id: "first-timer", label: "First-timer 🐣" },
  { id: "camp-veteran", label: "Camp Veteran 🎖️" },
  { id: "supporter", label: "Supporter 💖" },
];

function formatCapitalizedName(value: string): string {
  if (!value) return "";
  const clean = value.replace(/[^A-Za-z\s]/g, "");
  return clean.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
}

export default function ProfilePage() {
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isAdminProfile, setIsAdminProfile] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBadge, setRegBadge] = useState(ROLES[0].id);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [showPwd, setShowPwd] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);


  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Cropper States
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const showCroppedImage = async () => {
    try {
      if (cropImageSrc && croppedAreaPixels) {
        const croppedImageBase64 = await getCroppedImg(cropImageSrc, croppedAreaPixels);
        setSelectedAvatar(croppedImageBase64);
        setCropImageSrc(null); // Close modal
      }
    } catch (e) {
      console.error(e);
      setError("Failed to crop image.");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = "/login";
          return;
        }
        
        let adminEmails = await fetchSystemSetting("admin_emails");
        if (typeof adminEmails === "string") {
          try { adminEmails = JSON.parse(adminEmails); } catch(e) {}
        }
        if (!Array.isArray(adminEmails)) adminEmails = ["heartistrichford@gmail.com"];
        const isAdmin = adminEmails.includes(user.email);
        setIsAdminProfile(isAdmin);

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          const userObj = {
            id: profile.id,
            avatar: profile.avatar_url,
            firstName: profile.first_name,
            lastName: profile.last_name,
            age: profile.age,
            birthDate: profile.birth_date,
            email: profile.email,
            contact: profile.contact_number,
            badge: profile.badge,
            team: profile.team,
            last_profile_edit: profile.last_profile_edit
          };
          setActiveUser(userObj);
          localStorage.setItem("activeUser", JSON.stringify(userObj));
          
          if (!isAdmin && profile.last_profile_edit) { /* cooldown disabled */ }
          
          setRegFirstName(profile.first_name || "");
          setRegLastName(profile.last_name || "");
          setRegBirthDate(profile.birth_date || "");
          setRegEmail(profile.email || "");
          setRegContact(profile.contact_number || "");
          setRegBadge(isAdmin ? "Admin" : (profile.badge || ROLES[0].id));
          if (isAdmin) {
             const savedAvatar = profile.avatar_url;
             if (savedAvatar && savedAvatar.length > 10) {
               setSelectedAvatar(savedAvatar);
             } else {
               setSelectedAvatar("");
             }
          } else if (profile.avatar_url) {
             setSelectedAvatar(profile.avatar_url);
          }
        }
      };

      fetchProfile();
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && isAdminProfile && activeUser) {
       const oldName = "AdminRichford";
       const newName = activeUser.firstName;
       if (newName === oldName) return; 

       const lsUpdates = [
         { key: "fusionInbox", fn: (data: any) => {
             let changed = false;
             for (const u in data) {
               data[u] = data[u].map((m: any) => { if (m.senderName === oldName) { m.senderName = newName; changed = true; } return m; });
             }
             return changed ? data : null;
         }},
         { key: "communityAnnouncements", fn: (data: any) => {
             let changed = false;
             const newData = data.map((a: any) => { if (a.author === oldName) { a.author = newName; changed = true; } return a; });
             return changed ? newData : null;
         }},
         { key: "fusionCommunityPosts", fn: (data: any) => {
             let changed = false;
             const newData = data.map((p: any) => {
                 if (p.name === oldName) { p.name = newName; changed = true; }
                 if (p.realName === oldName) { p.realName = newName; changed = true; }
                 if (p.username === oldName) { p.username = newName; changed = true; }
                 if (p.authorId === oldName) { p.authorId = newName; changed = true; }
                 p.comments = (p.comments || []).map((c: any) => {
                    if (c.author === oldName) { c.author = newName; changed = true; }
                    c.replies = (c.replies || []).map((r: any) => { if (r.author === oldName) { r.author = newName; changed = true; } return r; });
                    return c;
                 });
                 return p;
             });
             return changed ? newData : null;
         }},
         { key: "fusionPrayers", fn: (data: any) => {
             let changed = false;
             const newData = data.map((p: any) => { if (p.name === oldName) { p.name = newName; changed = true; } return p; });
             return changed ? newData : null;
         }},
         { key: "registeredAccounts", fn: (data: any) => {
             let changed = false;
             const newData = data.map((a: any) => { if (a.firstName === oldName) { a.firstName = newName; changed = true; } return a; });
             return changed ? newData : null;
         }}
       ];

       lsUpdates.forEach(({key, fn}) => {
         const item = localStorage.getItem(key);
         if (item) {
           try { 
              const result = fn(JSON.parse(item));
              if (result !== null) localStorage.setItem(key, JSON.stringify(result));
           } catch(e){}
         }
       });
    }
  }, [isAdminProfile, activeUser]);

  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    
    if (isAdminProfile) {
      if (!regFirstName || !regEmail) {
        setError("Name and Email are required.");
        return;
      }
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(regFirstName.trim())) {
        setError("First Name must only contain letters.");
        return;
      }
    } else {
      if (!regFirstName || !regLastName || !regEmail) {
        setError("Name and Email are required.");
        return;
      }

      const nameRegex = /^[A-Za-z\s]+$/;
      if (!nameRegex.test(regFirstName.trim()) || !nameRegex.test(regLastName.trim())) {
        setError("First Name and Last Name must only contain letters.");
        return;
      }

      if (!regBirthDate) {
        setError("Please select a birthday.");
        return;
      }
    }

    setIsUpdating(true);

    try {
      let finalAvatarUrl = selectedAvatar;


      // If selectedAvatar is a base64 string, upload to Supabase Storage
      if (selectedAvatar && selectedAvatar.startsWith("data:image")) {
        const res = await fetch(selectedAvatar);
        const blob = await res.blob();
        
        const filePath = `${activeUser.id}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, blob, {
            contentType: "image/png",
            upsert: true
          });
          
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        finalAvatarUrl = publicUrlData.publicUrl;
      }

      // Update Database
      const profileUpdates: any = {
        first_name: regFirstName.trim(),
        avatar_url: finalAvatarUrl,
        email: regEmail.trim(),
        age: ""
      };
      
      if (!isAdminProfile) {
        profileUpdates.last_name = regLastName.trim();
        profileUpdates.birth_date = regBirthDate;
        profileUpdates.contact_number = regContact.trim();
        profileUpdates.badge = regBadge;
        profileUpdates.last_profile_edit = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", activeUser.id);

      if (updateError) throw updateError;

      // Wait, we should also update Auth Email and Password if changed
      const updateAuthPayload: any = {};
      if (regEmail.trim() !== activeUser.email) updateAuthPayload.email = regEmail.trim();
      if (regPassword) updateAuthPayload.password = regPassword;
      
      if (Object.keys(updateAuthPayload).length > 0) {
        const { error: authUpdateError } = await supabase.auth.updateUser(updateAuthPayload);
        if (authUpdateError) throw authUpdateError;
      }

      const updatedUser = {
        ...activeUser,
        avatar: finalAvatarUrl,
        firstName: regFirstName.trim(),
        lastName: isAdminProfile ? "" : regLastName.trim(),
        age: "",
        birthDate: isAdminProfile ? "" : regBirthDate,
        email: regEmail.trim(),
        contact: isAdminProfile ? "" : regContact.trim(),
        badge: isAdminProfile ? "Admin" : regBadge,
        team: activeUser.team
      };

      // Keep localStorage activeUser updated for fallback
      localStorage.setItem("activeUser", JSON.stringify(updatedUser));
      setActiveUser(updatedUser);
      setSelectedAvatar(finalAvatarUrl);
      
      if (!isAdminProfile) { /* cooldown disabled */ } else if (activeUser.firstName !== regFirstName.trim()) {
        const oldName = activeUser.firstName;
        const newName = regFirstName.trim();
        
        try { await supabase.from("prayers").update({ author_name: newName }).eq("author_name", oldName); } catch(e) {}
        
        const lsUpdates = [
          { key: "fusionInbox", fn: (data: any) => {
              for (const u in data) {
                data[u] = data[u].map((m: any) => { if (m.senderName === oldName) m.senderName = newName; return m; });
              }
              return data;
          }},
          { key: "communityAnnouncements", fn: (data: any) => data.map((a: any) => { if (a.author === oldName) a.author = newName; return a; }) },
          { key: "fusionCommunityPosts", fn: (data: any) => data.map((p: any) => {
              if (p.name === oldName) p.name = newName;
              if (p.realName === oldName) p.realName = newName;
              if (p.username === oldName) p.username = newName;
              if (p.authorId === oldName) p.authorId = newName;
              p.comments = (p.comments || []).map((c: any) => {
                 if (c.author === oldName) c.author = newName;
                 c.replies = (c.replies || []).map((r: any) => { if (r.author === oldName) r.author = newName; return r; });
                 return c;
              });
              return p;
          }) },
          { key: "fusionPrayers", fn: (data: any) => data.map((p: any) => { if (p.name === oldName) p.name = newName; return p; }) }
        ];
        
        lsUpdates.forEach(({key, fn}) => {
          const item = localStorage.getItem(key);
          if (item) {
            try { localStorage.setItem(key, JSON.stringify(fn(JSON.parse(item)))); } catch(e){}
          }
        });
      }

      setMessage("Profile successfully updated!");
      setTimeout(() => setMessage(""), 3000);
      setRegPassword(""); // Clear password field

    } catch (err: any) {
      console.error(err);
      setError(typeof err === "object" ? JSON.stringify(err) : (err.message || "Failed to update profile."));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleForceResetCooldown = async () => {
    if (!activeUser || !activeUser.id) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('profiles').update({ last_profile_edit: null }).eq('id', activeUser.id);
      if (error) throw error;
      setCooldownEnd(null);
      setMessage("Cooldown successfully reset! You can now update your profile.");
      setTimeout(() => setMessage(""), 5000);
    } catch(e) {
      console.error(e);
      setError("Failed to reset cooldown.");
    }
    setIsUpdating(false);
  };

  if (!activeUser) return <div style={{ color: "white", padding: "50px", textAlign: "center" }}>Loading...</div>;

  return (
    <main className="main-container" style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100vh" }}>
      <HeartistLogo className="animated-glow-text" width={45} height={45} />
      <h1 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "15px", marginBottom: "30px", textTransform: "uppercase" }}>
        My Profile
      </h1>
      
      <div className="card" style={{ width: "100%", maxWidth: "500px", padding: "30px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,234,0,0.3)", borderRadius: "15px" }}>
        {/* Main Avatar & Info */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "30px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "20px" }}>
           <div style={{ width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", border: `3px solid ${activeUser.team && activeUser.team !== 'none' ? activeUser.team : 'rgba(255,255,255,0.2)'}`, marginBottom: "15px", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "3rem", background: "rgba(255,255,255,0.1)" }}>
             {activeUser.avatar && activeUser.avatar.length > 10 ? (
               <img src={activeUser.avatar} alt="Profile" style={{width:"100%", height:"100%", objectFit:"cover"}} />
             ) : (
               <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Profile" style={{width:"100%", height:"100%", objectFit:"cover"}} />
             )}
           </div>
           <h2 style={{ margin: 0, color: "white", fontFamily: "var(--font-outfit)" }}>{activeUser.firstName} {activeUser.lastName}</h2>
            <p style={{ margin: "5px 0", color: "var(--neon-yellow)" }}>
              {(() => {
                const accounts: any[] = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("registeredAccounts") || "[]") : [];
                const auMatch = accounts.find((a: any) => a.firstName === activeUser?.firstName && a.lastName === activeUser?.lastName);
                const liveBadge = auMatch?.badge || activeUser.badge || "Heartist";
                return ROLES.find(r => r.id === liveBadge)?.label || liveBadge || "Heartist";
              })()}
            </p>
           {activeUser.team && activeUser.team !== 'none' && (
             <p style={{ margin: 0, color: activeUser.team, textTransform: "capitalize", fontWeight: "bold" }}>Team {activeUser.team}</p>
           )}
        </div>

        
        {message && <p style={{ color: "#00FF80", textAlign: "center", fontSize: "0.95rem", marginBottom: "20px", background: "rgba(0,255,128,0.1)", padding: "10px", borderRadius: "8px", border: "1px solid #00FF80" }}>{message}</p>}
        {error && <p style={{ color: "red", textAlign: "center", fontSize: "0.9rem", marginBottom: "20px" }}>{error}</p>}

        {false ? (
          <div style={{
            background: "linear-gradient(135deg, rgba(255,234,0,0.1) 0%, rgba(255,234,0,0.02) 100%)",
            border: "1px solid var(--neon-yellow)",
            borderRadius: "15px",
            padding: "30px",
            textAlign: "center",
            boxShadow: "0 0 20px rgba(255,234,0,0.15), inset 0 0 10px rgba(255,234,0,0.05)"
          }}>
            <div style={{ fontSize: "3rem", marginBottom: "15px" }}>⏳</div>
            <h2 style={{ color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", marginBottom: "10px" }}>Profile on Cooldown</h2>
            <p style={{ color: "var(--neon-white)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "20px" }}>
              To conserve database storage, profile updates are limited to once a week. 
              You can update your profile again on:
            </p>
            <button
              type="button"
              onClick={handleForceResetCooldown}
              disabled={isUpdating}
              style={{
                background: "rgba(255, 51, 102, 0.2)",
                color: "var(--neon-pink)",
                border: "1px solid var(--neon-pink)",
                padding: "10px 20px",
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: "var(--font-outfit)",
                marginBottom: "20px",
                fontWeight: "bold",
              }}
            >
              {isUpdating ? "Resetting..." : "Reset Cooldown (Admin Tool)"}
            </button>
            <div style={{
              background: "rgba(0,0,0,0.6)",
              padding: "15px",
              borderRadius: "10px",
              display: "inline-block",
              border: "1px dashed rgba(255,234,0,0.5)"
            }}>
              <p style={{ margin: 0, color: "var(--neon-gold)", fontWeight: "bold", fontSize: "1.1rem", fontFamily: "var(--font-outfit)" }}>
                {cooldownEnd?.toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          
          <div style={{ textAlign: "center", marginBottom: "15px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "10px", fontFamily: "var(--font-outfit)" }}>Change Avatar</p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
              
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
              <div 
            style={{ width: "80px", height: "80px", border: "2px solid var(--neon-yellow)", borderRadius: "50%", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "3rem", background: "rgba(255,255,255,0.1)", cursor: "pointer", position: "relative", overflow: "hidden" }}
            onClick={() => document.getElementById("avatar-upload-input")?.click()}
        >
            {selectedAvatar && selectedAvatar.length > 10 ? (
                <img src={selectedAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
                <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
        </div>
        <input 
            type="file" 
            id="avatar-upload-input" 
            accept="image/*" 
            style={{ display: "none" }} 
            onChange={handleImageUpload} 
        />
  

                      </div>
              {selectedAvatar && selectedAvatar !== "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", marginTop: "10px" }}>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", margin: 0, fontFamily: "var(--font-outfit)" }}>Revert to Default:</p>
                      <div 
                          onClick={() => setSelectedAvatar("https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg")}
                          style={{ width: "45px", height: "45px", borderRadius: "50%", cursor: "pointer", border: "1px solid rgba(255,255,255,0.2)", overflow: "hidden", transition: "transform 0.2s" }}
                          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                      >
                          <img src="https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg" alt="Default Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                  </div>
              )}
          </div>
                      
                      <div style={{ marginTop: "15px" }}>
                        <label style={{ display: "inline-block", fontSize: "0.85rem", color: "var(--neon-yellow)", cursor: "pointer", border: "1px dashed var(--neon-yellow)", padding: "8px 15px", borderRadius: "8px", fontFamily: "var(--font-outfit)", background: "rgba(255,234,0,0.05)", transition: "all 0.2s" }}>
                          Upload Photo
                          <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                        </label>
                      </div>
                    </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
            <div style={{ flex: "1 1 140px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>First Name</label>
              <input 
                type="text" 
                value={regFirstName}
                onChange={(e) => setRegFirstName(formatCapitalizedName(e.target.value))}
                style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem", textTransform: "capitalize" }}
              />
            </div>
            {!isAdminProfile && (
            <div style={{ flex: "1 1 140px" }}>
                          <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>Last Name</label>
                          <input 
                            type="text" 
                            value={regLastName}
                            onChange={(e) => setRegLastName(formatCapitalizedName(e.target.value))}
                            style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem", textTransform: "capitalize" }}
                          />
                        </div>
            )}
          </div>

          {!isAdminProfile && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, textAlign: "left" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", textAlign: "left" }}>Birthday</label>
                <input 
                  type="date" 
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  style={{ width: "100%", height: "44px", minHeight: "44px", maxHeight: "44px", boxSizing: "border-box", padding: "8px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", colorScheme: "dark", WebkitAppearance: "none", appearance: "none", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem", textAlign: "left" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, textAlign: "left" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", textAlign: "left" }}>Contact Number</label>
                <input 
                  type="tel" 
                  placeholder="09XX XXX XXXX"
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value)}
                  style={{ width: "100%", height: "44px", minHeight: "44px", maxHeight: "44px", boxSizing: "border-box", padding: "8px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                />
              </div>
            </div>
          )}

          {!isAdminProfile && (
          <div>
                      <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>Camper Badge</label>
                      <select 
                        value={regBadge}
                        onChange={(e) => setRegBadge(e.target.value)}
                        style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                      >
                        {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    </div>
          )}

          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>Email Address</label>
            <input 
              type="email" 
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
            />
          </div>
          
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input 
                type={showPwd ? "text" : "password"} 
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                style={{ width: "100%", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "15px", paddingRight: "45px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
              />
              <button 
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "5px" }}
              >
                {showPwd ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isUpdating}
            className="glow-text-yellow"
            style={{ marginTop: "15px", padding: "15px", background: "rgba(255,234,0,0.1)", color: "var(--neon-yellow)", border: "1px solid var(--neon-yellow)", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "1.1rem", cursor: isUpdating ? "wait" : "pointer", transition: "all 0.3s", opacity: isUpdating ? 0.7 : 1 }}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </form>
        )}
      </div>
      
      {!isAdminProfile && (
        <Link href="/" className="nav-item" style={{ marginTop: "30px", padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)" }}>
          Back to Dashboard
        </Link>
      )}

      {/* CROPPER MODAL */}
      {cropImageSrc && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <h2 style={{ color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", marginBottom: "20px" }}>Crop Photo</h2>
          
          <div style={{ position: "relative", width: "100%", maxWidth: "400px", height: "400px", background: "#333", borderRadius: "10px", overflow: "hidden" }}>
            <Cropper
              image={cropImageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button 
              onClick={() => setCropImageSrc(null)}
              style={{ padding: "10px 20px", background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)" }}
            >
              Cancel
            </button>
            <button 
              onClick={showCroppedImage}
              className="glow-text-yellow"
              style={{ padding: "10px 20px", background: "rgba(255,234,0,0.1)", color: "var(--neon-yellow)", border: "1px solid var(--neon-yellow)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)", fontWeight: "bold" }}
            >
              Crop & Save
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
