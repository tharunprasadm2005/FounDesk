import { useState, useEffect } from "react";
import api from "../../utils/api";
import { useToast } from "../../context/ToastContext";
import { CheckCircle, AlertCircle, FileText } from "lucide-react";
import { PLAN_TIERS } from "./SettingsConstants";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Inline, Stack } from "../../components/layout";

export default function BillingTab() {
  const { toast } = useToast();

  const [billing, setBilling] = useState(null);
  const [billingConfig, setBillingConfig] = useState(null);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [invoices, setInvoices] = useState([]);

  const fetchBilling = async () => {
    try {
      const res = await api.get("/api/billing/plan");
      setBilling(res.data);
    } catch (err) {
      console.error("[Settings] Failed to fetch billing plan:", err);
      try { const r = await api.get("/api/billing/config"); setBillingConfig(r.data); } catch (err2) { console.error("[Settings] Failed to fetch billing config:", err2); }
    }
  };

  const handleChangePlan = async (plan) => {
    try { await api.post("/api/billing/change-plan", { plan }); fetchBilling(); toast(`Plan changed to ${plan}.`, "success"); } catch { toast("Failed to change plan.", "error"); }
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Cancel your subscription?")) return;
    try { await api.post("/api/billing/cancel"); fetchBilling(); toast("Subscription cancelled.", "success"); } catch { toast("Failed to cancel subscription.", "error"); }
  };

  const handleReactivateSubscription = async () => {
    try { await api.post("/api/billing/reactivate"); fetchBilling(); toast("Subscription reactivated.", "success"); } catch { toast("Failed to reactivate.", "error"); }
  };

  const fetchInvoices = async () => {
    try { const res = await api.get("/api/billing/invoices"); setInvoices(Array.isArray(res.data) ? res.data : []); } catch { console.error("Failed to fetch invoices"); }
  };

  useEffect(() => {
    fetchBilling();
  }, []);

  const rawPlan = billing?.plan || "starter";
  const status = billing?.subscription_status || "trial";
  const trialDays = billing?.trial_remaining_days;
  const usage = billing?.usage;
  const activePlanKey = rawPlan.toString().toLowerCase();

  return (
    <div className="animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[32px]">
        {PLAN_TIERS.map(tier => {
          const isCurrent = tier.key === activePlanKey;
          const tierIndex = PLAN_TIERS.findIndex(t => t.key === activePlanKey);
          const thisIndex = PLAN_TIERS.findIndex(t => t.key === tier.key);
          const isUpgrade = thisIndex > tierIndex;
          const isDowngrade = activePlanKey !== "enterprise" && thisIndex < tierIndex && !isCurrent;
          const showCancel = isCurrent && (status === "active" || status === "trial");
          const showReactivate = isCurrent && (status === "cancelled" || status === "past_due");

          return (
            <Card key={tier.key} padding="p-[24px]" className={`relative bg-washi-white flex flex-col ${isCurrent ? 'ring-2 ring-moss-600' : ''}`}>
              {isCurrent && (
                <span className="absolute top-[12px] right-[12px] px-[8px] py-[4px] rounded-[2px] bg-moss-600/10 text-moss-600 border border-moss-600/20 text-[10px] font-bold tracking-widest uppercase">
                  Current
                </span>
              )}
              <div className="text-[16px] font-heading text-sumi-900 mb-[12px]">{tier.name}</div>
              <div className="text-[32px] font-medium text-sumi-900 mb-[24px] font-mono tracking-tight">
                {tier.currency === "INR" ? "\u20B9" : "$"}{tier.price}<span className="text-[14px] text-stone-400 font-sans tracking-normal">/mo</span>
              </div>
              <Stack gap="gap-[12px]" className="mb-[32px] flex-1">
                {tier.features.map((f, i) => (
                  <Inline key={i} items="items-start" gap="gap-[12px]" className="text-[13px] text-stone-500">
                    <CheckCircle size={14} className="text-moss-600 mt-[2px] shrink-0" />
                    <span>{f}</span>
                  </Inline>
                ))}
              </Stack>
              <div className="mt-auto pt-[24px] border-t border-stone-200">
                {isCurrent && showCancel && (
                  <Button onClick={handleCancelSubscription} variant="secondary" className="w-full text-clay-500 border-clay-500/30 hover:bg-clay-500/10 hover:text-clay-500">Cancel Subscription</Button>
                )}
                {isCurrent && showReactivate && (
                  <Button onClick={handleReactivateSubscription} variant="primary" className="w-full">Reactivate</Button>
                )}
                {isUpgrade && (
                  <Button onClick={() => handleChangePlan(tier.key)} variant="primary" className="w-full">Upgrade</Button>
                )}
                {isDowngrade && (
                  <Button onClick={() => handleChangePlan(tier.key)} variant="secondary" className="w-full">Downgrade</Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[32px]">
        <Stack gap="gap-[16px]">
          {trialDays !== null && trialDays !== undefined && (
            <Card padding="p-[24px]" className="bg-washi-white">
              <div className="text-[11px] font-bold text-stone-400 tracking-widest uppercase mb-[12px]">
                Trial {trialDays > 0 ? `${trialDays} days remaining` : "expired"}
              </div>
              <div className="h-[6px] bg-stone-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${trialDays > 7 ? "bg-moss-600" : "bg-clay-500"}`} style={{ width: `${Math.min(100, Math.max(0, (trialDays / 30) * 100))}%` }} />
              </div>
            </Card>
          )}

          {billing?.subscription_status && (
            <Card padding="p-[24px]" className="bg-washi-white h-full">
              <Inline justify="justify-between" items="items-center">
                <div>
                  <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase m-0 mb-[8px]">Subscription Status</h3>
                  <div className="text-[14px] font-medium text-sumi-900">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {billing?.current_period_end && <span className="text-stone-400 text-[13px] ml-[8px] font-mono tracking-wide">· Renews {new Date(billing.current_period_end).toLocaleDateString()}</span>}
                  </div>
                </div>
                <span className={`px-[12px] py-[6px] rounded-[2px] border text-[11px] font-bold tracking-widest uppercase ${status === "active" ? "bg-moss-600/10 text-moss-600 border-moss-600/20" : "bg-clay-500/10 text-clay-500 border-clay-500/20"}`}>
                  {status}
                </span>
              </Inline>
            </Card>
          )}
        </Stack>

        <Card padding="p-[24px]" className="bg-washi-white h-full">
          <h3 className="text-[12px] font-bold text-stone-400 tracking-widest uppercase mb-[24px] m-0">Usage</h3>
          {usage ? (
            <Stack gap="gap-[16px]">
              {Object.entries(usage).map(([key, val]) => (
                <div key={key}>
                  <Inline justify="justify-between" className="text-[12px] mb-[8px]">
                    <span className="text-stone-500 capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="font-mono font-medium text-sumi-900 flex items-center">
                      {val.used || 0}{val.limit ? <span className="text-stone-400"> / {val.limit}</span> : ""}
                      {val.limits_exceeded && <AlertCircle size={14} className="text-clay-500 ml-[6px]" />}
                    </span>
                  </Inline>
                  {val.limit && (
                    <div className="h-[4px] bg-stone-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${((val.used || 0) / val.limit) > 0.8 || val.limits_exceeded ? "bg-clay-500" : "bg-moss-600"}`} style={{ width: `${Math.min(100, ((val.used || 0) / val.limit) * 100)}%` }} />
                    </div>
                  )}
                  {val.limits_exceeded && (
                    <div className="text-[11px] font-medium text-clay-500 flex items-center gap-[6px] mt-[6px]">
                      <AlertCircle size={12} /> Limit exceeded
                    </div>
                  )}
                </div>
              ))}
            </Stack>
          ) : (
            <p className="text-[13px] text-stone-400 italic m-0">No usage data available.</p>
          )}
        </Card>
      </div>

      <Button onClick={() => { setShowInvoiceHistory(!showInvoiceHistory); if (!showInvoiceHistory && !invoices.length) fetchInvoices(); }} variant={showInvoiceHistory ? "primary" : "secondary"} className="mb-[24px]">
        <FileText size={14} className="mr-1" /> Invoice History
      </Button>

      {showInvoiceHistory && (
        <Card padding="p-0" className="bg-washi-white overflow-hidden animate-in slide-in-from-top-2">
          {invoices.length === 0 ? (
            <div className="p-[24px] text-[13px] text-stone-400 italic text-center">No invoices found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200">
                    {["Date", "Amount", "Status", "Plan", "Payment ID"].map(h => (
                      <th key={h} className="py-[12px] px-[16px] text-[10px] font-bold text-stone-400 tracking-widest uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {invoices.map((inv, i) => (
                    <tr key={inv.id || i} className="hover:bg-linen-100/50 transition-colors">
                      <td className="py-[12px] px-[16px] text-[13px] text-stone-500 font-mono tracking-wide">{inv.date ? new Date(inv.date).toLocaleDateString() : inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "\u2014"}</td>
                      <td className="py-[12px] px-[16px] text-[14px] font-medium text-sumi-900 font-mono tracking-tight">{inv.amount ? `${inv.currency || "$"}${(inv.amount / 100).toFixed(2)}` : "\u2014"}</td>
                      <td className="py-[12px] px-[16px]">
                        <span className={`px-[8px] py-[4px] rounded-[2px] border text-[10px] font-bold tracking-widest uppercase ${inv.status === "paid" ? "bg-moss-600/10 text-moss-600 border-moss-600/20" : "bg-stone-100 text-stone-500 border-stone-200"}`}>
                          {inv.status || "\u2014"}
                        </span>
                      </td>
                      <td className="py-[12px] px-[16px] text-[13px] text-stone-500 capitalize">{inv.plan || inv.plan_id || "\u2014"}</td>
                      <td className="py-[12px] px-[16px] text-[12px] text-stone-400 font-mono tracking-wide">{inv.payment_id || inv.id || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
