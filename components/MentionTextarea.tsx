"use client";
import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface Account {
  firstName: string;
  lastName: string;
  id?: string;
  avatar?: string;
}

interface MentionTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
}

export default function MentionTextarea(props: MentionTextareaProps) {
  const { value = "", defaultValue, onChange, onKeyDown, onScroll, style, className, id, placeholder, ...rest } = props;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [filter, setFilter] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [caretPos, setCaretPos] = useState(0);
  const [internalValue, setInternalValue] = useState<string>((props.value as string) || (props.defaultValue as string) || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const portalNode = document.getElementById("emoji-portal-wrapper");
      const isInsidePortal = portalNode && portalNode.contains(event.target as Node);
      const isInsideRef = emojiPickerRef.current && emojiPickerRef.current.contains(event.target as Node);
      
      if (!isInsideRef && !isInsidePortal) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onEmojiClick = (emojiObject: any) => {
    const currentPos = textareaRef.current ? textareaRef.current.selectionStart : internalValue.length;
    const valBefore = internalValue.substring(0, currentPos);
    const valAfter = internalValue.substring(currentPos);
    const newValue = valBefore + emojiObject.emoji + valAfter;
    triggerOnChange(newValue);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = currentPos + emojiObject.emoji.length;
        textareaRef.current.selectionEnd = currentPos + emojiObject.emoji.length;
      }
    }, 0);
  };
  useEffect(() => {
    if (props.value !== undefined) setInternalValue(props.value as string);
  }, [props.value]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // Fetch logged in user to avoid mentioning oneself with "You" badge if needed
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (profile) setActiveUser({ firstName: profile.first_name, lastName: profile.last_name });
        }

        const { data: profiles, error } = await supabase.from('profiles').select('first_name, last_name, avatar_url, badge');
        if (!error && profiles) {
          const accs = profiles
            .filter(p => p.badge?.toLowerCase() !== 'admin')
            .map(p => ({
              firstName: p.first_name,
              lastName: p.last_name,
              avatar: p.avatar_url
            }));
          
          const adminLog = localStorage.getItem("isAdminLoggedIn");
          if (adminLog) {
            accs.unshift({ firstName: "everyone", lastName: "", avatar: "📢" });
          }
          setAccounts(accs);
        }
      } catch (e) {
        console.error("Error fetching mention accounts:", e);
      }
    };
    
    fetchAccounts();
  }, []);

  const triggerOnChange = (newValue: string) => {
    setInternalValue(newValue);
    if (!onChange) return;
    
    // Create a robust mock event that satisfies auto-resize logic
    const fakeTarget = {
      value: newValue,
      style: textareaRef.current ? textareaRef.current.style : {},
      scrollHeight: textareaRef.current ? textareaRef.current.scrollHeight : 0
    };
    
    const e = { target: fakeTarget, currentTarget: fakeTarget } as unknown as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(e);
  };

  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredAccounts = accounts.filter(a => {
    const fn = `${a.firstName} ${a.lastName}`.toLowerCase();
    return fn.includes(filter.toLowerCase());
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (dropdownVisible && filteredAccounts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredAccounts.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredAccounts.length) % filteredAccounts.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        selectUser(filteredAccounts[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setDropdownVisible(false);
        return;
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInternalValue(val);
    if (onChange) onChange(e);

    const pos = e.target.selectionStart;
    setCaretPos(pos);

    const textBeforeCaret = val.substring(0, pos);
    const lastAtPos = textBeforeCaret.lastIndexOf('@');
    
    if (lastAtPos !== -1 && (lastAtPos === 0 || /\s/.test(textBeforeCaret.charAt(lastAtPos - 1)))) {
      const textAfterAt = textBeforeCaret.substring(lastAtPos + 1).replace(/\u200B/g, "");
      if (!/\n/.test(textAfterAt)) {
        setMentionStartIndex(lastAtPos);
        setFilter(textAfterAt);
        setDropdownVisible(true);
        return;
      }
    }
    setDropdownVisible(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (onScroll) onScroll(e);
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const selectUser = (user: Account) => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const currentValue = internalValue;
    const valBefore = currentValue.substring(0, mentionStartIndex);
    const valAfter = currentValue.substring(caretPos);
    
    const newValue = `${valBefore}@\u200B${fullName} ${valAfter}`;
    triggerOnChange(newValue);
    setDropdownVisible(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCaretPos = mentionStartIndex + fullName.length + 3;
        textareaRef.current.selectionStart = newCaretPos;
        textareaRef.current.selectionEnd = newCaretPos;
      }
    }, 0);
  };

  const sortedMentions = React.useMemo(() => {
    const validMentions = new Set<string>();
    accounts.forEach(a => {
      const fullName = `${a.firstName} ${a.lastName}`.trim();
      const parts = fullName.split(" ");
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j <= parts.length; j++) {
          validMentions.add(parts.slice(i, j).join(" ").toLowerCase());
        }
      }
    });
    return Array.from(validMentions).sort((a, b) => b.length - a.length);
  }, [accounts]);

  const combinedRegex = React.useMemo(() => {
    let baseRegexStr = '[a-zA-Z0-9_.-]+(?:\\s[a-zA-Z0-9_.-]+)?';
    if (sortedMentions.length > 0) {
      const escapedMentions = sortedMentions.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      baseRegexStr = `${escapedMentions.join('|')}|[a-zA-Z0-9_.-]+(?:\\s[a-zA-Z0-9_.-]+)?`;
    }
    return new RegExp(`@\\u200B?(${baseRegexStr})(?=[\\s\\.,!?]|$)`, 'gi');
  }, [sortedMentions]);

  const renderHighlights = () => {
    let html = internalValue;
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    if (combinedRegex) {
      html = html.replace(combinedRegex, '<span style="background-color: rgba(255,234,0,0.3); color: transparent; border-radius: 2px; box-decoration-break: clone; -webkit-box-decoration-break: clone;">$&</span>');
    }

    html = html.replace(/\n/g, '<br/>');

    if ((internalValue).endsWith('\n')) {
      html += '<br/>';
    }

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const containerStyle: CSSProperties = { position: "relative", width: style?.width || "100%", height: style?.height || "auto", flex: style?.flex, minHeight: style?.minHeight, userSelect: "text", WebkitUserSelect: "text", pointerEvents: "auto" };
  
  const sharedTextStyles: CSSProperties = {
    fontFamily: style?.fontFamily || "inherit",
    fontSize: style?.fontSize || "inherit",
    lineHeight: style?.lineHeight || "normal",
    letterSpacing: style?.letterSpacing || "normal",
    padding: style?.padding || "0px",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    textAlign: style?.textAlign || "left",
  };

  const inputStyle: CSSProperties = { ...style, ...sharedTextStyles, width: "100%", height: "100%", margin: 0, position: "relative", zIndex: 2, background: "transparent", color: "var(--text-main)", caretColor: "var(--neon-yellow)", outline: "none", resize: "none", paddingRight: "40px" };
  
  const backdropStyle: CSSProperties = { ...style, ...sharedTextStyles, width: "100%", height: "100%", margin: 0, position: "absolute", top: 0, left: 0, right: 0, bottom: 0, color: "transparent", pointerEvents: "none", overflow: "hidden", zIndex: 1, borderColor: "transparent", background: style?.background || "transparent", paddingRight: "40px" };

  return (
    <div className={className} style={containerStyle}>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes highlightIn {
          from { background-color: transparent; }
          to { background-color: rgba(255,234,0,0.3); }
        }
        @keyframes slideDownSmooth {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        textarea {
          user-select: text !important;
          -webkit-user-select: text !important;
        }
        textarea::selection {
          background-color: rgba(0, 120, 215, 0.8) !important;
          color: #ffffff !important;
        }
        textarea::-moz-selection {
          background-color: rgba(0, 120, 215, 0.8) !important;
          color: #ffffff !important;
        }
      `}} />
      
      
      <div ref={backdropRef} style={backdropStyle}>
        {renderHighlights()}
      </div>

      <div ref={emojiPickerRef} style={{ position: "absolute", bottom: "10px", right: "10px", zIndex: 10 }}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setShowEmojiPicker(!showEmojiPicker);
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "5px",
            opacity: 0.7,
            transition: "all 0.2s"
          }}
          onMouseOver={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--neon-white)"; }}
          onMouseOut={(e) => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>
        {showEmojiPicker && (
          isMobile && typeof document !== 'undefined' ? require('react-dom').createPortal(
            <div id="emoji-portal-wrapper" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }} onClick={() => setShowEmojiPicker(false)}></div>
              <div style={{ position: 'relative', zIndex: 1, width: '90vw', maxWidth: '350px' }}>
                <button onClick={() => setShowEmojiPicker(false)} style={{ position: 'absolute', top: '-40px', right: '0', background: 'transparent', border: 'none', color: 'var(--neon-white)', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} width="100%" height={350} hiddenEmojis={["1f595", "1f595-1f3fb", "1f595-1f3fc", "1f595-1f3fd", "1f595-1f3fe", "1f595-1f3ff"]} />
              </div>
            </div>,
            document.body
          ) : (
            <div className="emoji-picker-responsive-wrapper">
              <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.DARK} width="100%" height={350} hiddenEmojis={["1f595", "1f595-1f3fb", "1f595-1f3fc", "1f595-1f3fd", "1f595-1f3fe", "1f595-1f3ff"]} />
            </div>
          )
        )}
      </div>
      
      <textarea
        {...rest}
        ref={textareaRef}
        id={id}
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={handleScroll}
        placeholder={placeholder}
        style={inputStyle}
      />

      {dropdownVisible && filteredAccounts.length > 0 && (
          <div style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            width: "250px",
            maxHeight: "200px",
            overflowY: "auto",
            background: "var(--bg-card)",
            border: "1px solid var(--neon-yellow)",
            borderRadius: "8px",
            zIndex: 1000,
            boxShadow: "0 -4px 15px rgba(0,0,0,0.5)",
            marginBottom: "5px",
            display: "flex",
            flexDirection: "column",
            animation: "slideDownSmooth 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            transformOrigin: "bottom center"
          }}>
            {filteredAccounts.map((acc, idx) => (
              <div 
                key={idx}
                onClick={() => selectUser(acc)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  padding: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "var(--neon-white)",
                  background: idx === selectedIndex ? "rgba(255, 234, 0, 0.2)" : "transparent",
                  borderBottom: idx < filteredAccounts.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                  fontSize: "0.85rem",
                  transition: "background 0.2s ease, transform 0.2s ease"
                }}
              >
              <div style={{ 
                width: "24px", 
                height: "24px", 
                borderRadius: "50%", 
                background: "var(--bg-main)", 
                border: "1px solid var(--neon-yellow)",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                marginRight: "10px",
                overflow: "hidden",
                fontSize: "0.6rem",
                color: "var(--text-main)",
                flexShrink: 0
              }}>
                {acc.avatar && (acc.avatar.startsWith("data:image") || acc.avatar.startsWith("http")) ? (
                  <img src={acc.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "👤"
                )}
              </div>
              
              <span style={{ fontWeight: "bold", fontFamily: "var(--font-outfit)" }}>
                {acc.firstName} {acc.lastName} {activeUser && activeUser.firstName === acc.firstName && activeUser.lastName === acc.lastName ? <span style={{ color: "var(--neon-yellow)", fontSize: "0.8rem", marginLeft: "5px", opacity: 0.8 }}>(You)</span> : null}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
