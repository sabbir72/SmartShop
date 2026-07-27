import React, { useState } from "react";
import { useStore } from "../../context/StoreContext";
import { Coupon } from "../../types";
import { PrintableDocumentData } from "../../types/print";
import { buildReportPrintData } from "../../utils/printDocumentBuilder";
import { EnterprisePrintModal } from "../common/EnterprisePrintModal";
import { Tag, Plus, Edit2, Trash2, X, CheckCircle, AlertTriangle, Search, Filter, Printer } from "lucide-react";

export const CouponManagement: React.FC = () => {
  const { coupons, addCoupon, updateCoupon, deleteCoupon, categories, products, hasPermission, settings, addToast, recordAuditLog } = useStore();

  const [activePrintData, setActivePrintData] = useState<PrintableDocumentData | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const openPrintModal = (data: PrintableDocumentData) => {
    setActivePrintData(data);
    setIsPrintModalOpen(true);
  };

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);

  const [code, setCode] = useState("");
  const [type, setType] = useState<"Percentage" | "Fixed">("Percentage");
  const [discountValue, setDiscountValue] = useState(10);
  const [minSpend, setMinSpend] = useState(1000);
  const [maxDiscount, setMaxDiscount] = useState(500);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("2026-12-31");
  const [usageLimit, setUsageLimit] = useState(500);
  const [status, setStatus] = useState<"Active" | "Disabled">("Active");

  const handleOpenCreate = () => {
    setEditingId(null);
    setCode(`PROMO${Math.floor(100 + Math.random() * 900)}`);
    setType("Percentage");
    setDiscountValue(15);
    setMinSpend(1500);
    setMaxDiscount(600);
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("2026-12-31");
    setUsageLimit(1000);
    setStatus("Active");
    setShowModal(true);
  };

  const handleEdit = (c: Coupon) => {
    setEditingId(c.id);
    setCode(c.code);
    setType(c.type === "Fixed Amount" ? "Fixed" : c.type);
    setDiscountValue(c.discountValue);
    setMinSpend(c.minSpend || c.minPurchase || 1000);
    setMaxDiscount(c.maxDiscount || 500);
    setStartDate(c.startDate || new Date().toISOString().split("T")[0]);
    setEndDate(c.endDate || "2026-12-31");
    setUsageLimit(c.usageLimit || 1000);
    setStatus(c.status === "Disabled" ? "Disabled" : "Active");
    setShowModal(true);
  };

  const handleSaveCoupon = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      addToast("Coupon Code is required.", "error");
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      type,
      discountValue,
      minSpend,
      minPurchase: minSpend,
      maxDiscount,
      startDate,
      endDate,
      usageLimit,
      status,
    };

    if (editingId) {
      updateCoupon(editingId, payload);
      recordAuditLog(`Updated Coupon '${code}'`, "Coupon", "", JSON.stringify(payload));
    } else {
      addCoupon(payload);
      recordAuditLog(`Created Coupon '${code}'`, "Coupon", "", JSON.stringify(payload));
    }

    setShowModal(false);
  };

  const handleToggleStatus = (c: Coupon) => {
    const nextStatus = c.status === "Active" ? "Disabled" : "Active";
    updateCoupon(c.id, { status: nextStatus });
    recordAuditLog(`Toggled Coupon '${c.code}' status to ${nextStatus}`, "Coupon");
  };

  const handleConfirmDelete = () => {
    if (!deletingCoupon) return;
    deleteCoupon(deletingCoupon.id);
    recordAuditLog(`Deleted Coupon '${deletingCoupon.code}'`, "Coupon");
    setDeletingCoupon(null);
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center justify-between shadow-md border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-6 h-6 text-indigo-400" />
            <h1 className="text-2xl font-black tracking-tight">Promotional Coupon Management</h1>
          </div>
          <p className="text-xs text-slate-300 mt-1">Configure discount vouchers, expiry limits & minimum spend thresholds</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const headers = ["Coupon Code", "Discount Type", "Value", "Min Spend", "Max Discount", "Start Date", "End Date", "Status"];
              const rawRows = coupons.map((c) => [
                c.code,
                c.type,
                `${c.discountValue}${c.type === "Percentage" ? "%" : settings.currencySymbol}`,
                `${settings.currencySymbol}${(c.minSpend || c.minPurchase || 0).toLocaleString()}`,
                `${settings.currencySymbol}${(c.maxDiscount || 0).toLocaleString()}`,
                c.startDate || "N/A",
                c.endDate || "N/A",
                c.status || "Active",
              ]);
              openPrintModal(buildReportPrintData("PROMOTIONAL COUPONS & VOUCHERS REPORT", headers, rawRows, "coupon_report"));
            }}
            className="bg-indigo-800/60 hover:bg-indigo-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 border border-indigo-700/50 transition-all"
          >
            <Printer className="w-4 h-4 text-indigo-300" /> Print Summary
          </button>

          {hasPermission("Coupon", "add") && (
            <button
              onClick={handleOpenCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Create New Coupon
            </button>
          )}
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {coupons.map((c) => {
          const isExpired = c.endDate ? new Date(c.endDate).getTime() < Date.now() : false;

          return (
            <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 relative group">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-mono font-black text-slate-900 text-base">{c.code}</h3>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                    isExpired
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : c.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}
                >
                  {isExpired ? "Expired" : c.status}
                </span>
              </div>

              <div className="text-xs text-slate-600 space-y-1.5">
                <p>
                  Discount:{" "}
                  <strong className="text-slate-900 font-extrabold">
                    {c.discountValue}
                    {c.type === "Percentage" ? "% OFF" : ` ${settings.currencySymbol}`}
                  </strong>
                </p>
                <p>
                  Minimum Order Spend:{" "}
                  <strong className="text-slate-900 font-bold">{settings.currencySymbol}{(c.minSpend || c.minPurchase || 0).toLocaleString()}</strong>
                </p>
                <p>
                  Maximum Discount Cap:{" "}
                  <strong className="text-slate-900 font-bold">{settings.currencySymbol}{(c.maxDiscount || 0).toLocaleString()}</strong>
                </p>
                <p>
                  Total Usage:{" "}
                  <strong className="text-slate-900 font-bold">
                    {c.usageCount} / {c.usageLimit || "Unlimited"} times
                  </strong>
                </p>
                <p className="text-[10px] text-slate-400">Valid: {c.startDate || "N/A"} to {c.endDate || "N/A"}</p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                {hasPermission("Coupon", "edit") && (
                  <button
                    onClick={() => handleEdit(c)}
                    className="flex-1 text-center text-xs font-bold text-indigo-600 hover:bg-indigo-50 py-1.5 rounded-xl border border-indigo-200 transition-colors"
                  >
                    Edit
                  </button>
                )}

                {hasPermission("Coupon", "delete") && (
                  <button
                    onClick={() => setDeletingCoupon(c)}
                    className="text-center text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">{editingId ? "Edit Coupon Code" : "Create Promotional Coupon"}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono uppercase font-black text-sm tracking-wider"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount ({settings.currencySymbol})</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Min Order Spend ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    min={0}
                    value={minSpend}
                    onChange={(e) => setMinSpend(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Discount Cap ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    min={0}
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valid From</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Expiration Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Max Total Usage Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Coupon Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 font-bold">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCoupon && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 border-b pb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-extrabold text-slate-900 text-base">Delete Coupon</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete coupon code <strong className="text-slate-900">"{deletingCoupon.code}"</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingCoupon(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
              >
                Delete Coupon
              </button>
            </div>
          </div>
        </div>
      )}

      {activePrintData && (
        <EnterprisePrintModal
          data={activePrintData}
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};

