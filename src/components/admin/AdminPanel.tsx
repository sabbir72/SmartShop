import React, { useState } from "react";
import { useStore } from "../../context/StoreContext";
import { AdminDashboard } from "./AdminDashboard";
import { ProductManagement } from "./ProductManagement";
import { CategoryManagement } from "./CategoryManagement";
import { InventoryManagement } from "./InventoryManagement";
import { OrderManagement } from "./OrderManagement";
import { CouponManagement } from "./CouponManagement";
import { ReportsAnalytics } from "./ReportsAnalytics";
import { RoleManagement } from "./RoleManagement";
import { AuditLogView } from "./AuditLogView";
import { AdminAIAssistant } from "./AdminAIAssistant";
import { SettingsCMS } from "./SettingsCMS";
import { SecurityLabelManagement } from "./SecurityLabelManagement";
import { CompanyCMSManagement } from "./CompanyCMSManagement";
import { CareersManagement } from "./CareersManagement";
import { LegalPoliciesManagement } from "./LegalPoliciesManagement";
import { FAQManagement } from "./FAQManagement";
import { CustomerSupportManagement } from "./CustomerSupportManagement";
import { SupplierManagement } from "./SupplierManagement";
import { MarketingManagement } from "./MarketingManagement";
import { WarehouseMovementManagement } from "./WarehouseMovementManagement";
import { SEOMarketingManagement } from "./SEOMarketingManagement";
import {
  LayoutDashboard,
  Package,
  Layers,
  Building2,
  ShoppingBag,
  Tag,
  BarChart3,
  ShieldCheck,
  Activity,
  Sparkles,
  Settings,
  Briefcase,
  HelpCircle,
  Headphones,
  FileText,
  Building,
  Truck,
  ShieldAlert,
  Store,
  Lock,
  Megaphone,
  ArrowLeftRight,
  Search,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

export const AdminPanel: React.FC = () => {
  const { adminView, setAdminView, activeRole, hasPermission, setMode, switchRole } = useStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // BR-02: Customer / Guest role attempting to view Admin Panel
  if (activeRole === "Customer" || activeRole === "Guest") {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white border border-rose-200 rounded-3xl shadow-xl text-center space-y-6">
        <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black uppercase tracking-wider rounded-full border border-rose-200">
            403 Forbidden
          </span>
          <h1 className="text-2xl font-extrabold text-slate-900">Access Denied to Admin Command Center</h1>
          <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
            Your current active role <strong className="text-rose-700 font-bold">"{activeRole}"</strong> does not have administrative privileges required to access the portal.
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-2">
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <Lock className="w-4 h-4 text-amber-500" />
            <span>Role-Based Access Control (RBAC) Enforcement</span>
          </div>
          <p>
            To test administrative modules, switch your test role in the top header RBAC bar or select an authorized admin role (Super Admin, Admin, Product Manager, etc.).
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={() => switchRole("Super Admin")}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
            >
              Switch to Super Admin
            </button>
            <button
              onClick={() => switchRole("Product Manager")}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
            >
              Switch to Product Manager
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center">
          <button
            onClick={() => setMode("storefront")}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Store className="w-4 h-4" />
            <span>Return to Customer Storefront</span>
          </button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, module: "Product" },
    { id: "products", label: "Products", icon: Package, module: "Product" },
    { id: "categories", label: "Categories", icon: Layers, module: "Category" },
    { id: "inventory", label: "Inventory", icon: Building2, module: "Inventory" },
    { id: "warehouse-movement", label: "Warehouse Movement", icon: ArrowLeftRight, module: "Inventory" },
    { id: "orders", label: "Orders", icon: ShoppingBag, module: "Order" },
    { id: "coupons", label: "Coupons", icon: Tag, module: "Coupon" },
    { id: "marketing", label: "Marketing Management", icon: Megaphone, module: "CMS" },
    { id: "seo-marketing", label: "SEO & Marketing", icon: Search, module: "CMS" },
    { id: "reports", label: "Reports", icon: BarChart3, module: "Reports" },
    { id: "supplier-management", label: "Supplier Management", icon: Truck, module: "CMS" },
    { id: "company-cms", label: "Company Info & Inquiries", icon: Building, module: "CMS" },
    { id: "careers", label: "Careers & Recruitment", icon: Briefcase, module: "Careers" },
    { id: "legal-policies", label: "Legal Policies", icon: FileText, module: "CMS" },
    { id: "faq-kb", label: "FAQ Knowledge Base", icon: HelpCircle, module: "CMS" },
    { id: "customer-support", label: "Support Tickets & Returns", icon: Headphones, module: "Support" },
    { id: "roles", label: "RBAC Roles", icon: ShieldCheck, module: "User" },
    { id: "audit-logs", label: "Audit Logs", icon: Activity, module: "Audit" },
    { id: "ai-assistant", label: "AI Copywriter", icon: Sparkles, module: "Product" },
    { id: "cms-security", label: "CMS Security Labels", icon: ShieldCheck, module: "Settings" },
    { id: "settings", label: "Settings", icon: Settings, module: "Settings" },
  ];

  const currentNavItem = navItems.find((item) => item.id === adminView) || navItems[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Mobile Top Navigation Switcher (visible on lg:hidden) */}
      <div className="lg:hidden mb-4 bg-[#0F172A] text-white p-3.5 rounded-2xl border border-slate-800 shadow-md">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="w-full flex items-center justify-between font-bold text-xs"
        >
          <div className="flex items-center gap-2">
            {React.createElement(currentNavItem.icon, { className: "w-4 h-4 text-indigo-400" })}
            <span className="text-white uppercase tracking-wider text-[11px] font-black">
              Admin Module: {currentNavItem.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-800 px-2.5 py-1 rounded-xl text-[11px]">
            <span>{mobileNavOpen ? "Close Menu" : "Switch Module"}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileNavOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        {mobileNavOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = adminView === item.id;
              const isAllowed = hasPermission(item.module as any, "view");

              if (!isAllowed && activeRole !== "Super Admin" && activeRole !== "Admin") {
                return null;
              }

              return (
                <button
                  key={`mobile-${item.id}`}
                  onClick={() => {
                    setAdminView(item.id as any);
                    setMobileNavOpen(false);
                  }}
                  className={`flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-left transition-colors ${
                    isActive ? "bg-indigo-600 text-white font-black" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Desktop Sidebar Nav */}
        <aside className="hidden lg:flex lg:col-span-1 bg-[#0F172A] p-5 rounded-2xl border border-slate-800 h-fit space-y-6 shadow-md flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-slate-800 px-2 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider block">Admin Console</span>
                <span className="text-xs font-bold text-white">Role: {activeRole}</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Active Session"></div>
            </div>

            <nav className="space-y-1 pt-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = adminView === item.id;
                const isAllowed = hasPermission(item.module as any, "view");

                if (!isAllowed && activeRole !== "Super Admin" && activeRole !== "Admin") {
                  return null;
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setAdminView(item.id as any)}
                    className={`sidebar-item w-full ${isActive ? "active" : ""}`}
                  >
                    <Icon className={`w-4 h-4 mr-2.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Admin User Profile Footprint */}
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3 p-2 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <div className="w-9 h-9 bg-indigo-500 text-white rounded-full flex items-center justify-center font-black text-xs border-2 border-white/20 shrink-0">
                SA
              </div>
              <div className="overflow-hidden text-left">
                <p className="text-white text-xs font-bold truncate">Rakib Ahmed</p>
                <p className="text-slate-400 text-[10px] truncate">{activeRole}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Admin Content Column */}
        <main className="lg:col-span-4">
          {adminView === "dashboard" && <AdminDashboard />}
          {adminView === "products" && <ProductManagement />}
          {adminView === "categories" && <CategoryManagement />}
          {adminView === "inventory" && <InventoryManagement />}
          {adminView === "warehouse-movement" && <WarehouseMovementManagement />}
          {adminView === "orders" && <OrderManagement />}
          {adminView === "coupons" && <CouponManagement />}
          {adminView === "marketing" && <MarketingManagement />}
          {adminView === "seo-marketing" && <SEOMarketingManagement />}
          {adminView === "reports" && <ReportsAnalytics />}
          {adminView === "supplier-management" && <SupplierManagement />}
          {adminView === "company-cms" && <CompanyCMSManagement />}
          {adminView === "careers" && <CareersManagement />}
          {adminView === "legal-policies" && <LegalPoliciesManagement />}
          {adminView === "faq-kb" && <FAQManagement />}
          {adminView === "customer-support" && <CustomerSupportManagement />}
          {adminView === "roles" && <RoleManagement />}
          {adminView === "audit-logs" && <AuditLogView />}
          {adminView === "ai-assistant" && <AdminAIAssistant />}
          {adminView === "cms-security" && <SecurityLabelManagement />}
          {adminView === "settings" && (
            <div className="space-y-6">
              <SettingsCMS />
              <SecurityLabelManagement />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
