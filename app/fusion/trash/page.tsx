"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { deletePostFromSupabase } from "@/lib/communitySync";
import { supabase } from "@/lib/supabase";
import HeartistLogo from "@/components/HeartistLogo";

export default function TrashPage() {
  const router = useRouter();
  const [trashedPosts, setTrashedPosts] = useState<any[]>([]);
  const [username, setUsername] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [itemToDeleteForever, setItemToDeleteForever] = useState<any>(null);
  const [itemToRestore, setItemToRestore] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeUserStr = localStorage.getItem("activeUser");
      if (!activeUserStr) {
        window.location.href = "/login";
        return;
      }
      const activeUser = JSON.parse(activeUserStr);
      const u = activeUser.firstName;
      setUsername(u);

      const loadTrash = async (userId: string, userName: string) => {
        try {
          // Fetch from Supabase
          const { data: posts, error: e1 } = await supabase.from('posts').select('*').eq('author_id', userId).eq('status', 'trashed');
          const { data: comments, error: e2 } = await supabase.from('comments').select('*').eq('author_id', userId).eq('status', 'trashed');
          const { data: prayers, error: e3 } = await supabase.from('prayers').select('*').eq('author_id', userId).eq('status', 'trashed');

          if (e1) console.error("Posts trash error:", e1);
          if (e2) console.error("Comments trash error:", e2);
          if (e3) console.error("Prayers trash error:", e3);

          const allTrash: any[] = [];
          
          if (posts) {
            posts.forEach(p => {
              allTrash.push({
                ...p,
                type: 'post',
                content: p.content,
                deletedAt: new Date(p.created_at).getTime(), // Wait, we don't have deleted_at. We'll just use created_at for now or it won't auto-delete well.
                read: true 
              });
            });
          }
          if (comments) {
            comments.forEach(c => {
              allTrash.push({
                ...c,
                type: 'comment',
                content: c.content,
                deletedAt: new Date(c.created_at).getTime(),
                read: true
              });
            });
          }
          if (prayers) {
            prayers.forEach(pr => {
              allTrash.push({
                ...pr,
                type: 'prayer',
                content: pr.request,
                deletedAt: new Date(pr.created_at).getTime(),
                read: true
              });
            });
          }

          allTrash.sort((a: any, b: any) => (b.deletedAt || 0) - (a.deletedAt || 0));
          setTrashedPosts(allTrash);
        } catch (e: any) {
          console.error("Failed to load trash from Supabase", e?.message, e?.details, e?.hint);
        }
      };

      loadTrash(activeUser.id || u, u);
      
      const onStorage = () => loadTrash(activeUser.id || u, u);
      window.addEventListener("storage", onStorage);
      
      return () => {
        window.removeEventListener("storage", onStorage);
      };
    }
  }, []);

  const markAllAsSeen = () => {
    if (typeof window !== "undefined") {
      // In a real app we'd update "read" status in DB. Here we just update local state visually.
      const updatedTrash = trashedPosts.map((t: any) => ({ ...t, read: true }));
      setTrashedPosts(updatedTrash);
      localStorage.setItem("fusionTrashRead", "true");
      setToastMessage("Trash marked as read.");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const confirmRestorePost = async () => {
    if (typeof window !== "undefined" && itemToRestore) {
      const post = itemToRestore;
      try {
        if (post.type === "prayer") {
          await supabase.from("prayers").update({ status: 'active' }).eq("id", post.id);
        } else if (post.type === "comment") {
          await supabase.from("comments").update({ status: 'active' }).eq("id", post.id);
        } else {
          await supabase.from("posts").update({ status: 'active' }).eq("id", post.id);
        }

        // Update state
        setTrashedPosts(trashedPosts.filter(p => String(p.id) !== String(post.id)));
        window.dispatchEvent(new Event("storage"));
        setItemToRestore(null);
        setToastMessage("Post restored!");
        setTimeout(() => setToastMessage(""), 3000);
      } catch (e) {
        console.error("Failed to restore post", e);
        setToastMessage("Failed to restore.");
        setTimeout(() => setToastMessage(""), 3000);
      }
    }
  };

  const confirmDeleteForever = async () => {
    if (itemToDeleteForever) {
      const id = itemToDeleteForever;
      const postToDelete = trashedPosts.find(p => String(p.id) === String(id));
      if (postToDelete) {
        try {
          if (postToDelete.type === "prayer") {
             await supabase.from("reports").delete().eq("prayer_id", postToDelete.id);
             const { error } = await supabase.from("prayers").delete().eq("id", postToDelete.id);
             if (error) throw error;
          } else if (postToDelete.type === "comment") {
             await supabase.from("comments").delete().eq("reply_to", postToDelete.id);
             const { error } = await supabase.from("comments").delete().eq("id", postToDelete.id);
             if (error) throw error;
          } else {
             await supabase.from("reports").delete().eq("post_id", postToDelete.id);
             await supabase.from("comments").delete().eq("post_id", postToDelete.id);
             await supabase.from("announcements").delete().eq("post_id", postToDelete.id);
             const { error } = await supabase.from("posts").delete().eq("id", postToDelete.id);
             if (error) throw error;
          }
        } catch (e) {
          console.error("Failed to delete from Supabase", e);
          setToastMessage("Cannot delete. It may be linked to other data.");
          setTimeout(() => setToastMessage(""), 3000);
          setItemToDeleteForever(null);
          return;
        }
      }

      const updated = trashedPosts.filter(p => String(p.id) !== String(id));
      setTrashedPosts(updated);
      
      window.dispatchEvent(new Event("storage"));
      setItemToDeleteForever(null);
      setToastMessage("Item permanently deleted.");
      setTimeout(() => setToastMessage(""), 3000);
    }
  };

  const getDaysLeft = (deletedAt: number) => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const expiry = deletedAt + thirtyDaysMs;
    const leftMs = expiry - Date.now();
    const daysLeft = Math.ceil(leftMs / (1000 * 60 * 60 * 24));
    return daysLeft > 0 ? daysLeft : 0;
  };

  return (
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      <header className="top-header" style={{ marginBottom: "30px" }}>
        <HeartistLogo className="animated-glow-text" width={30} height={30} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", marginTop: "10px" }}>
          TRASH
        </h1>
        <p className="logo-sub">Recently Deleted Posts</p>
      </header>

      <section style={{ marginBottom: "40px" }}>
        {trashedPosts.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "50px 20px", borderTop: "2px solid rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "15px", opacity: 0.5 }}>🗑️</span>
            <h3 style={{ color: "var(--text-muted)", fontFamily: "var(--font-outfit)", fontSize: "1.2rem", margin: 0 }}>Your trash is empty.</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {trashedPosts.some(t => !t.read) && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "5px" }}>
                <button onClick={markAllAsSeen} style={{ padding: "8px 18px", borderRadius: "20px", border: "1px solid #FF4444", background: "rgba(255,68,68,0.1)", color: "#FF4444", cursor: "pointer", fontFamily: "var(--font-outfit)", fontWeight: "bold", fontSize: "0.9rem", transition: "all 0.3s ease" }}>
                  Mark All As Read
                </button>
              </div>
            )}
            
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px", overflowX: "auto" }} className="custom-scrollbar">
              {["All", "Posts", "Comments", "Replies"].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  style={{
                    padding: "6px 15px",
                    borderRadius: "20px",
                    border: `1px solid ${filterType === f ? "var(--neon-yellow)" : "rgba(255,255,255,0.2)"}`,
                    background: filterType === f ? "rgba(255,234,0,0.1)" : "transparent",
                    color: filterType === f ? "var(--neon-yellow)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    transition: "all 0.2s"
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {trashedPosts.filter(t => {
              if (filterType === "All") return true;
              if (filterType === "Posts") return !t.type || t.type === "post";
              if (filterType === "Comments") return t.type === "comment";
              if (filterType === "Replies") return t.type === "reply";
              return true;
            }).map((post, index) => (
              <div key={`${post.id}-${index}`} className="card" style={{ borderLeft: "4px solid #FF4444", position: "relative" }}>
                <div style={{ marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ color: "#FF4444", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                    DELETED {post.type ? post.type.toUpperCase() : "POST"}
                    {!post.read && <span style={{ width: "8px", height: "8px", background: "#FF4444", borderRadius: "50%" }}></span>}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    {getDaysLeft(post.deletedAt)} days left before permanent deletion
                  </div>
                </div>
                
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5", margin: "0 0 15px 0", whiteSpace: "pre-wrap", fontStyle: "italic", textDecoration: "line-through" }}>
                  {post.content}
                </p>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                  <button 
                    onClick={() => setItemToDeleteForever(post.id)}
                    style={{ background: "transparent", border: "1px solid rgba(255, 68, 68, 0.5)", borderRadius: "6px", color: "#FF4444", padding: "5px 15px", fontSize: "0.85rem", cursor: "pointer", transition: "all 0.3s" }}
                  >
                    Delete Forever
                  </button>
                  <button 
                    onClick={() => setItemToRestore(post)}
                    style={{ background: "rgba(255, 234, 0, 0.1)", border: "1px solid var(--neon-yellow)", borderRadius: "6px", color: "var(--neon-yellow)", padding: "5px 15px", fontSize: "0.85rem", cursor: "pointer", transition: "all 0.3s", fontWeight: "bold" }}
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <button onClick={() => router.back()} className="nav-item" style={{ padding: "10px 20px", background: "transparent", border: "1px solid var(--neon-yellow)", borderRadius: "8px", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)", cursor: "pointer", fontSize: "1rem" }}>
          Bumalik
        </button>
      </div>

      {toastMessage && (
        <div style={{ position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.9)", border: "1px solid var(--neon-yellow)", color: "white", padding: "12px 20px", borderRadius: "30px", display: "flex", alignItems: "center", gap: "15px", zIndex: 1100, animation: "slideUp 0.3s ease-out, fadeOut 0.3s ease-in 2.7s forwards", boxShadow: "0 4px 15px rgba(255, 234, 0, 0.2)" }}>
          <span style={{ fontSize: "0.95rem" }}>{toastMessage}</span>
        </div>
      )}

      {/* Delete Forever Confirmation Modal */}
      {itemToDeleteForever && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px", animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-main)", width: "100%", maxWidth: "400px", borderTop: "3px solid #FF4444", padding: "20px", animation: "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#FF4444", fontFamily: "var(--font-outfit)" }}>Delete Forever</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.95rem", color: "var(--text-main)" }}>Are you sure you want to permanently delete this item? It cannot be recovered.</p>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button onClick={() => setItemToDeleteForever(null)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "var(--text-muted)", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}>Cancel</button>
              <button 
                onClick={confirmDeleteForever}
                style={{ flex: 1, padding: "10px", background: "#FF4444", border: "none", color: "white", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {itemToRestore && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px", animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", flexDirection: "column", background: "var(--bg-main)", width: "100%", maxWidth: "400px", borderTop: "3px solid var(--neon-yellow)", padding: "20px", animation: "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "var(--neon-yellow)", fontFamily: "var(--font-outfit)" }}>Restore Item</h3>
            <p style={{ margin: "0 0 20px 0", fontSize: "0.95rem", color: "var(--text-main)" }}>Are you sure you want to restore this item back to the main room?</p>
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button onClick={() => setItemToRestore(null)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", color: "var(--text-muted)", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" }}>Cancel</button>
              <button 
                onClick={confirmRestorePost}
                style={{ flex: 1, padding: "10px", background: "var(--neon-yellow)", border: "none", color: "black", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.9rem" }}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
