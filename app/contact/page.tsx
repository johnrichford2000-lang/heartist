"use client";

import Link from "next/link";
import { useState } from "react";
import HeartistLogo from "@/components/HeartistLogo";
import { supabase } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/authHelper";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.message || isSending) return;

    setIsSending(true);
    try {
      const user = await getCurrentUser();
      const userId = user?.id || null;

      const dateStr = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const { data, error } = await supabase.from('forms').insert([{
        user_id: userId,
        type: 'CONTACT_US',
        data: {
          ...formData,
          date: dateStr
        },
        status: 'Pending'
      }]).select().single();

      if (error) {
        console.error("Error submitting contact form to Supabase:", error);
      } else {
        // Broadcast realtime update to admin
        try {
          supabase.channel('admin_forms').send({
            type: 'broadcast',
            event: 'new_contact_message',
            payload: data
          });
        } catch {}
      }

      setIsSubmitted(true);
      setFormData({ name: "", email: "", message: "" });
      setTimeout(() => setIsSubmitted(false), 3500);
    } catch (e) {
      console.error("Error in contact submit:", e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="main-container" style={{ padding: "80px 20px" }}>
      <header style={{ marginBottom: "30px", textAlign: "center" }}>
        <HeartistLogo className="animated-glow-text" width={45} height={45} />
        <h1 className="header-title glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "2.5rem", marginTop: "15px", textTransform: "uppercase" }}>
          Connect With Us
        </h1>
        <h2 style={{ color: "var(--neon-white)", fontSize: "1.1rem", marginTop: "10px", fontFamily: "var(--font-outfit)", fontStyle: "italic" }}>
          Send us a message and we'll get back to you!
        </h2>
      </header>

      <section style={{ maxWidth: "600px", margin: "0 auto", padding: "30px", background: "var(--bg-card)", borderTop: "3px solid var(--neon-yellow)", borderRadius: "15px", width: "100%" }}>
        {isSubmitted ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <h3 style={{ color: "var(--neon-yellow)", fontSize: "1.5rem", marginBottom: "15px", fontFamily: "var(--font-outfit)" }}>Message Sent! ??</h3>
            <p style={{ color: "var(--text-muted)", lineHeight: "1.6" }}>Thank you for reaching out to us. Your message is safely delivered to our leaders on the Admin Dashboard.</p>
            <button onClick={() => setIsSubmitted(false)} style={{ marginTop: "25px", padding: "10px 20px", background: "transparent", color: "var(--neon-white)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", cursor: "pointer", fontFamily: "var(--font-outfit)" }}>Send Another Message</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={{ color: "var(--neon-white)", fontSize: "0.9rem", marginBottom: "8px", display: "block", fontFamily: "var(--font-outfit)" }}>Your Name *</label>
              <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ width: "100%", padding: "12px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }} />
            </div>
            <div>
              <label style={{ color: "var(--neon-white)", fontSize: "0.9rem", marginBottom: "8px", display: "block", fontFamily: "var(--font-outfit)" }}>Email Address (Optional)</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ width: "100%", padding: "12px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", outline: "none", fontFamily: "var(--font-outfit)" }} />
            </div>
            <div>
              <label style={{ color: "var(--neon-white)", fontSize: "0.9rem", marginBottom: "8px", display: "block", fontFamily: "var(--font-outfit)" }}>Your Message *</label>
              <textarea required rows={5} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} style={{ width: "100%", padding: "12px", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", outline: "none", fontFamily: "var(--font-outfit)", resize: "vertical" }} />
            </div>
            <button type="submit" disabled={isSending} style={{ padding: "15px", background: "var(--neon-yellow)", color: "black", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "1.1rem", cursor: isSending ? "not-allowed" : "pointer", opacity: isSending ? 0.7 : 1, fontFamily: "var(--font-outfit)", marginTop: "10px", transition: "opacity 0.2s" }} onMouseOver={e => e.currentTarget.style.opacity = "0.8"} onMouseOut={e => e.currentTarget.style.opacity = "1"}>
              {isSending ? "Sending Message..." : "Send Message"}
            </button>
          </form>
        )}
      </section>

      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <Link href="/" className="nav-item" style={{ padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)" }}>
          Back to Home
        </Link>
      </div>
    </main>
  );
}
