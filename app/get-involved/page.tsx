"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown, { DropdownOption } from "@/components/CustomDropdown";
import { supabase } from "@/lib/supabase";
import { getCurrentUser, CurrentUser } from "@/lib/authHelper";
import { createNotification } from "@/lib/notificationsSync";

interface FormRecord {
  id: string;
  user_id: string | null;
  type: string;
  data: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    cellphone?: string;
    involvement?: string;
    message?: string;
    date?: string;
    receiptUrl?: string;
    receiptName?: string;
  };
  status?: string;
  created_at: string;
}

interface AdminResponseRecord {
  message: string;
  sentAt: string;
  adminName: string;
}

// Known dummy/test accounts to exclude from production view
const DUMMY_EMAILS = [
  "juan@example.com",
  "maria@example.com",
  "mark.reyes@example.com",
  "grace.lim@example.com"
];

const DEFAULT_EXCLUDED_IDS = [
  "babc7ac0-806b-4750-a410-496d9f092201",
  "5b4d3194-6499-4f18-901c-d60a4e24a3c7",
  "184bcede-37f8-47f6-8403-6274f82c6e40",
  "918949de-ebc2-48ba-8799-a4576168ee13",
  "d468e6cb-249a-48e4-8d86-706e99766076"
];

export default function GetInvolvedPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [adminViewMode, setAdminViewMode] = useState<"submissions" | "user_form">("submissions");

  // Picture State (Auto-resizing & zero emojis, stored in Supabase system_settings)
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [bannerNotice, setBannerNotice] = useState<string>("");
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submissions State (Admin - fetched from Supabase forms table)
  const [submissions, setSubmissions] = useState<FormRecord[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<FormRecord | null>(null);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);

  // Admin Responses to Users (Stored in Supabase system_settings: getInvolvedResponses)
  const [adminResponses, setAdminResponses] = useState<Record<string, AdminResponseRecord>>({});
  const [customMessages, setCustomMessages] = useState<Record<string, string>>({});
  const [actionNotice, setActionNotice] = useState<Record<string, string>>({});
  const [isSendingToUser, setIsSendingToUser] = useState<Record<string, boolean>>({});

  // User Contact Form State (Saved directly to Supabase forms table)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    cellphone: "",
    involvement: "volunteer",
    message: ""
  });
  const [useAccountName, setUseAccountName] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrorNotice, setFormErrorNotice] = useState("");

  // Receipt Upload State (For Contribute and Partner options)
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");
  const [isProcessingReceipt, setIsProcessingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // Fullscreen Preview Lightbox State (for Admin and User)
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [previewReceiptTitle, setPreviewReceiptTitle] = useState<string>("");

  // Process user uploaded receipt image via canvas compression
  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormErrorNotice("Please select a valid image file (PNG, JPG, WEBP).");
      setTimeout(() => setFormErrorNotice(""), 3500);
      return;
    }

    setIsProcessingReceipt(true);
    setReceiptFileName(file.name);

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setReceiptUrl(compressedDataUrl);
        }
        setIsProcessingReceipt(false);
      };
      img.onerror = () => {
        setIsProcessingReceipt(false);
        setFormErrorNotice("Failed to process image. Please try another image.");
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessingReceipt(false);
      setFormErrorNotice("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setReceiptUrl("");
    setReceiptFileName("");
    if (receiptInputRef.current) {
      receiptInputRef.current.value = "";
    }
  };

  const handleToggleUseName = (checked: boolean) => {
    setUseAccountName(checked);
    if (checked) {
      const first = currentUser?.firstName || (currentUser?.fullName ? currentUser.fullName.split(" ")[0] : "");
      const last = currentUser?.lastName || (currentUser?.fullName ? currentUser.fullName.split(" ").slice(1).join(" ") : "");
      setFormData(prev => ({
        ...prev,
        firstName: first,
        lastName: last,
        name: `${first} ${last}`.trim()
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        firstName: "",
        lastName: "",
        name: ""
      }));
    }
  };

  // User's own submitted entries (displayed in dedicated separate box)
  const [userEntries, setUserEntries] = useState<FormRecord[]>([]);
  const [showUserEntries, setShowUserEntries] = useState(true);
  const [loadingUserEntries, setLoadingUserEntries] = useState(false);
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);

  // Smooth scroll from top down to user's entries / Heartist response when navigated from notifications
  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const shouldScroll =
      searchParams.get("scrollTo") === "my-entries" ||
      window.location.hash === "#my-submitted-entries" ||
      window.location.hash === "#my-entries";
    const subId = searchParams.get("subId");

    if (!shouldScroll && !subId) return;

    setShowUserEntries(true);
    if (subId) {
      setHighlightedEntryId(subId);
    }

    // Explicitly start at the very top (0, 0)
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // Function to smoothly glide down from top to the target element
    const glideDownToTarget = () => {
      let target: HTMLElement | null = null;
      if (subId) {
        target = document.getElementById(`entry-${subId}`);
      }
      if (!target) {
        target = document.getElementById("my-submitted-entries");
      }

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        return true;
      }
      return false;
    };

    // Smooth animation begins with a slight delay so user perceives the descent from the top
    const timer = setTimeout(() => {
      const success = glideDownToTarget();
      if (!success) {
        // In case entries are still rendering from network, retry once
        setTimeout(glideDownToTarget, 500);
      }
    }, 450);

    const fadeTimer = setTimeout(() => {
      setHighlightedEntryId(null);
    }, 6500);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [userEntries]);

  // 1. Check Authentication & Admin status
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          window.location.href = "/login";
          return;
        }
        setCurrentUser(user);
        const adminStorage = typeof window !== "undefined" && localStorage.getItem("isAdminLoggedIn") === "true";
        const adminFlag = !!(user.isAdmin || adminStorage);
        setIsAdmin(adminFlag);
      } catch (err) {
        console.error("Auth check error:", err);
      } finally {
        setLoadingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // 2. Fetch Picture from Supabase system_settings & subscribe to realtime updates
  useEffect(() => {
    async function fetchPicture() {
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("*")
          .eq("id", "getInvolvedPicture")
          .maybeSingle();

        if (data?.value?.url) {
          setBannerUrl(data.value.url);
        } else {
          setBannerUrl("");
        }
      } catch (err) {
        console.error("Error fetching picture:", err);
      }
    }

    fetchPicture();

    const picChannel = supabase
      .channel("get_involved_picture_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings", filter: "id=eq.getInvolvedPicture" },
        (payload) => {
          const newVal = payload.new as any;
          if (newVal?.value?.url !== undefined) {
            setBannerUrl(newVal.value.url);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(picChannel);
    };
  }, []);

  // 3. Fetch Admin Responses from Supabase system_settings
  useEffect(() => {
    async function fetchAdminResponses() {
      try {
        const { data } = await supabase
          .from("system_settings")
          .select("*")
          .eq("id", "getInvolvedResponses")
          .maybeSingle();

        if (data?.value) {
          setAdminResponses(data.value);
        }
      } catch (err) {
        console.error("Error fetching admin responses:", err);
      }
    }

    fetchAdminResponses();

    const responsesChannel = supabase
      .channel("get_involved_responses_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_settings", filter: "id=eq.getInvolvedResponses" },
        (payload) => {
          const newVal = payload.new as any;
          if (newVal?.value) {
            setAdminResponses(newVal.value);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(responsesChannel);
    };
  }, []);

  // 4. Fetch Real Submissions for Admin from Supabase (Filtering out dummy accounts)
  const fetchSubmissions = async () => {
    try {
      setLoadingSubmissions(true);

      // Fetch dynamic excluded IDs from Supabase system_settings if configured
      let excludedIds = [...DEFAULT_EXCLUDED_IDS];
      try {
        const { data: exclData } = await supabase
          .from("system_settings")
          .select("*")
          .eq("id", "excluded_get_involved_forms")
          .maybeSingle();

        if (exclData?.value && Array.isArray(exclData.value)) {
          excludedIds = Array.from(new Set([...excludedIds, ...exclData.value]));
        }
      } catch {}

      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("type", "GET_INVOLVED")
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Exclude dummy test entries - only real user submissions will appear!
        const realSubmissions = (data as FormRecord[]).filter((row) => {
          const isDummyId = excludedIds.includes(row.id);
          const userEmail = (row.data?.email || "").toLowerCase().trim();
          const isDummyEmail = DUMMY_EMAILS.includes(userEmail);
          return !isDummyId && !isDummyEmail;
        });

        setSubmissions(realSubmissions);
      }
    } catch (err) {
      console.error("Error fetching submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    fetchSubmissions();

    const formsChannel = supabase
      .channel("get_involved_forms_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forms", filter: "type=eq.GET_INVOLVED" },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(formsChannel);
    };
  }, [isAdmin]);

  // 5. Fetch User's Own Entries from Supabase
  const fetchUserEntries = async () => {
    if (!currentUser) return;
    try {
      setLoadingUserEntries(true);

      let excludedIds = [...DEFAULT_EXCLUDED_IDS];
      try {
        const { data: exclData } = await supabase
          .from("system_settings")
          .select("*")
          .eq("id", "excluded_get_involved_forms")
          .maybeSingle();

        if (exclData?.value && Array.isArray(exclData.value)) {
          excludedIds = Array.from(new Set([...excludedIds, ...exclData.value]));
        }
      } catch {}

      let query = supabase
        .from("forms")
        .select("*")
        .eq("type", "GET_INVOLVED")
        .order("created_at", { ascending: false });

      if (currentUser.id) {
        query = query.or(`user_id.eq.${currentUser.id},data->>email.eq.${currentUser.email}`);
      } else if (currentUser.email) {
        query = query.eq("data->>email", currentUser.email);
      }

      const { data, error } = await query;
      if (!error && data) {
        const realEntries = (data as FormRecord[]).filter((row) => !excludedIds.includes(row.id));
        setUserEntries(realEntries);
      }
    } catch (err) {
      console.error("Error fetching user entries:", err);
    } finally {
      setLoadingUserEntries(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUserEntries();
    }
  }, [currentUser]);

  // Picture Upload handler (Natural aspect ratio, saved to Supabase system_settings)
  const handlePictureSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setBannerNotice("Please select a valid image file.");
      setTimeout(() => setBannerNotice(""), 3500);
      return;
    }

    setIsUploadingBanner(true);
    setBannerNotice("Processing and saving image to Supabase...");

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

          try {
            const { error } = await supabase.from("system_settings").upsert({
              id: "getInvolvedPicture",
              value: { url: compressedDataUrl, updatedAt: new Date().toISOString() },
              updated_at: new Date().toISOString()
            });

            if (error) {
              console.error("Error saving picture to Supabase:", error);
              setBannerNotice("Failed to save picture.");
            } else {
              setBannerUrl(compressedDataUrl);
              setBannerNotice("Picture updated successfully!");
            }
          } catch (saveErr) {
            console.error("Save error:", saveErr);
            setBannerNotice("Failed to save picture.");
          } finally {
            setIsUploadingBanner(false);
            setTimeout(() => setBannerNotice(""), 3500);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Custom CSS modal confirmation for removing picture
  const handleConfirmRemovePicture = async () => {
    setIsUploadingBanner(true);
    try {
      await supabase.from("system_settings").upsert({
        id: "getInvolvedPicture",
        value: { url: "", updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString()
      });
      setBannerUrl("");
      setBannerNotice("Picture removed.");
    } catch (err) {
      console.error("Error removing picture:", err);
      setBannerNotice("Failed to remove picture.");
    } finally {
      setIsUploadingBanner(false);
      setShowRemoveModal(false);
      setTimeout(() => setBannerNotice(""), 3500);
    }
  };

  // Handler: "Send to User" (Saved directly to Supabase system_settings & in-app notification)
  const handleSendToUser = async (sub: FormRecord, badgeLabel: string) => {
    const userName = sub.data?.name?.trim() || "Member";
    const defaultMsg = `Hi ${userName}, thank you so much for reaching out to get involved with Heartist as a ${badgeLabel}! We appreciate your willingness to be part of our journey. We will reach out to you with next steps. Blessings!`;
    const messageToSend = (customMessages[sub.id] !== undefined ? customMessages[sub.id] : defaultMsg).trim();

    if (!messageToSend) {
      setActionNotice((prev) => ({ ...prev, [sub.id]: "Message cannot be empty." }));
      setTimeout(() => setActionNotice((prev) => { const n = { ...prev }; delete n[sub.id]; return n; }), 3000);
      return;
    }

    setIsSendingToUser((prev) => ({ ...prev, [sub.id]: true }));

    try {
      const timeStr = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });

      const updatedResponses = {
        ...adminResponses,
        [sub.id]: {
          message: messageToSend,
          sentAt: timeStr,
          adminName: currentUser?.fullName || "Heartist Team"
        }
      };

      setAdminResponses(updatedResponses);

      await supabase.from("system_settings").upsert({
        id: "getInvolvedResponses",
        value: updatedResponses,
        updated_at: new Date().toISOString()
      });

      if (sub.user_id) {
        try {
          await createNotification({
            recipient_id: sub.user_id,
            sender_id: currentUser?.id || "admin",
            sender_name: "Heartist Team",
            type: "GET_INVOLVED",
            post_id: sub.id,
            message: messageToSend
          });
        } catch (notifErr) {
          console.error("In-app notification dispatch error:", notifErr);
        }
      }

      setActionNotice((prev) => ({ ...prev, [sub.id]: "Message sent to user successfully!" }));
      setTimeout(() => {
        setActionNotice((prev) => {
          const n = { ...prev };
          delete n[sub.id];
          return n;
        });
      }, 4000);
    } catch (err) {
      console.error("Error sending to user:", err);
      setActionNotice((prev) => ({ ...prev, [sub.id]: "Failed to send message." }));
    } finally {
      setIsSendingToUser((prev) => ({ ...prev, [sub.id]: false }));
    }
  };

  // Admin: Delete entry from Supabase forms table
  const handleDeleteEntry = async () => {
    if (!entryToDelete) return;
    setIsDeletingEntry(true);
    try {
      const { error } = await supabase
        .from("forms")
        .delete()
        .eq("id", entryToDelete.id);

      if (error) {
        console.error("Error deleting entry from Supabase:", error);
      } else {
        setSubmissions((prev) => prev.filter((s) => s.id !== entryToDelete.id));
        if (expandedId === entryToDelete.id) {
          setExpandedId(null);
        }
      }
    } catch (err) {
      console.error("Error deleting entry:", err);
    } finally {
      setIsDeletingEntry(false);
      setEntryToDelete(null);
    }
  };

  // User form submission (Direct insert into Supabase forms table)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrorNotice("");

    try {
      const userId = currentUser?.id || null;
      const fullName = `${formData.firstName} ${formData.lastName}`.trim() || formData.name;
      const isPaymentCategory = formData.involvement === "contribute" || formData.involvement === "partner";

      const { error } = await supabase.from("forms").insert([
        {
          user_id: userId,
          type: "GET_INVOLVED",
          data: {
            ...formData,
            receiptUrl: (isPaymentCategory && receiptUrl) ? receiptUrl : undefined,
            receiptName: (isPaymentCategory && receiptFileName) ? receiptFileName : undefined,
            name: fullName,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            date: new Date().toISOString().split("T")[0]
          },
          status: "Pending"
        }
      ]);

      if (error) {
        console.error("Error submitting form to Supabase", error);
        setFormErrorNotice("Failed to submit form. Please check your connection and try again.");
      } else {
        setSubmitted(true);
        setFormData({
          firstName: "",
          lastName: "",
          name: "",
          email: "",
          cellphone: "",
          involvement: "volunteer",
          message: ""
        });
        setReceiptUrl("");
        setReceiptFileName("");
        if (receiptInputRef.current) {
          receiptInputRef.current.value = "";
        }
        setUseAccountName(false);
        fetchUserEntries();
        setShowUserEntries(true);
        setTimeout(() => setSubmitted(false), 4000);
      }
    } catch (e) {
      console.error("Error submitting form:", e);
      setFormErrorNotice("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Category counts for Admin Dropdown
  const getCategoryCount = (catValue: string) => {
    if (catValue === "all") return submissions.length;
    return submissions.filter((s) => {
      const inv = (s.data?.involvement || "").toLowerCase();
      if (catValue === "join") return inv === "join" || inv.includes("join");
      return inv === catValue.toLowerCase();
    }).length;
  };

  const filterOptions: DropdownOption[] = [
    { label: `All (${getCategoryCount("all")})`, value: "all" },
    { label: `Volunteer (${getCategoryCount("volunteer")})`, value: "volunteer" },
    { label: `Contribute (${getCategoryCount("contribute")})`, value: "contribute" },
    { label: `Partner (${getCategoryCount("partner")})`, value: "partner" },
    { label: `Join events (${getCategoryCount("join")})`, value: "join" }
  ];

  // Filtered submissions list
  const filteredSubmissions = submissions.filter((s) => {
    if (filterCategory === "all") return true;
    const inv = (s.data?.involvement || "").toLowerCase();
    if (filterCategory === "join") return inv === "join" || inv.includes("join");
    return inv === filterCategory.toLowerCase();
  });

  // Helper badge styling for involvement
  const getInvolvementBadge = (involvement?: string) => {
    const inv = (involvement || "volunteer").toLowerCase();
    if (inv === "volunteer") {
      return { label: "Volunteer", bg: "rgba(0, 229, 255, 0.15)", border: "#00E5FF", text: "#00E5FF" };
    }
    if (inv === "contribute") {
      return { label: "Contribute", bg: "rgba(0, 230, 118, 0.15)", border: "#00E676", text: "#00E676" };
    }
    if (inv === "partner") {
      return { label: "Partner", bg: "rgba(186, 104, 200, 0.15)", border: "#BA68C8", text: "#BA68C8" };
    }
    if (inv === "join" || inv.includes("join")) {
      return { label: "Join events", bg: "rgba(255, 215, 0, 0.15)", border: "#FFD700", text: "#FFD700" };
    }
    return { label: involvement || "Member", bg: "rgba(255, 255, 255, 0.1)", border: "rgba(255, 255, 255, 0.3)", text: "#FFFFFF" };
  };

  const isShowingUserForm = !isAdmin || adminViewMode === "user_form";

  return (
    <main className="main-container" style={{ padding: "clamp(60px, 8vw, 80px) clamp(12px, 3vw, 20px) clamp(140px, 16vh, 180px)" }}>
      {/* Header */}
      <header style={{ marginBottom: "30px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1
          className="header-title glow-text-yellow"
          style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}
        >
          Get Involved
        </h1>
        <h2 style={{ color: "var(--neon-white)", fontSize: "1.2rem", marginTop: "10px", fontFamily: "var(--font-outfit)", fontStyle: "italic" }}>
          "Be part of a purposeful journey with us."
        </h2>
      </header>

      {/* BOX 1: MAIN CARD (PICTURE PLACEHOLDER + FORM OR ADMIN PANEL) */}
      <section
        className="card"
        style={{
          maxWidth: "680px",
          margin: "0 auto",
          padding: "30px",
          background: "var(--bg-card)",
          borderTop: "3px solid var(--neon-yellow)",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)"
        }}
      >
        <p style={{ color: "var(--text-muted)", fontSize: "1rem", lineHeight: "1.6", marginBottom: "25px", textAlign: "center" }}>
          Join a movement fueled by faith, compassion, and creativity. Volunteer, partner, contribute, or attend events and use your unique gifts to support the next generation.
        </p>

        {/* PICTURE PLACEHOLDER (AUTO-RESIZING & ZERO EMOJIS) */}
        <div style={{ marginBottom: "30px" }}>
          {bannerUrl ? (
            <div
              style={{
                width: "100%",
                borderRadius: "14px",
                overflow: "hidden",
                background: "#080808",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 20px rgba(0,0,0,0.4)"
              }}
            >
              <img
                src={bannerUrl}
                alt="Get Involved Picture"
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "560px",
                  objectFit: "contain",
                  display: "block",
                  borderRadius: "14px"
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                padding: "40px 20px",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px dashed rgba(255, 215, 0, 0.3)",
                borderRadius: "14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)"
              }}
            >
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-outfit)", fontSize: "0.95rem", fontWeight: 500 }}>
                [ Picture Placeholder ]
              </span>
              {isAdmin && (
                <p style={{ color: "var(--neon-yellow)", fontSize: "0.82rem", margin: 0, opacity: 0.9, fontFamily: "var(--font-outfit)" }}>
                  Admin: Upload portrait, landscape, or square picture
                </p>
              )}
            </div>
          )}

          {/* Admin Photo Controls */}
          {isAdmin && (
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "12px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingBanner}
                style={{
                  background: "var(--neon-yellow)",
                  color: "#000",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontFamily: "var(--font-outfit)",
                  transition: "transform 0.2s"
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                {bannerUrl ? "Change Picture" : "Add Picture"}
              </button>

              {bannerUrl && (
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(true)}
                  disabled={isUploadingBanner}
                  style={{
                    background: "rgba(255, 59, 48, 0.15)",
                    color: "#FF453A",
                    border: "1px solid #FF453A",
                    padding: "8px 14px",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontFamily: "var(--font-outfit)"
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Remove
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePictureSelect}
          />

          {bannerNotice && (
            <p
              style={{
                marginTop: "10px",
                fontSize: "0.9rem",
                textAlign: "center",
                color: bannerNotice.includes("successfully") ? "#00E676" : "#FFD700",
                fontFamily: "var(--font-outfit)"
              }}
            >
              {bannerNotice}
            </p>
          )}
        </div>

        {/* ADMIN VIEW vs USER CONTACT FORM */}
        {loadingAuth ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
            Loading...
          </div>
        ) : isAdmin && adminViewMode === "submissions" ? (
          <div>
            {/* Admin Header & Mode Switcher */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "12px 16px",
                background: "rgba(255, 215, 0, 0.08)",
                border: "1px solid rgba(255, 215, 0, 0.25)",
                borderRadius: "12px",
                marginBottom: "24px"
              }}
            >
              <div>
                <span style={{ color: "var(--neon-yellow)", fontWeight: "bold", fontSize: "0.95rem", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "var(--font-outfit)" }}>
                  Admin Panel
                </span>
                <p style={{ color: "var(--neon-white)", fontSize: "0.85rem", margin: "2px 0 0 0", fontFamily: "var(--font-outfit)" }}>
                  Manage connected members & send direct thank you notes
                </p>
              </div>

              {/* View Toggle */}
              <div style={{ display: "flex", gap: "6px", background: "rgba(0,0,0,0.4)", padding: "4px", borderRadius: "8px" }}>
                <button
                  type="button"
                  onClick={() => setAdminViewMode("submissions")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: "var(--neon-yellow)",
                    color: "#000",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    fontFamily: "var(--font-outfit)"
                  }}
                >
                  Connected ({submissions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewMode("user_form")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    fontFamily: "var(--font-outfit)",
                    transition: "all 0.2s"
                  }}
                >
                  User Form View
                </button>
              </div>
            </div>

            {/* DROPDOWN CATEGORY FILTER */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "var(--neon-white)", fontSize: "0.9rem", fontFamily: "var(--font-outfit)", marginBottom: "8px", fontWeight: 500 }}>
                Filter by Involvement:
              </label>
              <CustomDropdown
                value={filterCategory}
                onChange={(val) => setFilterCategory(val)}
                options={filterOptions}
              />
            </div>

            {/* CONNECTED USERS EXPANDABLE BOXES (REAL USER SUBMISSIONS ONLY) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {loadingSubmissions ? (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                  Loading submissions from Supabase...
                </div>
              ) : filteredSubmissions.length === 0 ? (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px dashed rgba(255,255,255,0.15)",
                    borderRadius: "12px",
                    color: "var(--text-muted)"
                  }}
                >
                  <p style={{ margin: "0 0 6px 0", color: "var(--neon-white)", fontWeight: 500, fontFamily: "var(--font-outfit)" }}>
                    No connected users found.
                  </p>
                  <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-outfit)" }}>
                    When members submit their details via the form, they will automatically appear here in real-time.
                  </span>
                </div>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isExpanded = expandedId === sub.id;
                  const userName = sub.data?.name?.trim() || `${sub.data?.firstName || ""} ${sub.data?.lastName || ""}`.trim() || "Member";
                  const badge = getInvolvementBadge(sub.data?.involvement);
                  const hasAdminResponse = !!adminResponses[sub.id];
                  const adminResponseData = adminResponses[sub.id];

                  const defaultMsg = `Hi ${userName}, thank you so much for reaching out to get involved with Heartist as a ${badge.label}! We appreciate your willingness to be part of our journey. We will reach out to you with next steps. Blessings!`;
                  const activeMessage = customMessages[sub.id] !== undefined ? customMessages[sub.id] : defaultMsg;
                  const notice = actionNotice[sub.id];
                  const isSending = !!isSendingToUser[sub.id];

                  return (
                    <div
                      key={sub.id}
                      style={{
                        background: isExpanded ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.4)",
                        border: isExpanded ? "1px solid var(--neon-yellow)" : "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        transition: "all 0.25s ease",
                        boxShadow: isExpanded ? "0 4px 16px rgba(255, 215, 0, 0.08)" : "none"
                      }}
                    >
                      {/* COLLAPSED BOX: STRICTLY NAME ONLY + CLEAN SVG CHEVRON */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                        style={{
                          padding: "16px 20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                          userSelect: "none",
                          transition: "background 0.2s"
                        }}
                      >
                        <span
                          style={{
                            color: isExpanded ? "var(--neon-yellow)" : "var(--neon-white)",
                            fontSize: "1.1rem",
                            fontWeight: 600,
                            fontFamily: "var(--font-outfit)",
                            letterSpacing: "0.3px"
                          }}
                        >
                          {userName}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {sub.data?.receiptUrl && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                color: "var(--neon-yellow)",
                                background: "rgba(255, 215, 0, 0.12)",
                                border: "1px solid rgba(255, 215, 0, 0.35)",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontWeight: 500,
                                fontFamily: "var(--font-outfit)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px"
                              }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                              </svg>
                              Receipt
                            </span>
                          )}
                          {hasAdminResponse && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "#00E676",
                                background: "rgba(0, 230, 118, 0.12)",
                                border: "1px solid rgba(0, 230, 118, 0.4)",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontWeight: 500,
                                fontFamily: "var(--font-outfit)"
                              }}
                            >
                              Responded
                            </span>
                          )}
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={isExpanded ? "var(--neon-yellow)" : "var(--text-muted)"}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                              transition: "transform 0.25s ease"
                            }}
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                      </div>

                      {/* EXPANDED CONTENT: CREDENTIALS & SEND TO USER SECTION */}
                      {isExpanded && (
                        <div
                          style={{
                            padding: "0 20px 20px 20px",
                            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                            marginTop: "4px",
                            paddingTop: "16px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px"
                          }}
                        >
                          {/* Involvement & Date Header */}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontFamily: "var(--font-outfit)" }}>
                                Involvement:
                              </span>
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  color: badge.text,
                                  background: badge.bg,
                                  border: `1px solid ${badge.border}`,
                                  padding: "3px 12px",
                                  borderRadius: "14px",
                                  fontWeight: 600,
                                  fontFamily: "var(--font-outfit)"
                                }}
                              >
                                {badge.label}
                              </span>
                            </div>

                            {sub.created_at && (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-outfit)" }}>
                                Submitted: {new Date(sub.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            )}
                          </div>

                          {/* Email Address */}
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", display: "block", marginBottom: "3px", fontFamily: "var(--font-outfit)" }}>
                              Email Address
                            </span>
                            {sub.data?.email ? (
                              <span style={{ color: "var(--neon-white)", fontSize: "0.95rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-outfit)" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                  <polyline points="22,6 12,13 2,6" />
                                </svg>
                                {sub.data.email}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>Not provided</span>
                            )}
                          </div>

                          {/* Cellphone Number */}
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", display: "block", marginBottom: "3px", fontFamily: "var(--font-outfit)" }}>
                              Cellphone Number
                            </span>
                            {sub.data?.cellphone ? (
                              <span style={{ color: "var(--neon-white)", fontSize: "0.95rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-outfit)" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--neon-yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                {sub.data.cellphone}
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>Not provided</span>
                            )}
                          </div>

                          {/* User Message */}
                          <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", display: "block", marginBottom: "4px", fontFamily: "var(--font-outfit)" }}>
                              User Message / Note
                            </span>
                            {sub.data?.message ? (
                              <p style={{ margin: 0, color: "var(--neon-white)", fontSize: "0.95rem", lineHeight: "1.5", whiteSpace: "pre-wrap" }}>
                                "{sub.data.message}"
                              </p>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.9rem" }}>No message provided.</span>
                            )}
                          </div>

                          {/* PAYMENT / PROOF OF RECEIPT SECTION */}
                          {sub.data?.receiptUrl ? (
                            <div
                              style={{
                                background: "rgba(0,0,0,0.35)",
                                padding: "14px",
                                borderRadius: "10px",
                                border: "1px solid rgba(255, 215, 0, 0.3)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "10px"
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                                <span style={{ color: "var(--neon-yellow)", fontSize: "0.88rem", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-outfit)" }}>
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="5" width="20" height="14" rx="2" />
                                    <line x1="2" y1="10" x2="22" y2="10" />
                                  </svg>
                                  Proof of Payment / Uploaded Receipt
                                </span>
                                <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-outfit)" }}>
                                  Click image to view full size
                                </span>
                              </div>

                              {/* Clickable receipt image */}
                              <div
                                onClick={() => {
                                  setPreviewReceiptUrl(sub.data!.receiptUrl!);
                                  setPreviewReceiptTitle(`Proof of Payment - ${userName} (${badge.label})`);
                                }}
                                style={{
                                  cursor: "pointer",
                                  borderRadius: "8px",
                                  overflow: "hidden",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  maxHeight: "220px",
                                  background: "#050505",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "relative",
                                  transition: "transform 0.2s, border-color 0.2s"
                                }}
                              >
                                <img
                                  src={sub.data.receiptUrl}
                                  alt="Payment Receipt"
                                  style={{
                                    width: "100%",
                                    maxHeight: "220px",
                                    objectFit: "contain",
                                    display: "block"
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    bottom: "8px",
                                    right: "8px",
                                    background: "rgba(0, 0, 0, 0.8)",
                                    border: "1px solid rgba(255, 255, 255, 0.25)",
                                    color: "white",
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px"
                                  }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    <line x1="11" y1="8" x2="11" y2="14" />
                                    <line x1="8" y1="11" x2="14" y2="11" />
                                  </svg>
                                  Click to Expand
                                </div>
                              </div>
                            </div>
                          ) : (sub.data?.involvement === "contribute" || sub.data?.involvement === "partner") ? (
                            <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                              <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontStyle: "italic", fontFamily: "var(--font-outfit)" }}>
                                Payment Receipt: No receipt uploaded by member.
                              </span>
                            </div>
                          ) : null}

                          {/* Previously Sent Response from Admin */}
                          {hasAdminResponse && (
                            <div style={{ background: "rgba(0, 230, 118, 0.08)", border: "1px solid rgba(0, 230, 118, 0.3)", borderRadius: "8px", padding: "12px 14px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                <span style={{ color: "#00E676", fontSize: "0.82rem", fontWeight: 600, fontFamily: "var(--font-outfit)" }}>
                                  Previously Sent to User ({adminResponseData.sentAt})
                                </span>
                              </div>
                              <p style={{ margin: 0, color: "var(--neon-white)", fontSize: "0.9rem", lineHeight: "1.4" }}>
                                "{adminResponseData.message}"
                              </p>
                            </div>
                          )}

                          {/* SEND TO USER COMPOSER */}
                          <div
                            style={{
                              marginTop: "6px",
                              padding: "16px",
                              borderRadius: "10px",
                              background: "rgba(255, 215, 0, 0.04)",
                              border: "1px solid rgba(255, 215, 0, 0.2)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neon-yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="22" y1="2" x2="11" y2="13" />
                                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                                <span style={{ color: "var(--neon-yellow)", fontSize: "0.9rem", fontWeight: 600, fontFamily: "var(--font-outfit)" }}>
                                  Send to User
                                </span>
                              </div>

                              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "var(--font-outfit)" }}>
                                User will see this message in their separate "My Submissions" box below
                              </span>
                            </div>

                            {/* Template Pills */}
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomMessages((prev) => ({
                                    ...prev,
                                    [sub.id]: `Hi ${userName}, thank you so much for your heart to serve as a ${badge.label} with Heartist! We appreciate your willingness to be part of our journey. We will contact you soon with next steps. Blessings!`
                                  }));
                                }}
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  color: "var(--neon-white)",
                                  padding: "4px 10px",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  fontFamily: "var(--font-outfit)"
                                }}
                              >
                                Template: Thank You Note
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomMessages((prev) => ({
                                    ...prev,
                                    [sub.id]: `Hi ${userName}, we received your details for ${badge.label} at Heartist. Please stay tuned as we will reach out to you directly with further information. Thank you!`
                                  }));
                                }}
                                style={{
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(255,255,255,0.15)",
                                  color: "var(--neon-white)",
                                  padding: "4px 10px",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  fontFamily: "var(--font-outfit)"
                                }}
                              >
                                Template: Follow-Up Note
                              </button>
                            </div>

                            {/* Textarea */}
                            <textarea
                              rows={3}
                              value={activeMessage}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomMessages((prev) => ({ ...prev, [sub.id]: val }));
                              }}
                              placeholder="Type your thank you or contact message to the user..."
                              style={{
                                width: "100%",
                                padding: "10px",
                                borderRadius: "8px",
                                background: "rgba(0,0,0,0.5)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                color: "white",
                                fontSize: "0.88rem",
                                outline: "none",
                                resize: "none",
                                fontFamily: "var(--font-outfit)"
                              }}
                            />

                            {/* Action Button */}
                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                              <button
                                type="button"
                                disabled={isSending}
                                onClick={() => handleSendToUser(sub, badge.label)}
                                style={{
                                  background: "var(--neon-yellow)",
                                  color: "#000",
                                  border: "none",
                                  padding: "9px 20px",
                                  borderRadius: "8px",
                                  fontWeight: 600,
                                  fontSize: "0.88rem",
                                  cursor: isSending ? "not-allowed" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontFamily: "var(--font-outfit)",
                                  transition: "transform 0.2s",
                                  opacity: isSending ? 0.7 : 1
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="22" y1="2" x2="11" y2="13" />
                                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                </svg>
                                {isSending ? "Sending to User..." : "Send to User"}
                              </button>

                              {notice && (
                                <span style={{ color: notice.includes("successfully") ? "#00E676" : "#FFD700", fontSize: "0.82rem", fontFamily: "var(--font-outfit)" }}>
                                  {notice}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* DANGER ZONE: DELETE SUBMISSION ENTRY */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: "4px",
                              paddingTop: "12px",
                              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                              flexWrap: "wrap",
                              gap: "8px"
                            }}
                          >
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                              Manage submission:
                            </span>
                            <button
                              type="button"
                              onClick={() => setEntryToDelete(sub)}
                              style={{
                                background: "rgba(255, 59, 48, 0.12)",
                                color: "#FF453A",
                                border: "1px solid rgba(255, 59, 48, 0.35)",
                                padding: "7px 14px",
                                borderRadius: "8px",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontFamily: "var(--font-outfit)",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete Entry
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* USER CONTACT FORM */
          <div>
            {isAdmin && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "rgba(255, 215, 0, 0.08)",
                  border: "1px solid rgba(255, 215, 0, 0.25)",
                  borderRadius: "10px",
                  marginBottom: "20px"
                }}
              >
                <span style={{ color: "var(--neon-yellow)", fontSize: "0.85rem", fontWeight: 600, fontFamily: "var(--font-outfit)" }}>
                  Viewing as User Form Preview
                </span>
                <button
                  type="button"
                  onClick={() => setAdminViewMode("submissions")}
                  style={{
                    background: "var(--neon-yellow)",
                    color: "#000",
                    border: "none",
                    padding: "4px 12px",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-outfit)"
                  }}
                >
                  Return to Admin Panel
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Name Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ color: "var(--neon-white)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>
                  Name:
                </label>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: "12px"
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.65)", fontFamily: "var(--font-outfit)" }}>
                      First Name
                    </span>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Juan"
                      value={formData.firstName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          firstName: val,
                          name: `${val} ${prev.lastName}`.trim()
                        }));
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "white",
                        outline: "none",
                        fontFamily: "var(--font-outfit)",
                        width: "100%"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.65)", fontFamily: "var(--font-outfit)" }}>
                      Last Name
                    </span>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Dela Cruz"
                      value={formData.lastName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          lastName: val,
                          name: `${prev.firstName} ${val}`.trim()
                        }));
                      }}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.5)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "white",
                        outline: "none",
                        fontFamily: "var(--font-outfit)",
                        width: "100%"
                      }}
                    />
                  </div>
                </div>

                {/* "Use name" Checkbox - Placed below Last Name, aligned right */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      fontSize: "0.83rem",
                      color: useAccountName ? "#ffffff" : "rgba(255, 255, 255, 0.65)",
                      fontFamily: "var(--font-outfit)",
                      userSelect: "none",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: useAccountName ? "rgba(255, 255, 255, 0.08)" : "transparent",
                      border: useAccountName ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid transparent",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={useAccountName}
                      onChange={(e) => handleToggleUseName(e.target.checked)}
                      style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                    />
                    <div
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "4px",
                        border: useAccountName ? "1.5px solid #ffffff" : "1.5px solid rgba(255, 255, 255, 0.45)",
                        background: useAccountName ? "#ffffff" : "rgba(0, 0, 0, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {useAccountName && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span>Use name</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ color: "var(--neon-white)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>Email:</label>
                <input
                  required
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    outline: "none",
                    fontFamily: "var(--font-outfit)"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ color: "var(--neon-white)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>Cellphone:</label>
                <input
                  required
                  type="tel"
                  placeholder="0912 345 6789"
                  value={formData.cellphone}
                  onChange={(e) => setFormData({ ...formData, cellphone: e.target.value })}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    outline: "none",
                    fontFamily: "var(--font-outfit)"
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ color: "var(--neon-white)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>How do you want to be involved?:</label>
                <CustomDropdown
                  value={formData.involvement}
                  onChange={(val) => setFormData({ ...formData, involvement: val })}
                  options={[
                    { label: "Volunteer", value: "volunteer" },
                    { label: "Contribute", value: "contribute" },
                    { label: "Partner", value: "partner" },
                    { label: "Join events", value: "join" }
                  ]}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ color: "var(--neon-white)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>Message: (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your interests, skills, or heart for the ministry..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    background: "rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "white",
                    outline: "none",
                    resize: "none",
                    fontFamily: "var(--font-outfit)"
                  }}
                />
              </div>

              {/* GCash Integration */}
              {(formData.involvement === "contribute" || formData.involvement === "partner") && (
                <div
                  style={{
                    background: "rgba(0, 82, 255, 0.1)",
                    border: "1px solid #0052FF",
                    borderRadius: "12px",
                    padding: "20px",
                    marginTop: "10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center"
                  }}
                >
                  <p style={{ color: "var(--neon-white)", fontSize: "1rem", fontFamily: "var(--font-outfit)", marginBottom: "15px", fontWeight: "bold" }}>
                    Scan to Send Support via GCash
                  </p>

                  <div
                    style={{
                      width: "200px",
                      height: "auto",
                      background: "white",
                      borderRadius: "8px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "10px"
                    }}
                  >
                    <img
                      src="/gcash-qr.jpg"
                      alt="GCash QR Code"
                      style={{ width: "100%", height: "auto", objectFit: "contain", borderRadius: "5px" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).parentElement!.innerHTML =
                          '<span style="color: black; font-size: 0.8rem; font-family: sans-serif;">Save your image as public/gcash-qr.jpg</span>';
                      }}
                    />
                  </div>

                  <a
                    href="/gcash-qr.jpg"
                    download="Heartist_GCash_QR.jpg"
                    style={{
                      display: "inline-block",
                      marginTop: "15px",
                      padding: "8px 20px",
                      background: "var(--neon-white)",
                      color: "black",
                      borderRadius: "20px",
                      textDecoration: "none",
                      fontFamily: "var(--font-outfit)",
                      fontSize: "0.85rem",
                      fontWeight: "bold",
                      transition: "all 0.3s"
                    }}
                  >
                    Save QR to photos
                  </a>

                  <p style={{ color: "#0052FF", fontSize: "1.1rem", fontFamily: "var(--font-outfit)", marginTop: "15px", fontWeight: "bold" }}>
                    TH***A MA**E L.
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontFamily: "var(--font-outfit)" }}>
                    0927 551 ****
                  </p>
                </div>
              )}

              {/* UPLOAD RECEIPT HERE: Shown when choice is contribute or partner */}
              {(formData.involvement === "contribute" || formData.involvement === "partner") && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                    <label style={{ color: "var(--neon-white)", fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>
                      Upload receipt here:
                    </label>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                      Proof of Payment (GCash / Bank Transfer)
                    </span>
                  </div>

                  {receiptUrl ? (
                    <div
                      style={{
                        background: "rgba(0, 0, 0, 0.45)",
                        border: "1px solid rgba(0, 230, 118, 0.4)",
                        borderRadius: "10px",
                        padding: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span style={{ color: "#00E676", fontSize: "0.85rem", fontWeight: 600, fontFamily: "var(--font-outfit)" }}>
                            Receipt Photo Attached
                          </span>
                          {receiptFileName && (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-outfit)" }}>
                              ({receiptFileName})
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => receiptInputRef.current?.click()}
                            disabled={isProcessingReceipt}
                            style={{
                              background: "rgba(255, 255, 255, 0.08)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              color: "var(--neon-white)",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              fontFamily: "var(--font-outfit)"
                            }}
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveReceipt}
                            disabled={isProcessingReceipt}
                            style={{
                              background: "rgba(255, 59, 48, 0.12)",
                              border: "1px solid rgba(255, 59, 48, 0.35)",
                              color: "#FF453A",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                              fontFamily: "var(--font-outfit)"
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Clickable Image Preview */}
                      <div
                        onClick={() => {
                          setPreviewReceiptUrl(receiptUrl);
                          setPreviewReceiptTitle("My Uploaded Receipt");
                        }}
                        style={{
                          cursor: "pointer",
                          borderRadius: "8px",
                          overflow: "hidden",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          maxHeight: "180px",
                          background: "#080808",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative"
                        }}
                      >
                        <img
                          src={receiptUrl}
                          alt="Receipt Preview"
                          style={{ width: "100%", maxHeight: "180px", objectFit: "contain", display: "block" }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            bottom: "6px",
                            right: "6px",
                            background: "rgba(0, 0, 0, 0.8)",
                            color: "white",
                            padding: "3px 8px",
                            borderRadius: "5px",
                            fontSize: "0.72rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          Click to preview
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Empty Upload Box */
                    <div
                      onClick={() => receiptInputRef.current?.click()}
                      style={{
                        padding: "24px 16px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.4)",
                        border: "1.5px dashed rgba(255, 255, 255, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        cursor: isProcessingReceipt ? "wait" : "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--neon-yellow)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ color: "var(--neon-white)", fontSize: "0.92rem", fontWeight: 500, fontFamily: "var(--font-outfit)", display: "block" }}>
                          {isProcessingReceipt ? "Processing receipt photo..." : "Click to upload receipt photo"}
                        </span>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "var(--font-outfit)" }}>
                          Upload GCash screenshot, bank confirmation, or transaction slip
                        </span>
                      </div>
                    </div>
                  )}

                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleReceiptSelect}
                  />
                </div>
              )}

              {formErrorNotice && (
                <p style={{ color: "#FF453A", fontSize: "0.85rem", textAlign: "center", fontFamily: "var(--font-outfit)", margin: 0 }}>
                  {formErrorNotice}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="glow-text-yellow"
                style={{
                  marginTop: "10px",
                  padding: "15px",
                  background: submitted ? "var(--neon-yellow)" : "transparent",
                  color: submitted ? "#000" : "var(--neon-yellow)",
                  border: "1px solid var(--neon-yellow)",
                  borderRadius: "8px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-outfit)",
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  transition: "all 0.3s",
                  opacity: submitting ? 0.7 : 1
                }}
              >
                {submitted ? "Sent!" : submitting ? "Sending..." : "Connect"}
              </button>
            </form>
          </div>
        )}
      </section>

      {/* BOX 2: SEPARATE STANDALONE BOX FOR VIEW ENTRY / MY SUBMISSIONS */}
      {isShowingUserForm && (
        <section
          id="my-submitted-entries"
          className="card"
          style={{
            maxWidth: "680px",
            margin: "30px auto 0 auto",
            padding: "26px 30px",
            background: "var(--bg-card)",
            borderTop: "3px solid var(--neon-yellow)",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
            scrollMarginTop: "100px"
          }}
        >
          {/* Header of the Separate View Entry Box */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neon-yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <h3 style={{ color: "var(--neon-white)", fontSize: "1.2rem", margin: 0, fontFamily: "var(--font-outfit)", fontWeight: 700, letterSpacing: "0.3px" }}>
                  View Entry / My Submissions
                </h3>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.84rem", margin: "4px 0 0 0", fontFamily: "var(--font-outfit)" }}>
                Track your submitted details & direct responses from the Heartist team
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowUserEntries(!showUserEntries)}
              style={{
                background: showUserEntries ? "var(--neon-yellow)" : "rgba(255, 255, 255, 0.08)",
                color: showUserEntries ? "#000" : "var(--neon-white)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                padding: "8px 16px",
                borderRadius: "20px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "var(--font-outfit)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s"
              }}
            >
              <span>{showUserEntries ? "Hide Entries" : "View Entries"} ({userEntries.length})</span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transform: showUserEntries ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease"
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Collapsible Entries Area */}
          {showUserEntries && (
            <div style={{ marginTop: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {loadingUserEntries ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)", fontFamily: "var(--font-outfit)" }}>
                  Loading your entries from Supabase...
                </div>
              ) : userEntries.length === 0 ? (
                <div
                  style={{
                    padding: "30px 20px",
                    textAlign: "center",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px dashed rgba(255,255,255,0.15)",
                    borderRadius: "12px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-outfit)",
                    fontSize: "0.92rem"
                  }}
                >
                  <p style={{ margin: "0 0 6px 0", color: "var(--neon-white)", fontWeight: 500 }}>No entries submitted yet.</p>
                  <span>Fill out the form in the box above to get involved and connect with us!</span>
                </div>
              ) : (
                userEntries.map((entry) => {
                  const badge = getInvolvementBadge(entry.data?.involvement);
                  const adminResp = adminResponses[entry.id];
                  const isHighlighted = highlightedEntryId === entry.id;

                  return (
                    <div
                      key={entry.id}
                      id={`entry-${entry.id}`}
                      className={isHighlighted ? "highlighted-entry-target" : ""}
                      style={{
                        background: isHighlighted ? "rgba(255, 215, 0, 0.12)" : "rgba(0, 0, 0, 0.5)",
                        border: isHighlighted
                          ? "2px solid var(--neon-yellow)"
                          : adminResp
                          ? "1px solid var(--neon-yellow)"
                          : "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "14px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                        boxShadow: isHighlighted
                          ? "0 0 28px rgba(255, 215, 0, 0.45)"
                          : adminResp
                          ? "0 0 18px rgba(255, 215, 0, 0.15)"
                          : "none",
                        transition: "all 0.35s ease",
                        scrollMarginTop: "140px"
                      }}
                    >
                      {/* Entry Header: Category Badge & Date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontFamily: "var(--font-outfit)" }}>
                            Category:
                          </span>
                          <span
                            style={{
                              fontSize: "0.82rem",
                              color: badge.text,
                              background: badge.bg,
                              border: `1px solid ${badge.border}`,
                              padding: "3px 12px",
                              borderRadius: "14px",
                              fontWeight: 600,
                              fontFamily: "var(--font-outfit)"
                            }}
                          >
                            {badge.label}
                          </span>
                          {isHighlighted && (
                            <span
                              style={{
                                fontSize: "0.72rem",
                                color: "#000",
                                background: "var(--neon-yellow)",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontWeight: 700,
                                fontFamily: "var(--font-outfit)",
                                letterSpacing: "0.4px"
                              }}
                            >
                              TARGET RESPONSE
                            </span>
                          )}
                        </div>

                        {entry.created_at && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "var(--font-outfit)" }}>
                            Submitted: {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      {/* Entry Submitted Details */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "rgba(255,255,255,0.02)", padding: "12px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ color: "var(--neon-white)", fontSize: "1rem", fontWeight: 500, fontFamily: "var(--font-outfit)" }}>
                          {entry.data?.name?.trim() || `${entry.data?.firstName || ""} ${entry.data?.lastName || ""}`.trim() || "Member"}
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", color: "var(--text-muted)", fontSize: "0.85rem", fontFamily: "var(--font-outfit)" }}>
                          <span>Email: <strong style={{ color: "var(--neon-white)" }}>{entry.data?.email || "Not specified"}</strong></span>
                          <span>Phone: <strong style={{ color: "var(--neon-white)" }}>{entry.data?.cellphone || "Not specified"}</strong></span>
                        </div>
                        {entry.data?.message && (
                          <div style={{ marginTop: "4px" }}>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", display: "block" }}>Your Message:</span>
                            <p style={{ margin: "2px 0 0 0", color: "rgba(255,255,255,0.9)", fontSize: "0.88rem", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                              "{entry.data.message}"
                            </p>
                          </div>
                        )}
                        {entry.data?.receiptUrl && (
                          <div style={{ marginTop: "6px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                            <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", display: "block", marginBottom: "4px" }}>
                              Uploaded Proof of Payment:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewReceiptUrl(entry.data!.receiptUrl!);
                                setPreviewReceiptTitle("My Uploaded Receipt");
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "rgba(0, 230, 118, 0.1)",
                                border: "1px solid rgba(0, 230, 118, 0.35)",
                                color: "#00E676",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                fontSize: "0.82rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: "var(--font-outfit)",
                                transition: "all 0.2s ease"
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="5" width="20" height="14" rx="2" />
                                <line x1="2" y1="10" x2="22" y2="10" />
                              </svg>
                              View Uploaded Receipt
                            </button>
                          </div>
                        )}
                      </div>

                      {/* ADMIN RESPONSE BOX (HIGHLIGHTED IF ADMIN SENT A MESSAGE) */}
                      {adminResp ? (
                        <div
                          style={{
                            padding: "16px",
                            borderRadius: "12px",
                            background: "rgba(255, 215, 0, 0.08)",
                            border: "1.5px solid var(--neon-yellow)",
                            boxShadow: "0 0 20px rgba(255, 215, 0, 0.18)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neon-yellow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              <span style={{ color: "var(--neon-yellow)", fontSize: "0.88rem", fontWeight: 700, fontFamily: "var(--font-outfit)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                Message from Heartist Team
                              </span>
                            </div>

                            <span style={{ color: "rgba(255, 215, 0, 0.8)", fontSize: "0.75rem", fontFamily: "var(--font-outfit)", fontWeight: 500 }}>
                              {adminResp.sentAt}
                            </span>
                          </div>

                          <p style={{ margin: 0, color: "var(--neon-white)", fontSize: "0.95rem", lineHeight: "1.5", whiteSpace: "pre-wrap", fontFamily: "var(--font-outfit)" }}>
                            {adminResp.message}
                          </p>
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "10px 14px",
                            borderRadius: "8px",
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px dashed rgba(255, 255, 255, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between"
                          }}
                        >
                          <span style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontFamily: "var(--font-outfit)" }}>
                            Status: Received • Waiting for response from Heartist Team
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      )}

      {/* 3. CSS-STYLED CONFIRMATION MODAL FOR REMOVING PICTURE (NO ALERT/CONFIRM) */}
      {showRemoveModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#121212",
              border: "1px solid var(--neon-yellow)",
              borderRadius: "16px",
              padding: "26px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 10px 32px rgba(0,0,0,0.8)",
              textAlign: "center",
              animation: "fadeIn 0.2s ease"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255, 59, 48, 0.15)",
                color: "#FF453A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto"
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>

            <h3
              style={{
                color: "var(--neon-white)",
                fontFamily: "var(--font-outfit)",
                fontSize: "1.25rem",
                margin: "0 0 10px 0",
                fontWeight: "bold"
              }}
            >
              Remove Picture?
            </h3>

            <p
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-outfit)",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                margin: "0 0 22px 0"
              }}
            >
              This will remove the current banner picture and revert to the default placeholder for all users.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowRemoveModal(false)}
                disabled={isUploadingBanner}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "var(--neon-white)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit)"
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRemovePicture}
                disabled={isUploadingBanner}
                style={{
                  padding: "10px 22px",
                  borderRadius: "8px",
                  background: "#FF453A",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit)"
                }}
              >
                {isUploadingBanner ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CSS-STYLED CONFIRMATION MODAL FOR DELETING SUBMISSION ENTRY (NO ALERT/CONFIRM) */}
      {entryToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px"
          }}
        >
          <div
            style={{
              background: "#121212",
              border: "1px solid rgba(255, 59, 48, 0.6)",
              borderRadius: "16px",
              padding: "26px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 10px 32px rgba(0,0,0,0.8)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              animation: "fadeIn 0.2s ease"
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(255, 59, 48, 0.15)",
                color: "#FF453A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto"
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>

            <h3
              style={{
                color: "var(--neon-white)",
                fontFamily: "var(--font-outfit)",
                fontSize: "1.2rem",
                margin: 0,
                fontWeight: "bold"
              }}
            >
              Delete Submission Entry?
            </h3>

            <p
              style={{
                color: "var(--text-muted)",
                fontFamily: "var(--font-outfit)",
                fontSize: "0.9rem",
                lineHeight: "1.5",
                margin: 0
              }}
            >
              Are you sure you want to permanently delete the entry for{" "}
              <strong style={{ color: "var(--neon-white)" }}>
                {entryToDelete.data?.name?.trim() || `${entryToDelete.data?.firstName || ""} ${entryToDelete.data?.lastName || ""}`.trim() || "Member"}
              </strong>
              ? This will remove their record from Supabase and free up space.
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setEntryToDelete(null)}
                disabled={isDeletingEntry}
                style={{
                  padding: "10px 20px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "var(--neon-white)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit)"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEntry}
                disabled={isDeletingEntry}
                style={{
                  padding: "10px 22px",
                  borderRadius: "8px",
                  background: "#FF453A",
                  border: "none",
                  color: "#fff",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: isDeletingEntry ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-outfit)",
                  opacity: isDeletingEntry ? 0.7 : 1
                }}
              >
                {isDeletingEntry ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. FULLSCREEN RECEIPT PREVIEW MODAL (LIGHTBOX FOR ADMIN & USER) */}
      {previewReceiptUrl && (
        <div
          onClick={() => setPreviewReceiptUrl(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: "20px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#121212",
              border: "1px solid rgba(255, 215, 0, 0.45)",
              borderRadius: "16px",
              padding: "16px 20px",
              maxWidth: "700px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 14px 40px rgba(0,0,0,0.9)",
              animation: "fadeIn 0.2s ease"
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
              <span style={{ color: "var(--neon-yellow)", fontWeight: 600, fontSize: "0.95rem", fontFamily: "var(--font-outfit)" }}>
                {previewReceiptTitle || "Payment Receipt"}
              </span>
              <button
                type="button"
                onClick={() => setPreviewReceiptUrl(null)}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-outfit)"
                }}
              >
                Close
              </button>
            </div>

            {/* Modal Image Display */}
            <div
              style={{
                width: "100%",
                maxHeight: "calc(90vh - 120px)",
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#080808",
                borderRadius: "10px",
                padding: "8px"
              }}
            >
              <img
                src={previewReceiptUrl}
                alt="Receipt Full View"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: "8px",
                  display: "block"
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Back to Home Button */}
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <Link
          href="/"
          className="nav-item"
          style={{
            padding: "10px 20px",
            border: "1px solid var(--neon-yellow)",
            borderRadius: "8px",
            textDecoration: "none",
            color: "var(--neon-yellow)",
            fontFamily: "var(--font-outfit)",
            fontWeight: 600
          }}
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
