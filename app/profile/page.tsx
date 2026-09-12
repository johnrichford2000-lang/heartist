"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown from "@/components/CustomDropdown";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from "@/utils/cropImage";
import { supabase } from "@/lib/supabase";
import { fetchSystemSetting } from "@/lib/fusionSync";

const ROLES = [
  { id: "first-timer", title: "First-timer", emoji: "🐣", label: "First-timer 🐣" },
  { id: "camp-veteran", title: "Camp Veteran", emoji: "🎖️", label: "Camp Veteran 🎖️" },
  { id: "supporter", title: "Supporter", emoji: "💖", label: "Supporter 💖" },
];

function calculateAge(birthDateString: string): number {
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

function formatCapitalizedName(value: string): string {
  if (!value) return "";
  const clean = value.replace(/[^A-Za-z\s]/g, "");
  return clean.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
}

export default function ProfilePage() {
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isAdminProfile, setIsAdminProfile] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<Date | null>(null);
  
  const [regFirstName, setRegFirstName] = useState("");
  const [regMiddleName, setRegMiddleName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regBirthDate, setRegBirthDate] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regContact, setRegContact] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBadge, setRegBadge] = useState(ROLES[0].id);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Forgot Password modal state
  const [showForgotPwdModal, setShowForgotPwdModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPwd, setShowForgotNewPwd] = useState(false);
  const [showForgotConfirmPwd, setShowForgotConfirmPwd] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotCodeExpiry, setForgotCodeExpiry] = useState(120);
  const [forgotResendCooldown, setForgotResendCooldown] = useState(60);
  const [isForgotResending, setIsForgotResending] = useState(false);

  // Change Email Address modal state
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [changeEmailStep, setChangeEmailStep] = useState<"request" | "verify">("request");
  const [changeCurrentPassword, setChangeCurrentPassword] = useState("");
  const [changeNewEmail, setChangeNewEmail] = useState("");
  const [changeEmailCode, setChangeEmailCode] = useState("");
  const [showChangeCurrentPwd, setShowChangeCurrentPwd] = useState(false);
  const [isChangeEmailLoading, setIsChangeEmailLoading] = useState(false);
  const [changeEmailError, setChangeEmailError] = useState("");
  const [changeEmailMessage, setChangeEmailMessage] = useState("");
  const [changeEmailCodeExpiry, setChangeEmailCodeExpiry] = useState(120);
  const [changeEmailResendCooldown, setChangeEmailResendCooldown] = useState(60);
  const [isChangeEmailResending, setIsChangeEmailResending] = useState(false);

  // Cropper States
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timers for OTP modals
  useEffect(() => {
    let timer: any;
    if (showForgotPwdModal && forgotStep === "verify") {
      timer = setInterval(() => {
        setForgotCodeExpiry((prev) => (prev > 0 ? prev - 1 : 0));
        setForgotResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showForgotPwdModal, forgotStep]);

  useEffect(() => {
    let timer: any;
    if (showChangeEmailModal && changeEmailStep === "verify") {
      timer = setInterval(() => {
        setChangeEmailCodeExpiry((prev) => (prev > 0 ? prev - 1 : 0));
        setChangeEmailResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showChangeEmailModal, changeEmailStep]);

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
          const middleName = profile.middle_name || user.user_metadata?.middle_name || "";
          const userObj = {
            id: profile.id,
            avatar: profile.avatar_url,
            firstName: profile.first_name,
            middleName: middleName,
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
          
          setRegFirstName(profile.first_name || "");
          setRegMiddleName(middleName);
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
        setError("First Name, Last Name, and Email are required.");
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
        const { error: uploadError } = await supabase.storage
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

      // Update Auth metadata & password if provided
      const updateAuthPayload: any = {
        data: {
          first_name: regFirstName.trim(),
          middle_name: regMiddleName.trim(),
          last_name: isAdminProfile ? "" : regLastName.trim(),
          birth_date: isAdminProfile ? "" : regBirthDate,
          contact_number: isAdminProfile ? "" : regContact.trim(),
          badge: isAdminProfile ? "Admin" : regBadge
        }
      };
      if (regPassword) updateAuthPayload.password = regPassword;
      
      const { error: authUpdateError } = await supabase.auth.updateUser(updateAuthPayload);
      if (authUpdateError) throw authUpdateError;

      // Attempt updating middle_name in profiles if column exists
      try {
        await supabase.from("profiles").update({ middle_name: regMiddleName.trim() }).eq("id", activeUser.id);
      } catch(e) {}

      const updatedUser = {
        ...activeUser,
        avatar: finalAvatarUrl,
        firstName: regFirstName.trim(),
        middleName: regMiddleName.trim(),
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
      
      if (isAdminProfile && activeUser.firstName !== regFirstName.trim()) {
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
      setTimeout(() => setMessage(""), 4000);
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

  // --- FORGOT PASSWORD (OTP) HANDLERS ---
  const handleRequestResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotLoading) return;
    setForgotError("");
    setForgotMessage("");

    const email = forgotEmail.trim();
    if (!email || !email.includes("@")) {
      setForgotError("Please enter a valid email address.");
      return;
    }

    setIsForgotLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
      if (resetError) throw resetError;

      setForgotStep("verify");
      setForgotCodeExpiry(120);
      setForgotResendCooldown(60);
      setForgotCode("");
      setForgotMessage("A 6-digit password reset OTP code has been sent to your email. Please enter it below.");
    } catch (err: any) {
      setForgotError(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResendForgotOtp = async () => {
    if (forgotResendCooldown > 0 || isForgotResending) return;
    setIsForgotResending(true);
    setForgotError("");
    setForgotMessage("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
      if (resetError) throw resetError;
      setForgotMessage("A new 6-digit OTP code has been sent to your email.");
      setForgotCodeExpiry(120);
      setForgotResendCooldown(60);
      setForgotCode("");
    } catch (err: any) {
      const msg = err.message || "Failed to resend code. Please try again.";
      if (/rate limit|rate exceeded|too many requests/i.test(msg)) {
        setForgotError("Email rate limit reached. Please wait a few minutes before requesting another code.");
      } else {
        setForgotError(msg);
      }
    } finally {
      setIsForgotResending(false);
    }
  };

  const handleVerifyAndSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgotLoading) return;
    if (forgotCodeExpiry === 0) {
      setForgotError("The OTP code has expired. Please request a new code.");
      return;
    }

    const code = forgotCode.trim();
    if (!code || code.length !== 6) {
      setForgotError("Please enter the 6-digit OTP code.");
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotError("New password must be at least 6 characters long.");
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setIsForgotLoading(true);
    setForgotError("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: code,
        type: "recovery"
      });

      if (verifyError) throw verifyError;

      const { error: updateError } = await supabase.auth.updateUser({
        password: forgotNewPassword
      });

      if (updateError) throw updateError;

      setShowForgotPwdModal(false);
      setForgotStep("request");
      setRegPassword("");
      setMessage("Password successfully reset & updated with OTP!");
      setTimeout(() => setMessage(""), 5000);
      setForgotError("");
    } catch (err: any) {
      setForgotError(err.message || "Invalid or expired OTP code. Please try requesting a new one.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  // --- CHANGE EMAIL (OTP) HANDLERS ---
  const handleRequestChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangeEmailLoading) return;
    setChangeEmailError("");
    setChangeEmailMessage("");

    const currentPwd = changeCurrentPassword;
    const newEmail = changeNewEmail.trim();

    if (!currentPwd || !newEmail) {
      setChangeEmailError("Please enter your current password and new email.");
      return;
    }

    if (!newEmail.includes("@") || !newEmail.includes(".")) {
      setChangeEmailError("Please enter a valid new email address.");
      return;
    }

    if (newEmail.toLowerCase() === regEmail.toLowerCase()) {
      setChangeEmailError("The new email address cannot be the same as your current email.");
      return;
    }

    setIsChangeEmailLoading(true);
    try {
      // 1. Check if new email is already taken in profiles
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newEmail)
        .maybeSingle();

      if (existingProfile) {
        setChangeEmailError("This new email address is already registered to another account.");
        return;
      }

      // 2. Re-authenticate user to verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: regEmail.trim(),
        password: currentPwd
      });

      if (authError) {
        setChangeEmailError("Incorrect current password. Please verify and try again.");
        return;
      }

      // 3. Trigger Supabase to send OTP to new email
      const { error: updateAuthError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (updateAuthError) throw updateAuthError;

      setChangeEmailStep("verify");
      setChangeEmailCodeExpiry(120);
      setChangeEmailResendCooldown(60);
      setChangeEmailCode("");
      setChangeEmailMessage(`A 6-digit OTP verification code has been sent to ${newEmail}. Please enter it below to confirm.`);
    } catch (err: any) {
      setChangeEmailError(err.message || "Failed to initiate email change. Please check credentials and try again.");
    } finally {
      setIsChangeEmailLoading(false);
    }
  };

  const handleResendChangeEmailOtp = async () => {
    if (changeEmailResendCooldown > 0 || isChangeEmailResending) return;
    setIsChangeEmailResending(true);
    setChangeEmailError("");
    setChangeEmailMessage("");
    try {
      const { error: resendError } = await supabase.auth.updateUser({
        email: changeNewEmail.trim()
      });
      if (resendError) throw resendError;
      setChangeEmailMessage(`A new 6-digit OTP code has been sent to ${changeNewEmail.trim()}.`);
      setChangeEmailCodeExpiry(120);
      setChangeEmailResendCooldown(60);
      setChangeEmailCode("");
    } catch (err: any) {
      const msg = err.message || "Failed to resend code. Please try again.";
      if (/rate limit|rate exceeded|too many requests/i.test(msg)) {
        setChangeEmailError("Email rate limit reached. Please wait a few minutes before requesting another code.");
      } else {
        setChangeEmailError(msg);
      }
    } finally {
      setIsChangeEmailResending(false);
    }
  };

  const handleVerifyAndConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangeEmailLoading) return;
    if (changeEmailCodeExpiry === 0) {
      setChangeEmailError("The OTP code has expired. Please request a new code.");
      return;
    }

    const code = changeEmailCode.trim();
    if (!code || code.length !== 6) {
      setChangeEmailError("Please enter the 6-digit OTP code.");
      return;
    }

    setIsChangeEmailLoading(true);
    setChangeEmailError("");
    try {
      const newEmail = changeNewEmail.trim();

      // 1. Verify OTP with Supabase Auth
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: code,
        type: "email_change"
      });

      if (verifyError) throw verifyError;

      // 2. Update email in PostgreSQL profiles table
      if (activeUser?.id) {
        await supabase
          .from("profiles")
          .update({ email: newEmail })
          .eq("id", activeUser.id);
      }

      // 3. Update local state
      setRegEmail(newEmail);
      const updatedUser = { ...activeUser, email: newEmail };
      setActiveUser(updatedUser);
      localStorage.setItem("activeUser", JSON.stringify(updatedUser));

      setShowChangeEmailModal(false);
      setChangeEmailStep("request");
      setMessage("Email address successfully verified & updated with OTP!");
      setTimeout(() => setMessage(""), 5000);
      setChangeEmailError("");
    } catch (err: any) {
      setChangeEmailError(err.message || "Invalid or expired OTP code. Please check the code and try again.");
    } finally {
      setIsChangeEmailLoading(false);
    }
  };

  if (!activeUser) return <div style={{ color: "white", padding: "50px", textAlign: "center" }}>Loading...</div>;

  return (
    <main className="main-container" style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100vh" }}>
      {/* Top-Left Back Button (Pure SVG Icon, Fixed to Screen Top-Left, Navigates to Dashboard / Main) */}
      <Link
        href="/"
        aria-label="Back to Dashboard"
        style={{
          position: "fixed",
          top: "18px",
          left: "18px",
          zIndex: 900,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "rgba(10, 10, 10, 0.75)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid var(--neon-yellow)",
          color: "var(--neon-yellow)",
          textDecoration: "none",
          boxShadow: "0 0 14px rgba(255, 234, 0, 0.2)",
          transition: "all 0.25s ease",
          cursor: "pointer"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = "rgba(255, 234, 0, 0.18)";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(255, 234, 0, 0.45)";
          e.currentTarget.style.transform = "translateX(-3px)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = "rgba(10, 10, 10, 0.75)";
          e.currentTarget.style.boxShadow = "0 0 14px rgba(255, 234, 0, 0.2)";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <svg 
          width="22" 
          height="22" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </Link>

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
           <h2 style={{ margin: 0, color: "white", fontFamily: "var(--font-outfit)", textAlign: "center" }}>
             {activeUser.firstName}{activeUser.middleName ? ` ${activeUser.middleName}` : ""} {activeUser.lastName}
           </h2>
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

          {/* Name Fields: First, Middle, Last */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ flex: "1 1 130px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>
                First Name
              </label>
              <input 
                type="text" 
                value={regFirstName}
                onChange={(e) => setRegFirstName(formatCapitalizedName(e.target.value))}
                style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem", textTransform: "capitalize" }}
              />
            </div>

            {!isAdminProfile && (
              <>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>
                    Middle Name <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>(Optional)</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Optional"
                    value={regMiddleName}
                    onChange={(e) => setRegMiddleName(formatCapitalizedName(e.target.value))}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem", textTransform: "capitalize" }}
                  />
                </div>
                <div style={{ flex: "1 1 130px" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>
                    Last Name
                  </label>
                  <input 
                    type="text" 
                    value={regLastName}
                    onChange={(e) => setRegLastName(formatCapitalizedName(e.target.value))}
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem", textTransform: "capitalize" }}
                  />
                </div>
              </>
            )}
          </div>

          {!isAdminProfile && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", textAlign: "left" }}>
                    Birthday
                  </label>
                  {regBirthDate && calculateAge(regBirthDate) > 0 && (
                    <span style={{ fontSize: "0.72rem", color: "var(--neon-yellow)", fontWeight: "bold", fontFamily: "var(--font-outfit)" }}>
                      {calculateAge(regBirthDate)} yrs old
                    </span>
                  )}
                </div>
                <input 
                  type="date" 
                  value={regBirthDate}
                  onChange={(e) => setRegBirthDate(e.target.value)}
                  style={{ width: "100%", height: "44px", minHeight: "44px", maxHeight: "44px", boxSizing: "border-box", padding: "8px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", colorScheme: "dark", WebkitAppearance: "none", appearance: "none", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem", textAlign: "left" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, textAlign: "left" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", textAlign: "left" }}>
                  Contact Number
                </label>
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

          {/* Camper Badge Uniform Custom Dropdown */}
          {!isAdminProfile && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", display: "block" }}>
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
            </div>
          )}

          {/* Email Address Field with Lower-Right "Change Email?" Action Link */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
              <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                Email Address
              </label>
            </div>
            <input 
              type="email" 
              value={regEmail}
              readOnly
              style={{ 
                width: "100%", 
                padding: "12px 15px", 
                borderRadius: "8px", 
                background: "rgba(0,0,0,0.35)", 
                border: "1px solid rgba(255,255,255,0.15)", 
                color: "rgba(255,255,255,0.85)", 
                outline: "none", 
                fontFamily: "var(--font-outfit)", 
                fontSize: "1rem",
                cursor: "default"
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => {
                  setChangeCurrentPassword("");
                  setChangeNewEmail("");
                  setChangeEmailCode("");
                  setChangeEmailStep("request");
                  setChangeEmailError("");
                  setChangeEmailMessage("");
                  setShowChangeEmailModal(true);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--neon-yellow)",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-outfit)",
                  cursor: "pointer",
                  padding: "2px 0",
                  textDecoration: "underline",
                  opacity: 0.9,
                  transition: "opacity 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "0.9")}
              >
                Change Email?
              </button>
            </div>
          </div>
          
          {/* Password Field with Lower-Right "Forgot Password?" Action Link */}
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>
              New Password
            </label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input 
                type={showPwd ? "text" : "password"} 
                value={regPassword}
                placeholder="Leave blank to keep current password"
                onChange={(e) => setRegPassword(e.target.value)}
                style={{ width: "100%", paddingTop: "12px", paddingBottom: "12px", paddingLeft: "15px", paddingRight: "45px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
              />
              <button 
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem", padding: "5px" }}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(regEmail || activeUser?.email || "");
                  setForgotStep("request");
                  setForgotCode("");
                  setForgotNewPassword("");
                  setForgotConfirmPassword("");
                  setForgotError("");
                  setForgotMessage("");
                  setShowForgotPwdModal(true);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--neon-yellow)",
                  fontSize: "0.82rem",
                  fontFamily: "var(--font-outfit)",
                  cursor: "pointer",
                  padding: "2px 0",
                  textDecoration: "underline",
                  opacity: 0.9,
                  transition: "opacity 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                onMouseOut={(e) => (e.currentTarget.style.opacity = "0.9")}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isUpdating}
            className="glow-text-yellow"
            style={{ marginTop: "15px", padding: "15px", background: "rgba(255,234,0,0.1)", color: "var(--neon-yellow)", border: "1px solid var(--neon-yellow)", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "1.1rem", cursor: isUpdating ? "wait" : "pointer", transition: "all 0.3s", opacity: isUpdating ? 0.7 : 1 }}
          >
            {isUpdating ? "Saving Changes..." : "Save Changes"}
          </button>
        </form>
        )}
      </div>

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

      {/* ================= FORGOT PASSWORD (OTP) MODAL ================= */}
      {showForgotPwdModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "440px",
            background: "#0a0a0a",
            border: "1px solid var(--neon-yellow)",
            borderRadius: "16px",
            padding: "28px 24px",
            boxShadow: "0 0 35px rgba(255, 234, 0, 0.25)",
            position: "relative"
          }}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowForgotPwdModal(false);
                setForgotStep("request");
                setForgotError("");
                setForgotMessage("");
              }}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "1.2rem",
                cursor: "pointer"
              }}
            >
              ✕
            </button>

            <h3 style={{
              color: "var(--neon-yellow)",
              fontFamily: "var(--font-outfit)",
              fontSize: "1.3rem",
              marginTop: 0,
              marginBottom: "8px",
              textAlign: "center"
            }}>
              {forgotStep === "request" ? "Reset Password via OTP" : "Verify OTP Code"}
            </h3>

            {forgotError && (
              <p style={{
                color: "#ff4d4d",
                fontSize: "0.85rem",
                background: "rgba(255, 77, 77, 0.1)",
                border: "1px solid #ff4d4d",
                borderRadius: "8px",
                padding: "8px 12px",
                margin: "10px 0 15px",
                textAlign: "center"
              }}>
                {forgotError}
              </p>
            )}

            {forgotMessage && (
              <p style={{
                color: "#00FF80",
                fontSize: "0.85rem",
                background: "rgba(0, 255, 128, 0.1)",
                border: "1px solid #00FF80",
                borderRadius: "8px",
                padding: "8px 12px",
                margin: "10px 0 15px",
                textAlign: "center"
              }}>
                {forgotMessage}
              </p>
            )}

            {forgotStep === "request" ? (
              /* STEP 1: Enter/Confirm Email to receive OTP */
              <form onSubmit={handleRequestResetPassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ color: "var(--neon-white)", fontSize: "0.88rem", lineHeight: "1.4", margin: 0, textAlign: "center" }}>
                  A 6-digit OTP recovery code will be sent to your registered email address.
                </p>

                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Registered Email Address
                  </label>
                  <input 
                    type="email" 
                    placeholder="your-email@example.com" 
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isForgotLoading || !forgotEmail.trim()}
                    className="glow-text-yellow"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: isForgotLoading ? "rgba(255,234,0,0.2)" : "var(--neon-yellow)",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      cursor: isForgotLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isForgotLoading && <span className="heartist-spinner" style={{ borderColor: "#000", borderTopColor: "transparent" }} />}
                    {isForgotLoading ? "Sending OTP..." : "Send OTP Code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPwdModal(false)}
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
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Enter 6-digit OTP & New Password */
              <form onSubmit={handleVerifyAndSetNewPassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Target email and live countdown badge */}
                <div style={{
                  background: "rgba(255, 234, 0, 0.05)",
                  border: "1px dashed rgba(255, 234, 0, 0.4)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                    Code sent to: <strong>{forgotEmail}</strong>
                  </span>
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: forgotCodeExpiry > 30 ? "var(--neon-yellow)" : "#ff4d4d",
                    fontFamily: "monospace"
                  }}>
                    {forgotCodeExpiry > 0 ? `Expires: ${formatTime(forgotCodeExpiry)}` : "Expired"}
                  </span>
                </div>

                {/* 6-Digit OTP input */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="000000" 
                    maxLength={6}
                    value={forgotCode}
                    onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ""))}
                    required
                    style={{ 
                      width: "100%", 
                      padding: "12px 14px", 
                      textAlign: "center", 
                      letterSpacing: "10px", 
                      fontFamily: "monospace, var(--font-outfit)", 
                      fontWeight: "bold", 
                      borderRadius: "8px", 
                      background: "rgba(0,0,0,0.5)", 
                      border: forgotCode.length === 6 ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.25)", 
                      color: "var(--neon-yellow)", 
                      outline: "none", 
                      fontSize: "1.6rem",
                      boxShadow: forgotCode.length === 6 ? "0 0 15px rgba(255, 234, 0, 0.2)" : "none"
                    }}
                  />
                </div>

                {/* Resend Action Box */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px"
                }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                    Didn&apos;t get the code?
                  </span>
                  <button
                    type="button"
                    disabled={forgotResendCooldown > 0 || isForgotResending}
                    onClick={handleResendForgotOtp}
                    style={{
                      background: forgotResendCooldown > 0 || isForgotResending ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 234, 0, 0.12)",
                      border: forgotResendCooldown > 0 || isForgotResending ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid var(--neon-yellow)",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      color: forgotResendCooldown > 0 || isForgotResending ? "var(--text-muted)" : "var(--neon-yellow)",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      cursor: forgotResendCooldown > 0 || isForgotResending ? "not-allowed" : "pointer"
                    }}
                  >
                    {isForgotResending ? "Sending..." : forgotResendCooldown > 0 ? `Resend in ${forgotResendCooldown}s` : "Resend Code"}
                  </button>
                </div>

                {/* New Password */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    New Password
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type={showForgotNewPwd ? "text" : "password"} 
                      placeholder="At least 6 characters" 
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px 42px 12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowForgotNewPwd(!showForgotNewPwd)}
                      style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
                    >
                      {showForgotNewPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type={showForgotConfirmPwd ? "text" : "password"} 
                      placeholder="Repeat new password" 
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px 42px 12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowForgotConfirmPwd(!showForgotConfirmPwd)}
                      style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
                    >
                      {showForgotConfirmPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isForgotLoading || forgotCode.length !== 6 || forgotCodeExpiry === 0}
                    className="glow-text-yellow"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: isForgotLoading ? "rgba(255,234,0,0.2)" : "var(--neon-yellow)",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      cursor: (isForgotLoading || forgotCode.length !== 6 || forgotCodeExpiry === 0) ? "not-allowed" : "pointer",
                      opacity: (forgotCode.length !== 6 || forgotCodeExpiry === 0) ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isForgotLoading && <span className="heartist-spinner" style={{ borderColor: "#000", borderTopColor: "transparent" }} />}
                    {isForgotLoading ? "Verifying..." : "Verify OTP & Reset"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForgotStep("request")}
                    style={{
                      padding: "12px 16px",
                      background: "transparent",
                      color: "var(--text-muted)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      fontFamily: "var(--font-outfit)",
                      fontSize: "0.95rem",
                      cursor: "pointer"
                    }}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ================= CHANGE EMAIL ADDRESS (OTP) MODAL ================= */}
      {showChangeEmailModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            width: "100%",
            maxWidth: "440px",
            background: "#0a0a0a",
            border: "1px solid var(--neon-yellow)",
            borderRadius: "16px",
            padding: "28px 24px",
            boxShadow: "0 0 35px rgba(255, 234, 0, 0.25)",
            position: "relative"
          }}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowChangeEmailModal(false);
                setChangeEmailStep("request");
                setChangeEmailError("");
                setChangeEmailMessage("");
              }}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "1.2rem",
                cursor: "pointer"
              }}
            >
              ✕
            </button>

            <h3 style={{
              color: "var(--neon-yellow)",
              fontFamily: "var(--font-outfit)",
              fontSize: "1.3rem",
              marginTop: 0,
              marginBottom: "8px",
              textAlign: "center"
            }}>
              {changeEmailStep === "request" ? "Change Email Address" : "Verify New Email OTP"}
            </h3>

            {changeEmailError && (
              <p style={{
                color: "#ff4d4d",
                fontSize: "0.85rem",
                background: "rgba(255, 77, 77, 0.1)",
                border: "1px solid #ff4d4d",
                borderRadius: "8px",
                padding: "8px 12px",
                margin: "10px 0 15px",
                textAlign: "center"
              }}>
                {changeEmailError}
              </p>
            )}

            {changeEmailMessage && (
              <p style={{
                color: "#00FF80",
                fontSize: "0.85rem",
                background: "rgba(0, 255, 128, 0.1)",
                border: "1px solid #00FF80",
                borderRadius: "8px",
                padding: "8px 12px",
                margin: "10px 0 15px",
                textAlign: "center"
              }}>
                {changeEmailMessage}
              </p>
            )}

            {changeEmailStep === "request" ? (
              /* STEP 1: Verify Password & Enter New Email */
              <form onSubmit={handleRequestChangeEmail} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ color: "var(--neon-white)", fontSize: "0.88rem", lineHeight: "1.4", margin: 0, textAlign: "center" }}>
                  Confirm your password and enter your new email to receive a 6-digit verification code.
                </p>

                {/* Current Email Display */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Current Email
                  </label>
                  <input 
                    type="text" 
                    value={regEmail}
                    disabled
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />
                </div>

                {/* Current Password */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Current Password
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type={showChangeCurrentPwd ? "text" : "password"} 
                      placeholder="Enter your current password" 
                      value={changeCurrentPassword}
                      onChange={(e) => setChangeCurrentPassword(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px 42px 12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowChangeCurrentPwd(!showChangeCurrentPwd)}
                      style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.1rem", padding: "4px" }}
                    >
                      {showChangeCurrentPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* New Email Address */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    New Email Address
                  </label>
                  <input 
                    type="email" 
                    placeholder="newemail@example.com" 
                    value={changeNewEmail}
                    onChange={(e) => setChangeNewEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isChangeEmailLoading || !changeCurrentPassword || !changeNewEmail.trim()}
                    className="glow-text-yellow"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: isChangeEmailLoading ? "rgba(255,234,0,0.2)" : "var(--neon-yellow)",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      cursor: isChangeEmailLoading ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isChangeEmailLoading && <span className="heartist-spinner" style={{ borderColor: "#000", borderTopColor: "transparent" }} />}
                    {isChangeEmailLoading ? "Sending OTP..." : "Send OTP to New Email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowChangeEmailModal(false)}
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
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: Enter 6-digit OTP sent to new email */
              <form onSubmit={handleVerifyAndConfirmEmailChange} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Target email and live countdown badge */}
                <div style={{
                  background: "rgba(255, 234, 0, 0.05)",
                  border: "1px dashed rgba(255, 234, 0, 0.4)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                    Code sent to: <strong>{changeNewEmail}</strong>
                  </span>
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: changeEmailCodeExpiry > 30 ? "var(--neon-yellow)" : "#ff4d4d",
                    fontFamily: "monospace"
                  }}>
                    {changeEmailCodeExpiry > 0 ? `Expires: ${formatTime(changeEmailCodeExpiry)}` : "Expired"}
                  </span>
                </div>

                {/* 6-Digit OTP input */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Enter 6-Digit OTP Code
                  </label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="000000" 
                    maxLength={6}
                    value={changeEmailCode}
                    onChange={(e) => setChangeEmailCode(e.target.value.replace(/\D/g, ""))}
                    required
                    style={{ 
                      width: "100%", 
                      padding: "12px 14px", 
                      textAlign: "center", 
                      letterSpacing: "10px", 
                      fontFamily: "monospace, var(--font-outfit)", 
                      fontWeight: "bold", 
                      borderRadius: "8px", 
                      background: "rgba(0,0,0,0.5)", 
                      border: changeEmailCode.length === 6 ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.25)", 
                      color: "var(--neon-yellow)", 
                      outline: "none", 
                      fontSize: "1.6rem",
                      boxShadow: changeEmailCode.length === 6 ? "0 0 15px rgba(255, 234, 0, 0.2)" : "none"
                    }}
                  />
                </div>

                {/* Resend Action Box */}
                <div style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px"
                }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                    Didn&apos;t get the code?
                  </span>
                  <button
                    type="button"
                    disabled={changeEmailResendCooldown > 0 || isChangeEmailResending}
                    onClick={handleResendChangeEmailOtp}
                    style={{
                      background: changeEmailResendCooldown > 0 || isChangeEmailResending ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 234, 0, 0.12)",
                      border: changeEmailResendCooldown > 0 || isChangeEmailResending ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid var(--neon-yellow)",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      color: changeEmailResendCooldown > 0 || isChangeEmailResending ? "var(--text-muted)" : "var(--neon-yellow)",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      cursor: changeEmailResendCooldown > 0 || isChangeEmailResending ? "not-allowed" : "pointer"
                    }}
                  >
                    {isChangeEmailResending ? "Sending..." : changeEmailResendCooldown > 0 ? `Resend in ${changeEmailResendCooldown}s` : "Resend Code"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isChangeEmailLoading || changeEmailCode.length !== 6 || changeEmailCodeExpiry === 0}
                    className="glow-text-yellow"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: isChangeEmailLoading ? "rgba(255,234,0,0.2)" : "var(--neon-yellow)",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      cursor: (isChangeEmailLoading || changeEmailCode.length !== 6 || changeEmailCodeExpiry === 0) ? "not-allowed" : "pointer",
                      opacity: (changeEmailCode.length !== 6 || changeEmailCodeExpiry === 0) ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isChangeEmailLoading && <span className="heartist-spinner" style={{ borderColor: "#000", borderTopColor: "transparent" }} />}
                    {isChangeEmailLoading ? "Verifying..." : "Verify OTP & Update Email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangeEmailStep("request")}
                    style={{
                      padding: "12px 16px",
                      background: "transparent",
                      color: "var(--text-muted)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      fontFamily: "var(--font-outfit)",
                      fontSize: "0.95rem",
                      cursor: "pointer"
                    }}
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
