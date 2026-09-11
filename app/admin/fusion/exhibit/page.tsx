"use client";

import { useState, useEffect } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import CustomDropdown from "@/components/CustomDropdown";
import { fetchSystemSetting, saveSystemSetting, uploadExhibitImage } from "@/lib/fusionSync";
import { supabase } from "@/lib/supabase";

export default function AdminExhibitPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  
  const [selectedCamp, setSelectedCamp] = useState<string>("Fusion 1");
  const [selectedDay, setSelectedDay] = useState<string>("Day 1");
  const [selectedCategory, setSelectedCategory] = useState<string>("Morning");

  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const CAMPS = [
    { value: "Fusion 1", label: "Fusion 1" },
    { value: "Fusion 2", label: "Fusion 2" },
    { value: "Fusion 3", label: "Fusion 3" },
    { value: "Fusion 4", label: "Fusion 4" },
    { value: "Fusion 5", label: "Fusion 5" },
  ];

  const DAYS = [
    { value: "Day 1", label: "Day 1" },
    { value: "Day 2", label: "Day 2" },
    { value: "Day 3", label: "Day 3" },
    { value: "Day 4", label: "Day 4" },
    { value: "Day 5", label: "Day 5" },
  ];

  const CATEGORIES = [
    { value: "Morning", label: "Morning" },
    { value: "Afternoon", label: "Afternoon" },
    { value: "Night", label: "Night" },
    { value: "Praise & Worship", label: "Praise & Worship" },
    { value: "Funny Pictures", label: "Funny Pictures" },
    { value: "Random", label: "Random" },
  ];

  useEffect(() => {
    const adminStr = localStorage.getItem("isAdminLoggedIn");
    if (adminStr === "true") {
      setIsLoggedIn(true);
    } else {
      window.location.href = "/login?redirect=/admin/fusion/exhibit";
    }

    const loadData = async () => {
      const savedPhotos = await fetchSystemSetting("fusionExhibitPhotos");
      if (savedPhotos) {
        setPhotos(savedPhotos);
      }
    };
    loadData();
    window.addEventListener("storage", loadData);
    return () => window.removeEventListener("storage", loadData);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newPreviews: string[] = [];
      let loadedCount = 0;
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target && typeof event.target.result === "string") {
            newPreviews.push(event.target.result);
          }
          loadedCount++;
          if (loadedCount === files.length) {
            setPreviewImages(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleUpload = async () => {
    if (previewImages.length === 0) {
      setSaveMessage("Please select at least one image first.");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    setIsLoading(true);
    setSaveMessage(`Uploading ${previewImages.length} image(s)...`);

    try {
      const uploadedUrls: string[] = [];
      for (const img of previewImages) {
        const url = await uploadExhibitImage(img, selectedCamp, selectedCategory);
        if (url) uploadedUrls.push(url);
      }
      
      if (uploadedUrls.length > 0) {
        const newPhoto = {
          id: Date.now(),
          url: uploadedUrls[0], // Cover photo
          urls: uploadedUrls, // All photos in album
          camp: selectedCamp,
          day: selectedDay,
          category: selectedCategory,
          likes: 0,
          isLiked: false,
          created_at: new Date().toISOString()
        };

        const updatedPhotos = [newPhoto, ...photos];
        await saveSystemSetting("fusionExhibitPhotos", updatedPhotos);
        setPhotos(updatedPhotos);
        
        // Broadcast
        localStorage.setItem("fusionExhibitPhotos", JSON.stringify(updatedPhotos));
        window.dispatchEvent(new Event("storage"));
        
        setPreviewImages([]);
        setSaveMessage(uploadedUrls.length === 1 ? "Image uploaded successfully!" : `Album of ${uploadedUrls.length} images uploaded!`);
        
        // Clear file input
        const fileInput = document.getElementById("exhibitImageUpload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        setSaveMessage("Failed to upload image(s). Please try again.");
      }
    } catch (err) {
      console.error(err);
      setSaveMessage("An error occurred during upload.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    
    setIsLoading(true);
    setSaveMessage("Deleting photo...");
    
    try {
      const updatedPhotos = photos.filter((p) => p.id !== deleteId);
      
      await saveSystemSetting("fusionExhibitPhotos", updatedPhotos);
      setPhotos(updatedPhotos);
      
      localStorage.setItem("fusionExhibitPhotos", JSON.stringify(updatedPhotos));
      window.dispatchEvent(new Event("storage"));
      
      setSaveMessage("Photo deleted.");
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to delete photo.");
    } finally {
      setIsLoading(false);
      setDeleteId(null);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  const toggleThrowback = async (photoId: number) => {
    const isCurrentlyThrowback = photos.find(p => p.id === photoId)?.isThrowback;
    
    if (!isCurrentlyThrowback) {
      const throwbackCount = photos.filter(p => p.isThrowback).length;
      if (throwbackCount >= 3) {
        setSaveMessage("Maximum of 3 Throwback photos allowed! Please unpin one first.");
        setTimeout(() => setSaveMessage(""), 3000);
        return;
      }
    }
    
    setIsLoading(true);
    setSaveMessage(isCurrentlyThrowback ? "Unpinning..." : "Pinning...");
    
    try {
      const updatedPhotos = photos.map((p) => 
        p.id === photoId ? { ...p, isThrowback: !p.isThrowback } : p
      );
      
      await saveSystemSetting("fusionExhibitPhotos", updatedPhotos);
      setPhotos(updatedPhotos);
      
      localStorage.setItem("fusionExhibitPhotos", JSON.stringify(updatedPhotos));
      window.dispatchEvent(new Event("storage"));
      
      setSaveMessage(isCurrentlyThrowback ? "Removed from Throwbacks." : "Added to Throwbacks!");
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to update throwback status.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  if (!isLoggedIn) return null;

  return (
    <main className="app-container" style={{ paddingBottom: "100px" }}>
      <header className="top-header" style={{ marginBottom: "20px" }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "10px" }}>
          EXHIBIT MANAGER
        </h1>
        <p className="logo-sub">Manage The Exhibit Photos</p>
      </header>

      <section className="form-section">
        <h3 style={{ color: "var(--neon-white)", fontSize: "1.2rem", fontFamily: "var(--font-outfit)", marginBottom: "15px" }}>
          Upload New Photo
        </h3>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div className="input-group">
            <label className="input-label">Select Camp</label>
            <CustomDropdown
              options={CAMPS}
              value={selectedCamp}
              onChange={setSelectedCamp}
              placeholder="Select Camp"
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Select Day</label>
            <CustomDropdown
              options={DAYS}
              value={selectedDay}
              onChange={setSelectedDay}
              placeholder="Select Day"
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Select Category</label>
            <CustomDropdown
              options={CATEGORIES}
              value={selectedCategory}
              onChange={setSelectedCategory}
              placeholder="Select Category"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Choose Images (Select Multiple for Album)</label>
            <input 
              type="file" 
              id="exhibitImageUpload" 
              accept="image/*" 
              multiple
              onChange={handleImageChange}
              style={{
                width: "100%", padding: "10px", backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff"
              }}
            />
          </div>

          {previewImages.length > 0 && (
            <div style={{ marginTop: "15px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {previewImages.map((img, i) => (
                <div key={i} style={{ position: "relative", borderRadius: "8px", overflow: "hidden", height: "100px" }}>
                  {i === 0 && (
                    <div style={{ position: "absolute", top: 0, left: 0, background: "var(--neon-yellow)", color: "black", padding: "2px 6px", fontSize: "0.7rem", fontWeight: "bold", zIndex: 10 }}>COVER</div>
                  )}
                  <img src={img} alt={`Preview ${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button 
                    onClick={() => {
                      const newArr = [...previewImages];
                      newArr.splice(i, 1);
                      setPreviewImages(newArr);
                      if (newArr.length === 0) {
                        const fileInput = document.getElementById("exhibitImageUpload") as HTMLInputElement;
                        if (fileInput) fileInput.value = "";
                      }
                    }}
                    style={{
                      position: "absolute", top: "5px", right: "5px", background: "rgba(0,0,0,0.7)", 
                      color: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", 
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", zIndex: 10
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <button 
            className="action-btn"
            onClick={handleUpload}
            disabled={isLoading || previewImages.length === 0}
            style={{ 
              marginTop: "10px",
              opacity: (isLoading || previewImages.length === 0) ? 0.5 : 1,
              backgroundColor: "var(--neon-white)",
              color: "#000",
              fontWeight: "bold",
              padding: "12px",
              border: "none",
              borderRadius: "8px"
            }}
          >
            {isLoading ? "UPLOADING..." : "UPLOAD PHOTO(S)"}
          </button>
          
          {saveMessage && (
            <p style={{ textAlign: "center", color: saveMessage.includes("Error") || saveMessage.includes("Failed") ? "#ff4d4d" : "var(--neon-white)", fontSize: "0.9rem", marginTop: "10px" }}>
              {saveMessage}
            </p>
          )}
        </div>
      </section>

      <div className="section-divider" style={{ margin: "30px 0" }}></div>

      <section className="form-section">
        <h3 style={{ color: "var(--neon-white)", fontSize: "1.2rem", fontFamily: "var(--font-outfit)", marginBottom: "15px" }}>
          Uploaded Photos ({photos.length})
        </h3>
        
        {photos.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem", padding: "20px 0" }}>
            No photos uploaded yet.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px" }}>
            {photos.map((photo) => (
              <div key={photo.id} style={{ 
                position: "relative", 
                borderRadius: "8px", 
                overflow: "hidden", 
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                flexDirection: "column"
              }}>
                <div style={{ position: "relative", height: "120px" }}>
                  <img 
                    src={photo.url} 
                    alt="Exhibit" 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                  />
                  
                  {/* Pin Button for Throwback */}
                  <button 
                    onClick={() => toggleThrowback(photo.id)}
                    style={{
                      position: "absolute", top: "5px", left: "5px",
                      background: photo.isThrowback ? "rgba(255, 234, 0, 0.8)" : "rgba(0, 0, 0, 0.6)",
                      color: photo.isThrowback ? "#000" : "#fff",
                      border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                      width: "30px", height: "30px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 10, backdropFilter: "blur(4px)"
                    }}
                    title={photo.isThrowback ? "Unpin Throwback" : "Pin as Throwback"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={photo.isThrowback ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </button>

                  {/* Delete Button */}
                  <button 
                    onClick={() => setDeleteId(photo.id)}
                    style={{
                      position: "absolute", top: "5px", right: "5px",
                      background: "rgba(255, 0, 0, 0.8)", color: "#fff",
                      border: "1px solid rgba(255,255,255,0.3)", borderRadius: "6px",
                      width: "30px", height: "30px", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      zIndex: 10, backdropFilter: "blur(4px)"
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                <div style={{ padding: "8px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <div style={{ fontWeight: "bold", color: "#fff" }}>{photo.camp} - {photo.day}</div>
                  <div>{photo.category}</div>
                  <div style={{ fontSize: "0.75rem", marginTop: "6px", color: "var(--neon-yellow)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--neon-yellow)" stroke="var(--neon-yellow)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 0 3px rgba(255,234,0,0.6))" }}>
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    {photo.likes} likes
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId !== null && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "var(--bg-card)", border: "1px solid rgba(255,255,255,0.1)",
            padding: "25px", borderRadius: "15px", width: "90%", maxWidth: "350px", textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            <h3 style={{ color: "var(--neon-white)", fontFamily: "var(--font-outfit)", fontSize: "1.3rem", marginBottom: "10px" }}>Delete Photo</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "25px" }}>Are you sure you want to delete this photo permanently?</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button 
                onClick={() => setDeleteId(null)}
                style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
              >
                CANCEL
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isLoading}
                style={{ flex: 1, padding: "12px", background: "#ff4d4d", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: isLoading ? "default" : "pointer", opacity: isLoading ? 0.7 : 1 }}
              >
                {isLoading ? "DELETING..." : "DELETE"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
