"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import { supabase, createEphemeralClient } from "@/lib/supabase";
import { fetchSystemSetting } from "@/lib/fusionSync";
import CustomDropdown from "@/components/CustomDropdown";
import BadgeIcon, { getBadgeDefinition } from "@/components/BadgeIcon";

const DEFAULT_AVATAR = "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg";
const ROLES = [
  { id: "first-timer", title: "First-timer", label: "First-timer", color: "#22C55E" },
  { id: "camp-veteran", title: "Camp Veteran", label: "Camp Veteran", color: "#F59E0B" },
  { id: "supporter", title: "Supporter", label: "Supporter", color: "#EC4899" },
];

const PasswordEye = ({ show }: { show: boolean }) => (
  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
    {show ? (
      <svg 
        width="19" 
        height="19" 
        viewBox="0 0 24 24" 
        fill="#FFE600" 
        style={{ 
          filter: "drop-shadow(0 0 5px #FFE600) drop-shadow(0 0 10px rgba(255, 230, 0, 0.75))", 
          transition: "all 0.3s ease" 
        }}
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ) : (
      <svg 
        width="19" 
        height="19" 
        viewBox="0 0 24 24" 
        fill="#8E8E93" 
        style={{ 
          filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))", 
          transition: "all 0.3s ease" 
        }}
      >
        {/* Left half with jagged crack */}
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09l-1.8 3.5 3.2 2-2.5 3.5 1.5 2.5L12 21.35z"/>
        {/* Right half with jagged crack */}
        <path d="M12.8 5.09C13.89 3.81 15.56 3 17.3 3 20.38 3 22.8 5.42 22.8 8.5c0 3.78-3.4 6.86-8.55 11.54L12.8 21.35l1.2-3.15-1.5-2.5 2.5-3.5-3.2-2 1-3.11z"/>
      </svg>
    )}
  </span>
);

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

import { formatCapitalizedName, formatFullName } from "@/utils/formatName";
import { validatePasswordStrength } from "@/utils/passwordValidation";
export { formatCapitalizedName };

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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
  const [changeEmailStep, setChangeEmailStep] = useState<"auth" | "new_email" | "verify">("auth");
  const [changeCurrentEmail, setChangeCurrentEmail] = useState("");
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
    let timer: any = null;
    if (showForgotPwdModal && forgotStep === "verify") {
      timer = setInterval(() => {
        setForgotCodeExpiry((prev) => (prev > 0 ? prev - 1 : 0));
        setForgotResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showForgotPwdModal, forgotStep]);

  useEffect(() => {
    let timer: any = null;
    if (showChangeEmailModal && changeEmailStep === "verify") {
      timer = setInterval(() => {
        setChangeEmailCodeExpiry((prev) => (prev > 0 ? prev - 1 : 0));
        setChangeEmailResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showChangeEmailModal, changeEmailStep]);

  useEffect(() => {
    const saved = localStorage.getItem("registeredAccounts");
    if (saved) {
      setAccounts(JSON.parse(saved));
    }
    if (typeof window !== "undefined") {
      const savedRemember = localStorage.getItem("heartistRememberMe");
      const savedEmail = localStorage.getItem("heartistRememberMeEmail");
      if (savedRemember === "true" && savedEmail) {
        setRememberMe(true);
        setLoginIdentifier(savedEmail);
      }
    }
  }, []);
  
  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Register fields
  const [isAdminInvite, setIsAdminInvite] = useState(false);
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

  // Password strength validations
  const regPassValidation = validatePasswordStrength(regPassword);
  const forgotPassValidation = validatePasswordStrength(forgotNewPassword);

  // Age eligibility: Prohibit ages 0-5
  const regComputedAge = regBirthDate ? calculateAge(regBirthDate) : 0;
  const isAgeProhibited = regBirthDate ? regComputedAge <= 5 : false;

  const isRegisterDisabled = 
    isRegistering || 
    isRegisterFormIncomplete || 
    isAgeProhibited ||
    !agreeToTerms ||
    !regPassValidation.isValid ||
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
      const inviteParam = params.get("invite");
      const emailParam = params.get("email");
      if (inviteParam === "admin") {
        setIsAdminInvite(true);
        setActiveTab("register");
        if (emailParam) {
          setRegEmail(decodeURIComponent(emailParam));
        }
      }
    }
  }, []);

  const createProfileIfNotExists = async (user: any) => {
    let adminEmails = await fetchSystemSetting("admin_emails");
    if (typeof adminEmails === "string") {
      try { adminEmails = JSON.parse(adminEmails); } catch(e) {}
    }
    if (!Array.isArray(adminEmails)) adminEmails = ["heartistrichford@gmail.com"];
    const isAdmin = adminEmails.includes(user.email);

    // Check if profile exists
    let { data: profileData } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profileData) {
      const meta = user.user_metadata || {};
      const isUserAdmin = isAdmin || meta.badge === "Admin";
      const newProfile = {
        id: user.id,
        first_name: meta.first_name || (isUserAdmin ? "Admin" : ""),
        last_name: meta.last_name || "",
        email: user.email || "",
        age: meta.age || (meta.birth_date ? String(calculateAge(meta.birth_date)) : ""),
        birth_date: meta.birth_date || null,
        contact_number: meta.contact_number || "",
        badge: isUserAdmin ? "Admin" : (meta.badge || "first-timer"),
        avatar_url: meta.avatar_url || DEFAULT_AVATAR
      };

      const { data: insertedProfile, error: insertError } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating initial profile:", insertError);
      }

      if (!isUserAdmin) {
        try {
          const { data: currSetting } = await supabase
            .from("system_settings")
            .select("value")
            .eq("id", "user_default_badges")
            .maybeSingle();
          const currMap = (currSetting?.value && typeof currSetting.value === "object") ? currSetting.value : {};
          currMap[user.id] = meta.badge || "first-timer";
          await supabase.from("system_settings").upsert({
            id: "user_default_badges",
            value: currMap,
            updated_at: new Date().toISOString()
          });
        } catch(e) {}
      }

      return insertedProfile;
    }
    return profileData;
  };

  const processPostLogin = async (user: any) => {
    let adminEmails = await fetchSystemSetting("admin_emails");
    if (typeof adminEmails === "string") {
      try { adminEmails = JSON.parse(adminEmails); } catch(e) {}
    }
    if (!Array.isArray(adminEmails)) adminEmails = ["heartistrichford@gmail.com"];
    const isAdmin = adminEmails.includes(user.email);

    // Ensure profile exists in database
    await createProfileIfNotExists(user);

    // Fetch full profile
    let { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    if (!profileData) {
      setError("Unable to load profile. Please try logging in again.");
      return;
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
      await supabase.from("profiles").update({ badge: "Admin" }).eq("id", profileData.id);
      profileData.badge = "Admin";
    }

    // Keep localStorage activeUser for now as a cache to ease migration of other components
    const userObj = {
      id: profileData.id,
      avatar: profileData.avatar_url,
      firstName: formatCapitalizedName(profileData.first_name),
      middleName: formatCapitalizedName(profileData.middle_name || user.user_metadata?.middle_name || ""),
      lastName: formatCapitalizedName(profileData.last_name),
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
      
      // If it doesn't look like an email, assume it's a first name / username
      if (!emailToUse.includes("@")) {
        // Validation: Username / First Name must start with a Capital letter (Big Letter).
        // Reject if user entered small letter.
        const words = emailToUse.split(/\s+/).filter(Boolean);
        const hasSmallStart = words.some(w => /^[a-zñ]/.test(w));
        
        if (hasSmallStart) {
          setError("Username / First Name must start with a Capital letter (Big Letter, halimbawa: 'Richford'). Hindi tinatanggap ang small letters.");
          return;
        }

        const inputName = emailToUse;
        const candidateEmails: string[] = [];

        // 1. Exact match on first_name (e.g. "John Richford" or "John")
        const { data: exactMatches } = await supabase
          .from("profiles")
          .select("email, first_name")
          .ilike("first_name", inputName);

        if (exactMatches) {
          for (const m of exactMatches) {
            if (m.email && !candidateEmails.includes(m.email)) {
              candidateEmails.push(m.email);
            }
          }
        }

        // 2. Prefix match if user typed single word (e.g. "John" while registered as "John Richford")
        if (!inputName.includes(" ")) {
          const { data: prefixMatches } = await supabase
            .from("profiles")
            .select("email, first_name")
            .ilike("first_name", `${inputName} %`);

          if (prefixMatches) {
            for (const m of prefixMatches) {
              if (m.email && !candidateEmails.includes(m.email)) {
                candidateEmails.push(m.email);
              }
            }
          }
        }

        // 3. Fallback: Check if user typed full name (e.g. "John Richford Lozano")
        const nameParts = inputName.split(/\s+/);
        if (nameParts.length >= 2) {
          const possibleFirst = nameParts.slice(0, -1).join(" ");
          const possibleLast = nameParts[nameParts.length - 1];
          const { data: fullProfiles } = await supabase
            .from("profiles")
            .select("email, first_name, last_name")
            .ilike("first_name", possibleFirst)
            .ilike("last_name", possibleLast);

          if (fullProfiles) {
            for (const m of fullProfiles) {
              if (m.email && !candidateEmails.includes(m.email)) {
                candidateEmails.push(m.email);
              }
            }
          }
        }

        if (candidateEmails.length === 0) {
          setError("User not found with that First Name or Name.");
          return;
        }

        // Authenticate candidate profiles in parallel using ephemeral client to identify correct account
        const authResults = await Promise.all(
          candidateEmails.map(async (candEmail) => {
            try {
              const ephem = createEphemeralClient();
              const { data: testAuth, error: testAuthError } = await ephem.auth.signInWithPassword({
                email: candEmail,
                password: loginPassword,
              });
              if (testAuth?.user && !testAuthError) {
                return candEmail;
              }
            } catch (e) {}
            return null;
          })
        );

        const matchedEmails = authResults.filter((e): e is string => Boolean(e));

        if (matchedEmails.length === 0) {
          setError("Account not found or incorrect password.");
          return;
        }

        if (matchedEmails.length > 1) {
          setError("Multiple accounts detected with this name and password. Please log in using your registered email address.");
          return;
        }

        emailToUse = matchedEmails[0];
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password: loginPassword,
      });

      if (authError) throw authError;

      if (data.user) {
        if (rememberMe) {
          localStorage.setItem("heartistRememberMe", "true");
          localStorage.setItem("heartistRememberMeEmail", loginIdentifier.trim());
        } else {
          localStorage.removeItem("heartistRememberMe");
          localStorage.removeItem("heartistRememberMeEmail");
        }
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

    const computedAge = calculateAge(regBirthDate);
    if (computedAge <= 5) {
      setError("Registration is restricted to participants aged 6 and above. Children aged 0–5 are not eligible.");
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

    const regPassCheck = validatePasswordStrength(regPassword);
    if (!regPassCheck.isValid) {
      setError(regPassCheck.errorMessage);
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
        if (!isAdminInvite) {
          setError("This email is reserved for administrators. Please use the Admin Invite Link to register.");
          return;
        }
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

      // First Come, First Served policy for duplicate First Names:
      // Verify if any existing user with the same First Name already uses this exact password.
      const formattedRegFirst = formatCapitalizedName(regFirstName.trim());
      const candidateCheckEmails: string[] = [];

      // 1. Exact match on first_name
      const { data: nameMatches } = await supabase
        .from("profiles")
        .select("email, first_name")
        .ilike("first_name", formattedRegFirst);

      if (nameMatches) {
        for (const m of nameMatches) {
          if (m.email && m.email.toLowerCase() !== regEmail.trim().toLowerCase() && !candidateCheckEmails.includes(m.email)) {
            candidateCheckEmails.push(m.email);
          }
        }
      }

      // 2. Prefix match if single-word first name (e.g. registering "John" while "John Richford" exists)
      if (!formattedRegFirst.includes(" ")) {
        const { data: prefixMatches } = await supabase
          .from("profiles")
          .select("email, first_name")
          .ilike("first_name", `${formattedRegFirst} %`);

        if (prefixMatches) {
          for (const m of prefixMatches) {
            if (m.email && m.email.toLowerCase() !== regEmail.trim().toLowerCase() && !candidateCheckEmails.includes(m.email)) {
              candidateCheckEmails.push(m.email);
            }
          }
        }
      } else {
        // Multi-word first name (e.g. registering "John Richford" while "John" exists)
        const firstWord = formattedRegFirst.split(/\s+/)[0];
        const { data: firstWordMatches } = await supabase
          .from("profiles")
          .select("email, first_name")
          .ilike("first_name", firstWord);

        if (firstWordMatches) {
          for (const m of firstWordMatches) {
            if (m.email && m.email.toLowerCase() !== regEmail.trim().toLowerCase() && !candidateCheckEmails.includes(m.email)) {
              candidateCheckEmails.push(m.email);
            }
          }
        }
      }

      if (candidateCheckEmails.length > 0) {
        const conflictResults = await Promise.all(
          candidateCheckEmails.map(async (candEmail) => {
            try {
              const ephem = createEphemeralClient();
              const { data: testAuth, error: testAuthError } = await ephem.auth.signInWithPassword({
                email: candEmail,
                password: regPassword,
              });
              return Boolean(testAuth?.user && !testAuthError);
            } catch (e) {
              return false;
            }
          })
        );

        if (conflictResults.some(Boolean)) {
          setError("Your password is invalid. Please change your password.");
          return;
        }
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
            badge: isAdminInvite ? "Admin" : regBadge,
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
    setMessage("");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: regEmail.trim(),
        token: verificationCode,
        type: 'signup'
      });

      if (verifyError) throw verifyError;

      if (data.user) {
        if (isAdminInvite || data.user.user_metadata?.badge === "Admin") {
          const { saveSystemSetting } = await import("@/lib/fusionSync");
          let adminEmails = await fetchSystemSetting("admin_emails");
          if (typeof adminEmails === "string") {
            try { adminEmails = JSON.parse(adminEmails); } catch(e) {}
          }
          if (!Array.isArray(adminEmails)) adminEmails = ["heartistrichford@gmail.com"];
          const vEmail = data.user.email || regEmail.trim();
          if (!adminEmails.includes(vEmail)) {
            adminEmails.push(vEmail);
            await saveSystemSetting("admin_emails", adminEmails);
          }
        }
        // Ensure user profile is recorded in PostgreSQL profiles table
        await createProfileIfNotExists(data.user);
      }

      // Explicitly sign out so user is not automatically logged in
      await supabase.auth.signOut();
      localStorage.removeItem("isHeartistLoggedIn");
      localStorage.removeItem("activeUser");
      localStorage.removeItem("isAdminLoggedIn");

      // Pre-fill email in Login tab for a seamless experience
      const verifiedEmail = regEmail.trim();
      setLoginIdentifier(verifiedEmail);
      setLoginPassword("");
      setVerificationCode("");
      setCodeExpiry(0);
      setResendCooldown(0);

      // Open the Successfully Registered pop-up modal
      setShowSuccessModal(true);
      setError("");
      setMessage("");
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
      setForgotError(err.message || "Failed to send reset code. Please verify the email and try again.");
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

    const forgotPassCheck = validatePasswordStrength(forgotNewPassword);
    if (!forgotPassCheck.isValid) {
      setForgotError(forgotPassCheck.errorMessage);
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setIsForgotLoading(true);
    setForgotError("");
    try {
      // 1. Verify OTP token for recovery
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: code,
        type: "recovery"
      });

      if (verifyError) throw verifyError;

      // Check conflict for new password against other users with the same First Name
      if (verifyData?.user) {
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", verifyData.user.id)
          .maybeSingle();

        const myFirstName = myProfile?.first_name || verifyData.user.user_metadata?.first_name;
        if (myFirstName) {
          const formattedMyFirst = formatCapitalizedName(myFirstName.trim());
          const { data: conflictProfiles } = await supabase
            .from("profiles")
            .select("email")
            .ilike("first_name", formattedMyFirst);

          const candidateResetEmails = (conflictProfiles || [])
            .map((p) => p.email)
            .filter((e) => e && e.toLowerCase() !== forgotEmail.trim().toLowerCase());

          if (candidateResetEmails.length > 0) {
            const conflictResults = await Promise.all(
              candidateResetEmails.map(async (candEmail) => {
                try {
                  const ephem = createEphemeralClient();
                  const { data: testAuth, error: testAuthError } = await ephem.auth.signInWithPassword({
                    email: candEmail,
                    password: forgotNewPassword,
                  });
                  return Boolean(testAuth?.user && !testAuthError);
                } catch (e) {
                  return false;
                }
              })
            );

            if (conflictResults.some(Boolean)) {
              setForgotError("Your password is invalid. Please change your password.");
              return;
            }
          }
        }
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: forgotNewPassword
      });

      if (updateError) throw updateError;

      // 3. Clean up session and close modal
      await supabase.auth.signOut();
      localStorage.removeItem("isHeartistLoggedIn");
      localStorage.removeItem("activeUser");
      localStorage.removeItem("isAdminLoggedIn");

      setShowForgotPwdModal(false);
      setForgotStep("request");
      setLoginIdentifier(forgotEmail.trim());
      setLoginPassword("");
      setMessage("Password successfully reset with OTP! Please log in with your new password.");
      setError("");
    } catch (err: any) {
      setForgotError(err.message || "Invalid or expired OTP code. Please try requesting a new one.");
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Step 1: Verify current registered credentials with delay and strict First Name prohibition
  const handleVerifyCurrentCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangeEmailLoading) return;
    setChangeEmailError("");
    setChangeEmailMessage("");

    const currentEmail = changeCurrentEmail.trim();
    const currentPwd = changeCurrentPassword;

    if (!currentEmail || !currentPwd) {
      setChangeEmailError("Please enter your current registered email and password.");
      return;
    }

    // Strict validation: prohibit First Name. Must be a valid email format.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!currentEmail.includes("@") || !currentEmail.includes(".") || currentEmail.includes(" ") || !emailRegex.test(currentEmail)) {
      setChangeEmailError("First Name is prohibited. Please enter your valid registered email address.");
      return;
    }

    setIsChangeEmailLoading(true);
    try {
      // Intentional delay before transition for natural security check feedback
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Authenticate with current email & password
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: currentPwd
      });

      if (authError || !authData.user) {
        setChangeEmailError("Incorrect email or password. Please verify your credentials.");
        return;
      }

      // On successful verification, advance to Step 2 (enter new email)
      setChangeEmailStep("new_email");
      setChangeEmailMessage("Account credentials verified. Please enter your new email address.");
    } catch (err: any) {
      setChangeEmailError(err.message || "Failed to verify credentials. Please try again.");
    } finally {
      setIsChangeEmailLoading(false);
    }
  };

  // Step 2: Send OTP to New Email Address
  const handleSendOtpToNewEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangeEmailLoading) return;
    setChangeEmailError("");
    setChangeEmailMessage("");

    const currentEmail = changeCurrentEmail.trim().toLowerCase();
    const newEmail = changeNewEmail.trim().toLowerCase();

    if (!newEmail) {
      setChangeEmailError("Please enter your new email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setChangeEmailError("Please enter a valid new email address.");
      return;
    }

    if (currentEmail === newEmail) {
      setChangeEmailError("The new email address cannot be the same as your current email.");
      return;
    }

    setIsChangeEmailLoading(true);
    try {
      // Check if new email is already registered to another account
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newEmail)
        .maybeSingle();

      if (existingProfile) {
        setChangeEmailError("This new email address is already registered to another account.");
        return;
      }

      // Trigger Supabase Auth to send OTP code to the new email
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
      const msg = err.message || "Failed to send OTP to new email. Please try again.";
      if (/rate limit|rate exceeded|too many requests/i.test(msg)) {
        setChangeEmailError("Email rate limit reached. Please wait a few minutes before requesting another code.");
      } else {
        setChangeEmailError(msg);
      }
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

      // 1. Verify OTP with Supabase Auth for email_change
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: newEmail,
        token: code,
        type: "email_change"
      });

      if (verifyError) throw verifyError;

      // 2. Update email in PostgreSQL profiles table
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ email: newEmail })
          .eq("id", data.user.id);
      }

      // 3. Sign out cleanly
      await supabase.auth.signOut();
      localStorage.removeItem("isHeartistLoggedIn");
      localStorage.removeItem("activeUser");
      localStorage.removeItem("isAdminLoggedIn");

      setShowChangeEmailModal(false);
      setChangeEmailStep("auth");
      setLoginIdentifier(newEmail);
      setLoginPassword("");
      setMessage("Email address successfully verified & updated with OTP! Please log in with your new email.");
      setError("");
    } catch (err: any) {
      setChangeEmailError(err.message || "Invalid or expired OTP code. Please check the code and try again.");
    } finally {
      setIsChangeEmailLoading(false);
    }
  };

  return (
    <main className="main-container" style={{ padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      {/* Top-Left Back Button (Pure SVG Icon, Fixed to Screen Top-Left, Navigates to Main Home) */}
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

      <HeartistLogo className="animated-glow-text" width={60} height={60} />
      <h1 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "20px", marginBottom: "30px", textTransform: "uppercase" }}>
        Heartist Portal
      </h1>
      
      <div style={{ 
        width: "100%", 
        maxWidth: "450px", 
        padding: "0", 
        background: "rgba(16, 16, 22, 0.85)", 
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "16px",
        border: "1px solid rgba(255, 255, 255, 0.16)", 
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column" 
      }}>
        
        {/* Tabs / Header */}
        {activeTab === "verify" ? (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between", 
            padding: "16px 24px", 
            borderBottom: "1px solid rgba(255,255,255,0.12)", 
            background: "rgba(255,255,255,0.03)" 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--neon-yellow)" }}></span>
              <span style={{ color: "#ffffff", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "0.95rem", letterSpacing: "1px" }}>
                EMAIL VERIFICATION
              </span>
            </div>
            <button
              type="button"
              onClick={() => { setActiveTab("register"); setError(""); setMessage(""); }}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline", fontFamily: "var(--font-outfit)" }}
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
                background: activeTab === "login" ? "rgba(255,255,255,0.05)" : "transparent",
                color: activeTab === "login" ? "#ffffff" : "rgba(255,255,255,0.5)",
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
                background: activeTab === "register" ? "rgba(255,255,255,0.05)" : "transparent",
                color: activeTab === "register" ? "#ffffff" : "rgba(255,255,255,0.5)",
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
                background: "rgba(255, 255, 255, 0.04)", 
                border: "1px solid rgba(255, 255, 255, 0.12)", 
                borderRadius: "12px", 
                padding: "18px 16px", 
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ fontSize: "0.78rem", color: "#ffffff", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: "bold" }}>
                    Verification Code Sent
                  </span>
                  <span style={{ 
                    fontSize: "0.78rem", 
                    color: codeExpiry === 0 ? "#FF6B6B" : "#ffffff", 
                    fontFamily: "monospace, var(--font-outfit)", 
                    fontWeight: "bold",
                    background: "rgba(255, 255, 255, 0.08)",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    border: codeExpiry === 0 ? "1px solid rgba(255, 107, 107, 0.4)" : "1px solid rgba(255, 255, 255, 0.15)"
                  }}>
                    {codeExpiry > 0 ? (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: "normal" }}>Expires: </span>
                        <span style={{ color: "var(--neon-yellow)", fontWeight: "bold" }}>
                          {Math.floor(codeExpiry / 60).toString().padStart(2, "0")}:{(codeExpiry % 60).toString().padStart(2, "0")}
                        </span>
                      </>
                    ) : (
                      "Expired"
                    )}
                  </span>
                </div>

                <p style={{ color: "#ffffff", fontSize: "1.05rem", margin: 0, wordBreak: "break-all", fontFamily: "var(--font-outfit)", fontWeight: "bold" }}>
                  {regEmail}
                </p>
                <p style={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "0.82rem", margin: "2px 0 0 0", lineHeight: "1.4" }}>
                  {codeExpiry > 0 
                    ? "Please check your inbox (and spam folder) for the 6-digit code."
                    : "The 6-digit code has expired. Check the resend box below to request a new code."
                  }
                </p>
              </div>

              {/* 6-Digit Code Input */}
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <label style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-outfit)", fontWeight: "500" }}>
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
                    maxWidth: "280px",
                    textAlign: "center", 
                    letterSpacing: "12px", 
                    padding: "13px 10px", 
                    borderRadius: "10px", 
                    background: codeExpiry === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.6)", 
                    border: codeExpiry === 0 
                      ? "1px solid rgba(255,107,107,0.3)" 
                      : verificationCode.length === 6 
                        ? "1.5px solid var(--neon-yellow)" 
                        : "1px solid rgba(255,255,255,0.3)", 
                    color: codeExpiry === 0 ? "#FF6B6B" : "#ffffff", 
                    outline: "none", 
                    fontFamily: "monospace, var(--font-outfit)", 
                    fontSize: "1.85rem", 
                    fontWeight: "bold",
                    boxShadow: verificationCode.length === 6 && codeExpiry > 0 ? "0 0 12px rgba(255, 234, 0, 0.2)" : "none",
                    transition: "all 0.2s"
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
                  color: "rgba(255, 255, 255, 0.9)",
                  fontFamily: "var(--font-outfit)"
                }}>
                  Didn&apos;t get a code?
                </span>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendOtp}
                  style={{
                    background: resendCooldown > 0 || isResending ? "rgba(255, 255, 255, 0.05)" : "transparent",
                    border: resendCooldown > 0 || isResending ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.35)",
                    borderRadius: "6px",
                    padding: "7px 14px",
                    color: resendCooldown > 0 || isResending ? "rgba(255,255,255,0.4)" : "#ffffff",
                    fontSize: "0.82rem",
                    fontFamily: "var(--font-outfit)",
                    fontWeight: "bold",
                    cursor: resendCooldown > 0 || isResending ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                  onMouseEnter={(e) => {
                    if (resendCooldown === 0 && !isResending) {
                      e.currentTarget.style.borderColor = "var(--neon-yellow)";
                      e.currentTarget.style.color = "var(--neon-yellow)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (resendCooldown === 0 && !isResending) {
                      e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.35)";
                      e.currentTarget.style.color = "#ffffff";
                    }
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
                style={{ 
                  width: "100%",
                  padding: "14px", 
                  background: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "var(--neon-yellow)" : "rgba(255,255,255,0.05)", 
                  color: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "#000000" : "rgba(255,255,255,0.3)", 
                  border: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.12)", 
                  borderRadius: "8px", 
                  fontFamily: "var(--font-outfit)", 
                  fontWeight: "bold", 
                  fontSize: "1rem", 
                  cursor: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? "pointer" : "not-allowed", 
                  opacity: verificationCode.length === 6 && !isVerifying && codeExpiry > 0 ? 1 : 0.6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                  boxShadow: "none"
                }}
              >
                {isVerifying && <span className="heartist-spinner" style={{ borderColor: "rgba(0,0,0,0.2)", borderTopColor: "#000" }} />}
                {isVerifying 
                  ? "Verifying Code..." 
                  : codeExpiry === 0 
                    ? "Code Expired - Please Resend" 
                    : "Verify Email"}
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
                  color: "rgba(255,255,255,0.7)", 
                  cursor: "pointer", 
                  textDecoration: "underline", 
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-outfit)",
                  marginTop: "-5px",
                  transition: "color 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#ffffff"}
                onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
              >
                Wrong email? Go back to edit
              </button>
            </form>
          ) : activeTab === "login" ? (
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Email / First Name field with lower-right Change Email? */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <input 
                  type="text" 
                  placeholder="Email or First Name" 
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px", paddingRight: "2px" }}>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowChangeEmailModal(true);
                      setChangeEmailStep("auth");
                      setChangeEmailError("");
                      setChangeEmailMessage("");
                      if (loginIdentifier.includes("@") && loginIdentifier.includes(".")) {
                        setChangeCurrentEmail(loginIdentifier.trim());
                      } else {
                        setChangeCurrentEmail("");
                      }
                      setChangeCurrentPassword("");
                      setChangeNewEmail("");
                      setChangeEmailCode("");
                    }} 
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: "var(--text-muted)", 
                      fontSize: "0.8rem", 
                      cursor: "pointer", 
                      textDecoration: "underline", 
                      padding: "2px 0", 
                      fontFamily: "var(--font-outfit)",
                      transition: "color 0.2s"
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "var(--neon-yellow)")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    Change Email?
                  </button>
                </div>
              </div>

              {/* Password field with lower-right Forgot Password? and Remember Me checkbox */}
              <div style={{ display: "flex", flexDirection: "column" }}>
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
                    <PasswordEye show={showLoginPwd} />
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px", padding: "0 2px" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: "7px", cursor: "pointer", fontSize: "0.82rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)", userSelect: "none" }}>
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ 
                        width: "16px", 
                        height: "16px", 
                        cursor: "pointer", 
                        accentColor: "var(--neon-yellow)" 
                      }}
                    />
                    Remember Me
                  </label>

                  <button 
                    type="button" 
                    onClick={() => {
                      setShowForgotPwdModal(true);
                      setForgotError("");
                      setForgotMessage("");
                      setForgotStep("request");
                      setForgotEmail(loginIdentifier.includes("@") ? loginIdentifier : "");
                      setForgotCode("");
                      setForgotNewPassword("");
                      setForgotConfirmPassword("");
                    }} 
                    style={{ 
                      background: "none", 
                      border: "none", 
                      color: "var(--neon-yellow)", 
                      fontSize: "0.8rem", 
                      cursor: "pointer", 
                      textDecoration: "underline", 
                      padding: "2px 0", 
                      fontFamily: "var(--font-outfit)" 
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
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
              {/* Official Admin Invitation Banner */}
              {isAdminInvite && (
                <div style={{ 
                  padding: "16px", 
                  borderRadius: "10px", 
                  background: "rgba(255, 234, 0, 0.08)", 
                  border: "1px solid var(--neon-yellow)", 
                  display: "flex", 
                  alignItems: "flex-start", 
                  gap: "12px",
                  boxShadow: "0 0 15px rgba(255, 234, 0, 0.15)"
                }}>
                  <div style={{ color: "var(--neon-yellow)", flexShrink: 0, marginTop: "2px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ margin: 0, color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", fontSize: "1.05rem" }}>
                      Administrator Invitation
                    </h4>
                    <p style={{ margin: "4px 0 0 0", color: "var(--neon-white)", fontSize: "0.85rem", lineHeight: "1.4" }}>
                      You have been invited as an Administrator. Please fill out your details below to create your official Admin account.
                    </p>
                  </div>
                </div>
              )}
              
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

              {/* Birthday and Contact Number (Balanced Responsive Grid) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", width: "100%" }}>
                {/* Birthday Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)", textAlign: "left" }}>
                      Birthday
                    </label>
                    {regBirthDate && (
                      <span style={{ 
                        fontSize: "0.72rem", 
                        color: isAgeProhibited ? "#FF4D4D" : "var(--neon-yellow)", 
                        fontWeight: "bold", 
                        fontFamily: "var(--font-outfit)" 
                      }}>
                        {regComputedAge} yrs old {isAgeProhibited && "(Ages 6+ only)"}
                      </span>
                    )}
                  </div>
                  <input 
                    type="date" 
                    title="Birthday"
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    style={{ 
                      width: "100%", 
                      height: "44px", 
                      minHeight: "44px",
                      maxHeight: "44px",
                      boxSizing: "border-box", 
                      padding: "8px 14px", 
                      borderRadius: "8px", 
                      background: "rgba(0,0,0,0.5)", 
                      border: isAgeProhibited ? "1px solid #FF4D4D" : "1px solid rgba(255,255,255,0.2)", 
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
                  {isAgeProhibited && (
                    <span style={{ fontSize: "0.72rem", color: "#FF6B6B", fontFamily: "var(--font-outfit)", marginTop: "1px" }}>
                      Must be at least 6 years old to register.
                    </span>
                  )}
                </div>

                {/* Contact Number Field */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0, textAlign: "left" }}>
                  <label style={{ fontSize: "0.8rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)", textAlign: "left" }}>
                    Contact Number (Optional)
                  </label>
                  <input 
                    type="tel" 
                    placeholder="Optional" 
                    value={regContact}
                    onChange={(e) => setRegContact(e.target.value.replace(/[^0-9+\-\s]/g, '').slice(0, 16))}
                    style={{ 
                      width: "100%", 
                      height: "44px", 
                      minHeight: "44px",
                      maxHeight: "44px",
                      boxSizing: "border-box", 
                      padding: "8px 14px", 
                      borderRadius: "8px", 
                      background: "rgba(0,0,0,0.5)", 
                      border: "1px solid rgba(255,255,255,0.2)", 
                      color: "white", 
                      outline: "none", 
                      fontFamily: "var(--font-outfit)", 
                      fontSize: "0.95rem" 
                    }}
                  />
                </div>
              </div>

              <input 
                type="email" 
                placeholder="Email Address" 
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                style={{ width: "100%", padding: "12px 15px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "1rem" }}
              />

              {/* Camper Badge / Admin Role Section */}
              {isAdminInvite ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                    Assigned Role
                  </label>
                  <div style={{
                    padding: "12px 15px",
                    borderRadius: "8px",
                    background: "rgba(255, 234, 0, 0.08)",
                    border: "1px solid var(--neon-yellow)",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    color: "var(--neon-yellow)",
                    fontWeight: "bold",
                    fontFamily: "var(--font-outfit)",
                    fontSize: "0.95rem"
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    <span>Administrator</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--canary-yellow)", margin: "2px 0 0 4px", fontStyle: "italic" }}>
                    Official role assigned via administrator invite.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.85rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)" }}>
                    Select Badge
                  </label>
                  <CustomDropdown 
                    options={ROLES.map(r => ({
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
                    onChange={(val) => setRegBadge(val)}
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--canary-yellow)", margin: "4px 0 2px 4px", fontStyle: "italic", lineHeight: "1.3" }}>
                    {regBadge === "first-timer" && "For those joining our camps or events for the very first time."}
                    {regBadge === "camp-veteran" && "For seasoned campers who have attended past Fusion Camps."}
                    {regBadge === "supporter" && "For parents, sponsors, or friends actively supporting the youth."}
                  </p>
                </div>
              )}
              
              {/* Create Password */}
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input 
                  type={showRegPwd ? "text" : "password"} 
                  placeholder="Create Strong Password (min. 8 chars)" 
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
                  <PasswordEye show={showRegPwd} />
                </button>
              </div>

              {/* Live Password Strength Criteria */}
              {regPassword.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "6px",
                  background: "rgba(0,0,0,0.35)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginTop: "-4px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: regPassValidation.criteria.hasMinLength ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                    {regPassValidation.criteria.hasMinLength ? <CriteriaCheck /> : <CriteriaDot />}
                    <span>8+ characters</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: regPassValidation.criteria.hasUpper ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                    {regPassValidation.criteria.hasUpper ? <CriteriaCheck /> : <CriteriaDot />}
                    <span>Big letter (A-Z)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: regPassValidation.criteria.hasLower ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                    {regPassValidation.criteria.hasLower ? <CriteriaCheck /> : <CriteriaDot />}
                    <span>Small letter (a-z)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: regPassValidation.criteria.hasNumber ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                    {regPassValidation.criteria.hasNumber ? <CriteriaCheck /> : <CriteriaDot />}
                    <span>Number (0-9)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: regPassValidation.criteria.hasUniqueKey ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                    {regPassValidation.criteria.hasUniqueKey ? <CriteriaCheck /> : <CriteriaDot />}
                    <span>Unique key (_, -, @, #)</span>
                  </div>
                </div>
              )}

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
                  <PasswordEye show={showRegConfirmPwd} />
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
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setAgreeToTerms(isChecked);
                    if (isChecked) {
                      setShowGuidelinesModal(true);
                    }
                  }}
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
                      : isAgeProhibited
                        ? "Ang registration ay para lamang sa edad 6 pataas (Ages 6+)."
                        : !regPassValidation.isValid
                          ? regPassValidation.errorMessage
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
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Intro */}
            <div style={{ background: "rgba(255, 234, 0, 0.05)", borderLeft: "3px solid var(--neon-yellow)", padding: "10px 14px", borderRadius: "0 8px 8px 0" }}>
              <p style={{ fontSize: "0.88rem", margin: 0, color: "var(--neon-white)", lineHeight: "1.5" }}>
                Welcome to <strong>Heartist</strong>! This portal was created to nurture our faith, inspire creative expression, and foster unity as followers of Christ.
              </p>
            </div>

            {/* Sections */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "0.88rem", lineHeight: "1.6", color: "#ddd" }}>
              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  01. Christ-Centered & Safe Space
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Keep every interaction respectful, humble, and uplifting. Any form of bullying, harassment, defamation, foul language, or inappropriate conduct is strictly prohibited.
                </p>
              </div>

              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  02. Authentic & God-Honoring Creativity
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Share your artwork, devotions, and reflections with sincerity and honor to God. Respect the creative work of others, and refrain from posting inappropriate content or material that is not your own without permission.
                </p>
              </div>

              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  03. Peace, Prayer & Fellowship
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  The prayer wall and community spaces exist to encourage, support, and lift one another up in prayer. Keep all discussions peaceful, gracious, and uplifting.
                </p>
              </div>

              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  04. Privacy & Account Responsibility
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Safeguard your password and personal information. Respect the privacy and confidentiality of your fellow camp attendees, including their personal stories and prayer requests.
                </p>
              </div>

              <div>
                <h4 style={{ color: "var(--canary-yellow)", margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                  05. Age Eligibility (Ages 6 and Above)
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)" }}>
                  Heartist Portal is exclusively intended for participants aged 6 years old and above. Children aged 0 to 5 years old are strictly prohibited from creating or holding an independent account to uphold community safety and privacy protection.
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

      {/* Forgot Password Modal */}
      {showForgotPwdModal && (
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
          onClick={() => setShowForgotPwdModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "rgba(18, 18, 20, 0.98)",
              border: "1px solid var(--neon-yellow)",
              borderRadius: "16px",
              padding: "28px 24px",
              maxWidth: "460px",
              width: "100%",
              maxHeight: "90vh",
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
                <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", color: "var(--neon-yellow)", margin: "0 0 4px 0" }}>
                  Reset Password (OTP)
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  {forgotStep === "request" 
                    ? "Enter your registered email to receive a 6-digit OTP code."
                    : "Enter the OTP code and set your new password."}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowForgotPwdModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {forgotError && (
              <p style={{ color: "#FF6B6B", fontSize: "0.85rem", margin: 0, background: "rgba(255,107,107,0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,107,107,0.2)" }}>
                {forgotError}
              </p>
            )}
            {forgotMessage && (
              <p style={{ color: "#00FF80", fontSize: "0.85rem", margin: 0, background: "rgba(0,255,128,0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,255,128,0.2)" }}>
                {forgotMessage}
              </p>
            )}

            {forgotStep === "request" ? (
              <form onSubmit={handleRequestResetPassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Registered Email
                  </label>
                  <input 
                    type="email" 
                    placeholder="name@example.com" 
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isForgotLoading}
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
              <form onSubmit={handleVerifyAndSetNewPassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* OTP Info Box with Timer */}
                <div style={{
                  background: "rgba(255, 234, 0, 0.04)",
                  border: "1px solid rgba(255, 234, 0, 0.15)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--neon-yellow)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
                      OTP Code Sent
                    </span>
                    <span style={{
                      fontSize: "0.78rem",
                      color: forgotCodeExpiry === 0 ? "#FF6B6B" : forgotCodeExpiry <= 30 ? "#FFA500" : "var(--neon-yellow)",
                      fontFamily: "monospace, var(--font-outfit)",
                      fontWeight: "bold",
                      background: "rgba(0, 0, 0, 0.4)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: forgotCodeExpiry === 0 ? "1px solid rgba(255, 107, 107, 0.4)" : "1px solid rgba(255, 234, 0, 0.3)"
                    }}>
                      {forgotCodeExpiry > 0 
                        ? `Expires: ${Math.floor(forgotCodeExpiry / 60).toString().padStart(2, "0")}:${(forgotCodeExpiry % 60).toString().padStart(2, "0")}`
                        : "Expired"}
                    </span>
                  </div>
                  <p style={{ color: "#fff", fontSize: "0.9rem", margin: 0, fontWeight: "bold", wordBreak: "break-all" }}>
                    {forgotEmail}
                  </p>
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

                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    New Password (min. 8 chars, strong)
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type={showForgotNewPwd ? "text" : "password"} 
                      placeholder="Enter new password" 
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px 14px", paddingRight: "45px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowForgotNewPwd(!showForgotNewPwd)}
                      style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      <PasswordEye show={showForgotNewPwd} />
                    </button>
                  </div>

                  {/* Live Password Strength Criteria for Forgot Password */}
                  {forgotNewPassword.length > 0 && (
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
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: forgotPassValidation.criteria.hasMinLength ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {forgotPassValidation.criteria.hasMinLength ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>8+ characters</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: forgotPassValidation.criteria.hasUpper ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {forgotPassValidation.criteria.hasUpper ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>Big letter (A-Z)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: forgotPassValidation.criteria.hasLower ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {forgotPassValidation.criteria.hasLower ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>Small letter (a-z)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: forgotPassValidation.criteria.hasNumber ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {forgotPassValidation.criteria.hasNumber ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>Number (0-9)</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.74rem", color: forgotPassValidation.criteria.hasUniqueKey ? "#00FF88" : "rgba(255,255,255,0.4)" }}>
                        {forgotPassValidation.criteria.hasUniqueKey ? <CriteriaCheck /> : <CriteriaDot />}
                        <span>Unique key (_, -, @, #)</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    Confirm New Password
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input 
                      type={showForgotConfirmPwd ? "text" : "password"} 
                      placeholder="Confirm new password" 
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      required
                      style={{ width: "100%", padding: "12px 14px", paddingRight: "45px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword ? "1px solid #FF4D4D" : "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowForgotConfirmPwd(!showForgotConfirmPwd)}
                      style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      <PasswordEye show={showForgotConfirmPwd} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isForgotLoading || forgotCode.length !== 6 || !forgotPassValidation.isValid || forgotNewPassword !== forgotConfirmPassword || forgotCodeExpiry === 0}
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
                      cursor: (isForgotLoading || forgotCode.length !== 6 || !forgotPassValidation.isValid || forgotNewPassword !== forgotConfirmPassword || forgotCodeExpiry === 0) ? "not-allowed" : "pointer",
                      opacity: (forgotCode.length !== 6 || !forgotPassValidation.isValid || forgotNewPassword !== forgotConfirmPassword || forgotCodeExpiry === 0) ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isForgotLoading && <span className="heartist-spinner" style={{ borderColor: "#000", borderTopColor: "transparent" }} />}
                    {isForgotLoading ? "Verifying..." : "Verify OTP & Set Password"}
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

      {/* Change Email Address Modal with OTP */}
      {showChangeEmailModal && (
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
          onClick={() => setShowChangeEmailModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "rgba(18, 18, 20, 0.98)",
              border: "1px solid var(--neon-yellow)",
              borderRadius: "16px",
              padding: "28px 24px",
              maxWidth: "460px",
              width: "100%",
              maxHeight: "90vh",
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
                <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", color: "var(--neon-yellow)", margin: "0 0 4px 0" }}>
                  Change Email Address (OTP)
                </h2>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  {changeEmailStep === "auth"
                    ? "Step 1 of 3: Enter your registered email and password to verify your account."
                    : changeEmailStep === "new_email"
                    ? "Step 2 of 3: Enter your new email address to receive a 6-digit OTP."
                    : "Step 3 of 3: Enter the 6-digit OTP code sent to your new email."}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowChangeEmailModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Close"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Step Progress Bar */}
            <div style={{ display: "flex", gap: "6px", margin: "2px 0" }}>
              <div style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                backgroundColor: "var(--neon-yellow)",
                boxShadow: "0 0 8px rgba(255, 234, 0, 0.5)"
              }} />
              <div style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                backgroundColor: changeEmailStep === "new_email" || changeEmailStep === "verify" ? "var(--neon-yellow)" : "rgba(255, 255, 255, 0.15)",
                boxShadow: changeEmailStep === "new_email" || changeEmailStep === "verify" ? "0 0 8px rgba(255, 234, 0, 0.5)" : "none"
              }} />
              <div style={{
                flex: 1,
                height: "4px",
                borderRadius: "2px",
                backgroundColor: changeEmailStep === "verify" ? "var(--neon-yellow)" : "rgba(255, 255, 255, 0.15)",
                boxShadow: changeEmailStep === "verify" ? "0 0 8px rgba(255, 234, 0, 0.5)" : "none"
              }} />
            </div>

            {changeEmailError && (
              <p style={{ color: "#FF6B6B", fontSize: "0.85rem", margin: 0, background: "rgba(255,107,107,0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,107,107,0.2)" }}>
                {changeEmailError}
              </p>
            )}
            {changeEmailMessage && (
              <p style={{ color: "#00FF80", fontSize: "0.85rem", margin: 0, background: "rgba(0,255,128,0.1)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(0,255,128,0.2)" }}>
                {changeEmailMessage}
              </p>
            )}

            {/* STEP 1: Current Credentials Authentication */}
            {changeEmailStep === "auth" && (
              <form onSubmit={handleVerifyCurrentCredentials} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      Registered Email Address
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "#FF6B6B", fontWeight: 600 }}>
                      * Email only (No First Name)
                    </span>
                  </div>
                  <input 
                    type="email" 
                    placeholder="Enter your registered email address" 
                    value={changeCurrentEmail}
                    onChange={(e) => setChangeCurrentEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />
                </div>

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
                      style={{ width: "100%", padding: "12px 14px", paddingRight: "45px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowChangeCurrentPwd(!showChangeCurrentPwd)}
                      style={{ position: "absolute", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "1.1rem" }}
                    >
                      <PasswordEye show={showChangeCurrentPwd} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isChangeEmailLoading || !changeCurrentEmail.trim() || !changeCurrentPassword}
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
                    {isChangeEmailLoading ? "Verifying credentials..." : "Verify Credentials"}
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
            )}

            {/* STEP 2: Enter New Email Address */}
            {changeEmailStep === "new_email" && (
              <form onSubmit={handleSendOtpToNewEmail} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Verified Account Indicator */}
                <div style={{
                  background: "rgba(0, 255, 128, 0.06)",
                  border: "1px solid rgba(0, 255, 128, 0.25)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px"
                }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "0.72rem", color: "#00FF80", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Account Verified
                    </span>
                    <span style={{ fontSize: "0.88rem", color: "#fff", fontWeight: "bold" }}>
                      {changeCurrentEmail}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setChangeEmailStep("auth");
                      setChangeEmailError("");
                      setChangeEmailMessage("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      textDecoration: "underline",
                      cursor: "pointer"
                    }}
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                    New Email Address
                  </label>
                  <input 
                    type="email" 
                    placeholder="Enter your new email address (e.g. new@example.com)" 
                    value={changeNewEmail}
                    onChange={(e) => setChangeNewEmail(e.target.value)}
                    required
                    autoFocus
                    style={{ width: "100%", padding: "12px 14px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", fontSize: "0.95rem" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="submit"
                    disabled={isChangeEmailLoading || !changeNewEmail.trim()}
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
                    onClick={() => {
                      setChangeEmailStep("auth");
                      setChangeEmailError("");
                      setChangeEmailMessage("");
                    }}
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

            {/* STEP 3: Verify OTP sent to New Email */}
            {changeEmailStep === "verify" && (
              <form onSubmit={handleVerifyAndConfirmEmailChange} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* OTP Info Box with Timer */}
                <div style={{
                  background: "rgba(255, 234, 0, 0.04)",
                  border: "1px solid rgba(255, 234, 0, 0.15)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--neon-yellow)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold" }}>
                      OTP Code Sent to New Email
                    </span>
                    <span style={{
                      fontSize: "0.78rem",
                      color: changeEmailCodeExpiry === 0 ? "#FF6B6B" : changeEmailCodeExpiry <= 30 ? "#FFA500" : "var(--neon-yellow)",
                      fontFamily: "monospace, var(--font-outfit)",
                      fontWeight: "bold",
                      background: "rgba(0, 0, 0, 0.4)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: changeEmailCodeExpiry === 0 ? "1px solid rgba(255, 107, 107, 0.4)" : "1px solid rgba(255, 234, 0, 0.3)"
                    }}>
                      {changeEmailCodeExpiry > 0 
                        ? `Expires: ${Math.floor(changeEmailCodeExpiry / 60).toString().padStart(2, "0")}:${(changeEmailCodeExpiry % 60).toString().padStart(2, "0")}`
                        : "Expired"}
                    </span>
                  </div>
                  <p style={{ color: "#fff", fontSize: "0.9rem", margin: 0, fontWeight: "bold", wordBreak: "break-all" }}>
                    {changeNewEmail}
                  </p>
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
                    autoFocus
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
                    onClick={() => {
                      setChangeEmailStep("new_email");
                      setChangeEmailError("");
                      setChangeEmailMessage("");
                    }}
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

      {/* Successfully Registered Pop-up Modal */}
      {showSuccessModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "20px"
        }}>
          <div style={{
            background: "rgba(18, 18, 24, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "18px",
            maxWidth: "420px",
            width: "100%",
            padding: "32px 24px",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            {/* Green SVG Check Icon */}
            <div style={{
              width: "68px",
              height: "68px",
              borderRadius: "50%",
              background: "rgba(0, 255, 128, 0.12)",
              border: "2px solid #00FF80",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "18px"
            }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#00FF80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            {/* Title */}
            <h3 style={{
              margin: "0 0 10px 0",
              color: "#ffffff",
              fontFamily: "var(--font-outfit)",
              fontSize: "1.5rem",
              fontWeight: "900",
              letterSpacing: "0.5px"
            }}>
              Successfully Registered!
            </h3>

            {/* Subtitle / Description */}
            <p style={{
              margin: "0 0 20px 0",
              color: "rgba(255, 255, 255, 0.8)",
              fontSize: "0.92rem",
              lineHeight: "1.5",
              fontFamily: "var(--font-outfit)"
            }}>
              {isAdminInvite 
                ? "Napatunayan na ang iyong Administrator account. Maaari ka nang mag-log in gamit ang iyong email at password para mabuksan ang Admin Dashboard."
                : "Maligayang pagdating sa Heartist! Matagumpay nang na-verify ang iyong email address. Maaari ka nang mag-log in gamit ang iyong email at password."}
            </p>

            {/* Verified Email Card */}
            <div style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "24px"
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ color: "var(--neon-yellow)", fontWeight: "bold", fontSize: "0.9rem", fontFamily: "var(--font-outfit)" }}>
                {loginIdentifier || regEmail}
              </span>
            </div>

            {/* Proceed to Login Button */}
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                setActiveTab("login");
                if (isAdminInvite) {
                  setMessage("Administrator account verified! Please log in to access the Admin Dashboard.");
                } else {
                  setMessage("Account verified! Please enter your password to log in.");
                }
              }}
              style={{
                width: "100%",
                padding: "14px",
                background: "var(--neon-yellow)",
                color: "#000000",
                border: "none",
                borderRadius: "10px",
                fontFamily: "var(--font-outfit)",
                fontWeight: "900",
                fontSize: "1.05rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 4px 15px rgba(255, 234, 0, 0.25)"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              Proceed to Login
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
