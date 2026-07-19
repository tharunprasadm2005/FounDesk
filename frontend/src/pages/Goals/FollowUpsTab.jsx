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

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div className="card-glass">
        {fuLoading ? (
          <p style={{ fontSize: "13px", color: "var(--light-gray)", margin: 0 }}>Syncing follow-up database...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {followUps.length > 0 ? followUps.slice(0, 3).map((fu, idx) => (
              <div key={fu.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "16px 0",
                borderBottom: idx === Math.min(followUps.length, 3) - 1 ? "none" : "1px solid var(--border-soft)",
              }}>
                <span style={{ fontSize: "13.5px", color: "var(--white)", fontWeight: "500" }}>
                  {fu.person_name} — {fu.last_contact_date ? `Last contact ${daysAgo(fu.last_contact_date)}` : "No contact logged"}
                </span>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <button onClick={() => handleFuStatus(fu.id, "completed")}
                    style={{ fontSize: "11.5px", color: "var(--void)", background: "var(--ember)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "750", border: "none" }}>
                    Logged Follow-up
                  </button>
                  <button onClick={() => handleFuStatus(fu.id, "dismissed")}
                    style={{ fontSize: "11.5px", color: "var(--graphite)", background: "transparent", cursor: "pointer", border: "none", fontWeight: "600" }}>
                    Dismiss
                  </button>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: "13px", color: "var(--light-gray)", margin: 0, padding: "20px 0", textAlign: "center" }}>
                All relationship follow-ups are up to date.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
