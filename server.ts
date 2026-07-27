import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { getPrismaClient } from "./src/lib/prisma";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: "10mb" }));

  // Lazy Gemini initialization helper
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      appName: "Smart E-Commerce Management System",
    });
  });

  // PostgreSQL Database Health Endpoint (via Prisma)
  app.get("/api/db/status", async (req, res) => {
    try {
      const prisma = getPrismaClient();
      if (!prisma) {
        return res.json({
          status: "configured_or_uninitialized",
          database: "PostgreSQL",
          connected: false,
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          message: "DATABASE_URL not found or Prisma client uninitialized.",
        });
      }

      await prisma.$queryRaw`SELECT 1`;
      return res.json({
        status: "connected",
        database: "PostgreSQL (Supabase)",
        connected: true,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return res.status(500).json({
        status: "error",
        database: "PostgreSQL",
        connected: false,
        error: err.message,
      });
    }
  });

  // AI Shopping Assistant Chatbot API
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, context } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          reply: `I am your AI Shopping Assistant! (Gemini API key not provided in env, running in offline fallback mode). How can I assist you with product specs, recommendations, or order tracking today?`,
        });
      }

      const prompt = `You are an expert, helpful AI E-Commerce Shopping & Customer Service Assistant for Smart E-Commerce.
Context of products in stock or user cart: ${JSON.stringify(context || {})}
User Query: "${message}"

Give a friendly, helpful, concise answer with bullet points if recommending products or explaining store policies. Keep tone professional and encouraging.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      res.json({ reply: response.text || "I'm here to help you shop!" });
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      res.status(500).json({
        reply: "I encountered an error processing your query. Please feel free to ask again or browse our categories!",
        error: error.message,
      });
    }
  });

  // AI Product Copywriter & SEO Generator for Admin
  app.post("/api/ai/copywriter", async (req, res) => {
    try {
      const { productName, category, specs } = req.body;
      const ai = getGeminiClient();

      if (!ai) {
        return res.json({
          shortDescription: `High quality ${productName} engineered for maximum durability and top performance.`,
          fullDescription: `<p>Experience the ultimate in innovation with <strong>${productName}</strong>. Designed for everyday excellence, featuring premium materials and user-centric features.</p>`,
          seoTitle: `${productName} - Buy Online at Best Price`,
          seoKeywords: `${productName}, ${category}, online shopping, buy ${productName}`,
          seoDescription: `Get the best deals on ${productName} in ${category}. Fast delivery and warranty guaranteed.`,
        });
      }

      const prompt = `You are a professional E-Commerce Copywriter and SEO Specialist.
Generate marketing copy for a product with:
Product Name: ${productName}
Category: ${category}
Specs/Features: ${JSON.stringify(specs || {})}

Return STRICT JSON format with these exact keys:
{
  "shortDescription": "1-2 engaging catchphrases",
  "fullDescription": "2 HTML paragraphs highlighting key benefits",
  "seoTitle": "SEO optimized product title under 60 chars",
  "seoKeywords": "comma separated keywords",
  "seoDescription": "Meta description under 150 chars"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      let text = response.text || "";
      // Strip json codeblock if present
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();

      try {
        const parsed = JSON.parse(text);
        res.json(parsed);
      } catch (e) {
        res.json({
          shortDescription: `Premium ${productName} with modern features.`,
          fullDescription: response.text,
          seoTitle: `${productName} - Smart E-Commerce`,
          seoKeywords: `${productName}, ${category}`,
          seoDescription: `Shop ${productName} with fast shipping and standard warranty.`,
        });
      }
    } catch (error: any) {
      console.error("AI Copywriter Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk Product Upload CSV Validation API
  app.post("/api/import/validate", (req, res) => {
    const { rows, existingSkus } = req.body;
    const errors: Array<{ rowNumber: number; sku: string; error: string }> = [];
    const validRows: any[] = [];
    const skuSet = new Set(existingSkus || []);

    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: "Invalid rows data" });
    }

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // header is row 1
      const sku = (row["SKU"] || row["sku"] || "").toString().trim();
      const name = (row["Product Name"] || row["product_name"] || row["Name"] || "").toString().trim();
      const price = parseFloat(row["Price"] || row["price"] || "0");
      const category = (row["Category"] || row["category"] || "").toString().trim();

      let rowErrors: string[] = [];

      if (!name) rowErrors.push("Missing Product Name");
      if (!sku) rowErrors.push("Missing SKU");
      else if (skuSet.has(sku)) rowErrors.push(`Duplicate SKU '${sku}' in database or import file`);
      if (isNaN(price) || price <= 0) rowErrors.push("Missing or invalid Price");
      if (!category) rowErrors.push("Missing Category");

      if (rowErrors.length > 0) {
        errors.push({
          rowNumber: rowNum,
          sku: sku || "N/A",
          error: rowErrors.join("; "),
        });
      } else {
        if (sku) skuSet.add(sku);
        validRows.push({
          ...row,
          SKU: sku,
          Name: name,
          Price: price,
          Category: category,
        });
      }
    });

    res.json({
      totalProcessed: rows.length,
      validCount: validRows.length,
      errorCount: errors.length,
      errors,
      validRows,
    });
  });

  // -------------------------------------------------------------------
  // BANGLADESH PAYMENT GATEWAYS API PROXIES (bKash, SSLCommerz, Nagad)
  // -------------------------------------------------------------------

  // bKash Checkout Init & Token Proxy
  app.post("/api/payment/bkash/init", async (req, res) => {
    try {
      const { amount, invoiceNumber, customerPhone } = req.body;
      const appKey = process.env.BKASH_APP_KEY;
      const appSecret = process.env.BKASH_APP_SECRET;
      const username = process.env.BKASH_USERNAME;
      const password = process.env.BKASH_PASSWORD;
      const isSandbox = process.env.BKASH_IS_SANDBOX !== "false";

      if (!appKey || !appSecret || !username || !password) {
        // Return structured sandbox simulation token if API keys are not yet configured
        return res.json({
          status: "simulated_success",
          paymentID: `TRX_BKASH_${Date.now()}`,
          bkashURL: `/checkout/payment-success?gateway=bkash&invoice=${invoiceNumber}`,
          message: "bKash Sandbox Mode (Configure BKASH_APP_KEY in settings or env for live PGW)",
          amount,
          invoiceNumber,
        });
      }

      // Live / Test PGW API Call
      const baseUrl = isSandbox
        ? "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized"
        : "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized";

      // 1. Grant Token Call
      const tokenResp = await fetch(`${baseUrl}/checkout/token/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          username,
          password,
        },
        body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
      });
      const tokenData = await tokenResp.json();

      if (!tokenData.id_token) {
        return res.status(400).json({ error: "Failed to authenticate with bKash API", details: tokenData });
      }

      // 2. Create Payment Call
      const createResp = await fetch(`${baseUrl}/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: tokenData.id_token,
          "X-APP-Key": appKey,
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: customerPhone || "01700000000",
          callbackURL: `${process.env.APP_URL || "http://localhost:3000"}/api/payment/bkash/callback`,
          amount: String(amount),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: invoiceNumber,
        }),
      });

      const createData = await createResp.json();
      res.json(createData);
    } catch (err: any) {
      console.error("bKash Init Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // SSLCommerz Session Init Proxy
  app.post("/api/payment/sslcommerz/init", async (req, res) => {
    try {
      const { amount, invoiceNumber, customerName, customerEmail, customerPhone } = req.body;
      const storeId = process.env.SSLCOMMERZ_STORE_ID;
      const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
      const isSandbox = process.env.SSLCOMMERZ_IS_SANDBOX !== "false";

      if (!storeId || !storePassword) {
        return res.json({
          status: "simulated_success",
          GatewayPageURL: `/checkout/payment-success?gateway=sslcommerz&invoice=${invoiceNumber}`,
          message: "SSLCommerz Sandbox Mode (Configure SSLCOMMERZ_STORE_ID in settings or env for live PGW)",
        });
      }

      const sslUrl = isSandbox
        ? "https://sandbox.sslcommerz.com/gwprocess/v4/api.php"
        : "https://securepay.sslcommerz.com/gwprocess/v4/api.php";

      const formData = new URLSearchParams({
        store_id: storeId,
        store_passwd: storePassword,
        total_amount: String(amount),
        currency: "BDT",
        tran_id: invoiceNumber,
        success_url: `${process.env.APP_URL || "http://localhost:3000"}/api/payment/sslcommerz/success`,
        fail_url: `${process.env.APP_URL || "http://localhost:3000"}/api/payment/sslcommerz/fail`,
        cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/api/payment/sslcommerz/cancel`,
        cus_name: customerName || "Customer",
        cus_email: customerEmail || "customer@example.com",
        cus_phone: customerPhone || "01700000000",
        cus_add1: "Dhaka, Bangladesh",
        cus_city: "Dhaka",
        cus_country: "Bangladesh",
        shipping_method: "NO",
        product_name: "Smart E-Commerce Order",
        product_category: "General",
        product_profile: "physical-goods",
      });

      const resp = await fetch(sslUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
      });

      const sslData = await resp.json();
      res.json(sslData);
    } catch (err: any) {
      console.error("SSLCommerz Init Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------------
  // SMS & EMAIL NOTIFICATION GATEWAY PROXIES
  // -------------------------------------------------------------------

  // SMS Dispatch API (BulkSMS BD / Twilio / Gateway Fallback)
  app.post("/api/notifications/sms", async (req, res) => {
    try {
      const { phone, message } = req.body;
      const bulkSmsKey = process.env.BULKSMS_API_KEY;
      const senderId = process.env.BULKSMS_SENDER_ID || "SmartEcom";

      if (bulkSmsKey) {
        // BulkSMS BD API Request
        const resp = await fetch("https://bulksmsbd.net/api/smsapi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: bulkSmsKey,
            type: "text",
            number: phone,
            senderid: senderId,
            message: message,
          }),
        });
        const smsRes = await resp.json();
        return res.json({ status: "sent", provider: "BulkSMS BD", response: smsRes });
      }

      // Fallback / Development Simulation Log
      console.log(`[SMS DISPATCH LOG] To: ${phone} | Content: ${message}`);
      res.json({
        status: "simulated_sent",
        recipient: phone,
        message,
        info: "SMS logged to server console. Provide BULKSMS_API_KEY in .env to dispatch live SMS to subscriber hand-sets.",
      });
    } catch (err: any) {
      console.error("SMS Dispatch Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Email Dispatch API (Nodemailer SMTP / Brevo / SendGrid / Fallback)
  app.post("/api/notifications/email", async (req, res) => {
    try {
      const { toEmail, subject, htmlContent } = req.body;
      const sendgridKey = process.env.SENDGRID_API_KEY;
      const brevoApiKey = process.env.BREVO_API_KEY;
      const smtpHost = process.env.SMTP_HOST || "smtp-relay.brevo.com";
      const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const fromEmail = process.env.EMAIL_FROM || "sabbircse72@gmail.com";

      // 1. Try Nodemailer SMTP Transporter if SMTP credentials are fully provided
      if (smtpHost && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          });

          const mailInfo = await transporter.sendMail({
            from: `"SmartShop Security" <${fromEmail}>`,
            to: toEmail,
            subject: subject,
            html: htmlContent,
          });

          console.log(`[SMTP LIVE EMAIL DISPATCHED] ID: ${mailInfo.messageId} | Recipient: ${toEmail}`);
          return res.json({
            status: "sent",
            provider: "SMTP",
            messageId: mailInfo.messageId,
            recipient: toEmail,
          });
        } catch (smtpErr: any) {
          console.warn("[SMTP Dispatch Warning] Falling back to HTTP API:", smtpErr.message || smtpErr);
        }
      }

      // 2. Try Brevo HTTP REST API if BREVO_API_KEY is available
      if (brevoApiKey) {
        try {
          const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
              "api-key": brevoApiKey,
            },
            body: JSON.stringify({
              sender: { email: fromEmail, name: "SmartShop" },
              to: [{ email: toEmail }],
              subject: subject,
              htmlContent: htmlContent,
            }),
          });

          if (resp.ok) {
            const data = await resp.json();
            console.log(`[BREVO API LIVE EMAIL DISPATCHED] ID: ${data.messageId} | Recipient: ${toEmail}`);
            return res.json({ status: "sent", provider: "Brevo API", messageId: data.messageId, recipient: toEmail });
          }
        } catch (e) {
          console.warn("Brevo API Dispatch attempt failed:", e);
        }
      }

      // 3. Try SendGrid API
      if (sendgridKey) {
        const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sendgridKey}`,
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: toEmail }] }],
            from: { email: fromEmail, name: "SmartShop" },
            subject: subject,
            content: [{ type: "text/html", value: htmlContent }],
          }),
        });

        if (resp.status === 202 || resp.ok) {
          return res.json({ status: "sent", provider: "SendGrid", recipient: toEmail });
        }
      }

      // 4. Fallback / Simulation Log
      console.log(`[EMAIL DISPATCH LOG] To: ${toEmail} | Subject: ${subject} | SMTP Host: ${smtpHost}`);
      res.json({
        status: "simulated_sent",
        recipient: toEmail,
        subject,
        smtpHost,
        info: "Email OTP processed. Configure active SMTP or BREVO_API_KEY in .env for live transmission.",
      });
    } catch (err: any) {
      console.error("Email Dispatch Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return app;
}

export const app = createExpressApp();

async function startServer() {
  const PORT = 3000;

  // Vite Middleware for Development / Static serving for Production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Smart E-Commerce] Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}
