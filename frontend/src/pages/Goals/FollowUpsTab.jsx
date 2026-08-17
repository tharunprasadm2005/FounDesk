import { useState, useCallback, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";

export default function FollowUpsTab() {
  const toast = useToast();

  const [followUps, setFollowUps] = useState([]);
  const [fuLoading, setFuLoading] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    try {
      setFuLoading(true);
      const res = await api.get("/api/follow-ups?status=pending");
      setFollowUps(res.data);
    } catch (err) { console.error("[Goals] Failed to fetch follow-ups:", err); } finally { setFuLoading(false); }
  }, []);

  useEffect(() => { fetchFollowUps(); }, [fetchFollowUps]);

  const handleFuStatus = async (id, status) => {
    try { await api.put(`/api/follow-ups/${id}`, { status }); fetchFollowUps(); }
    catch { toast("Failed to update.", "error"); }
  };

  const daysAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    return `${diff} days ago`;
  };

  const dueLabel = (dateStr) => {
    if (!dateStr) return "due soon";
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `due ${Math.abs(diff)}d overdue`;
    if (diff === 0) return "due today";
    if (diff === 1) return "due tomorrow";
    return `due in ${diff}d`;
  };

  const priorityColor = {
    critical: "#ef4444",
    high: "#D6824F",
    normal: "var(--japandi-muted)",
    low: "var(--japandi-muted)",
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div className="card-glass" style={{ padding: "18px 20px" }}>
        {fuLoading ? (
          <p style={{ fontSize: "13px", color: "var(--japandi-muted)", margin: 0 }}>Syncing follow-up database...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {followUps.length > 0 ? followUps.slice(0, 6).map((fu, idx) => (
              <div key={fu.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
                padding: "16px 0",
                borderBottom: idx === Math.min(followUps.length, 6) - 1 ? "none" : "1px solid var(--japandi-border)",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "13.5px", color: "var(--japandi-text)", fontWeight: "600" }}>
                      {fu.person_name}
                    </span>
                    {fu.priority && fu.priority !== "normal" && (
                      <span style={{
                        fontSize: "9px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.6px",
                        padding: "2px 6px", borderRadius: "4px",
                        background: priorityColor[fu.priority] === "#ef4444" ? "rgba(239,68,68,0.12)" : "rgba(214,130,79,0.14)",
                        color: priorityColor[fu.priority],
                      }}>
                        {fu.priority}
                      </span>
                    )}
                  </div>
                  {fu.context && (
                    <div style={{ fontSize: "11.5px", color: "var(--japandi-muted)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {fu.context}
                    </div>
                  )}
                  <div style={{ fontSize: "10px", color: "var(--japandi-muted)", marginTop: "3px" }}>
                    {fu.last_contact_date ? `Last contact ${daysAgo(fu.last_contact_date)}` : "No contact logged"}
                    <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
                    <span style={{ color: priorityColor[fu.priority] === "#D6824F" ? "var(--japandi-accent)" : "inherit", fontWeight: 600 }}>
                      {fu.followup_date ? dueLabel(fu.followup_date) : "no due date"}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center", flexShrink: 0 }}>
                  <button onClick={() => handleFuStatus(fu.id, "completed")}
                    style={{ fontSize: "11.5px", color: "var(--japandi-bg)", background: "var(--japandi-accent)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "750", border: "none", whiteSpace: "nowrap" }}>
                    Logged Follow-up
                  </button>
                  <button onClick={() => handleFuStatus(fu.id, "dismissed")}
                    style={{ fontSize: "11.5px", color: "var(--japandi-muted)", background: "transparent", cursor: "pointer", border: "none", fontWeight: "600" }}>
                    Dismiss
                  </button>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: "13px", color: "var(--japandi-muted)", margin: 0, padding: "20px 0", textAlign: "center" }}>
                All relationship follow-ups are up to date.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
