"use client";

import { useState, useEffect, useRef } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import { fetchSystemSetting, saveSystemSetting } from "@/lib/fusionSync";
import { ALL_SONGS } from "@/app/fusion/playlist/songsData";

// Reusable Animated Dropdown Component
function AnimatedDropdown({ value, options, onChange, label }: { value: string, options: string[], onChange: (val: string) => void, label?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: "relative", width: "100%", marginBottom: "15px" }}>
      {label && <label style={{ display: "block", marginBottom: "5px", color: "var(--text-muted)", fontSize: "0.9rem" }}>{label}</label>}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: isOpen ? "8px 8px 0 0" : "8px",
          border: isOpen ? "1px solid var(--neon-yellow)" : "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.05)",
          color: isOpen ? "var(--neon-yellow)" : "white",
          cursor: "pointer",
          fontFamily: "var(--font-outfit)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.3s ease"
        }}
      >
        {value}
        <span style={{ 
          transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", 
          transition: "transform 0.3s ease",
          fontSize: "0.8rem"
        }}>▼</span>
      </div>

      <div style={{
        position: "absolute",
        top: "100%",
        left: 0,
        width: "100%",
        background: "rgba(10,10,10,0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid var(--neon-yellow)",
        borderTop: "none",
        borderRadius: "0 0 8px 8px",
        overflow: "hidden",
        maxHeight: isOpen ? "200px" : "0",
        opacity: isOpen ? 1 : 0,
        visibility: isOpen ? "visible" : "hidden",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 100,
        boxShadow: "0 10px 15px rgba(0,0,0,0.5)"
      }}>
        {options.map(opt => (
          <div 
            key={opt} 
            onClick={() => {
              onChange(opt);
              setIsOpen(false);
            }}
            style={{ 
              padding: "10px", 
              color: value === opt ? "var(--neon-yellow)" : "white", 
              cursor: "pointer",
              fontFamily: "var(--font-outfit)",
              fontWeight: value === opt ? 700 : 400,
              background: value === opt ? "rgba(255,234,0,0.1)" : "transparent",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => {
              if (value !== opt) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            }}
            onMouseOut={(e) => {
              if (value !== opt) e.currentTarget.style.background = "transparent";
            }}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}


export default function AdminPlaylistPage() {
  const [songs, setSongs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  
  const CAMPS = ["Fusion 1", "Fusion 2", "Fusion 3", "All Fusion"];
  const TYPES = ["Camp Song", "Praise Song", "Worship Song"];
  const DAYS = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];

  const [selectedCamp, setSelectedCamp] = useState(CAMPS[0]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);

  // Prevent background scrolling when modal is open (Bulletproof for Mobile)
  useEffect(() => {
    if (isModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }
  }, [isModalOpen]);

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    camp: "Fusion 1",
    type: "Camp Song",
    day: "Day 1",
    youtubeId: "",
    lyrics: ""
  });

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    setIsLoading(true);
    let dbSongs = await fetchSystemSetting("fusionPlaylist");
    if (!dbSongs || dbSongs.length === 0) {
      dbSongs = ALL_SONGS;
      await saveSystemSetting("fusionPlaylist", dbSongs);
    }
    setSongs(dbSongs);
    setIsLoading(false);
  };

  const handleOpenModal = (song: any = null) => {
    if (song) {
      setEditingSongId(song.id);
      setFormData({
        title: song.title,
        artist: song.artist,
        camp: song.camp,
        type: song.type,
        day: song.day || "Day 1",
        youtubeId: song.youtubeId || "",
        lyrics: song.lyrics || ""
      });
    } else {
      setEditingSongId(null);
      setFormData({
        title: "",
        artist: "",
        camp: selectedCamp, // default to the currently filtered camp
        type: "Camp Song",
        day: "Day 1",
        youtubeId: "",
        lyrics: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.artist) {
      setSaveMessage("Title and Artist are required.");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    setSaveMessage("Saving...");
    let updatedSongs = [...songs];
    if (editingSongId) {
      updatedSongs = updatedSongs.map(s => s.id === editingSongId ? { ...s, ...formData } : s);
    } else {
      const newSong = {
        id: Date.now().toString(),
        ...formData
      };
      updatedSongs.push(newSong);
    }

    const success = await saveSystemSetting("fusionPlaylist", updatedSongs);
    if (success) {
      setSongs(updatedSongs);
      setSaveMessage("Saved successfully!");
      setIsModalOpen(false);
    } else {
      setSaveMessage("Failed to save.");
    }
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this song?")) return;
    setSaveMessage("Deleting...");
    const updatedSongs = songs.filter(s => s.id !== id);
    const success = await saveSystemSetting("fusionPlaylist", updatedSongs);
    if (success) {
      setSongs(updatedSongs);
      setSaveMessage("Deleted successfully!");
    } else {
      setSaveMessage("Failed to delete.");
    }
    setTimeout(() => setSaveMessage(""), 3000);
  };

  const moveSong = async (id: string, direction: "up" | "down") => {
    const index = songs.findIndex(s => s.id === id);
    if (index < 0) return;
    
    const currentSong = songs[index];
    const campSongs = songs.filter(s => s.camp === currentSong.camp);
    const campIndex = campSongs.findIndex(s => s.id === id);
    
    if (direction === "up" && campIndex > 0) {
      const prevSong = campSongs[campIndex - 1];
      const prevIndex = songs.findIndex(s => s.id === prevSong.id);
      
      const updatedSongs = [...songs];
      updatedSongs[index] = prevSong;
      updatedSongs[prevIndex] = currentSong;
      
      setSongs(updatedSongs);
      await saveSystemSetting("fusionPlaylist", updatedSongs);
    } else if (direction === "down" && campIndex < campSongs.length - 1) {
      const nextSong = campSongs[campIndex + 1];
      const nextIndex = songs.findIndex(s => s.id === nextSong.id);
      
      const updatedSongs = [...songs];
      updatedSongs[index] = nextSong;
      updatedSongs[nextIndex] = currentSong;
      
      setSongs(updatedSongs);
      await saveSystemSetting("fusionPlaylist", updatedSongs);
    }
  };

  const displayedSongs = selectedCamp === "All Fusion" 
    ? songs 
    : songs.filter(s => s.camp === selectedCamp);

  return (
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      <header className="top-header" style={{ marginBottom: "20px" }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "10px" }}>
          ADMIN PLAYLIST
        </h1>
        <p className="logo-sub">Manage Camp Worship Setlist</p>
      </header>

      {saveMessage && (
        <div style={{ textAlign: "center", marginBottom: "15px", color: "var(--neon-yellow)", fontWeight: "bold" }}>
          {saveMessage}
        </div>
      )}

      {/* Admin Camp Filter Dropdown */}
      <section style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
        <div style={{ width: "100%", maxWidth: "300px", zIndex: 50 }}>
          <AnimatedDropdown 
            value={selectedCamp} 
            options={CAMPS} 
            onChange={setSelectedCamp} 
          />
        </div>
        <button 
          className="action-btn"
          onClick={() => handleOpenModal()}
          style={{ padding: "10px 20px", fontSize: "1rem" }}
        >
          + ADD NEW SONG
        </button>
      </section>

      {isLoading ? (
        <p style={{ textAlign: "center", color: "var(--text-muted)" }}>Loading songs...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {displayedSongs.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", fontStyle: "italic", padding: "40px 0" }}>
              No songs found for {selectedCamp}.
            </p>
          ) : (
            displayedSongs.map((song, i) => (
              <div key={song.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "1.2rem", fontWeight: "bold", width: "20px" }}>
                    {i + 1}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 5px 0", color: "var(--neon-yellow)" }}>{song.title}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>{song.artist}</p>
                      <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>{song.type}</span>
                      {song.day && (
                        <span style={{ fontSize: "0.7rem", border: "1px solid rgba(255,255,255,0.2)", color: "var(--neon-white)", padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                          {song.day}
                        </span>
                      )}
                      {selectedCamp === "All Fusion" && (
                         <span style={{ fontSize: "0.7rem", border: "1px dashed var(--neon-yellow)", color: "var(--neon-yellow)", padding: "2px 8px", borderRadius: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>
                         {song.camp}
                       </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginRight: "10px" }}>
                    <button 
                      onClick={() => moveSong(song.id, "up")}
                      disabled={i === 0 || selectedCamp === "All Fusion"}
                      style={{ padding: "2px 8px", background: (i === 0 || selectedCamp === "All Fusion") ? "transparent" : "rgba(255,255,255,0.1)", color: (i === 0 || selectedCamp === "All Fusion") ? "rgba(255,255,255,0.2)" : "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", cursor: (i === 0 || selectedCamp === "All Fusion") ? "default" : "pointer" }}
                      title={selectedCamp === "All Fusion" ? "Select a specific camp to reorder" : "Move Up"}
                    >
                      ▲
                    </button>
                    <button 
                      onClick={() => moveSong(song.id, "down")}
                      disabled={i === displayedSongs.length - 1 || selectedCamp === "All Fusion"}
                      style={{ padding: "2px 8px", background: (i === displayedSongs.length - 1 || selectedCamp === "All Fusion") ? "transparent" : "rgba(255,255,255,0.1)", color: (i === displayedSongs.length - 1 || selectedCamp === "All Fusion") ? "rgba(255,255,255,0.2)" : "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "4px", cursor: (i === displayedSongs.length - 1 || selectedCamp === "All Fusion") ? "default" : "pointer" }}
                      title={selectedCamp === "All Fusion" ? "Select a specific camp to reorder" : "Move Down"}
                    >
                      ▼
                    </button>
                  </div>
                  <button 
                    onClick={() => handleOpenModal(song)}
                    style={{ padding: "8px 15px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(song.id)}
                    style={{ padding: "8px 15px", background: "#ff4d4d", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    X
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px", zIndex: 9999
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "500px", maxHeight: "85vh", overflowY: "auto", position: "relative" }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: "absolute", top: "15px", right: "15px", background: "transparent", border: "none", color: "var(--neon-white)", fontSize: "1.2rem", cursor: "pointer" }}
            >
              ✕
            </button>
            <h2 style={{ color: "var(--neon-yellow)", marginTop: 0, marginBottom: "20px" }}>
              {editingSongId ? "Edit Song" : "Add Song"}
            </h2>

            <label style={{ display: "block", marginBottom: "5px", color: "var(--text-muted)" }}>Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white" }} 
            />

            <label style={{ display: "block", marginBottom: "5px", color: "var(--text-muted)" }}>Artist</label>
            <input 
              type="text" 
              value={formData.artist} 
              onChange={e => setFormData({...formData, artist: e.target.value})} 
              style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white" }} 
            />

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", zIndex: 60, position: "relative" }}>
              <div style={{ flex: "1 1 30%" }}>
                <AnimatedDropdown 
                  label="Camp"
                  value={formData.camp} 
                  options={CAMPS} 
                  onChange={(val) => setFormData({...formData, camp: val})} 
                />
              </div>
              <div style={{ flex: "1 1 30%" }}>
                <AnimatedDropdown 
                  label="Type"
                  value={formData.type} 
                  options={TYPES} 
                  onChange={(val) => setFormData({...formData, type: val})} 
                />
              </div>
              <div style={{ flex: "1 1 30%" }}>
                <label style={{ display: "block", marginBottom: "5px", color: "var(--text-muted)", fontSize: "0.9rem" }}>Day (e.g. Day 1)</label>
                <input 
                  type="text" 
                  value={formData.day} 
                  onChange={e => setFormData({...formData, day: e.target.value})} 
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white" }} 
                />
              </div>
            </div>

            <label style={{ display: "block", marginBottom: "5px", color: "var(--text-muted)" }}>YouTube Video ID (e.g. V_J1b9O1Y0c)</label>
            <input 
              type="text" 
              value={formData.youtubeId} 
              onChange={e => {
                let val = e.target.value;
                const match = val.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
                if (match && match[1]) {
                  val = match[1];
                }
                setFormData({...formData, youtubeId: val});
              }} 
              style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white" }} 
            />

            <label style={{ display: "block", marginBottom: "5px", color: "var(--text-muted)" }}>Lyrics</label>
            <textarea 
              value={formData.lyrics} 
              onChange={e => setFormData({...formData, lyrics: e.target.value})} 
              rows={12}
              style={{ width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)", color: "white", resize: "vertical", minHeight: "200px" }} 
            />

            <button className="action-btn" onClick={handleSave} style={{ width: "100%" }}>
              SAVE SONG
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
