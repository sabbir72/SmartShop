import React, { useState } from "react";
import { useStore } from "../../context/StoreContext";
import { PaymentMethod } from "../../types";
import { generateInvoicePDF } from "../../utils/pdfGenerator";
import {
  CreditCard,
  MapPin,
  Phone,
  User as UserIcon,
  CheckCircle2,
  ShieldCheck,
  FileText,
  ShoppingBag,
  ArrowRight,
} from "lucide-react";

export const CheckoutView: React.FC = () => {
  const { cart, appliedCoupon, placeOrder, setStoreView, currentUser, settings, securityLabels, addToast } = useStore();

  const [customerName, setCustomerName] = useState(currentUser.name || "Ayesha Rahman");
  const [customerEmail, setCustomerEmail] = useState(currentUser.email || "ayesha.customer@gmail.com");
  const [customerPhone, setCustomerPhone] = useState(currentUser.phone || "+880 1611 998877");

  const [street, setStreet] = useState("House 45, Road 11, Banani");
  const [city, setCity] = useState("Dhaka");
  const [postalCode, setPostalCode] = useState("1213");
  const [country, setCountry] = useState("Bangladesh");

  const ALL_PAYMENT_METHODS: PaymentMethod[] = [
    "bKash",
    "Nagad",
    "Rocket",
    "SSLCommerz",
    "Cash On Delivery",
  ];

  const availablePaymentMethods = React.useMemo(() => {
    const configuredGateways = settings.paymentGateways || {};
    let active = ALL_PAYMENT_METHODS.filter((method) => configuredGateways[method] !== false);

    if (settings.sslCommerzOnlyOnline && configuredGateways["SSLCommerz"] !== false) {
      active = active.filter((m) => m === "SSLCommerz" || m === "Cash On Delivery");
    }

    if (active.length === 0) {
      active = ["Cash On Delivery"];
    }

    return active;
  }, [settings.paymentGateways, settings.sslCommerzOnlyOnline]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bKash");

  React.useEffect(() => {
    if (!availablePaymentMethods.includes(paymentMethod)) {
      setPaymentMethod(availablePaymentMethods[0] || "Cash On Delivery");
    }
  }, [availablePaymentMethods, paymentMethod]);

  const subtotal = cart.reduce((acc, item) => {
    const price = item.selectedVariant?.price || item.product.discountPrice || item.product.sellingPrice;
    return acc + price * item.quantity;
  }, 0);

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "Percentage") {
      discountAmount = Math.min((subtotal * appliedCoupon.discountValue) / 100, appliedCoupon.maxDiscount);
    } else {
      discountAmount = appliedCoupon.discountValue;
    }
  }

  const shippingCharge = cart.length > 0 ? settings.shippingCharge : 0;
  const tax = Math.round((subtotal - discountAmount) * (settings.taxRate / 100));
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingCharge + tax);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // 1. Check real-time stock availability
    for (const item of cart) {
      const stockAvailable = item.selectedVariant
        ? item.selectedVariant.stock
        : item.product.totalStock;
      if (item.quantity > stockAvailable) {
        addToast(
          `Stock updated! Only ${stockAvailable} available for ${item.product.name}. Please adjust cart.`,
          "error"
        );
        return;
      }
    }

    // 2. COD Validation Rules
    if (paymentMethod === "Cash On Delivery") {
      if (settings.codMinOrderAmount && grandTotal < settings.codMinOrderAmount) {
        addToast(
          `Cash On Delivery requires a minimum order amount of ${settings.currencySymbol}${settings.codMinOrderAmount}.`,
          "warning"
        );
        return;
      }
      if (settings.codMaxOrderAmount && grandTotal > settings.codMaxOrderAmount) {
        addToast(
          `Cash On Delivery is available for orders up to ${settings.currencySymbol}${settings.codMaxOrderAmount.toLocaleString()}. Please select an online payment option.`,
          "warning"
        );
        return;
      }

      const allowedCODDistricts = settings.codAllowedDistricts && settings.codAllowedDistricts.length > 0
        ? settings.codAllowedDistricts
        : [
            "Dhaka",
            "Chittagong",
            "Sylhet",
            "Gazipur",
            "Narayanganj",
            "Rajshahi",
            "Khulna",
            "Barishal",
            "Rangpur",
            "Mymensingh",
            "Cumilla",
          ];
      const isAllowed = allowedCODDistricts.some((d) =>
        city.trim().toLowerCase().includes(d.toLowerCase())
      );
      if (!isAllowed) {
        addToast(
          `Cash On Delivery is only available for selected major districts (${allowedCODDistricts.slice(0, 5).join(", ")}...). Please select an online payment method.`,
          "warning"
        );
        return;
      }
    }

    const orderItems = cart.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      variantSummary: [item.color, item.size].filter(Boolean).join(" / "),
      price: item.selectedVariant?.price || item.product.discountPrice || item.product.sellingPrice,
      quantity: item.quantity,
      total: (item.selectedVariant?.price || item.product.discountPrice || item.product.sellingPrice) * item.quantity,
      image: item.selectedVariant?.image || item.product.mainImage,
    }));

    const newOrder = placeOrder({
      customerId: currentUser.id,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: { street, city, postalCode, country },
      items: orderItems,
      subtotal,
      discount: discountAmount,
      couponCode: appliedCoupon?.code,
      shippingCharge,
      tax,
      total: grandTotal,
      paymentMethod,
      paymentStatus: paymentMethod === "Cash On Delivery" ? "Unpaid" : "Paid",
      orderStatus: "Pending",
    });

    // Multi-channel Notification Simulation
    addToast(`Order ${newOrder.orderNumber} Created! Dispatched via Email, SMS & WhatsApp.`, "success");

    // Auto generate PDF invoice
    generateInvoicePDF(newOrder, settings.currencySymbol);

    // Redirect to order history
    setStoreView("orders");
  };

  if (cart.length === 0) {
    return (
      <div className="py-16 text-center space-y-4">
        <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Your Cart is Empty</h2>
        <button
          onClick={() => setStoreView("products")}
          className="bg-blue-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <div className="bg-slate-900 text-white p-6 rounded-2xl">
        <h1 className="text-2xl font-black tracking-tight">Checkout & Order Placement</h1>
        <p className="text-xs text-slate-300">Complete delivery address and payment authorization</p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Contact & Address */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-3">
              <UserIcon className="w-4 h-4 text-blue-600" /> Customer Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone Number</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-3">
              <MapPin className="w-4 h-4 text-blue-600" /> Shipping & Billing Address
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Street Address / House / Flat Number</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">City / Region</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Postal Code</label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-200 pb-3">
              <CreditCard className="w-4 h-4 text-blue-600" /> Select Payment Gateway
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs font-bold">
              {availablePaymentMethods.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                    paymentMethod === method
                      ? "bg-blue-50 border-blue-600 text-blue-700 shadow-xs ring-2 ring-blue-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs">{method}</span>
                  {paymentMethod === method && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>

            {/* Checkout Security Labels */}

          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-3">
              Order Line Items ({cart.length})
            </h3>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-xs">
                  <img
                    src={item.selectedVariant?.image || item.product.mainImage}
                    alt={item.product.name}
                    className="w-12 h-12 rounded-lg object-contain bg-slate-50 p-1 border shrink-0"
                  />
                  <div className="flex-1">
                    <h5 className="font-bold text-slate-900 line-clamp-1">{item.product.name}</h5>
                    <span className="text-slate-500">Qty: {item.quantity}</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {settings.currencySymbol}
                    {(
                      (item.selectedVariant?.price || item.product.discountPrice || item.product.sellingPrice) *
                      item.quantity
                    ).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-2 text-xs text-slate-600 border-t border-slate-200 pt-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">{settings.currencySymbol}{subtotal.toLocaleString()}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span>-{settings.currencySymbol}{discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Shipping Charge</span>
                <span className="font-bold text-slate-900">{settings.currencySymbol}{shippingCharge}</span>
              </div>

              <div className="flex justify-between">
                <span>Tax ({settings.taxRate}%)</span>
                <span className="font-bold text-slate-900">{settings.currencySymbol}{tax.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-3">
                <span>Grand Total</span>
                <span className="text-blue-600">{settings.currencySymbol}{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
            >
              <span>Confirm & Place Order</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Instant PDF Invoice download will initiate automatically.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
