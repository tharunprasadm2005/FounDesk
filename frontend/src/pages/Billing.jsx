import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

export default function Billing() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/billing/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch((err) => console.error("[Billing] Failed to fetch billing config:", err));
    fetch("/api/billing/plan", { headers: { Authorization: "Bearer " + (localStorage.getItem("token") || "") } })
      .then((r) => r.json())
      .then((d) => { setPlan(d); setLoading(false); })
      .catch((err) => { console.error("[Billing] Failed to fetch billing plan:", err); setLoading(false); });

    const s = document.createElement("script");
    s.src = RAZORPAY_SCRIPT;
    s.onload = () => setRazorpayLoaded(true);
    s.onerror = () => console.error("[Billing] Failed to load Razorpay script");
    document.body.appendChild(s);
    return () => { if (s.parentNode) s.parentNode.removeChild(s); };
  }, []);

  const handleUpgrade = async () => {
    if (!razorpayLoaded || !config) return alert("Razorpay not loaded yet");
    try {
      const res = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (localStorage.getItem("token") || "") },
      });
      const order = await res.json();
      if (order.error) return alert(order.error);

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "FounDesk",
        description: "Starter Plan",
        order_id: order.order_id,
        handler: async function (response) {
          const verify = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + (localStorage.getItem("token") || "") },
            body: JSON.stringify(response),
          });
          const result = await verify.json();
          if (result.status === "active") {
            setPlan((p) => ({ ...p, subscription_status: "active" }));
            alert("Subscription activated!");
          } else {
            alert("Payment verification failed");
          }
        },
        modal: { ondismiss: function () { console.log("Payment cancelled"); } },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      alert("Failed to create order: " + e.message);
    }
  };

  if (loading) return (
    <div style={{ padding: "80px 0", textAlign: "center", color: "var(--light-gray)", fontFamily: "'Satoshi', sans-serif" }}>
      <p>Loading billing info...</p>
    </div>
  );

  const isTrial = plan?.subscription_status === "trial";
  const isActive = plan?.subscription_status === "active";
  const isPastDue = plan?.subscription_status === "past_due";
  const isCancelled = plan?.subscription_status === "cancelled";

  const badgeStyle = (status) => ({
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    background: status === "active" ? "rgba(62,142,90,0.15)" : status === "trial" ? "rgba(241,96,1,0.15)" : "rgba(193,8,1,0.15)",
    color: status === "active" ? "var(--success)" : status === "trial" ? "var(--warning)" : "var(--error)",
  });

  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "0 auto", fontFamily: "'Satoshi', sans-serif" }} className="fade-in">
      <h1 style={{ fontSize: 24, marginBottom: 24, color: "var(--sand)", fontFamily: "'Clash Display', sans-serif", fontWeight: 800 }}>Billing</h1>

      <div style={{ background: "var(--ink-2)", border: "1px solid rgba(107, 107, 111, 0.12)", borderRadius: 16, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: "var(--sand)", fontFamily: "'Clash Display', sans-serif", fontWeight: 700 }}>Starter Plan</h2>
            <p style={{ margin: "4px 0 0", color: "var(--graphite)", fontSize: 13, fontWeight: 500 }}>
              ₹{(plan?.plan_amount || 0) / 100} / month
            </p>
          </div>
          <span style={badgeStyle(plan?.subscription_status)}>
            {plan?.subscription_status?.toUpperCase() || "UNKNOWN"}
          </span>
        </div>

        {isTrial && (
          <p style={{ color: "var(--ember)", background: "rgba(232, 80, 2, 0.04)", border: "1px solid rgba(232, 80, 2, 0.15)", padding: 12, borderRadius: 8, margin: "12px 0", fontSize: 12.5, fontWeight: 500 }}>
            Trial ends in <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{plan?.trial_remaining_days || 0}</span> days.
          </p>
        )}
        {isPastDue && (
          <p style={{ color: "var(--crimson)", background: "rgba(200, 30, 58, 0.04)", border: "1px solid rgba(200, 30, 58, 0.15)", padding: 12, borderRadius: 8, margin: "12px 0", fontSize: 12.5, fontWeight: 500 }}>
            Payment failed — please update your payment method.
          </p>
        )}
        {isCancelled && (
          <p style={{ color: "var(--crimson)", background: "rgba(200, 30, 58, 0.04)", border: "1px solid rgba(200, 30, 58, 0.15)", padding: 12, borderRadius: 8, margin: "12px 0", fontSize: 12.5, fontWeight: 500 }}>
            Your subscription has been cancelled. Upgrade to regain access.
          </p>
        )}

        <div style={{ margin: "24px 0" }}>
          <h3 style={{ fontSize: 10, color: "var(--graphite)", marginBottom: 12, textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.06em", fontFamily: "'Satoshi', sans-serif" }}>Plan Features</h3>
          {["Up to 5 workspaces", "Unlimited integrations", "AI-powered insights", "Calendar defense", "Knowledge transfer"].map((f) => (
            <div key={f} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.03)", color: "var(--sand)", fontSize: 13, fontWeight: 500 }}>
              <span>{f}</span>
              <span style={{ color: "#3acaa5", fontWeight: 700 }}>✓</span>
            </div>
          ))}
        </div>

        {!isActive && (
          <button
            style={razorpayLoaded ? {
              background: "var(--ember)", color: "var(--void)", border: "none",
              padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Satoshi', sans-serif", transition: "all 0.2s"
            } : {
              background: "var(--ink)", color: "var(--graphite)", border: "1px solid rgba(255,255,255,0.05)",
              padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: "not-allowed", fontFamily: "'Satoshi', sans-serif",
            }}
            onClick={handleUpgrade}
            disabled={!razorpayLoaded}
          >
            {razorpayLoaded ? "Upgrade Now — ₹" + ((plan?.plan_amount || 0) / 100) : "Synchronizing gateway..."}
          </button>
        )}
        {isActive && (
          <p style={{ color: "#3acaa5", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3acaa5" }} />
            Subscription is active. No action needed.
          </p>
        )}
      </div>
    </div>
  );
}
