import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="main-container" style={{ padding: "80px 20px" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1 
          className="header-title glow-text-yellow" 
          style={{ fontFamily: "var(--font-outfit)", fontWeight: 900, fontSize: "2.5rem" }}
        >
          ABOUT US
        </h1>
      </header>

      <div className="card" style={{ textAlign: "justify", padding: "40px", lineHeight: "1.8", fontSize: "1.1rem" }}>
        <p style={{ fontFamily: "var(--font-outfit)", color: "var(--text-main)" }}>
          <strong className="glow-text-yellow" style={{ fontSize: "1.3rem" }}>Heartist Engagement</strong> is a youth-serving Christian group dedicated to igniting the hearts of young people. 
          We foster faith, unity, and a deep commitment to serving others with humility, compassion, and charity. 
          Through Christian gatherings, creative arts exploration, and engaging online content, Heartist Engagement 
          empowers young people to discover their God-given talents and use them to make a positive impact on their generation.
        </p>
        <br />
        <p style={{ fontFamily: "var(--font-outfit)", color: "var(--text-main)" }}>
          Our ultimate goal is to see a vibrant Christian youth community where young people actively live out their faith, 
          inspire others, and make Jesus known throughout the world. We believe that creativity is a powerful tool for 
          expressing faith and reaching a wider audience. 
        </p>
        <br />
        <p style={{ fontFamily: "var(--font-outfit)", color: "var(--text-main)" }}>
          Heartist Engagement is centered on the belief that every young person has the potential to be a <strong className="glow-text-yellow">Heartist</strong> – 
          a passionate follower of Christ who uses their gifts to shape their world.
        </p>
      </div>

      <Link href="/" className="nav-item" style={{ marginTop: "30px", padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)" }}>
        Back to Home
      </Link>
    </main>
  );
}
