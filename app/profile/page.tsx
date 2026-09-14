"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown from "@/components/CustomDropdown";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from "@/utils/cropImage";
import { supabase, createEphemeralClient } from "@/lib/supabase";
import { fetchSystemSetting } from "@/lib/fusionSync";
import { formatCapitalizedName, formatFullName } from "@/utils/formatName";
import { validatePasswordStrength } from "@/utils/passwordValidation";
import BadgeIcon, { BadgePill, getBadgeDefinition, normalizeBadgeId } from "@/components/BadgeIcon";

const CriteriaCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CriteriaDot = () => (
  <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
  </svg>
);


const BASE_ROLES = [
  { id: "first-timer", title: "First-timer", label: "First-timer", color: "#22C55E" },
  { id: "camp-veteran", title: "Camp Veteran", label: "Camp Veteran", color: "#F59E0B" },
  { id: "supporter", title: "Supporter", label: "Supporter", color: "#EC4899" },
];

function getRoleBadgeItem(roleId: string) {
  if (!roleId) return BASE_ROLES[0];
  const def = getBadgeDefinition(roleId);
  return { id: def.id, title: def.label, label: def.label, color: def.color };
}

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
  const [regBadge, setRegBadge] = useState(BASE_ROLES[0].id);
  const [adminAssignedBadge, setAdminAssignedBadge] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [highlightBadge, setHighlightBadge] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Password modal state (with Old Password + OTP Verification)
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdModalStep, setPwdModalStep] = useState<"request" | "verify">("request");
  const [pwdModalMode, setPwdModalMode] = useState<"with_old" | "forgot">("with_old");
  const [oldPassword, setOldPassword] = useState("");
  const [pwdOtpCode, setPwdOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const newPassValidation = validatePasswordStrength(newPassword);
  const [isPwdLoading, setIsPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdMessage, setPwdMessage] = useState("");
  const [pwdCodeExpiry, setPwdCodeExpiry] = useState(120);
  const [pwdResendCooldown, setPwdResendCooldown] = useState(60);
  const [isPwdResending, setIsPwdResending] = useState(false);

  // Change Email Address modal state
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [changeEmailStep, setChangeEmailStep] = useState<"request" | "verify">("request");
  const [changeCurrentPassword, setChangeCurrentPassword] = useState("");
  const [changeNewEmail, setChangeNewEmail] = useState("");
  const [changeEmailCode, setChangeEmailCode] = useState("");
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

  // Delete Account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Invalid Birthday modal state (ages 0-5 prohibited)
  const [showInvalidBirthdayModal, setShowInvalidBirthdayModal] = useState(false);

  useEffect(() => {
    let timer: any = null;
    if (showDeleteModal && deleteCountdown > 0) {
      timer = setInterval(() => {
        setDeleteCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showDeleteModal, deleteCountdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timers for OTP modals
  useEffect(() => {
    let timer: any;
    if (showPwdModal && pwdModalStep === "verify") {
      timer = setInterval(() => {
        setPwdCodeExpiry((prev) => (prev > 0 ? prev - 1 : 0));
        setPwdResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showPwdModal, pwdModalStep]);

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
        setCropImageSrc(null);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to crop image.");
    }
  };

  useEffect(() => {
    let profileSub: any = null;
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
          const userBadge = profile.badge || BASE_ROLES[0].id;
          
          // Check if user has an admin-assigned badge outside the standard 3 roles
          const isBaseRole = BASE_ROLES.some(r => r.id === userBadge);
          if (!isBaseRole && userBadge.toLowerCase() !== "admin") {
            setAdminAssignedBadge(userBadge);
          } else {
            setAdminAssignedBadge(null);
          }

          const cleanFirst = formatCapitalizedName(profile.first_name);
          const cleanMiddle = formatCapitalizedName(middleName);
          const cleanLast = formatCapitalizedName(profile.last_name);

          const userObj = {
            id: profile.id,
            avatar: profile.avatar_url,
            firstName: cleanFirst,
            middleName: cleanMiddle,
            lastName: cleanLast,
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
          
          setRegFirstName(cleanFirst);
          setRegMiddleName(cleanMiddle);
          setRegLastName(cleanLast);
          setRegBirthDate(profile.birth_date || "");
          setRegEmail(profile.email || "");
          setRegContact(profile.contact_number || "");
          setRegBadge(isAdmin ? "Admin" : userBadge);

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

        profileSub = supabase
          .channel(`profile_realtime_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'profiles',
              filter: `id=eq.${user.id}`
            },
            (payload: any) => {
              const updated = payload.new;
              if (updated) {
                const newBadge = updated.badge || BASE_ROLES[0].id;
                const isBase = BASE_ROLES.some(r => r.id === newBadge);
                if (!isBase && (newBadge || "").toLowerCase() !== "admin") {
                  setAdminAssignedBadge(newBadge);
                } else {
                  setAdminAssignedBadge(null);
                }
                setRegBadge(isAdmin ? "Admin" : newBadge);
                setActiveUser((prev: any) => ({
                  ...prev,
                  badge: newBadge,
                  team: updated.team,
                  avatar: updated.avatar_url
                }));
              }
            }
          )
          .subscribe();
      };

      fetchProfile();
    }

    return () => {
      if (profileSub) {
        supabase.removeChannel(profileSub);
      }
    };
  }, []);

  const performSmoothScrollToBadge = useCallback(() => {
    const el = document.getElementById("profile-badge-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightBadge(true);
      setTimeout(() => {
        setHighlightBadge(false);
      }, 3500);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkAndScroll = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (params.get("scrollTo") === "badge" || hash === "#badge") {
        setTimeout(performSmoothScrollToBadge, 350);
        setTimeout(performSmoothScrollToBadge, 850);
      }
    };

    checkAndScroll();

    const handleBadgeUpdated = () => {
      const activeStr = localStorage.getItem("activeUser");
      if (activeStr) {
        try {
          const u = JSON.parse(activeStr);
          const isBaseRole = BASE_ROLES.some(r => r.id === u.badge);
          if (!isBaseRole && (u.badge || "").toLowerCase() !== "admin") {
            setAdminAssignedBadge(u.badge);
          } else {
            setAdminAssignedBadge(null);
          }
          setActiveUser((prev: any) => ({ ...prev, badge: u.badge }));
          setRegBadge(u.badge);
        } catch(e) {}
      }
      setTimeout(performSmoothScrollToBadge, 250);
    };

    window.addEventListener("badge_updated", handleBadgeUpdated);
    window.addEventListener("popstate", checkAndScroll);

    return () => {
      window.removeEventListener("badge_updated", handleBadgeUpdated);
      window.removeEventListener("popstate", checkAndScroll);
    };
  }, [performSmoothScrollToBadge]);

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

      const computedAge = calculateAge(regBirthDate);
      if (computedAge <= 5) {
        setShowInvalidBirthdayModal(true);
        setError("Invalid Birthday. Age must be at least 6 years old.");
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

      const cleanFirst = formatCapitalizedName(regFirstName.trim());
      const cleanMiddle = formatCapitalizedName(regMiddleName.trim());
      const cleanLast = isAdminProfile ? "" : formatCapitalizedName(regLastName.trim());

      // Update Database
      const profileUpdates: any = {
        first_name: cleanFirst,
        avatar_url: finalAvatarUrl,
        email: regEmail.trim(),
        age: ""
      };
      
      if (!isAdminProfile) {
        profileUpdates.last_name = cleanLast;
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

      // Update Auth metadata
      const updateAuthPayload: any = {
        data: {
          first_name: cleanFirst,
          middle_name: cleanMiddle,
          last_name: cleanLast,
          birth_date: isAdminProfile ? "" : regBirthDate,
          contact_number: isAdminProfile ? "" : regContact.trim(),
          badge: isAdminProfile ? "Admin" : regBadge
        }
      };
      
      const { error: authUpdateError } = await supabase.auth.updateUser(updateAuthPayload);
      if (authUpdateError) throw authUpdateError;

      // Attempt updating middle_name in profiles if column exists
      try {
        await supabase.from("profiles").update({ middle_name: cleanMiddle }).eq("id", activeUser.id);
      } catch(e) {}

      // Save user default badge to system_settings
      if (!isAdminProfile && !adminAssignedBadge && regBadge) {
        try {
          const { data: currSetting } = await supabase
            .from("system_settings")
            .select("value")
            .eq("id", "user_default_badges")
            .maybeSingle();
          const currMap = (currSetting?.value && typeof currSetting.value === "object") ? currSetting.value : {};
          currMap[activeUser.id] = regBadge;
          await supabase.from("system_settings").upsert({
            id: "user_default_badges",
            value: currMap,
            updated_at: new Date().toISOString()
          });
        } catch(e) {}
      }

      const updatedUser = {
        ...activeUser,
        avatar: finalAvatarUrl,
        firstName: cleanFirst,
        middleName: cleanMiddle,
        lastName: cleanLast,
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

  // --- PASSWORD CHANGE / FORGOT PASSWORD (OTP) HANDLERS ---
  const handleRequestPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPwdLoading) return;
    setPwdError("");
    setPwdMessage("");

    const targetEmail = regEmail || activeUser?.email;
    if (!targetEmail) {
      setPwdError("Account email not found. Please reload the page.");
      return;
    }

    // If changing with old password, verify old password first
    if (pwdModalMode === "with_old") {
      if (!oldPassword) {
        setPwdError("Please enter your current password.");
        return;
      }

      setIsPwdLoading(true);
      try {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: oldPassword
        });

        if (authError) {
          setPwdError("Incorrect old password. If you forgot your password, click 'Forgot Password?' below.");
          setIsPwdLoading(false);
          return;
        }
      } catch (err: any) {
        setPwdError("Verification failed. Please check your old password and try again.");
        setIsPwdLoading(false);
        return;
      }
    }

    setIsPwdLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail);
      if (resetError) throw resetError;

      setPwdModalStep("verify");
      setPwdCodeExpiry(120);
      setPwdResendCooldown(60);
      setPwdOtpCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPwdMessage(`A 6-digit OTP code has been sent to ${targetEmail}. Enter it below to set your new password.`);
    } catch (err: any) {
      setPwdError(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setIsPwdLoading(false);
    }
  };

  const handleResendPasswordOtp = async () => {
    if (pwdResendCooldown > 0 || isPwdResending) return;
    setIsPwdResending(true);
    setPwdError("");
    setPwdMessage("");
    try {
      const targetEmail = regEmail || activeUser?.email;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail);
      if (resetError) throw resetError;
      setPwdMessage(`A new 6-digit OTP code has been sent to ${targetEmail}.`);
      setPwdCodeExpiry(120);
      setPwdResendCooldown(60);
      setPwdOtpCode("");
    } catch (err: any) {
      const msg = err.message || "Failed to resend code. Please try again.";
      if (/rate limit|rate exceeded|too many requests/i.test(msg)) {
        setPwdError("Email rate limit reached. Please wait a few minutes before requesting another code.");
      } else {
        setPwdError(msg);
      }
    } finally {
      setIsPwdResending(false);
    }
  };

  const handleVerifyAndSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPwdLoading) return;
    if (pwdCodeExpiry === 0) {
      setPwdError("The OTP code has expired. Please request a new code.");
      return;
    }

    const code = pwdOtpCode.trim();
    if (!code || code.length !== 6) {
      setPwdError("Please enter the 6-digit OTP code.");
      return;
    }

    const newPassCheck = validatePasswordStrength(newPassword);
    if (!newPassCheck.isValid) {
      setPwdError(newPassCheck.errorMessage);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setIsPwdLoading(true);
    setPwdError("");
    try {
      const targetEmail = regEmail || activeUser?.email;

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: targetEmail,
        token: code,
        type: "recovery"
      });

      if (verifyError) throw verifyError;

      // Check conflict for new password against other users with the same First Name
      const myFirstName = activeUser?.firstName;
      if (myFirstName) {
        const formattedMyFirst = formatCapitalizedName(myFirstName.trim());
        const { data: conflictProfiles } = await supabase
          .from("profiles")
          .select("email")
          .ilike("first_name", formattedMyFirst);

        const candidateResetEmails = (conflictProfiles || [])
          .map((p) => p.email)
          .filter((e) => e && e.toLowerCase() !== targetEmail.toLowerCase());

        if (candidateResetEmails.length > 0) {
          const conflictResults = await Promise.all(
            candidateResetEmails.map(async (candEmail) => {
              try {
                const ephem = createEphemeralClient();
                const { data: testAuth, error: testAuthError } = await ephem.auth.signInWithPassword({
                  email: candEmail,
                  password: newPassword,
                });
                return Boolean(testAuth?.user && !testAuthError);
              } catch (e) {
                return false;
              }
            })
          );

          if (conflictResults.some(Boolean)) {
            setPwdError("Your password is invalid. Please change your password.");
            return;
          }
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setShowPwdModal(false);
      setPwdModalStep("request");
      setOldPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPwdOtpCode("");
      setMessage("Password successfully updated with OTP!");
      setTimeout(() => setMessage(""), 5000);
      setPwdError("");
    } catch (err: any) {
      setPwdError(err.message || "Invalid or expired OTP code. Please try requesting a new one.");
    } finally {
      setIsPwdLoading(false);
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
      const { error: verifyError } = await supabase.auth.verifyOtp({
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

  const handleDeleteAccount = async () => {
    if (deleteCountdown > 0 || isDeletingAccount) return;
    setIsDeletingAccount(true);
    setDeleteError("");
    try {
      const userId = activeUser?.id;
      const userEmail = activeUser?.email;

      if (userId) {
        try {
          await supabase.from("notifications").delete().eq("recipient_id", userId);
        } catch (e) {}

        try {
          await supabase.from("penalties").delete().eq("user_id", userId);
        } catch (e) {}

        try {
          await supabase.from("profiles").delete().eq("id", userId);
        } catch (e) {}

        if (selectedAvatar && selectedAvatar.includes("avatars")) {
          try {
            const fileName = selectedAvatar.split("/").pop();
            if (fileName) {
              await supabase.storage.from("avatars").remove([fileName]);
            }
          } catch (e) {}
        }
      }

      localStorage.removeItem("activeUser");
      localStorage.removeItem("heartist_active_user");
      if (userEmail && localStorage.getItem("heartistRememberMeEmail") === userEmail) {
        localStorage.removeItem("heartistRememberMeEmail");
        localStorage.removeItem("heartistRememberMe");
      }

      const savedAccounts = localStorage.getItem("registeredAccounts");
      if (savedAccounts) {
        try {
          const parsed = JSON.parse(savedAccounts);
          const updated = parsed.filter((a: any) => a.email !== userEmail && a.id !== userId);
          localStorage.setItem("registeredAccounts", JSON.stringify(updated));
        } catch (e) {}
      }

      try {
        await supabase.auth.signOut();
      } catch (e) {}

      window.location.href = "/login";
    } catch (err: any) {
      console.error("Delete account error:", err);
      setDeleteError(err.message || "Failed to delete account. Please try again.");
      setIsDeletingAccount(false);
    }
  };

  if (!activeUser) return <div style={{ color: "white", padding: "50px", textAlign: "center" }}>Loading...</div>;

  // Available Camper Badge options:
  // When an admin assigns a custom role, lock to that role. When removed/default, user can freely pick between the 3 base roles.
  const availableBadgeOptions = adminAssignedBadge
    ? [getRoleBadgeItem(adminAssignedBadge)]
    : BASE_ROLES;

  const isUnderageInProfile = !isAdminProfile && regBirthDate ? calculateAge(regBirthDate) <= 5 : false;

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
             {formatCapitalizedName(activeUser.firstName)}{activeUser.middleName ? ` ${formatCapitalizedName(activeUser.middleName)}` : ""} {formatCapitalizedName(activeUser.lastName)}
           </h2>
             {(() => {
               const currentBadgeId = isAdminProfile ? "Admin" : (regBadge || activeUser?.badge || "first-timer");
               const badgeDef = getBadgeDefinition(currentBadgeId);
               return (
                 <div 
                   id="profile-badge-section"
                   style={{
                     margin: "8px 0",
                     display: "inline-flex",
                     alignItems: "center",
                     gap: "8px",
                     padding: "6px 16px",
                     borderRadius: "20px",
                     background: `${badgeDef.color}18`,
                     border: `1.5px solid ${badgeDef.color}${highlightBadge ? "FF" : "50"}`,
                     color: badgeDef.color,
                     fontFamily: "var(--font-outfit)",
                     fontWeight: "700",
                     fontSize: "0.95rem",
                     letterSpacing: "0.3px",
                     boxShadow: highlightBadge 
                       ? `0 0 25px ${badgeDef.color}, 0 0 50px ${badgeDef.color}80` 
                       : `0 0 12px ${badgeDef.color}25`,
                     transform: highlightBadge ? "scale(1.15)" : "scale(1)",
                     transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                     cursor: "default"
                 }}>
                   <BadgeIcon badge={currentBadgeId} size={18} color={badgeDef.color} />
                   <span style={{ color: badgeDef.color }}>{badgeDef.label}</span>
                 </div>
               );
             })()}
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
                  {regBirthDate && (
                    <span style={{ 
                      fontSize: "0.72rem", 
                      color: isUnderageInProfile ? "#FF4D4D" : "var(--neon-yellow)", 
                      fontWeight: "bold", 
                      fontFamily: "var(--font-outfit)" 
                    }}>
                      {calculateAge(regBirthDate)} yrs old {isUnderageInProfile && "(Ages 6+ only)"}
                    </span>
                  )}
                </div>
                <input 
                  type="date" 
                  value={regBirthDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRegBirthDate(val);
                    if (val && calculateAge(val) <= 5) {
                      setShowInvalidBirthdayModal(true);
                    }
                  }}
                  style={{ 
                    width: "100%", 
                    height: "44px", 
                    minHeight: "44px", 
                    maxHeight: "44px", 
                    boxSizing: "border-box", 
                    padding: "8px 14px", 
                    borderRadius: "8px", 
                    background: "rgba(0,0,0,0.5)", 
                    border: isUnderageInProfile ? "1px solid #FF4D4D" : "1px solid rgba(255,255,255,0.2)", 
                    color: "white", 
                    colorScheme: "dark", 
                    WebkitAppearance: "none", 
                    appearance: "none", 
                    outline: "none", 
                    fontFamily: "var(--font-outfit)", 
                    fontSize: "0.95rem", 
                    textAlign: "left" 
                  }}
                />
                {isUnderageInProfile && (
                  <span style={{ fontSize: "0.72rem", color: "#FF6B6B", fontFamily: "var(--font-outfit)", marginTop: "1px" }}>
                    Invalid Birthday: Must be at least 6 years old.
                  </span>
                )}
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

          {/* Camper Badge Uniform Custom Dropdown (Includes user's registered badge and dynamic admin-assigned badge) */}
          {!isAdminProfile && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", display: "block" }}>
                  Camper Badge
                </label>
                {adminAssignedBadge && (
                  <span style={{ 
                    fontSize: "0.72rem", 
                    color: "var(--neon-yellow)", 
                    fontFamily: "var(--font-outfit)", 
                    fontWeight: "600",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Admin Assigned Role Active
                  </span>
                )}
              </div>
              <CustomDropdown 
                options={availableBadgeOptions.map(r => ({
                  value: r.id,
                  label: r.label,
                  color: r.color,
                  renderLabel: (isSelected: boolean) => (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <BadgeIcon badge={r.id} size={18} color={r.color} />
                      <span style={{ 
                        color: isSelected ? r.color : "#FFFFFF", 
                        fontWeight: isSelected ? "700" : "500",
                        fontFamily: "var(--font-outfit)",
                        transition: "color 0.2s ease"
                      }}>
                        {r.title}
                      </span>
                    </div>
                  )
                }))}
                value={regBadge}
                onChange={(val) => {
                  if (!adminAssignedBadge) {
                    setRegBadge(val);
                  }
                }}
                disabled={!!adminAssignedBadge}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--canary-yellow)", margin: "4px 0 2px 4px", fontStyle: "italic", lineHeight: "1.3" }}>
                {adminAssignedBadge ? (
                  "This role was officially assigned by an administrator and cannot be modified."
                ) : (
                  <>
                    {regBadge === "first-timer" && "For those joining our camps or events for the very first time."}
                    {regBadge === "camp-veteran" && "For seasoned campers who have attended past Fusion Camps."}
                    {regBadge === "supporter" && "For parents, sponsors, or friends actively supporting the youth."}
                  </>
                )}
              </p>
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
          
          {/* Password Field with Click to Change & Lower-Right "Forgot Password?" Action Link */}
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", marginBottom: "5px", display: "block" }}>
              Password
            </label>
            <div 
              onClick={() => {
                setPwdModalMode("with_old");
                setOldPassword("");
                setPwdModalStep("request");
                setPwdError("");
                setPwdMessage("");
                setShowPwdModal(true);
              }}
              style={{
                width: "100%",
                padding: "12px 15px",
                borderRadius: "8px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "var(--font-outfit)",
                fontSize: "0.95rem",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "all 0.2s ease"
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--neon-yellow)")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)")}
            >
              <span>••••••••••••</span>
              <span style={{ fontSize: "0.82rem", color: "var(--neon-yellow)", fontWeight: "bold" }}>
                Click to Change Password
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => {
                  setPwdModalMode("forgot");
                  setOldPassword("");
                  setPwdModalStep("request");
                  setPwdError("");
                  setPwdMessage("");
                  setShowPwdModal(true);
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
            disabled={isUpdating || isUnderageInProfile}
            className="glow-text-yellow"
            style={{ 
              width: "100%",
              marginTop: "15px", 
              padding: "15px", 
              background: isUnderageInProfile ? "rgba(255,255,255,0.05)" : "rgba(255,234,0,0.1)", 
              color: isUnderageInProfile ? "rgba(255,255,255,0.4)" : "var(--neon-yellow)", 
              border: isUnderageInProfile ? "1px solid rgba(255,255,255,0.15)" : "1px solid var(--neon-yellow)", 
              borderRadius: "8px", 
              fontFamily: "var(--font-outfit)", 
              fontWeight: "bold", 
              fontSize: "1.1rem", 
              cursor: isUpdating ? "wait" : isUnderageInProfile ? "not-allowed" : "pointer", 
              transition: "all 0.3s", 
              opacity: isUpdating ? 0.7 : 1 
            }}
          >
            {isUpdating ? "Saving Changes..." : "Save Changes"}
          </button>

          {/* Danger Zone: Delete Account - Same size and prominence as Save Changes */}
          <button 
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteCountdown(5);
              setDeleteError("");
            }}
            style={{
              width: "100%",
              marginTop: "10px",
              padding: "15px",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#EF4444",
              border: "1px solid #EF4444",
              borderRadius: "8px",
              fontFamily: "var(--font-outfit)",
              fontWeight: "bold",
              fontSize: "1.1rem",
              cursor: "pointer",
              transition: "all 0.3s",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
              e.currentTarget.style.boxShadow = "0 0 15px rgba(239, 68, 68, 0.35)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            Delete Account
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

      {/* ================= PASSWORD CHANGE / FORGOT (OTP) MODAL ================= */}
      {showPwdModal && (
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
                setShowPwdModal(false);
                setPwdModalStep("request");
                setOldPassword("");
                setPwdError("");
                setPwdMessage("");
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
              {pwdModalStep === "request" 
                ? (pwdModalMode === "with_old" ? "Change Password" : "Forgot Password") 
                : "Verify OTP & Set New Password"}
            </h3>

            {pwdError && (
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
                {pwdError}
              </p>
            )}

            {pwdMessage && (
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
                {pwdMessage}
              </p>
            )}

            {pwdModalStep === "request" ? (
              /* STEP 1: Enter Old Password (or direct request) & Send OTP */
              <form onSubmit={handleRequestPasswordOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ color: "var(--neon-white)", fontSize: "0.88rem", lineHeight: "1.4", margin: 0, textAlign: "center" }}>
                  {pwdModalMode === "with_old" 
                    ? "Enter your old password to verify your identity and send an OTP code." 
                    : `We will send a 6-digit OTP code to ${regEmail || activeUser?.email}.`}
                </p>

                {pwdModalMode === "with_old" && (
                  <div>
                    <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                      Enter Old Password
                    </label>
                    <input 
                      type="password" 
                      placeholder="Enter your current password" 
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                    />
                    <div style={{ textAlign: "right", marginTop: "4px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPwdModalMode("forgot");
                          setOldPassword("");
                          setPwdError("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--neon-yellow)",
                          fontSize: "0.78rem",
                          fontFamily: "var(--font-outfit)",
                          cursor: "pointer",
                          textDecoration: "underline",
                          opacity: 0.85
                        }}
                      >
                        Forgot old password? Send OTP directly
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isPwdLoading || (pwdModalMode === "with_old" && !oldPassword)}
                    className="glow-text-yellow"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: (isPwdLoading || (pwdModalMode === "with_old" && !oldPassword)) ? "rgba(255,234,0,0.2)" : "var(--neon-yellow)",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      cursor: (isPwdLoading || (pwdModalMode === "with_old" && !oldPassword)) ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isPwdLoading && <span className="heartist-spinner" style={{ borderColor: "#000", borderTopColor: "transparent" }} />}
                    {isPwdLoading ? "Sending OTP..." : "Send OTP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPwdModal(false)}
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
              /* STEP 2: Enter 6-digit OTP, New Password & Confirm Password */
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
                    Code sent to: <strong>{regEmail || activeUser?.email}</strong>
                  </span>
                  <span style={{
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: pwdCodeExpiry > 30 ? "var(--neon-yellow)" : "#ff4d4d",
                    fontFamily: "monospace"
                  }}>
                    {pwdCodeExpiry > 0 ? `Expires: ${formatTime(pwdCodeExpiry)}` : "Expired"}
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
                    value={pwdOtpCode}
                    onChange={(e) => setPwdOtpCode(e.target.value.replace(/\D/g, ""))}
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
                      border: pwdOtpCode.length === 6 ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.25)", 
                      color: "var(--neon-yellow)", 
                      outline: "none", 
                      fontSize: "1.6rem",
                      boxShadow: pwdOtpCode.length === 6 ? "0 0 15px rgba(255, 234, 0, 0.2)" : "none"
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
                    disabled={pwdResendCooldown > 0 || isPwdResending}
                    onClick={handleResendPasswordOtp}
                    style={{
                      background: pwdResendCooldown > 0 || isPwdResending ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 234, 0, 0.12)",
                      border: pwdResendCooldown > 0 || isPwdResending ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid var(--neon-yellow)",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      color: pwdResendCooldown > 0 || isPwdResending ? "var(--text-muted)" : "var(--neon-yellow)",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      cursor: pwdResendCooldown > 0 || isPwdResending ? "not-allowed" : "pointer"
                    }}
                  >
                    {isPwdResending ? "Sending..." : pwdResendCooldown > 0 ? `Resend in ${pwdResendCooldown}s` : "Resend Code"}
                  </button>
                </div>

                {/* New Password */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Enter New Password (min. 8 chars, strong)
                  </label>
                  <input 
                    type="password" 
                    placeholder="At least 8 characters (strong)" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />

                  {/* Live Password Strength Criteria */}
                  {newPassword.length > 0 && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "6px",
                      background: "rgba(0,0,0,0.35)",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.08)",
                      marginTop: "6px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: newPassValidation.criteria.hasMinLength ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {newPassValidation.criteria.hasMinLength ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>8+ characters</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: newPassValidation.criteria.hasUpper ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {newPassValidation.criteria.hasUpper ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>Big letter (A-Z)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: newPassValidation.criteria.hasLower ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {newPassValidation.criteria.hasLower ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>Small letter (a-z)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: newPassValidation.criteria.hasNumber ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {newPassValidation.criteria.hasNumber ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>Number (0-9)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: newPassValidation.criteria.hasUniqueKey ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {newPassValidation.criteria.hasUniqueKey ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>Unique key (_, -, @, #)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Confirm Password
                  </label>
                  <input 
                    type="password" 
                    placeholder="Repeat new password" 
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: confirmNewPassword && newPassword !== confirmNewPassword ? "1px solid #FF4D4D" : "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isPwdLoading || pwdOtpCode.length !== 6 || !newPassValidation.isValid || newPassword !== confirmNewPassword || pwdCodeExpiry === 0}
                    className="glow-text-yellow"
                    style={{
                      flex: 1,
                      padding: "12px",
                      background: isPwdLoading ? "rgba(255,234,0,0.2)" : "var(--neon-yellow)",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      fontFamily: "var(--font-outfit)",
                      fontWeight: "bold",
                      fontSize: "0.95rem",
                      cursor: (isPwdLoading || pwdOtpCode.length !== 6 || !newPassValidation.isValid || newPassword !== confirmNewPassword || pwdCodeExpiry === 0) ? "not-allowed" : "pointer",
                      opacity: (pwdOtpCode.length !== 6 || !newPassValidation.isValid || newPassword !== confirmNewPassword || pwdCodeExpiry === 0) ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isPwdLoading && <span className="heartist-spinner" style={{ borderColor: "#000", borderTopColor: "transparent" }} />}
                    {isPwdLoading ? "Verifying..." : "Verify OTP & Update Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPwdModalStep("request")}
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
                  Confirm your current password and enter your new email to receive a 6-digit verification code.
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

                {/* Current Password (No emoji buttons) */}
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Current Password
                  </label>
                  <input 
                    type="password" 
                    placeholder="Enter your current password" 
                    value={changeCurrentPassword}
                    onChange={(e) => setChangeCurrentPassword(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />
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

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0, 0, 0, 0.88)",
          backdropFilter: "blur(10px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            background: "#111111",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.95), 0 0 35px rgba(239, 68, 68, 0.15)",
            borderRadius: "16px",
            padding: "28px 24px",
            width: "100%",
            maxWidth: "440px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            {/* SVG Trash Icon - No Emojis */}
            <div style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              color: "#EF4444"
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </div>

            <h3 style={{
              fontSize: "1.3rem",
              fontWeight: "700",
              color: "#FFFFFF",
              margin: "0 0 8px 0",
              fontFamily: "var(--font-outfit)"
            }}>
              Permanently Delete Account?
            </h3>

            <p style={{
              fontSize: "0.95rem",
              color: "rgba(255, 255, 255, 0.85)",
              margin: "0 0 16px 0",
              fontFamily: "var(--font-outfit)",
              lineHeight: "1.5"
            }}>
              Are you sure you want to delete your account permanently?
            </p>

            <div style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.22)",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "22px",
              width: "100%"
            }}>
              <p style={{
                fontSize: "0.82rem",
                color: "#FCA5A5",
                margin: 0,
                lineHeight: "1.5",
                fontFamily: "var(--font-outfit)"
              }}>
                Please note that once you delete your account, it will be automatically and permanently removed. Your profile data and access will be completely erased. This action is irreversible.
              </p>
            </div>

            {deleteError && (
              <p style={{
                fontSize: "0.82rem",
                color: "#EF4444",
                margin: "0 0 14px 0",
                fontFamily: "var(--font-outfit)"
              }}>
                {deleteError}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteCountdown(5);
                  setDeleteError("");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "transparent",
                  color: "#D1D5DB",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "8px",
                  fontFamily: "var(--font-outfit)",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                  cursor: isDeletingAccount ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  if (!isDeletingAccount) e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleteCountdown > 0 || isDeletingAccount}
                onClick={handleDeleteAccount}
                style={{
                  flex: 1.3,
                  padding: "12px",
                  background: deleteCountdown > 0 || isDeletingAccount ? "rgba(239, 68, 68, 0.25)" : "#DC2626",
                  color: deleteCountdown > 0 || isDeletingAccount ? "rgba(255, 255, 255, 0.5)" : "#FFFFFF",
                  border: deleteCountdown > 0 || isDeletingAccount ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid #DC2626",
                  borderRadius: "8px",
                  fontFamily: "var(--font-outfit)",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  cursor: deleteCountdown > 0 || isDeletingAccount ? "not-allowed" : "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: deleteCountdown === 0 && !isDeletingAccount ? "0 0 20px rgba(220, 38, 38, 0.55)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                {isDeletingAccount && <span className="heartist-spinner" style={{ borderColor: "#fff", borderTopColor: "transparent" }} />}
                {isDeletingAccount 
                  ? "Deleting..." 
                  : deleteCountdown > 0 
                    ? `Delete Account (${deleteCountdown}s)` 
                    : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVALID BIRTHDAY MODAL (Ages 0-5 Prohibited) */}
      {showInvalidBirthdayModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
          onClick={() => setShowInvalidBirthdayModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: "420px",
              background: "#111111",
              border: "1px solid rgba(255, 77, 77, 0.4)",
              boxShadow: "0 0 35px rgba(255, 77, 77, 0.25), inset 0 0 15px rgba(255, 77, 77, 0.05)",
              borderRadius: "16px",
              padding: "28px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              animation: "fadeIn 0.25s ease-out"
            }}
          >
            {/* Warning Icon Badge */}
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(255, 77, 77, 0.12)",
              border: "1px solid rgba(255, 77, 77, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "16px",
              color: "#FF4D4D"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: "700",
              color: "#FFFFFF",
              margin: "0 0 10px 0",
              fontFamily: "var(--font-outfit)",
              letterSpacing: "0.3px"
            }}>
              Invalid Birthday
            </h3>

            <p style={{
              fontSize: "0.92rem",
              color: "rgba(255, 255, 255, 0.8)",
              margin: "0 0 18px 0",
              fontFamily: "var(--font-outfit)",
              lineHeight: "1.55"
            }}>
              Heartist Portal is exclusively for participants aged 6 years old and above. Birthdays corresponding to ages 0 to 5 years old cannot be accepted.
            </p>

            <div style={{
              background: "rgba(255, 234, 0, 0.06)",
              border: "1px solid rgba(255, 234, 0, 0.2)",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "20px",
              width: "100%"
            }}>
              <p style={{
                fontSize: "0.78rem",
                color: "var(--canary-yellow)",
                margin: 0,
                lineHeight: "1.4",
                fontFamily: "var(--font-outfit)"
              }}>
                Please select a valid birth date to proceed with updating your profile.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowInvalidBirthdayModal(false)}
              className="glow-button-yellow"
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--neon-yellow)",
                color: "#000000",
                border: "none",
                borderRadius: "8px",
                fontFamily: "var(--font-outfit)",
                fontWeight: "700",
                fontSize: "0.95rem",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
