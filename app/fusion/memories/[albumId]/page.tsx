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
                style={{ height: `${photo.height}px` }}
              >
                📸 Image {photo.id + 1}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Link href="/fusion/memories" className="nav-item" style={{ marginTop: "40px", alignSelf: "center", padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)" }}>
        Back to Albums
      </Link>
    </main>
  );
}
