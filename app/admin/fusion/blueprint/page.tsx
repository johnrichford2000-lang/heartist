"use client";

import { useState, useEffect } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown from "@/components/CustomDropdown";
import Cropper from "react-easy-crop";
import { fetchSystemSetting, saveSystemSetting, uploadFusionTeamImage } from "@/lib/fusionSync";

export default function AdminBlueprintPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [iterationsList, setIterationsList] = useState<number[]>([1, 2, 3, 4, 5]);

  // Bulletin State
  const [isRegOpen, setIsRegOpen] = useState(true);
  const [isPackingAnnounced, setIsPackingAnnounced] = useState(false);
  const [isItineraryAnnounced, setIsItineraryAnnounced] = useState(false);
  const [themeIteration, setThemeIteration] = useState("1");
  const [saveMessage, setSaveMessage] = useState("");

  // Packing List State
  const [packingList, setPackingList] = useState<{ id: number; item: string }[]>([
    { id: 1, item: "Bible, Notebook, & Pen" },
    { id: 2, item: "Extra T-Shirts (Yellow, White, Black)" },
    { id: 3, item: "Toiletries (Soap, Shampoo, Toothbrush)" },
    { id: 4, item: "Tumbler / Water Bottle" },
    { id: 5, item: "Flashlight / Powerbank" },
    { id: 6, item: "Sleeping Bag / Blanket" },
  ]);

  // Itinerary State
  const [itinerary, setItinerary] = useState<{ id: number; label: string; activities: string }[]>([
    { id: 1, label: "DAY 1", activities: "Arrival, Orientation, Opening Rally, Night Worship" },
    { id: 2, label: "DAY 2", activities: "Morning Devotion, Team Games, Plenary Sessions, Campfire" },
    { id: 3, label: "DAY 3", activities: "Acoustic Jam, Awarding Ceremony, Pack-up, Departure" },
  ]);

  // Meet the Team State
  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string; img: string; department: string; role: string; camp: string; church?: string; title?: string }[]>([]);
  const [newTeamMember, setNewTeamMember] = useState({ title: "", name: "", img: "", department: "Music Team", role: "Music Director", camp: "1", church: "" });
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [cropDataUrl, setCropDataUrl] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const DEPARTMENTS = ["Pastor", "Camp Coordinator", "Facilitators", "Media Team", "Music Team", "Dance Ministry"];
  const ROLES_MAP: Record<string, string[]> = {
    "Pastor": ["Senior Pastor", "Youth Pastor", "Guest Speaker", "Pastor"],
    "Camp Coordinator": ["Head Coordinator", "Assistant Coordinator", "Logistics", "Camp Coordinator"],
    "Facilitators": ["Head Facilitator", "Facilitator"],
    "Media Team": ["Tech Director", "Photographer", "Videographer", "Visuals", "Media Team"],
    "Music Team": ["Music Director", "Worship Leader", "Backup", "Keyboard 1", "Keyboard 2", "Lead Guitarist", "Rhythm Guitarist", "Bassist", "Drummer", "Acoustic Guitar"],
    "Dance Ministry": ["Dancer"]
  };

  const SUBHEADINGS_MAP: Record<string, { title: string, roles: string[] }[]> = {
    "Pastor": ROLES_MAP["Pastor"].map(r => ({ title: r, roles: [r] })),
    "Camp Coordinator": ROLES_MAP["Camp Coordinator"].map(r => ({ title: r, roles: [r] })),
    "Facilitators": ROLES_MAP["Facilitators"].map(r => ({ title: r, roles: [r] })),
    "Media Team": ROLES_MAP["Media Team"].map(r => ({ title: r, roles: [r] })),
    "Dance Ministry": ROLES_MAP["Dance Ministry"].map(r => ({ title: r, roles: [r] })),
    "Music Team": [
      { title: "Music Director", roles: ["Music Director"] },
      { title: "Worship Leader", roles: ["Worship Leader"] },
      { title: "Backup", roles: ["Backup"] },
      { title: "Keyboardist", roles: ["Keyboard 1", "Keyboard 2", "Keyboard", "Keyboardist"] },
      { title: "Acoustic Guitar", roles: ["Acoustic Guitar"] },
        { title: "Electric Guitar", roles: ["Lead Guitarist", "Rhythm Guitarist", "Electric Guitar", "Electric Guitar 1", "Electric Guitar 2", "Electric Guitar 1 (LEAD)", "Electric Guitar 2 (Rhythm)", "Electric Guitar (Lead)", "Electric Guitar (Rhythm)"] },
      { title: "Bassist", roles: ["Bassist"] },
      { title: "Drummer", roles: ["Drummer"] }
    ]
  };

  const [adminSelectedDept, setAdminSelectedDept] = useState<string>("ALL");
  const [adminSelectedCamp, setAdminSelectedCamp] = useState<string>("1");

  const MUSIC_TEAM_ORDER = [
      "Music Director",
      "Worship Leader",
      "Backup",
      "Keyboard 1",
      "Keyboard 2",
      "Acoustic Guitar",
      "Lead Guitarist",
      "Rhythm Guitarist",
      "Bassist",
      "Drummer"
    ];

  useEffect(() => {
    // Auth Protection
    if (typeof window !== "undefined") {
      if (localStorage.getItem("isAdminLoggedIn") !== "true") {
        window.location.href = "/login";
        return;
      }
      setIsLoggedIn(true);
    }

    const savedIters = localStorage.getItem("eventIterations");
    if (savedIters) {
      const parsed = JSON.parse(savedIters);
      setIterationsList(Array.from({ length: parsed.fusion || 5 }, (_, i) => i + 1));
    }

    const loadSettings = async () => {
      // Blueprint
      let blueprint = await fetchSystemSetting("fusionBlueprintData");
      if (!blueprint) {
        const savedBlueprint = localStorage.getItem("fusionBlueprintData");
        if (savedBlueprint) {
          blueprint = JSON.parse(savedBlueprint);
          await saveSystemSetting("fusionBlueprintData", blueprint);
        }
      }
      if (blueprint) {
        setIsRegOpen(blueprint.isRegistrationOpen ?? true);
        setIsPackingAnnounced(blueprint.isPackingAnnounced ?? false);
        setIsItineraryAnnounced(blueprint.isItineraryAnnounced ?? false);
        setThemeIteration(blueprint.themeIteration || "1");
      }

      // Packing
      let packing = await fetchSystemSetting("fusionPackingList");
      if (!packing) {
        const savedPacking = localStorage.getItem("fusionPackingList");
        if (savedPacking) packing = JSON.parse(savedPacking);
        if (packing) await saveSystemSetting("fusionPackingList", packing);
      }
      if (packing) setPackingList(packing);

      // Itinerary
      let itin = await fetchSystemSetting("fusionItinerary");
      if (!itin) {
        const savedItin = localStorage.getItem("fusionItinerary");
        if (savedItin) itin = JSON.parse(savedItin);
        if (itin) await saveSystemSetting("fusionItinerary", itin);
      }
      if (itin) setItinerary(itin);

      // Team
      let team = await fetchSystemSetting("fusionTeamMembers");
      if (!team) {
        const savedTeam = localStorage.getItem("fusionTeamMembers");
        if (savedTeam) {
          team = JSON.parse(savedTeam);
          let needsSave = false;
          for (let i = 0; i < team.length; i++) {
            if (team[i].img && team[i].img.startsWith("data:")) {
              const url = await uploadFusionTeamImage(team[i].img, team[i].name);
              if (url) {
                team[i].img = url;
                needsSave = true;
              }
            }
          }
          if (needsSave) await saveSystemSetting("fusionTeamMembers", team);
        }
      }
      if (team) setTeamMembers(team);
    };

    loadSettings();
    
    const params = new URLSearchParams(window.location.search);
    if (params.get('scrollTo') === 'bulletin') {
      window.scrollTo(0, 0);
      setTimeout(() => {
        const el = document.getElementById('bulletin');
        if (el) {
          const targetPosition = el.getBoundingClientRect().top + window.scrollY - 80;
          const startPosition = window.scrollY;
          const distance = targetPosition - startPosition;
          const duration = 1200; // 1.2s smooth slide
          let start: number | null = null;

          const animation = (currentTime: number) => {
            if (start === null) start = currentTime;
            const timeElapsed = currentTime - start;
            const progress = Math.min(timeElapsed / duration, 1);
            
            const ease = progress < 0.5 
              ? 4 * progress * progress * progress 
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            window.scrollTo(0, startPosition + distance * ease);

            if (timeElapsed < duration) {
              requestAnimationFrame(animation);
            }
          };

          requestAnimationFrame(animation);
        }
      }, 500);
    }
  }, []);

  const handleSaveBulletin = async () => {
    const data = {
      isRegistrationOpen: isRegOpen,
      isPackingAnnounced: isPackingAnnounced,
      isItineraryAnnounced: isItineraryAnnounced,
      themeIteration: themeIteration,
      timestamp: new Date().toISOString()
    };
    await saveSystemSetting("fusionBlueprintData", data);
    localStorage.setItem("fusionBlueprintData", JSON.stringify(data));
    window.dispatchEvent(new Event("storage"));
    setSaveMessage("Bulletin settings saved!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const togglePackingAnnouncement = async () => {
    const newVal = !isPackingAnnounced;
    setIsPackingAnnounced(newVal);
    const data = {
      isRegistrationOpen: isRegOpen,
      isPackingAnnounced: newVal,
      isItineraryAnnounced: isItineraryAnnounced,
      themeIteration: themeIteration,
      timestamp: new Date().toISOString()
    };
    await saveSystemSetting("fusionBlueprintData", data);
    localStorage.setItem("fusionBlueprintData", JSON.stringify(data));
    window.dispatchEvent(new Event("storage"));
  };

  const toggleItineraryAnnouncement = async () => {
    const newVal = !isItineraryAnnounced;
    setIsItineraryAnnounced(newVal);
    const data = {
      isRegistrationOpen: isRegOpen,
      isPackingAnnounced: isPackingAnnounced,
      isItineraryAnnounced: newVal,
      themeIteration: themeIteration,
      timestamp: new Date().toISOString()
    };
    await saveSystemSetting("fusionBlueprintData", data);
    localStorage.setItem("fusionBlueprintData", JSON.stringify(data));
    window.dispatchEvent(new Event("storage"));
  };

  const handleSavePacking = async () => {
    await saveSystemSetting("fusionPackingList", packingList);
    localStorage.setItem("fusionPackingList", JSON.stringify(packingList));

    const data = {
      isRegistrationOpen: isRegOpen,
      isPackingAnnounced: isPackingAnnounced,
      isItineraryAnnounced: isItineraryAnnounced,
      themeIteration: themeIteration,
      timestamp: new Date().toISOString()
    };
    await saveSystemSetting("fusionBlueprintData", data);
    localStorage.setItem("fusionBlueprintData", JSON.stringify(data));
    window.dispatchEvent(new Event("storage"));

    setSaveMessage("Packing list & announcement settings saved!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleSaveItinerary = async () => {
    await saveSystemSetting("fusionItinerary", itinerary);
    localStorage.setItem("fusionItinerary", JSON.stringify(itinerary));

    const data = {
      isRegistrationOpen: isRegOpen,
      isPackingAnnounced: isPackingAnnounced,
      isItineraryAnnounced: isItineraryAnnounced,
      themeIteration: themeIteration,
      timestamp: new Date().toISOString()
    };
    await saveSystemSetting("fusionBlueprintData", data);
    localStorage.setItem("fusionBlueprintData", JSON.stringify(data));
    window.dispatchEvent(new Event("storage"));

    setSaveMessage("Itinerary & announcement settings saved!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const addPackingItem = () => {
    const newId = packingList.length > 0 ? Math.max(...packingList.map(i => i.id)) + 1 : 1;
    setPackingList([...packingList, { id: newId, item: "New Item" }]);
  };

  const updatePackingItem = (id: number, val: string) => {
    setPackingList(prev => prev.map(i => i.id === id ? { ...i, item: val } : i));
  };

  const deletePackingItem = (id: number) => {
    setPackingList(prev => prev.filter(i => i.id !== id));
  };

  const addItineraryDay = () => {
    const newId = itinerary.length > 0 ? Math.max(...itinerary.map(d => d.id)) + 1 : 1;
    setItinerary([...itinerary, { id: newId, label: `DAY ${itinerary.length + 1}`, activities: "" }]);
  };

  const updateItineraryDay = (id: number, field: "label" | "activities", val: string) => {
    setItinerary(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d));
  };

  const deleteItineraryDay = (id: number) => {
    setItinerary(prev => prev.filter(d => d.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgUrl = event.target?.result as string;
      setCropDataUrl(imgUrl);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const saveCroppedImage = () => {
    if (!cropDataUrl || !croppedAreaPixels) {
      setShowCropper(false);
      return;
    }

    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = cropDataUrl;

    image.onload = () => {
      canvas.width = 150;
      canvas.height = 150;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        150,
        150
      );

      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      setNewTeamMember(prev => ({ ...prev, img: dataUrl }));
      setShowCropper(false);
    };
  };

  const saveTeamMember = async () => {
    if (!newTeamMember.name) {
      setSaveMessage("Please enter a name");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }
    
    setSaveMessage("Saving team member...");
    
    let finalImgUrl = newTeamMember.img;
    if (finalImgUrl && finalImgUrl.startsWith("data:")) {
      const url = await uploadFusionTeamImage(finalImgUrl, newTeamMember.name);
      if (url) finalImgUrl = url;
    }

    let updatedTeam;
    const memberToSave = { ...newTeamMember, img: finalImgUrl };

    if (editingMemberId !== null) {
      updatedTeam = teamMembers.map(m => m.id === editingMemberId ? { ...memberToSave, id: editingMemberId } : m);
      setEditingMemberId(null);
    } else {
      const newId = teamMembers.length > 0 ? Math.max(...teamMembers.map(m => m.id)) + 1 : 1;
      updatedTeam = [...teamMembers, { ...memberToSave, id: newId }];
    }
    
    setTeamMembers(updatedTeam);
    await saveSystemSetting("fusionTeamMembers", updatedTeam);
    localStorage.setItem("fusionTeamMembers", JSON.stringify(updatedTeam));
    setNewTeamMember(prev => ({ ...prev, title: "", name: "", img: "", church: "" }));
    setSaveMessage("Team member saved!");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const cancelEdit = () => {
    setEditingMemberId(null);
    setNewTeamMember(prev => ({ ...prev, title: "", name: "", img: "", church: "" }));
  };

  const editTeamMember = (member: any) => {
    setEditingMemberId(member.id);
    setNewTeamMember({
      title: member.title || "",
      name: member.name,
      img: member.img,
      department: member.department,
      role: member.role,
      camp: member.camp,
      church: member.church || ""
    });
    document.getElementById("meet-the-team-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const duplicateTeamMember = (member: any) => {
    setNewTeamMember({
      title: member.title || "",
      name: `${member.name} (Copy)`,
      img: member.img,
      department: member.department,
      role: member.role,
      camp: member.camp,
      church: member.church || ""
    });
    setEditingMemberId(null);
    document.getElementById("meet-the-team-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const deleteTeamMember = async (id: number) => {
    const updatedTeam = teamMembers.filter(m => m.id !== id);
    setTeamMembers(updatedTeam);
    await saveSystemSetting("fusionTeamMembers", updatedTeam);
    localStorage.setItem("fusionTeamMembers", JSON.stringify(updatedTeam));
  };

  const filteredAdminTeam = teamMembers
    .filter(m => (adminSelectedDept === "ALL" || m.department === adminSelectedDept) && m.camp === adminSelectedCamp)
    .sort((a, b) => {
      if (a.department === "Music Team" && b.department === "Music Team") {
        const indexA = MUSIC_TEAM_ORDER.indexOf(a.role);
        const indexB = MUSIC_TEAM_ORDER.indexOf(b.role);
        const finalA = indexA === -1 ? 999 : indexA;
        const finalB = indexB === -1 ? 999 : indexB;
        return finalA - finalB;
      }
      const deptOrder = ["Pastor", "Camp Coordinator", "Facilitators", "Media Team", "Music Team", "Dance Ministry"];
      const deptA = deptOrder.indexOf(a.department);
      const deptB = deptOrder.indexOf(b.department);
      if (deptA !== deptB) return deptA - deptB;
      return 0;
    });

  if (!isLoggedIn) return null;

  return (
    <>
      {saveMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0, 255, 0, 0.1)",
          border: "1px solid #00ff00",
          boxShadow: "0 0 15px rgba(0, 255, 0, 0.4)",
          padding: "15px 30px",
          borderRadius: "8px",
          color: "var(--neon-white)",
          fontFamily: "var(--font-outfit)",
          fontWeight: "bold",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          animation: "fadeInDown 0.3s ease forwards"
        }}>
          <span>✅</span>
          {saveMessage}
        </div>
      )}
      <main className="main-container" style={{ padding: "80px 20px" }}>
      <header style={{ marginBottom: "40px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1 className="header-title glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}>
          Manage Blueprint
        </h1>
        <h2 style={{ color: "var(--neon-white)", fontSize: "1.2rem", marginTop: "10px", fontFamily: "var(--font-outfit)", fontStyle: "italic" }}>
          Update the bulletin, packing list, and itinerary.
        </h2>
      </header>

      {/* The Bulletin Controls */}
      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-yellow)" }}>
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>The Bulletin Settings</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Control registration status and select which theme to reveal.</p>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Registration Status</label>
            <CustomDropdown
              value={isRegOpen ? "open" : "closed"}
              onChange={(val) => setIsRegOpen(val === "open")}
              options={[
                { value: "open", label: "Open for Registration" },
                { value: "closed", label: "Registration Closed" }
              ]}
            />
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Theme Reveal Iteration</label>
            <CustomDropdown
              value={themeIteration}
              onChange={(val) => setThemeIteration(val)}
              options={iterationsList.map(num => ({ value: num.toString(), label: `Fusion Camp ${num}` }))}
            />
          </div>
          <div>
            <button 
              onClick={handleSaveBulletin}
              className="glow-text-yellow"
              style={{ padding: "12px 25px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s" }}
            >
              Save Bulletin
            </button>
          </div>
        </div>
      </section>

      {/* Packing List Manager */}
      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-white)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>Packing List (Pabaon)</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Add or remove items campers need to bring.</p>
          </div>
          <button 
            onClick={addPackingItem}
            style={{ padding: "8px 15px", background: "rgba(0, 255, 128, 0.2)", color: "#00FF80", border: "1px solid #00FF80", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)" }}
          >
            + Add Item
          </button>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          {packingList.map(item => (
            <div key={item.id} style={{ display: "flex", gap: "10px" }}>
              <input 
                type="text"
                value={item.item}
                onChange={(e) => updatePackingItem(item.id, e.target.value)}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
              />
              <button 
                onClick={() => deletePackingItem(item.id)}
                style={{ padding: "0 15px", background: "rgba(255, 0, 0, 0.2)", color: "#FF4444", border: "1px solid #FF4444", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                X
              </button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "15px" }}>
            <button 
              onClick={togglePackingAnnouncement}
              style={{
                padding: "12px 20px", 
                background: isPackingAnnounced ? "#00c853" : "#d50000", 
                color: "white", 
                border: "none", 
                borderRadius: "8px", 
                fontFamily: "var(--font-outfit)", 
                fontWeight: "bold", 
                cursor: "pointer", 
                transition: "all 0.3s"
              }}
            >
              Add to Announcement: {isPackingAnnounced ? "ON" : "OFF"}
            </button>
            <button 
              onClick={handleSavePacking}
              className="glow-text-white"
              style={{ padding: "12px 25px", background: "var(--neon-white)", color: "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s" }}
            >
              Save Packing List
            </button>
          </div>
        </div>
      </section>

      {/* Itinerary Manager */}
      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-yellow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>Camp Itinerary</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Manage the schedule and activities for each day.</p>
          </div>
          <button 
            onClick={addItineraryDay}
            style={{ padding: "8px 15px", background: "rgba(0, 255, 128, 0.2)", color: "#00FF80", border: "1px solid #00FF80", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)" }}
          >
            + Add Day
          </button>
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginBottom: "20px" }}>
          {itinerary.map((day) => (
            <div key={day.id} style={{ padding: "15px", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <input 
                  type="text"
                  value={day.label}
                  placeholder="e.g. DAY 1"
                  onChange={(e) => updateItineraryDay(day.id, "label", e.target.value)}
                  style={{ width: "150px", padding: "8px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "var(--neon-yellow)", fontWeight: "bold", outline: "none", fontFamily: "var(--font-outfit)" }}
                />
                <button 
                  onClick={() => deleteItineraryDay(day.id)}
                  style={{ padding: "5px 10px", background: "rgba(255, 0, 0, 0.2)", color: "#FF4444", border: "1px solid #FF4444", borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem" }}
                >
                  Delete Day
                </button>
              </div>
              <textarea 
                value={day.activities}
                placeholder="Activities (e.g. Arrival, Orientation, Night Worship)"
                onChange={(e) => updateItineraryDay(day.id, "activities", e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", minHeight: "60px", resize: "vertical" }}
              />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "15px" }}>
          <button 
            onClick={toggleItineraryAnnouncement}
            style={{
              padding: "12px 20px", 
              background: isItineraryAnnounced ? "#00c853" : "#d50000", 
              color: "white", 
              border: "none", 
              borderRadius: "8px", 
              fontFamily: "var(--font-outfit)", 
              fontWeight: "bold", 
              cursor: "pointer", 
              transition: "all 0.3s"
            }}
          >
            Add to Announcement: {isItineraryAnnounced ? "ON" : "OFF"}
          </button>
          <button 
            onClick={handleSaveItinerary}
            className="glow-text-yellow"
            style={{ padding: "12px 25px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s" }}
          >
            Save Itinerary
          </button>
        </div>
      </section>

      {/* 4. Meet the Team Manager */}
      <section id="meet-the-team-section" className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-white)" }}>
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>Meet The Team Manager</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Add or edit team members to display on the Blueprint.</p>
        </div>

        {/* Add New Member Form */}
        <div style={{ background: "rgba(255,255,255,0.02)", padding: "20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", marginBottom: "30px" }}>
          <h4 style={{ color: "var(--neon-yellow)", marginBottom: "15px", fontFamily: "var(--font-outfit)" }}>{editingMemberId ? "Edit Member" : "Add New Member"}</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "flex-end" }}>
            <div style={{ flex: "0 0 80px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Title</label>
              <CustomDropdown 
                value={newTeamMember.title} 
                onChange={val => setNewTeamMember({...newTeamMember, title: val})} 
                options={[{ value: "", label: "None" }, { value: "Bro.", label: "Bro." }, { value: "Sis.", label: "Sis." }, { value: "Ptr.", label: "Ptr." }, { value: "Ma'am", label: "Ma'am" }, { value: "Sir", label: "Sir" }, { value: "Kuya", label: "Kuya" }, { value: "Ate", label: "Ate" }]} 
              />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Name</label>
              <input type="text" value={newTeamMember.name} onChange={e => setNewTeamMember({...newTeamMember, name: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none" }} placeholder="e.g. Khen" />
            </div>
            <div style={{ flex: "1 1 200px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Upload Picture</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ width: "100%", padding: "8px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontSize: "0.85rem" }} />
                {newTeamMember.img && (
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", overflow: "hidden", flexShrink: 0 }}>
                    <img src={newTeamMember.img} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                )}
              </div>
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Department</label>
              <CustomDropdown 
                value={newTeamMember.department} 
                onChange={val => setNewTeamMember({...newTeamMember, department: val, role: ROLES_MAP[val][0]})} 
                options={DEPARTMENTS.map(d => ({ value: d, label: d }))} 
              />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Role</label>
              <CustomDropdown 
                value={newTeamMember.role} 
                onChange={val => setNewTeamMember({...newTeamMember, role: val})} 
                options={ROLES_MAP[newTeamMember.department].map(r => ({ value: r, label: r }))} 
              />
            </div>
            <div style={{ flex: "1 1 120px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Assigned Camp</label>
              <CustomDropdown 
                value={newTeamMember.camp} 
                onChange={val => setNewTeamMember({...newTeamMember, camp: val})} 
                options={iterationsList.map(n => ({ value: n.toString(), label: `Fusion ${n}` }))} 
              />
            </div>
            <div style={{ flex: "1 1 150px" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Church (Optional)</label>
              <input type="text" value={newTeamMember.church || ""} onChange={e => setNewTeamMember({...newTeamMember, church: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none" }} placeholder="e.g. Heartist" />
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={saveTeamMember} style={{ padding: "12px 20px", background: editingMemberId ? "rgba(255, 234, 0, 0.2)" : "rgba(0, 255, 128, 0.2)", color: editingMemberId ? "var(--neon-yellow)" : "#00FF80", border: `1px solid ${editingMemberId ? "var(--neon-yellow)" : "#00FF80"}`, borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
                {editingMemberId ? "Update Member" : "Add Member"}
              </button>
              {(editingMemberId || newTeamMember.name || newTeamMember.img) && (
                  <button onClick={cancelEdit} style={{ padding: "12px 20px", background: "rgba(255, 68, 68, 0.2)", color: "#ff4444", border: "1px solid rgba(255, 68, 68, 0.4)", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", transition: "all 0.3s" }}>
                    Cancel / Clear
                  </button>
                )}
            </div>
          </div>
        </div>

        {/* Filter and List of Members */}
        <div style={{ background: "rgba(0,0,0,0.2)", padding: "20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "20px" }}>
          <h4 style={{ color: "var(--neon-white)", marginBottom: "15px", fontFamily: "var(--font-outfit)" }}>Manage Team Members</h4>
          
          {/* Admin Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Filter by Department</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {["ALL", ...DEPARTMENTS].map(dept => (
                  <button 
                    key={dept}
                    onClick={() => setAdminSelectedDept(dept)}
                    style={{
                      padding: "6px 12px",
                      background: adminSelectedDept === dept ? "var(--neon-yellow)" : "transparent",
                      color: adminSelectedDept === dept ? "black" : "var(--neon-yellow)",
                      border: "1px solid var(--neon-yellow)",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: adminSelectedDept === dept ? "bold" : "normal"
                    }}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "5px" }}>Filter by Camp</label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {iterationsList.map(n => (
                  <button 
                    key={n}
                    onClick={() => setAdminSelectedCamp(n.toString())}
                    style={{
                      padding: "6px 12px",
                      background: adminSelectedCamp === n.toString() ? "var(--neon-white)" : "transparent",
                      color: adminSelectedCamp === n.toString() ? "black" : "var(--neon-white)",
                      border: "1px solid var(--neon-white)",
                      borderRadius: "20px",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: adminSelectedCamp === n.toString() ? "bold" : "normal"
                    }}
                  >
                    Fusion {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {adminSelectedDept === "ALL" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
              {filteredAdminTeam.length > 0 ? (
                DEPARTMENTS.map(dept => {
                  const deptMembers = filteredAdminTeam.filter(m => m.department === dept);
                  if (deptMembers.length === 0) return null;
                  return (
                    <div key={dept} style={{ marginBottom: "20px" }}>
                      <h4 style={{ color: "var(--neon-yellow)", fontSize: "1.3rem", fontFamily: "var(--font-outfit)", marginBottom: "20px", textTransform: "uppercase", borderBottom: "2px solid rgba(255,255,255,0.2)", paddingBottom: "5px" }}>{dept}</h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                        {(SUBHEADINGS_MAP[dept] || []).map(group => {
                          const groupMembers = deptMembers.filter(m => group.roles.includes(m.role)).sort((a, b) => a.name.localeCompare(b.name));
                          if (groupMembers.length === 0) return null;
                          return (
                            <div key={group.title}>
                              <h5 style={{ color: "var(--neon-white)", fontSize: "1rem", fontFamily: "var(--font-outfit)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.8 }}>{group.title}</h5>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "15px" }}>
                                {groupMembers.map(m => (
                                  <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "15px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
                                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                                      <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", overflow: "hidden", flexShrink: 0 }}>
                                        {m.img && m.img.startsWith("data:") ? <img src={m.img} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.img && m.img.startsWith("http") ? <img src={m.img} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.img || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"}
                                      </div>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: "bold", color: "var(--neon-white)", wordBreak: "break-word" }}>{m.title ? `${m.title} ${m.name}` : m.name}</div>
                                        <div style={{ fontSize: "0.8rem", color: "var(--neon-yellow)" }}>{m.role}</div>
                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.department} • Fusion {m.camp} {m.church ? `• ${m.church}` : ""}</div>
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "10px", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px", justifyContent: "flex-end" }}>
                                      <button onClick={() => editTeamMember(m)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", color: "var(--neon-white)", padding: "5px 15px", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }}>Edit</button>
                                      <button onClick={() => duplicateTeamMember(m)} style={{ background: "rgba(255,234,0,0.1)", border: "1px solid rgba(255,234,0,0.3)", borderRadius: "4px", color: "var(--neon-yellow)", padding: "5px 15px", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }}>Copy</button>
                                      <button onClick={() => deleteTeamMember(m.id)} style={{ background: "none", border: "none", color: "#FF4444", fontSize: "1.2rem", cursor: "pointer", fontWeight: "bold", marginLeft: "10px", padding: "0 5px" }}>X</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No team members found for this filter.</p>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
              {filteredAdminTeam.length > 0 ? (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                    {(SUBHEADINGS_MAP[adminSelectedDept] || []).map(group => {
                      const groupMembers = filteredAdminTeam.filter(m => group.roles.includes(m.role)).sort((a, b) => a.name.localeCompare(b.name));
                      if (groupMembers.length === 0) return null;
                      return (
                        <div key={group.title}>
                          <h5 style={{ color: "var(--neon-white)", fontSize: "1rem", fontFamily: "var(--font-outfit)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.8 }}>{group.title}</h5>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "15px" }}>
                            {groupMembers.map(m => (
                              <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: "15px", padding: "15px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}>
                                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                                  <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", overflow: "hidden", flexShrink: 0 }}>
                                    {m.img && m.img.startsWith("data:") ? <img src={m.img} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.img && m.img.startsWith("http") ? <img src={m.img} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.img || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: "bold", color: "var(--neon-white)", wordBreak: "break-word" }}>{m.title ? `${m.title} ${m.name}` : m.name}</div>
                                    <div style={{ fontSize: "0.8rem", color: "var(--neon-yellow)" }}>{m.role}</div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.department} • Fusion {m.camp} {m.church ? `• ${m.church}` : ""}</div>
                                  </div>
                                </div>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "10px", justifyContent: "flex-end" }}>
                                  <button onClick={() => editTeamMember(m)} style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", color: "var(--neon-white)", padding: "5px 15px", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }}>Edit</button>
                                  <button onClick={() => duplicateTeamMember(m)} style={{ background: "rgba(255,234,0,0.1)", border: "1px solid rgba(255,234,0,0.3)", borderRadius: "4px", color: "var(--neon-yellow)", padding: "5px 15px", fontSize: "0.8rem", cursor: "pointer", transition: "all 0.2s" }}>Copy</button>
                                  <button onClick={() => deleteTeamMember(m.id)} style={{ background: "none", border: "none", color: "#FF4444", fontSize: "1.2rem", cursor: "pointer", fontWeight: "bold", marginLeft: "10px", padding: "0 5px" }}>X</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>No team members found for this filter.</p>
              )}
            </div>
          )}
        </div>
      </section>

      <div style={{ paddingBottom: "100px" }}></div>

      {/* Cropper Modal */}
      {showCropper && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "relative", width: "80%", height: "60vh", background: "#333", borderRadius: "10px", overflow: "hidden" }}>
            <Cropper
              image={cropDataUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div style={{ marginTop: "20px", display: "flex", gap: "20px" }}>
            <button onClick={() => setShowCropper(false)} style={{ padding: "10px 20px", background: "transparent", color: "white", border: "1px solid white", borderRadius: "5px", cursor: "pointer" }}>Cancel</button>
            <button onClick={saveCroppedImage} style={{ padding: "10px 20px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>Save Crop</button>
          </div>
        </div>
      )}
    </main>
    </>
  );
}
