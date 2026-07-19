import React, { useState, useEffect, useRef } from "react";
import { LogOut, User, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";

function Navbar({ user }) {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div
      style={{
        width: "100%",
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        zIndex: 100,
        transition: "all 0.3s ease",
        boxSizing: "border-box"
      }}
      className={scrolled ? "nav-glass" : ""}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Logo style={{ width: "32px", height: "32px" }} />
        <span style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Clash Display', sans-serif", letterSpacing: "0.03em" }}>
          FOUNDER PANEL
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <NotificationBell />

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "8px",
              transition: "background-color 0.2s"
            }}
            className="hover:bg-dark-gray"
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt="profile"
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  border: "1.5px solid var(--edge)"
                }}
              />
            ) : (
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(232, 80, 2, 0.15)",
                  color: "var(--japandi-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "12px",
                  fontFamily: "'Clash Display', sans-serif"
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "F"}
              </div>
            )}
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--japandi-text)" }}>
              {user?.name || "Founder"}
            </span>
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "40px",
                width: "160px",
                zIndex: 1000,
                padding: "6px"
              }}
              className="glass-panel"
            >
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  navigate("/settings");
                }}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "transparent",
                  border: "none",
                  padding: "8px 12px",
                  color: "var(--japandi-text)",
                  fontSize: "12px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  textAlign: "left"
                }}
                className="hover:bg-white/5"
              >
                <User size={14} />
                Settings
              </button>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "transparent",
                  border: "none",
                  padding: "8px 12px",
                  color: "var(--error)",
                  fontSize: "12px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  textAlign: "left"
                }}
                className="hover:bg-error/10"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;