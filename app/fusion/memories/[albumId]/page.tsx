import Link from "next/link";
import HeartistLogo from "@/components/HeartistLogo";

export default function AlbumGalleryPage({ params }: { params: { albumId: string } }) {
  // Simple title formatting (e.g. "worship-night" -> "worship night")
  const rawTitle = params.albumId.replace(/-/g, " ");

  // Generate placeholder photos to simulate the masonry gallery
  const photos = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    height: Math.floor(Math.random() * (300 - 150 + 1) + 150)
  }));

  return (
    <main className="app-container" style={{ paddingBottom: "120px" }}>
      {/* Top-Left Back Button (Pure SVG Icon, Fixed to Screen Top-Left, Navigates to Memories) */}
      <Link
        href="/fusion/memories"
        aria-label="Back to Memories"
        style={{
          position: "fixed",
          top: "18px",
          left: "18px",
          zIndex: 9999,
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

      <header className="top-header" style={{ marginBottom: "30px" }}>
        <HeartistLogo className="animated-glow-text" width={25} height={25} />
        <h1 className="header-title glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "1.8rem", marginTop: "10px", textTransform: "capitalize" }}>
          {rawTitle}
        </h1>
        <p className="logo-sub">Album Gallery</p>
      </header>

      <section>
        <div className="masonry-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="masonry-item">
              <div 
                className="masonry-img-placeholder" 
                style={{ height: `${photo.height}px`, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
                Image {photo.id + 1}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
