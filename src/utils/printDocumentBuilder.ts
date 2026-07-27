import { Order, Product, SalesReportData } from "../types";
import { PrintableDocumentData, PrintableDocumentType } from "../types/print";

/**
 * Helper utility to build standard Enterprise Printable Document objects for any application entity.
 */

export function buildOrderInvoiceData(order: Order, currencySymbol: string = "৳"): PrintableDocumentData {
  return {
    documentType: "invoice",
    documentTitle: "OFFICIAL ORDER INVOICE",
    documentNumber: order.orderNumber,
    referenceNumber: order.trackingNumber || `REF-${order.id.slice(0, 6).toUpperCase()}`,
    status: order.orderStatus,
    watermark: order.paymentStatus === "Paid" ? "PAID" : order.orderStatus === "Cancelled" ? "CANCELLED" : "ORIGINAL",
    generatedDate: new Date().toLocaleDateString(),
    generatedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    generatedBy: "System Order Processing",

    customerInfo: {
      name: order.customerName,
      phone: order.customerPhone,
      email: order.customerEmail,
      address: `${order.shippingAddress.street}, ${order.shippingAddress.city} ${order.shippingAddress.postalCode}`,
    },

    shippingInfo: {
      recipientName: order.customerName,
      phone: order.customerPhone,
      address: `${order.shippingAddress.street}, ${order.shippingAddress.city}`,
      city: order.shippingAddress.city,
      postalCode: order.shippingAddress.postalCode,
      courierName: "Express Logistics",
      trackingNumber: order.trackingNumber || order.orderNumber,
    },

    items: order.items.map((item) => ({
      id: item.productId,
      name: item.productName,
      sku: item.variantSummary || `SKU-${item.productId.slice(0, 6)}`,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
    })),

    subtotal: order.subtotal,
    discountTotal: order.discount,
    taxTotal: order.tax,
    shippingCharge: order.shippingCharge,
    grandTotal: order.total,
    currencySymbol,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,

    notes: "Thank you for shopping with Smart E-Commerce! Warranty applicable as per manufacturer policy.",
    signaturesNeeded: ["Prepared By", "Customer", "Authorized"],
  };
}

export function buildPackingSlipData(order: Order): PrintableDocumentData {
  return {
    documentType: "packing_slip",
    documentTitle: "WAREHOUSE PACKING SLIP",
    documentNumber: `PS-${order.orderNumber.replace("ORD-", "")}`,
    referenceNumber: order.orderNumber,
    status: order.orderStatus,
    watermark: "DRAFT",
    generatedDate: new Date().toLocaleDateString(),
    generatedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    generatedBy: "Warehouse Fulfillment Team",

    customerInfo: {
      name: order.customerName,
      phone: order.customerPhone,
      address: `${order.shippingAddress.street}, ${order.shippingAddress.city}`,
    },

    shippingInfo: {
      recipientName: order.customerName,
      phone: order.customerPhone,
      address: `${order.shippingAddress.street}, ${order.shippingAddress.city}`,
      courierName: "Pathao Courier / Steadfast",
      trackingNumber: order.trackingNumber || order.orderNumber,
    },

    items: order.items.map((item) => ({
      id: item.productId,
      name: item.productName,
      sku: item.variantSummary || `SKU-${item.productId.slice(0, 6)}`,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
      notes: "Verify seal before dispatch",
    })),

    notes: "Pack carefully with bubble wrap. Attach shipping label on outer box.",
    signaturesNeeded: ["Prepared By", "Received By"],
  };
}

export function buildShippingLabelData(order: Order): PrintableDocumentData {
  return {
    documentType: "shipping_label",
    documentTitle: "COURIER DISPATCH LABEL",
    documentNumber: order.orderNumber,
    status: order.orderStatus,
    generatedDate: new Date().toLocaleDateString(),
    generatedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    generatedBy: "Dispatch Station #1",

    customerInfo: {
      name: order.customerName,
      phone: order.customerPhone,
    },

    shippingInfo: {
      recipientName: order.customerName,
      phone: order.customerPhone,
      address: `${order.shippingAddress.street}, ${order.shippingAddress.city}`,
      city: order.shippingAddress.city,
      postalCode: order.shippingAddress.postalCode,
      courierName: "EXPRESS DELIVERY NETWORK",
      trackingNumber: order.trackingNumber || order.orderNumber,
    },

    items: order.items.map((item) => ({
      id: item.productId,
      name: item.productName,
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.total,
    })),

    grandTotal: order.total,
    paymentStatus: order.paymentStatus,
  };
}

export function buildBarcodeLabelsData(products: Product[]): PrintableDocumentData {
  return {
    documentType: "barcode_labels",
    documentTitle: "PRODUCT BARCODE & PRICE STICKERS",
    documentNumber: `LBL-${Date.now().toString().slice(-6)}`,
    status: "APPROVED",
    generatedDate: new Date().toLocaleDateString(),
    generatedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    generatedBy: "Inventory Manager",

    items: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || p.sku,
      quantity: (p as any).stock || (p as any).stockQuantity || 1,
      unitPrice: p.sellingPrice,
      total: p.sellingPrice,
    })),
  };
}

export function buildReportPrintData(
  title: string,
  headers: string[],
  rawRows: (string | number)[][],
  docType: PrintableDocumentType = "system_report"
): PrintableDocumentData {
  return {
    documentType: docType,
    documentTitle: title.toUpperCase(),
    documentNumber: `REP-${Date.now().toString().slice(-6)}`,
    status: "APPROVED",
    generatedDate: new Date().toLocaleDateString(),
    generatedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    generatedBy: "System Analytics Engine",

    headers,
    rawRows,

    notes: "Confidential Enterprise Management Report. For internal company use only.",
    signaturesNeeded: ["Prepared By", "Approved By"],
  };
}
