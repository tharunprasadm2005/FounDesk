import React, { useState, useEffect, useRef } from "react";
import { Bell, CheckSquare } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const activeCount = unreadCount;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "10px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: activeCount > 0 ? "var(--brand-orange)" : "var(--light-gray)",
          transition: "all 0.2s ease",
          position: "relative"
        }}
        className="hover:bg-dark-gray hover:text-brand-orange"
        title="Notifications"
        aria-label={`Notifications, ${activeCount} unread`}
      >
        <Bell size={20} />
        {activeCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "14px",
              height: "14px",
              backgroundColor: "var(--brand-orange)",
              color: "var(--primary)",
              fontWeight: 900,
              fontSize: "9px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1.5px solid var(--primary)"
            }}
            className="animate-pulse"
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "48px",
            width: "320px",
            zIndex: 1000,
            padding: 0
          }}
          className="glass-panel"
          data-lenis-prevent
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: "1px solid var(--edge)"
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--light-gray)" }}>
              Notifications
            </span>
            {activeCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--brand-orange)",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: 0
                }}
                className="hover:underline"
              >
                <CheckSquare size={12} />
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", fontSize: "12px", color: "var(--light-gray)" }}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", fontSize: "12px", color: "var(--light-gray)" }}>No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markAsRead(n.id);
                  }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--edge)",
                    cursor: "pointer",
                    backgroundColor: n.is_read ? "transparent" : "rgba(232, 80, 2, 0.05)",
                    transition: "background 0.15s"
                  }}
                  className="hover:bg-white/5"
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--white)", marginBottom: "2px" }}>{n.title}</div>
                  {n.message && <div style={{ fontSize: "11px", color: "var(--light-gray)", lineHeight: "1.4" }}>{n.message}</div>}
                  <div style={{ fontSize: "9px", color: "var(--gray)", marginTop: "4px" }}>
                    {new Date(n.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
