"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown from "@/components/CustomDropdown";

const LocationMap = dynamic(() => import('@/components/LocationMap'), { ssr: false, loading: () => <div style={{height: "300px", display: "flex", alignItems: "center", justifyContent: "center"}}>Loading Map...</div> });

export default function AdminHYNMapPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [locIteration, setLocIteration] = useState("1");
  const [hlIteration, setHlIteration] = useState("1");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<number | 'all' | null>(null);
    const [announcedAnnId, setAnnouncedAnnId] = useState<number | null>(null);
  const [locTheme, setLocTheme] = useState("");
  const [locName, setLocName] = useState("");
  const [locLat, setLocLat] = useState<number | null>(null);
  const [locLng, setLocLng] = useState<number | null>(null);
  const [locDate, setLocDate] = useState("--,--,----");
  const [locTime, setLocTime] = useState("--");
  const [locStatus, setLocStatus] = useState("Open");
  const [hynTargetDate, setHynTargetDate] = useState("");
  const [hynHighlights, setHynHighlights] = useState<string[]>([]);
  const [hynRSVPs, setHynRSVPs] = useState<any[]>([]);
  const [maxIterations, setMaxIterations] = useState(5);
  const [iterationsList, setIterationsList] = useState<number[]>([1,2,3,4,5]);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  useEffect(() => {
        if (localStorage.getItem("isAdminLoggedIn")) {
          setIsLoggedIn(true);
        }
        
        const fetchIters = async () => {
          const { data } = await supabase.from('hyn_events').select('id').order('id', { ascending: false }).limit(1);
          const currentMax = data && data.length > 0 ? data[0].id : 5;
          setMaxIterations(currentMax);
          setIterationsList(Array.from({ length: currentMax }, (_, i) => i + 1));
          
          setLocIteration(currentMax.toString());
          setHlIteration(currentMax.toString());
          
          loadData(currentMax);
          loadHighlights(currentMax);
        };
        fetchIters();
      }, []);

    useEffect(() => {
      const channel = supabase.channel('hyn_rsvps_changes_' + locIteration)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hyn_rsvps' }, () => {
          loadData(parseInt(locIteration));
        })
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }, [locIteration]);

  
  const loadHighlights = async (iteration: number) => {
    const { data } = await supabase.from('hyn_events').select('highlights').eq('id', iteration).single();
    if (data) {
      setHynHighlights(data.highlights || []);
    } else {
      setHynHighlights([]);
    }
  };

  const loadData = async (iteration: number) => {
    const { data } = await supabase.from('hyn_events').select('*').eq('id', iteration).single();
    if (data) {
      setLocTheme(data.theme || "");
        setLocName(data.name || "");
      setLocLat(data.lat || null);
      setLocLng(data.lng || null);
      setLocDate(data.date || "--,--,----");
      setLocTime(data.time || "--");
      setLocStatus(data.status || "Open");
      setHynTargetDate(data.target_date || "");
      
      
      const { data: rsvpData } = await supabase.from('hyn_rsvps').select('*').eq('event_id', iteration);
        setHynRSVPs(rsvpData || []);

        const { fetchAnnouncements } = await import("@/lib/fusionSync");
        const anns = await fetchAnnouncements();
        const eventTitle = data.name || data.theme;
        const match = anns.find((a: any) => a.content.includes(`HYN Registration is now OPEN for ${eventTitle}`));
        if (match) setAnnouncedAnnId(match.id);
        else setAnnouncedAnnId(null);
    } else {
      setLocTheme("");
        setLocName("");
      setLocLat(null);
      setLocLng(null);
      setLocDate("--,--,----");
      setLocTime("--");
      setLocStatus("Open");
      setHynTargetDate("");
      
      setHynRSVPs([]);
    }
  };

  const handleLocIterationChange = (val: string) => {
    setLocIteration(val);
    loadData(parseInt(val));
  };

  const handleHlIterationChange = (val: string) => {
    setHlIteration(val);
    loadHighlights(parseInt(val));
  };

  const handleSaveData = async () => {
    const eventId = parseInt(locIteration);
    const { error } = await supabase.from('hyn_events').upsert({
      id: eventId,
      theme: locTheme,
      name: locName,
      lat: locLat || null,
      lng: locLng || null,
      date: locDate,
      time: locTime,
      status: locStatus,
      target_date: hynTargetDate
    });
    if (error) {
      console.error(error);
      showToast("Error saving to database!");
    } else {
      showToast(`HYN ${locIteration} saved to Supabase!`);
    }
  };

  const handleSaveHighlights = async () => {
    const { error } = await supabase.from('hyn_events').update({ highlights: hynHighlights }).eq('id', parseInt(hlIteration));
    if (error) {
      showToast("Error saving highlights!");
    } else {
      showToast(`Highlights for HYN ${hlIteration} saved!`);
    }
  };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast("Uploading image...");
    
    // Convert to base64 if it's a small file, or just use base64 for everything to avoid Storage RLS issues
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newArr = [...hynHighlights];
      newArr[idx] = base64String;
      setHynHighlights(newArr);
      showToast("Image added! Don't forget to click Save Highlights.");
    };
    reader.readAsDataURL(file);
  };

  const handleAddIteration = async () => {
    const newMax = maxIterations + 1;
    setMaxIterations(newMax);
    setIterationsList([...iterationsList, newMax]);
    
    // Create new blank record in Supabase
    await supabase.from('hyn_events').insert({
      id: newMax,
      theme: "TBA",
      date: "--,--,----",
      time: "--",
      status: "Open"
    });
    
    showToast(`Heart Youth Night ${newMax} added!`);
  };

  const handleDeleteIteration = async () => {
    if (iterationsList.length <= 1) {
      showToast("Cannot delete the last iteration.");
      return;
    }
    const maxToDelete = iterationsList[iterationsList.length - 1];
    
    // Delete from Supabase
    await supabase.from('hyn_events').delete().eq('id', maxToDelete);
    
    const newIters = iterationsList.slice(0, -1);
    const newMax = newIters[newIters.length - 1];
    setMaxIterations(newMax);
    setIterationsList(newIters);

    if (parseInt(locIteration) === maxToDelete) {
      setLocIteration("1");
      loadData(1);
    }
    
    showToast(`Heart Youth Night ${maxToDelete} deleted!`);
  };


    
    const handleAnnounceRegistration = async () => {
      const { submitAnnouncement, deleteAnnouncement } = await import("@/lib/fusionSync");
      if (announcedAnnId !== null) {
        // Remove it
        const res = await deleteAnnouncement(announcedAnnId);
        if (res) {
          showToast("Announcement removed!");
          setAnnouncedAnnId(null);
        } else {
          showToast("Failed to remove announcement.");
        }
      } else {
        // Add it
        const contentStr = `HYN Registration is now OPEN for ${locName || locTheme}! Secure your spot now!`;
        const res = await submitAnnouncement({ content: contentStr });
        if (res) {
          showToast("Added to Announcements!");
          setAnnouncedAnnId(res.id);
        } else {
          showToast("Failed to announce.");
        }
      }
    };

    const handleDeleteAllRSVPs = () => {
      setDeleteTarget('all');
      setShowDeleteModal(true);
    };

    const handleDeleteRSVP = (id: number) => {
      setDeleteTarget(id);
      setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
      if (deleteTarget === 'all') {
        const { error } = await supabase.from('hyn_rsvps').delete().eq('event_id', parseInt(locIteration));
        if (error) showToast("Error deleting registers.");
        else { showToast("All registers deleted."); loadData(parseInt(locIteration)); }
      } else if (deleteTarget !== null) {
        const { error } = await supabase.from('hyn_rsvps').delete().eq('id', deleteTarget);
        if (error) showToast("Error deleting user.");
        else { showToast("User removed."); loadData(parseInt(locIteration)); }
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
    };

  if (!isLoggedIn) return null;

  return (
    <main className="main-container" style={{ padding: "80px 20px" }}>
      {toastMessage && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "#00c853", color: "white", padding: "10px 20px", borderRadius: "8px", zIndex: 9999, fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
          {toastMessage}
        </div>
      )}
      <header style={{ marginBottom: "40px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}>
          Manage HYN
        </h1>
        <h2 style={{ color: "var(--neon-white)", fontSize: "1.2rem", marginTop: "10px", fontFamily: "var(--font-outfit)", fontStyle: "italic" }}>
          Update iterations, details, and map coordinates.
        </h2>
      </header>

      {/* 2. Theme & Countdown Manager */}
      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-yellow)" }}>
        <h3 style={{ color: "var(--neon-yellow)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "15px" }}>Event Countdown</h3>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px" }}>
          
          <div style={{ flex: "1 1 300px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Countdown Target Date & Time</label>
            <input 
              type="datetime-local" 
              value={hynTargetDate}
              onChange={(e) => setHynTargetDate(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "5px" }}>Will compute the remaining days automatically in the User Page.</p>
            </div>
          </div>
          <button onClick={handleSaveData} className="glow-text-black" style={{ width: "100%", padding: "12px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>Save Countdown</button>
      </section>

      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-white)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", marginBottom: "20px" }}>
          <div>
            <h3 style={{ color: "var(--neon-white)", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "5px" }}>The Compass (HYN)</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Set the location for previous and upcoming Heart Youth Nights.</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button onClick={handleAddIteration} style={{ padding: "8px 15px", background: "rgba(0, 255, 128, 0.2)", color: "#00FF80", border: "1px solid #00FF80", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)" }}>+ Add Iteration</button>
            <button onClick={handleDeleteIteration} style={{ padding: "8px 15px", background: "rgba(255, 0, 0, 0.2)", color: "#FF4444", border: "1px solid #FF4444", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)" }}>- Delete Iteration</button>
          </div>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Date</label>
            <div style={{ display: "flex", gap: "5px" }}>
              <input 
                type="text"
                placeholder="e.g. Oct 25, 2026 or --,--,----"
                value={locDate}
                onChange={(e) => setLocDate(e.target.value)}
                style={{ flex: 1, minWidth: "0", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
              />
              <input 
                type="date"
                onChange={(e) => {
                  if (e.target.value) {
                    const d = new Date(e.target.value);
                    setLocDate(d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
                  }
                }}
                style={{ width: "40px", padding: "10px 0", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", cursor: "pointer" }}
                title="Pick a Date"
              />
            </div>
          </div>

          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Time</label>
            <div style={{ display: "flex", gap: "5px" }}>
              <input 
                type="text"
                placeholder="e.g. 5:00 PM or --"
                value={locTime}
                onChange={(e) => setLocTime(e.target.value)}
                style={{ flex: 1, minWidth: "0", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
              />
              <input 
                type="time"
                onChange={(e) => {
                  if (e.target.value) {
                    let [hours, minutes] = e.target.value.split(':');
                    let h = parseInt(hours, 10);
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    h = h % 12;
                    h = h ? h : 12; 
                    setLocTime(`${h}:${minutes} ${ampm}`);
                  }
                }}
                style={{ width: "40px", padding: "10px 0", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", cursor: "pointer" }}
                title="Pick a Time"
              />
            </div>
          </div>

          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Status</label>
            <CustomDropdown
              value={locStatus}
              onChange={(val) => setLocStatus(val)}
              options={[{ value: "Open", label: "Open" }, { value: "Closed", label: "Closed" }, { value: "Ended", label: "Ended" }]}
            />
          </div>

          <div style={{ flex: "1 1 150px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Iteration</label>
            <CustomDropdown
              value={locIteration}
              onChange={(val) => handleLocIterationChange(val)}
              options={iterationsList.map((num) => ({ value: num.toString(), label: `HYN ${num}` }))}
            />
          </div>

          <div style={{ flex: "3 1 300px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-yellow)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Event Theme (e.g. The Rabbit Hole)</label>
              <input 
                type="text" 
                placeholder="Leave blank if TBA"
                value={locTheme}
                onChange={(e) => setLocTheme(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,234,0,0.5)", color: "white", outline: "none", fontFamily: "var(--font-outfit)", marginBottom: "15px" }}
              />
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "1px" }}>Venue / Location Name (e.g. Main Church Sanctuary)</label>
            <input 
              type="text" 
              placeholder="Leave blank to show 'Classified'"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }}
            />
          </div>

          <button 
            onClick={handleSaveData}
            className="glow-text-white"
            style={{ padding: "12px 25px", background: "var(--neon-white)", color: "black", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", cursor: "pointer", transition: "all 0.3s", flex: "1 1 150px" }}
          >
              Save Changes
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

      {/* 3. Recent Highlights Uploader */}
      <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid #00c853" }}>
        <div style={{ marginBottom: "20px" }}>
            <h3 style={{ color: "#00c853", fontSize: "1.5rem", fontFamily: "var(--font-outfit)", marginBottom: "15px" }}>Recent Highlights Gallery</h3>
            
            <div style={{ marginBottom: "15px", maxWidth: "300px" }}>
              <label style={{ display: "block", fontSize: "0.85rem", color: "var(--neon-white)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>Select Iteration to Edit</label>
              <CustomDropdown
                value={hlIteration}
                onChange={(val) => handleHlIterationChange(val)}
                options={iterationsList.map((num) => ({ value: num.toString(), label: `HYN ${num}` }))}
              />
            </div>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "15px" }}>Add image URLs for the User Page slideshow.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {hynHighlights.map((hl, idx) => (
              <div key={idx} style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <input 
                  type="text" 
                  value={hl}
                  onChange={(e) => {
                    const newArr = [...hynHighlights];
                    newArr[idx] = e.target.value;
                    setHynHighlights(newArr);
                  }}
                  placeholder="Image URL or Base64..."
                  style={{ flex: "1 1 150px", padding: "10px", borderRadius: "8px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", color: "white", outline: "none", fontSize: "0.9rem" }}
                />
                <label style={{ flex: "0 0 auto", cursor: "pointer", background: "var(--neon-white)", color: "black", padding: "10px 12px", borderRadius: "8px", fontWeight: "bold", fontFamily: "var(--font-outfit)", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                  Upload
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFileUpload(e, idx)} />
                </label>
                <button onClick={() => setHynHighlights(hynHighlights.filter((_, i) => i !== idx))} style={{ flex: "0 0 auto", padding: "10px 15px", background: "rgba(255,0,0,0.2)", color: "red", borderRadius: "8px", border: "none", fontWeight: "bold", fontSize: "0.9rem" }}>X</button>
              </div>
            ))}
            <button onClick={() => setHynHighlights([...hynHighlights, ""])} style={{ padding: "12px", border: "1px dashed rgba(255,255,255,0.3)", borderRadius: "8px", background: "transparent", color: "white", cursor: "pointer" }}>+ Add Image Link</button>
          </div>
          <button onClick={handleSaveHighlights} style={{ width: "100%", padding: "12px", background: "#00c853", color: "white", border: "none", borderRadius: "8px", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>Save Highlights</button>
        </section>

      {/* 4. RSVP List */}
        <section className="card" style={{ maxWidth: "1000px", margin: "0 auto 40px", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid #ff4081", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "15px", marginBottom: "5px" }}>
                <h3 style={{ color: "#ff4081", fontSize: "1.6rem", fontFamily: "var(--font-outfit)", margin: 0 }}>
                  Registers
                </h3>
                <span style={{ 
                  padding: "6px 18px", 
                  background: "linear-gradient(45deg, #ff4081, #ff79b0)", 
                  color: "white", 
                  borderRadius: "30px", 
                  fontWeight: "bold",
                  fontSize: "0.95rem",
                  boxShadow: "0 4px 10px rgba(255,64,129,0.3)",
                  letterSpacing: "0.5px"
                }}>
                  {hynRSVPs.length} {hynRSVPs.length === 1 ? 'User' : 'Users'}
                </span>
              </div>
              {locStatus === "Open" && (
                <button 
                  onClick={handleAnnounceRegistration}
                  style={{ width: "100%", background: announcedAnnId !== null ? "rgba(255,165,0,0.1)" : "rgba(0,200,83,0.1)", color: announcedAnnId !== null ? "#ffa500" : "#00c853", border: `1px solid ${announcedAnnId !== null ? "#ffa500" : "#00c853"}`, borderRadius: "8px", padding: "10px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", transition: "0.2s" }}
                >
                  {announcedAnnId !== null ? "- Remove from Announcement" : "+ Add to Announcement"}
                </button>
              )}
              {hynRSVPs.length > 0 && (
                <button 
                  onClick={handleDeleteAllRSVPs}
                  style={{ width: "100%", background: "rgba(255,0,0,0.1)", color: "#ff4d4d", border: "1px solid #ff4d4d", borderRadius: "8px", padding: "10px 12px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem", transition: "0.2s" }}
                >
                  Delete All
                </button>
              )}
            </div>
          {hynRSVPs.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "20px" }}>Walang nag-register sa iteration na ito.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "15px" }}>
              {hynRSVPs.map((r: any, i) => (
                  <div key={i} style={{ 
                      padding: "18px", 
                      background: "rgba(255,255,255,0.03)", 
                      borderRadius: "12px", 
                      borderLeft: "4px solid #ff4081",
                      transition: "transform 0.2s ease",
                      textAlign: "left",
                      position: "relative"
                    }}>
                      <button 
                        onClick={() => handleDeleteRSVP(r.id)}
                        style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(255,0,0,0.2)", border: "none", color: "#ff4d4d", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "0.8rem" }}
                        title="Remove User"
                      >
                        X
                      </button>
                      <div style={{ fontWeight: "700", color: "white", fontSize: "1.1rem", fontFamily: "var(--font-outfit)", marginBottom: "4px", paddingRight: "20px" }}>
                        {r.username || r.name}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "5px" }}>
                        {r.time}
                      </div>
                    </div>
                ))}
            </div>
          )}
        </section>
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <Link href="/admin" className="nav-item" style={{ padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)" }}>
          Back to Admin Dashboard
        </Link>
      </div>
    
        {showDeleteModal && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, backdropFilter: "blur(5px)" }}>
            <div style={{ background: "var(--bg-card)", padding: "30px", borderRadius: "15px", border: "1px solid #ff4d4d", maxWidth: "400px", width: "90%", textAlign: "center", boxShadow: "0 10px 40px rgba(255,77,77,0.3)" }}>
              <h3 style={{ color: "#ff4d4d", fontSize: "1.5rem", marginBottom: "15px", fontFamily: "var(--font-outfit)" }}>Confirm Deletion</h3>
              <p style={{ color: "var(--text-muted)", marginBottom: "30px" }}>
                {deleteTarget === 'all' ? "Are you sure you want to delete ALL registers for this iteration? This action cannot be undone." : "Are you sure you want to remove this user's registration?"}
              </p>
              <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                <button onClick={() => setShowDeleteModal(false)} style={{ padding: "10px 20px", background: "transparent", border: "1px solid var(--text-muted)", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Cancel</button>
                <button onClick={confirmDelete} style={{ padding: "10px 20px", background: "#ff4d4d", border: "none", color: "white", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Yes, Delete</button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }
