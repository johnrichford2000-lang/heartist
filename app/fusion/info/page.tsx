"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";
import { fetchSystemSetting } from "@/lib/fusionSync";
import { supabase } from "@/lib/supabase";
import AnimatedDropdown from "@/components/AnimatedDropdown";

export default function BlueprintPage() {
  // Bulletin State
  const [isRegOpen, setIsRegOpen] = useState(true);
  const [themeWord, setThemeWord] = useState("IGNITE");
  const [themeSub, setThemeSub] = useState("our passion and creativity all for God's glory.");

  // Packing List State
  const [packingList, setPackingList] = useState<{ id: number; item: string; checked: boolean }[]>([
    { id: 1, item: "Bible, Notebook, & Pen", checked: false },
    { id: 2, item: "Extra T-Shirts (Yellow, White, Black)", checked: false },
    { id: 3, item: "Toiletries (Soap, Shampoo, Toothbrush)", checked: false },
    { id: 4, item: "Tumbler / Water Bottle", checked: false },
    { id: 5, item: "Flashlight / Powerbank", checked: false },
    { id: 6, item: "Sleeping Bag / Blanket", checked: false },
  ]);

  // Itinerary State
  const [itinerary, setItinerary] = useState<{ id: number; label: string; activities: string }[]>([
    { id: 1, label: "DAY 1", activities: "Arrival, Orientation, Opening Rally, Night Worship" },
    { id: 2, label: "DAY 2", activities: "Morning Devotion, Team Games, Plenary Sessions, Campfire" },
    { id: 3, label: "DAY 3", activities: "Acoustic Jam, Awarding Ceremony, Pack-up, Departure" },
  ]);

  const toggleCheck = (id: number) => {
    setPackingList(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
      // Optional: Save user's checked state locally so it persists
      const checkedIds = updated.filter(i => i.checked).map(i => i.id);
      localStorage.setItem("userCheckedPackingList", JSON.stringify(checkedIds));
      return updated;
    });
  };

  const [teamMembers, setTeamMembers] = useState<{ id: number; name: string; img: string; department: string; role: string; camp: string; church?: string; title?: string }[]>([]);
  const [selectedTeamType, setSelectedTeamType] = useState<string>("ALL");
  const [selectedTeamCamp, setSelectedTeamCamp] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  
  useEffect(() => {
    const loadBlueprintData = async () => {
      let iterationToLoad = "1";
      
      let blueprint = await fetchSystemSetting("fusionBlueprintData");
      if (!blueprint) {
        const savedBlueprint = localStorage.getItem("fusionBlueprintData");
        if (savedBlueprint) blueprint = JSON.parse(savedBlueprint);
      }
      if (blueprint) {
        setIsRegOpen(blueprint.isRegistrationOpen ?? true);
        iterationToLoad = blueprint.themeIteration || "1";
      }

      const savedTheme = localStorage.getItem(`fusionTheme_${iterationToLoad}`);
      if (savedTheme) {
        const parsedTheme = JSON.parse(savedTheme);
        setThemeWord(parsedTheme.word || "IGNITE");
        setThemeSub(parsedTheme.subtext || "our passion and creativity all for God's glory.");
      }

      let packingListFromDB = await fetchSystemSetting("fusionPackingList");
      if (!packingListFromDB) {
        const savedPacking = localStorage.getItem("fusionPackingList");
        if (savedPacking) packingListFromDB = JSON.parse(savedPacking);
      }
      const userChecked = localStorage.getItem("userCheckedPackingList");
      const checkedIds = userChecked ? JSON.parse(userChecked) : [];

      if (packingListFromDB) {
        setPackingList(packingListFromDB.map((item: any) => ({
          ...item,
          checked: checkedIds.includes(item.id)
        })));
      } else {
        setPackingList(prev => prev.map(item => ({ ...item, checked: checkedIds.includes(item.id) })));
      }

      let itin = await fetchSystemSetting("fusionItinerary");
      if (!itin) {
        const savedItin = localStorage.getItem("fusionItinerary");
        if (savedItin) itin = JSON.parse(savedItin);
      }
      if (itin) setItinerary(itin);

      let team = await fetchSystemSetting("fusionTeamMembers");
      if (!team) {
        const savedTeam = localStorage.getItem("fusionTeamMembers");
        if (savedTeam) team = JSON.parse(savedTeam);
      }
      if (team) setTeamMembers(team);
    };

    loadBlueprintData();
    window.addEventListener("storage", loadBlueprintData);
    
    const params = new URLSearchParams(window.location.search);
    const targetId = params.get('scrollTo');
    if (targetId) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      
      let attempts = 0;
      const maxAttempts = 40;
      const interval = setInterval(() => {
        attempts++;
        const el = document.getElementById(targetId);
        if (el) {
          clearInterval(interval);
          
          setTimeout(() => {
            const startPosition = window.scrollY || window.pageYOffset || 0;
            const targetPosition = Math.max(0, el.getBoundingClientRect().top + startPosition - 90);
            const distance = targetPosition - startPosition;
            const duration = Math.min(Math.max(Math.abs(distance) * 0.7, 1400), 2800);
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
              } else {
                // Highlight pulse effect on the section
                const origTransition = el.style.transition;
                const origTransform = el.style.transform;
                const origShadow = el.style.boxShadow;
                const origBorder = el.style.border;

                el.style.transition = "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
                el.style.transform = "scale(1.02)";
                el.style.boxShadow = "0 0 25px rgba(255, 234, 0, 0.6), inset 0 0 10px rgba(255, 234, 0, 0.2)";
                el.style.border = "1px solid var(--neon-yellow)";

                setTimeout(() => {
                  el.style.transform = origTransform || "";
                  el.style.boxShadow = origShadow || "";
                  el.style.border = origBorder || "";
                  setTimeout(() => {
                    el.style.transition = origTransition || "";
                  }, 500);
                }, 2000);
              }
            };

            requestAnimationFrame(animation);
          }, 100);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 50);
    }
    
    
      const channel = supabase.channel('system_settings_changes_info')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => {
          loadBlueprintData();
        })
        .subscribe();

      return () => {
        window.removeEventListener("storage", loadBlueprintData);
        supabase.removeChannel(channel);
      };

  }, []);

  // Dynamically generated lists from actual uploaded members (Auto-Synchronized)
  const availableCampsRaw = Array.from(new Set(teamMembers.map(m => m.camp))).sort();
  const availableCamps = [...availableCampsRaw.map(c => `Fusion ${c}`)];

  const availableDepartments = ["ALL", ...Array.from(new Set(teamMembers
    .filter(m => `Fusion ${m.camp}` === selectedTeamCamp)
    .map(m => m.department)
  ))];

  const GLOBAL_ROLE_ORDER = [
    // Pastor
    "Guest Speaker", "Senior Pastor", "Youth Pastor", "Pastor",
    // Camp Coordinator
    "Camp Coordinator", "Head Coordinator", "Assistant Coordinator", "Logistics",
    // Facilitators
    "Head Facilitator", "Facilitator",
    // Media Team
    "Media Team", "Photographer", "Videographer", "Visuals", "Tech Director",
    // Music Team
    "Music Director", "Worship Leader", "Backup", "Keyboard 1", "Keyboard 2", "Acoustic Guitar", "Lead Guitarist", "Rhythm Guitarist", "Bassist", "Drummer",
    // Dance Ministry
    "Dancer"
  ];

  const sortRoles = (a: string, b: string) => {
    const idxA = GLOBAL_ROLE_ORDER.indexOf(a);
    const idxB = GLOBAL_ROLE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  };

  const ROLE_GROUP_MAP: Record<string, string> = {
      "Keyboard 1": "Keyboardist",
      "Keyboard 2": "Keyboardist",
      "Keyboard": "Keyboardist",
      "Keyboardist": "Keyboardist",
      "Lead Guitarist": "Electric Guitar",
      "Rhythm Guitarist": "Electric Guitar",
      "Electric Guitar 1 (LEAD)": "Electric Guitar",
      "Electric Guitar 2 (Rhythm)": "Electric Guitar",
      "Electric Guitar 1": "Electric Guitar",
      "Electric Guitar 2": "Electric Guitar",
      "Electric Guitar (Lead)": "Electric Guitar",
      "Electric Guitar (Rhythm)": "Electric Guitar",
      "Electric Guitar": "Electric Guitar"
    };

  const getRoleGroup = (role: string) => ROLE_GROUP_MAP[role] || role;

  const GLOBAL_GROUP_ORDER = [
    // Pastor
    "Guest Speaker", "Senior Pastor", "Youth Pastor", "Pastor",
    // Camp Coordinator
    "Camp Coordinator", "Head Coordinator", "Assistant Coordinator", "Logistics",
    // Facilitators
    "Head Facilitator", "Facilitator",
    // Media Team
    "Media Team", "Photographer", "Videographer", "Visuals", "Tech Director",
    // Music Team
    "Music Director", "Worship Leader", "Backup", "Keyboardist", "Acoustic Guitar", "Electric Guitar", "Bassist", "Drummer",
    // Dance Ministry
    "Dancer"
  ];

  const sortGroups = (a: string, b: string) => {
    const idxA = GLOBAL_GROUP_ORDER.indexOf(a);
    const idxB = GLOBAL_GROUP_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  };

  const availableRolesRaw = Array.from(new Set(teamMembers
    .filter(m => `Fusion ${m.camp}` === selectedTeamCamp)
    .filter(m => selectedTeamType === "ALL" || m.department === selectedTeamType)
    .map(m => getRoleGroup(m.role))
    )).sort(sortGroups);
  
  const availableRoles = ["ALL", ...availableRolesRaw];

  // If a selected filter is no longer available, reset it
  if (availableCamps.length > 0 && !availableCamps.includes(selectedTeamCamp)) setSelectedTeamCamp(availableCamps[0]);
  if (!availableDepartments.includes(selectedTeamType)) setSelectedTeamType("ALL");
  if (!availableRoles.includes(selectedRole)) setSelectedRole("ALL");

  const filteredTeam = teamMembers
    .filter(m => `Fusion ${m.camp}` === selectedTeamCamp)
    .filter(m => selectedTeamType === "ALL" || m.department === selectedTeamType)
    .filter(m => selectedRole === "ALL" || getRoleGroup(m.role) === selectedRole);

  // Custom sort order for departments
  const CUSTOM_DEPT_ORDER = [
    "Pastor",
    "Camp Coordinator",
    "Facilitators",
    "Media Team",
    "Music Team",
    "Dance Ministry"
  ];

  const sortDepartments = (a: string, b: string) => {
    const idxA = CUSTOM_DEPT_ORDER.indexOf(a);
    const idxB = CUSTOM_DEPT_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  };

  availableDepartments.sort((a, b) => {
    if (a === "ALL") return -1;
    if (b === "ALL") return 1;
    return sortDepartments(a, b);
  });

  // Auto-Group Logic for UI display
  const deptsToRender = selectedTeamType === "ALL" 
    ? availableDepartments.filter(d => d !== "ALL").sort(sortDepartments)
    : [selectedTeamType];

  return (
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      {/* Header */}
      <header className="top-header" style={{ marginBottom: "30px" }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "10px" }}>
          THE BLUEPRINT
        </h1>
        <p className="logo-sub">Camp Information Hub</p>
      </header>

      {/* 1. The Bulletin */}
      <section id="bulletin" style={{ marginBottom: "40px", scrollMarginTop: "100px" }}>
        <h2 className="section-title">The Bulletin</h2>
        <div className="card" style={{ borderLeft: isRegOpen ? "4px solid var(--neon-yellow)" : "4px solid #FF4444", marginBottom: "15px" }}>
          <h3 className="glow-text-white" style={{ marginBottom: "5px", fontSize: "1.2rem", fontFamily: "var(--font-outfit)", color: isRegOpen ? "var(--neon-white)" : "#FF4444" }}>
            {isRegOpen ? "Camp Registration is OPEN!" : "Camp Registration is CLOSED"}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {isRegOpen 
              ? "Secure your slots now! Early bird discount applies until the end of the month." 
              : "Registration is currently closed. Please wait for further announcements from the team."}
          </p>
        </div>
        <div className="card" style={{ borderLeft: "4px solid var(--neon-white)" }}>
          <h3 className="glow-text-white" style={{ marginBottom: "5px", fontSize: "1.2rem", fontFamily: "var(--font-outfit)" }}>Theme Revealed: {themeWord}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>{themeSub}</p>
        </div>
      </section>

      {/* 2. Interactive Packing List */}
      <section id="packingList" style={{ marginBottom: "40px", scrollMarginTop: "100px" }}>
        <h2 className="section-title">Ang Pabaon (Packing List)</h2>
        <div className="card" style={{ background: "rgba(255, 255, 255, 0.02)" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "20px", fontStyle: "italic" }}>
            I-click ang broken heart kapag nailagay mo na sa bag!
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {packingList.map(item => (
              <div 
                key={item.id} 
                onClick={() => toggleCheck(item.id)}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "15px", 
                  cursor: "pointer",
                  padding: "10px",
                  borderRadius: "8px",
                  background: item.checked ? "rgba(255, 234, 0, 0.05)" : "transparent",
                  border: item.checked ? "1px solid rgba(255, 234, 0, 0.2)" : "1px solid transparent",
                  transition: "all 0.3s"
                }}
              >
                <div style={{ fontSize: "1.5rem", transition: "transform 0.3s", transform: item.checked ? "scale(1.1)" : "scale(1)" }}>
                  {item.checked ? "💛" : "💔"}
                </div>
                <span style={{ 
                  color: item.checked ? "var(--neon-yellow)" : "var(--text-main)", 
                  textDecoration: item.checked ? "line-through" : "none",
                  opacity: item.checked ? 0.7 : 1,
                  fontSize: "1rem",
                  fontFamily: "var(--font-outfit)"
                }}>
                  {item.item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Camp Itinerary */}
      <section id="itinerary" style={{ marginBottom: "40px", scrollMarginTop: "100px" }}>
        <h2 className="section-title">Camp Itinerary</h2>
        <div style={{ borderLeft: "2px solid rgba(255,255,255,0.1)", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "25px" }}>
          {itinerary.map((day) => (
            <div key={day.id}>
              <span style={{ color: "var(--neon-yellow)", fontWeight: "bold", fontSize: "1.1rem", fontFamily: "var(--font-outfit)" }}>{day.label}</span>
              <p style={{ color: "var(--text-main)", marginTop: "5px", whiteSpace: "pre-line" }}>{day.activities}</p>
            </div>
          ))}
          {itinerary.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Itinerary is still being prepared.</p>
          )}
        </div>
      </section>

      {/* 4. Meet the Team */}
      <section style={{ marginBottom: "40px" }}>
        <h2 className="section-title">Meet The Team</h2>
        
        <div className="filter-section" style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
          <AnimatedDropdown 
            label="1. Select Camp"
            value={selectedTeamCamp} 
            options={availableCamps} 
            onChange={(val) => {
              setSelectedTeamCamp(val);
              setSelectedTeamType("ALL");
              setSelectedRole("ALL");
            }} 
          />
          
          <AnimatedDropdown 
            label="2. Select Department"
            value={selectedTeamType} 
            options={availableDepartments} 
            onChange={(val) => {
              setSelectedTeamType(val);
              setSelectedRole("ALL");
            }} 
          />

          {selectedTeamType !== "ALL" && (
            <AnimatedDropdown 
              label="3. Select Role"
              value={selectedRole} 
              options={availableRoles} 
              onChange={(val) => setSelectedRole(val)} 
            />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
          {filteredTeam.length > 0 ? (
            deptsToRender.map(dept => {
              const deptMembers = filteredTeam.filter(m => m.department === dept);
              if (deptMembers.length === 0) return null;
              
              // Get unique groups in this department
              const deptGroups = Array.from(new Set(deptMembers.map(m => getRoleGroup(m.role)))).sort(sortGroups);
              
              return (
                <div key={dept} style={{ marginBottom: "20px", animation: "fadeIn 0.5s ease-out" }}>
                  <h3 className="animated-glow-text" style={{ fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "20px", textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px", textAlign: "center" }}>
                    {dept}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
                    {deptGroups.map(groupTitle => {
                      const groupMembers = deptMembers.filter(m => getRoleGroup(m.role) === groupTitle).sort((a, b) => {
                         const roleSort = sortRoles(a.role, b.role);
                         if (roleSort !== 0) return roleSort;
                         return a.name.localeCompare(b.name);
                      });
                      if (groupMembers.length === 0) return null; const uniqueGroupMembers: any[] = []; groupMembers.forEach(m => { const existing = uniqueGroupMembers.find(u => u.name.toLowerCase().trim() === m.name.toLowerCase().trim()); if (existing) { if (!existing.role.includes(m.role)) { existing.role = existing.role + ' / ' + m.role; } } else { uniqueGroupMembers.push({ ...m }); } });
                      
                      return (
                        <div key={groupTitle}>
                          <h5 style={{ color: "var(--neon-white)", fontSize: "1rem", fontFamily: "var(--font-outfit)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px", opacity: 0.8 }}>
                            {groupTitle}
                          </h5>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "20px" }}>
                            {uniqueGroupMembers.map((member, idx) => (
                              <div key={idx} className="card" style={{ textAlign: "center", padding: "20px 10px" }}>
                                <div style={{ width: "80px", height: "80px", margin: "0 auto 15px", borderRadius: "50%", overflow: "hidden", border: "2px solid var(--neon-yellow)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", background: "rgba(255,255,255,0.1)" }}>
                                  {member.img && (member.img.startsWith("http") || member.img.startsWith("data:")) ? (
                                    <img src={member.img} alt={member.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                  ) : (
                                    member.img || "https://zdnmideipijqfehgzmos.supabase.co/storage/v1/object/public/avatars/default_avatar.jpg"
                                  )}
                                </div>
                                <h3 style={{ fontSize: "1.1rem", color: "var(--neon-white)", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>
                                  {member.title ? `${member.title} ${member.name}` : member.name}
                                </h3>
                                <p style={{ color: "var(--neon-yellow)", fontSize: "0.9rem", margin: 0 }}>
                                  {member.role}
                                </p>
                                {member.church && (
                                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "5px 0 0 0", fontStyle: "italic" }}>
                                    ({member.church})
                                  </p>
                                )}
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
            <div className="card" style={{ padding: "30px 20px", textAlign: "center", border: "1px dashed rgba(255,255,255,0.2)", background: "transparent" }}>
              <p style={{ color: "var(--text-muted)", fontSize: "1rem" }}>Walang naka-assign sa category na ito.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}


