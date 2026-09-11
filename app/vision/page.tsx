import Link from "next/link";

export default function VisionMissionPage() {
  const coreValues = [
    {
      title: "Faith",
      desc: "Prioritizes nurturing and strengthening the faith of young people as the foundation for a Christ-centered life.",
      verse: "“And without faith it is impossible to please him, for whoever would draw near to God must believe that he exists and that he rewards those who seek him.”",
      ref: "(Hebrews 11:6)"
    },
    {
      title: "Empowerment",
      desc: "Empowering young people to discover and utilize their God-given talents, fostering confidence and purpose.",
      verse: "“For we are God’s handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do.”",
      ref: "(Ephesians 2:10)"
    },
    {
      title: "Unity",
      desc: "Promoting unity across denominations, believing that collaboration and togetherness strengthen impact.",
      verse: "“Make every effort to maintain the unity of the Spirit in the bond of peace.”",
      ref: "(Ephesians 4:3)"
    },
    {
      title: "Humility",
      desc: "Using gifts with modesty and selflessness.",
      verse: "“Do nothing out of selfish ambition or vain conceit. Rather, in humility value others above yourselves...”",
      ref: "(Philippians 2:3-4)"
    },
    {
      title: "Compassion",
      desc: "Encouraging youth to use their talents to understand and care for the needs of others.",
      verse: "“Therefore, as God’s chosen people, holy and dearly loved, clothe yourselves with compassion...”",
      ref: "(Colossians 3:12)"
    },
    {
      title: "Charity",
      desc: "Actively contributing to the betterment of communities through charitable acts.",
      verse: "“Whoever is kind to the poor lends to the Lord, and he will reward them for what they have done.”",
      ref: "(Proverbs 19:17)"
    },
    {
      title: "Creativity",
      desc: "Valuing creative exploration as a tool for expression, outreach, and amplifying the message of faith.",
      verse: "“I have filled him with the Spirit of God, with skill, ability and knowledge in all kinds of crafts...”",
      ref: "(Exodus 31:3-4)"
    }
  ];

  return (
    <main className="main-container" style={{ padding: "80px 20px" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1 
          className="header-title glow-text-yellow" 
          style={{ fontFamily: "var(--font-outfit)", fontWeight: 900, fontSize: "2.5rem" }}
        >
          VISION & MISSION
        </h1>
      </header>

      {/* Mission & Vision Section */}
      <div className="cards-grid" style={{ marginBottom: "40px" }}>
        <div className="card" style={{ textAlign: "left", alignItems: "flex-start", padding: "30px" }}>
          <h2 className="glow-text-yellow" style={{ fontFamily: "var(--font-outfit)", fontSize: "1.8rem", marginBottom: "16px" }}>MISSION</h2>
          <p style={{ fontFamily: "var(--font-outfit)", lineHeight: "1.6", color: "var(--text-main)" }}>
            To ignite the hearts of young people, empowering them to discover their God-given talents and use them to create a positive impact on their generation and glorify God. We achieve this through Christ-centered events and gatherings, creative arts exploration, and engaging online content that nurtures faith, fosters unity, and equips young leaders.
          </p>
        </div>

        <div className="card" style={{ textAlign: "left", alignItems: "flex-start", padding: "30px" }}>
          <h2 className="glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "1.8rem", marginBottom: "16px" }}>VISION</h2>
          <p style={{ fontFamily: "var(--font-outfit)", lineHeight: "1.6", color: "var(--text-main)" }}>
            We envision a vibrant Christian youth community, united across denominations, where every young person is a Heartist – a passionate follower of Christ, actively using their gifts to inspire their generation, build a stronger society, and make Jesus known throughout the world, both online and in person.
          </p>
        </div>
      </div>

      {/* Core Values Section */}
      <div style={{ width: "100%", marginTop: "20px" }}>
        <h2 className="glow-text-white" style={{ fontFamily: "var(--font-outfit)", fontSize: "2rem", textAlign: "center", marginBottom: "30px", textShadow: "0 0 10px rgba(255,255,255,0.4)" }}>CORE VALUES</h2>
        
        <div className="cards-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {coreValues.map((val, idx) => (
            <div key={idx} className="card" style={{ textAlign: "left", alignItems: "flex-start", padding: "24px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <h3 className={idx % 2 === 0 ? "glow-text-yellow" : "glow-text-white"} style={{ fontFamily: "var(--font-outfit)", fontSize: "1.4rem", marginBottom: "12px" }}>
                {val.title}
              </h3>
              <p style={{ fontFamily: "var(--font-outfit)", fontSize: "0.95rem", color: "var(--text-main)", marginBottom: "12px" }}>
                {val.desc}
              </p>
              <div style={{ paddingLeft: "12px", borderLeft: "3px solid var(--neon-yellow)", marginTop: "auto" }}>
                <p style={{ fontSize: "0.85rem", fontStyle: "italic", color: "var(--text-muted)" }}>
                  {val.verse} <br/> <strong style={{color: "var(--neon-white)"}}>{val.ref}</strong>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Link href="/" className="nav-item" style={{ marginTop: "40px", padding: "10px 20px", border: "1px solid var(--neon-yellow)", borderRadius: "8px", textDecoration: "none", color: "var(--neon-yellow)" }}>
        Back to Home
      </Link>
    </main>
  );
}
