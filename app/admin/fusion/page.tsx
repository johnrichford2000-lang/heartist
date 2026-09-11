"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown from "@/components/CustomDropdown";

const LocationMap = dynamic(() => import('@/components/LocationMap'), { ssr: false, loading: () => <div style={{height: "300px", display: "flex", alignItems: "center", justifyContent: "center"}}>Loading Map...</div> });

export default function AdminFusionMapPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [locIteration, setLocIteration] = useState("1");
  const [locName, setLocName] = useState("");
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [locStatus, setLocStatus] = useState("Open");
  const [compassThemeWord, setCompassThemeWord] = useState("IGNITE");
  const [maxIterations, setMaxIterations] = useState(5);
  const [iterationsList, setIterationsList] = useState<number[]>([1,2,3,4,5]);

  // Countdown State
  const [ignitionDate, setIgnitionDate] = useState("2027-06-15T00:00");
  const [countdownLabel, setCountdownLabel] = useState("June 15-18, 2027");

  // Moderation State
  const [canvasPosts, setCanvasPosts] = useState<any[]>([]);

  // Theme State
  const [themeIteration, setThemeIteration] = useState("1");
  const [themeWord, setThemeWord] = useState("IGNITE");
  const [themeSub, setThemeSub] = useState("our passion and creativity all for God's glory.");

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Location/Map State
  const [selectedCamp, setSelectedCamp] = useState("1");

  useEffect(() => {
    // Auth Protection
    if (typeof window !== "undefined") {
      if (localStorage.getItem("isAdminLoggedIn") !== "true") {
        window.location.href = "/login";
        return;
      }
      setIsLoggedIn(true);
    }
    
    const loadAllSettings = async () => {
      const { fetchSystemSetting } = await import("@/lib/fusionSync");
      
      const savedIters = await fetchSystemSetting("eventIterations");
      let currentMax = 5;
      if (savedIters) {
        currentMax = savedIters.fusion || 5;
      }
      setMaxIterations(currentMax);
      setIterationsList(Array.from({ length: currentMax }, (_, i) => i + 1));

      const savedCountdown = await fetchSystemSetting("fusionCountdownData");
      if (savedCountdown) {
        setIgnitionDate(savedCountdown.targetDate || "2027-06-15T00:00");
        setCountdownLabel(savedCountdown.labelDate || "June 15-18, 2027");
      }
      
      await loadLocationData(1);
      await loadThemeData(themeIteration);
    };

    loadAllSettings();
  }, []);

  const loadLocationData = async (iteration: number) => {
    const { fetchSystemSetting } = await import("@/lib/fusionSync");
    const saved = await fetchSystemSetting(`fusionLocationData_${iteration}`);
    if (saved) {
      setLocName(saved.name || "");
      setLocStatus(saved.status || "Open");
      setLocLat(saved.lat || null);
      setLocLng(saved.lng || null);
    } else {
      setLocName("");
      setLocStatus("Open");
      setLocLat(null);
      setLocLng(null);
    }

    const savedTheme = await fetchSystemSetting(`fusionTheme_${iteration}`);
    if (savedTheme) {
      setCompassThemeWord(savedTheme.word || "IGNITE");
    } else {
      setCompassThemeWord("IGNITE");
    }
  };

  const loadThemeData = async (iteration: string) => {
    const { fetchSystemSetting } = await import("@/lib/fusionSync");
    const saved = await fetchSystemSetting(`fusionTheme_${iteration}`);
    if (saved) {
      setThemeWord(saved.word || "IGNITE");
      setThemeSub(saved.subtext || "our passion and creativity all for God's glory.");
    } else {
      setThemeWord("IGNITE");
      setThemeSub("our passion and creativity all for God's glory.");
    }
  };

  const handleLocIterationChange = (val: string) => {
    setLocIteration(val);
    setSelectedCamp(val);
    loadLocationData(parseInt(val));
  };

  const handleSaveLocation = async () => {
    const data = {
      name: locName,
      status: locStatus,
      lat: locLat,
      lng: locLng
    };
    const { saveSystemSetting } = await import("@/lib/fusionSync");
    await saveSystemSetting(`fusionLocationData_${selectedCamp}`, data);
    showToast(`Fusion Camp ${selectedCamp} location settings saved!`);
  };

  const handleSaveCountdown = async () => {
    const data = {
      targetDate: ignitionDate,
      labelDate: countdownLabel
    };
    const { saveSystemSetting } = await import("@/lib/fusionSync");
    await saveSystemSetting("fusionCountdownData", data);
    showToast("Countdown Timer settings saved!");
  };

  const handleSaveTheme = async () => {
    const data = {
      word: themeWord,
      subtext: themeSub
    };
    const { saveSystemSetting } = await import("@/lib/fusionSync");
    await saveSystemSetting(`fusionTheme_${themeIteration}`, data);
    showToast(`Theme for Fusion Camp ${themeIteration} saved!`);
  };

  const handleAddIteration = async () => {
    const newMax = maxIterations + 1;
    setMaxIterations(newMax);
    setIterationsList(Array.from({ length: newMax }, (_, i) => i + 1));
    
    const { fetchSystemSetting, saveSystemSetting } = await import("@/lib/fusionSync");
    const savedIters = await fetchSystemSetting("eventIterations");
    const parsed = savedIters || { fusion: 5, hyn: 5 };
    parsed.fusion = newMax;
    await saveSystemSetting("eventIterations", parsed);
    
    showToast(`Fusion ${newMax} added!`);
  };

  const handleDeleteIteration = async () => {
    if (maxIterations <= 1) {
      showToast("Cannot delete the last iteration.");
      return;
    }
    const newMax = maxIterations - 1;
    setMaxIterations(newMax);
    setIterationsList(Array.from({ length: newMax }, (_, i) => i + 1));
    
    const { fetchSystemSetting, saveSystemSetting } = await import("@/lib/fusionSync");
    // we could delete it, but saveSystemSetting with null could work or just ignore
    await saveSystemSetting(`fusionLocationData_${maxIterations}`, null);

    const savedIters = await fetchSystemSetting("eventIterations");
    const parsed = savedIters || { fusion: 5, hyn: 5 };
    parsed.fusion = newMax;
    await saveSystemSetting("eventIterations", parsed);

    if (parseInt(locIteration) > newMax) {
      setLocIteration("1");
      loadLocationData(1);
    }
    
    showToast(`Fusion ${maxIterations} deleted!`);
  };

  if (!isLoggedIn) return null;

  return (
    <main className="main-container" style={{ padding: "80px 20px", position: "relative" }}>
      {toastMsg && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "var(--neon-yellow)", color: "black", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", zIndex: 9999, boxShadow: "0 4px 15px rgba(255, 234, 0, 0.4)", animation: "fadeInOut 3s forwards" }}>
          {toastMsg}
        </div>
      )}
      <header style={{ marginBottom: "40px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1 className="header-title glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}>
          Manage Fusion
        </h1>
        <h2 style={{ color: "var(--neon-white)", fontSize: "1.2rem", marginTop: "10px", fontFamily: "var(--font-outfit)", fontStyle: "italic" }}>
          Update iterations, details, and map coordinates.
        </h2>
      </header>

      {/* Countdown Timer Settings */}
      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-yellow)" }}>
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>Future Camp Countdown</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Set the target date for the next camp and the label that appears below it.</p>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Countdown Target Date & Time</label>
            <div style={{ display: "flex", gap: "5px" }}>
              <input 
                type="text"
                placeholder="e.g. 2027-06-15T00:00"
                value={ignitionDate}
                onChange={(e) => setIgnitionDate(e.target.value)}
                style={{ flex: 1, minWidth: "0", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
              />
              <input 
                type="datetime-local"
                onChange={(e) => {
                  if (e.target.value) {
                    setIgnitionDate(e.target.value);
                  }
                }}
                style={{ width: "40px", padding: "10px 0", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", cursor: "pointer" }}
                title="Pick a Date & Time"
              />
            </div>
          </div>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Manual Date Label (Shows below timer)</label>
            <input 
              type="text"
              placeholder="e.g. June 15-18, 2027"
              value={countdownLabel}
              onChange={(e) => setCountdownLabel(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
            />
          </div>
          <div>
            <button 
              onClick={handleSaveCountdown}
              className="glow-text-yellow"
              style={{ padding: "12px 25px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s" }}
            >
              Save Timer
            </button>
          </div>
        </div>
      </section>

      {/* Camp Theme Manager Settings */}
      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-white)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>Camp Theme Manager</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Update the theme word and subtext for specific camp iterations.</p>
          </div>
          <div style={{ minWidth: "200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Select Iteration</label>
            <CustomDropdown
              value={themeIteration}
              onChange={(val) => { setThemeIteration(val); loadThemeData(val); }}
              options={iterationsList.map((num) => ({ value: num.toString(), label: `Fusion Camp ${num}` }))}
            />
          </div>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Theme Word</label>
            <input 
              type="text"
              value={themeWord}
              onChange={(e) => setThemeWord(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
            />
          </div>
          <div style={{ flex: "2 1 400px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Theme Subtext</label>
            <input 
              type="text"
              value={themeSub}
              onChange={(e) => setThemeSub(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
            />
          </div>
          <div>
            <button 
              onClick={handleSaveTheme}
              className="glow-text-white"
              style={{ padding: "12px 25px", background: "var(--neon-white)", color: "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s" }}
            >
              Save Theme
            </button>
          </div>
        </div>
      </section>

      {/* Map Settings */}
      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-yellow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>The Compass (Fusion)</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Set the location for previous and upcoming Fusion camps.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button onClick={handleAddIteration} style={{ padding: "8px 15px", background: "rgba(0, 255, 128, 0.2)", color: "#00FF80", border: "1px solid #00FF80", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)" }}>+ Add Iteration</button>
            <button onClick={handleDeleteIteration} style={{ padding: "8px 15px", background: "rgba(255, 0, 0, 0.2)", color: "#FF4444", border: "1px solid #FF4444", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)" }}>- Delete Iteration</button>
          </div>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "flex-end" }}>
          
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Inherited Theme</label>
            <div style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--neon-white)", fontFamily: "var(--font-outfit)", fontWeight: "bold" }}>
              {compassThemeWord}
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>*Set via Theme Manager</span>
          </div>

          <div style={{ flex: "1 1 200px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Status</label>
            <CustomDropdown
              value={locStatus}
              onChange={(val) => setLocStatus(val)}
              options={[
                { value: "Open", label: "Open for Registration" },
                { value: "Closed", label: "Registration Closed" },
                { value: "NotAvailable", label: "Registration Not Available" },
                { value: "Ended", label: "Event Ended" }
              ]}
            />
          </div>

          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Iteration</label>
            <CustomDropdown
              value={locIteration}
              onChange={(val) => handleLocIterationChange(val)}
              options={iterationsList.map((num) => ({ value: num.toString(), label: `Fusion ${num}` }))}
            />
          </div>

          <div style={{ flex: "3 1 300px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Location Name (e.g. Tagaytay)</label>
            <input 
              type="text" 
              placeholder="Leave blank to show 'Classified'"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
            />
          </div>

          <button 
            onClick={handleSaveLocation}
            className="glow-text-yellow"
            style={{ padding: "12px 25px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s", flex: "1 1 150px" }}
          >
            Save Location
          </button>
        </div>
        
        <div style={{ marginTop: "20px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "10px", fontStyle: "italic" }}>
            Click anywhere on the map to drop a pin. This will be the exact location shown to the users.
            {locLat && locLng ? ` (Current Pin: ${locLat.toFixed(4)}, ${locLng.toFixed(4)})` : " (No pin dropped yet)"}
          </p>
          <LocationMap 
            lat={locLat} 
            lng={locLng} 
            interactive={true} 
            onChange={(lat, lng) => { setLocLat(lat); setLocLng(lng); }} 
          />
        </div>
      </section>

      <div style={{ textAlign: "center", marginTop: "40px", paddingBottom: "100px" }}>
        <Link href="/admin" className="nav-item" style={{ padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)" }}>
          Back to Admin Dashboard
        </Link>
      </div>
    </main>
  );
}
