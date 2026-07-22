import { useState, useCallback, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { Stack, Inline, Card } from "../../components/layout";

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
    <Stack gap="gap-6" className="fade-in">
      <Card padding="p-6">
        {fuLoading ? (
          <p className="text-[13px] text-[var(--stone-400)] m-0">Syncing follow-up database...</p>
        ) : (
          <Stack gap="gap-0">
            {followUps.length > 0 ? followUps.slice(0, 3).map((fu, idx) => (
              <Inline key={fu.id} justify="justify-between" items="items-center" className={`py-4 ${idx === Math.min(followUps.length, 3) - 1 ? "" : "border-b border-[var(--stone-200)]"}`}>
                <span className="text-[13.5px] text-[var(--japandi-text)] font-medium">
                  {fu.person_name} — {fu.last_contact_date ? `Last contact ${daysAgo(fu.last_contact_date)}` : "No contact logged"}
                </span>
                <Inline gap="gap-3" items="items-center">
                  <button onClick={() => handleFuStatus(fu.id, "completed")}
                    style={{ fontSize: "11.5px", color: "var(--washi-white)", background: "var(--japandi-accent)", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontWeight: "750", border: "none" }}>
                    Logged Follow-up
                  </button>
                  <button onClick={() => handleFuStatus(fu.id, "dismissed")}
                    style={{ fontSize: "11.5px", color: "var(--stone-400)", background: "transparent", cursor: "pointer", border: "none", fontWeight: "600" }}>
                    Dismiss
                  </button>
                </Inline>
              </Inline>
            )) : (
              <p className="text-[13px] text-[var(--stone-400)] m-0 py-5 text-center">
                All relationship follow-ups are up to date.
              </p>
            )}
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
