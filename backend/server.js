require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const admin = require("firebase-admin");

// ==============================
// 🔐 FIREBASE ADMIN INIT
// ==============================
// Uses a service account key. Either:
//  1) Set FIREBASE_SERVICE_ACCOUNT as the full JSON string in an env var (recommended for Render/Vercel), OR
//  2) Place a serviceAccountKey.json file in this folder (local dev only — NEVER commit it).
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ==============================
// 💳 RAZORPAY INIT
// ==============================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==============================
// 🚀 APP SETUP
// ==============================
const app = express();
app.use(express.json());

// Only allow requests from your deployed frontend + local dev
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser tools (curl/postman) with no origin, and any whitelisted origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

// ==============================
// 🔐 AUTH MIDDLEWARE — verifies the Firebase ID token sent from the frontend
// ==============================
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!idToken) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // contains uid, email, etc.
    next();
  } catch (err) {
    console.error("Auth verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired auth token" });
  }
}

// ==============================
// 💰 SERVER-SIDE PRICE CALCULATION
// (never trust a price sent by the client — recompute it here)
// ==============================
async function calculateTrustedPrice(parkingId, start, end) {
  const slotSnap = await db.collection("parkingSlots").doc(parkingId).get();

  if (!slotSnap.exists) {
    throw new Error("Parking location not found");
  }

  const slot = slotSnap.data();
  const pricePerHour = slot.pricePerHour || 20;

  const hours =
    (new Date(`1970-01-01T${end}`) - new Date(`1970-01-01T${start}`)) /
    (1000 * 60 * 60);

  if (!(hours > 0)) {
    throw new Error("Invalid start/end time");
  }

  const price = Math.ceil(hours) * pricePerHour;

  return { price, slot };
}

// ==============================
// 1️⃣ CREATE ORDER
// Frontend calls this BEFORE opening Razorpay checkout.
// ==============================
app.post("/api/create-order", requireAuth, async (req, res) => {
  try {
    const { parkingId, start, end } = req.body;

    if (!parkingId || !start || !end) {
      return res.status(400).json({ error: "Missing booking details" });
    }

    const { price, slot } = await calculateTrustedPrice(parkingId, start, end);

    if ((slot.availableSlots ?? 0) <= 0) {
      return res.status(409).json({ error: "No slots available" });
    }

    const order = await razorpay.orders.create({
      amount: price * 100, // paise
      currency: "INR",
      receipt: `parkiq_${req.user.uid}_${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // public key, safe to expose
    });
  } catch (err) {
    console.error("create-order error:", err.message);
    res.status(500).json({ error: "Could not create order" });
  }
});

// ==============================
// 2️⃣ VERIFY PAYMENT + CREATE BOOKING
// Frontend calls this AFTER Razorpay checkout succeeds.
// This is the ONLY place a booking document gets created.
// ==============================
app.post("/api/verify-payment", requireAuth, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      parkingId,
      parkingName,
      carNumber,
      ownerName,
      date,
      start,
      end,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !parkingId ||
      !carNumber ||
      !date ||
      !start ||
      !end
    ) {
      return res.status(400).json({ error: "Missing verification details" });
    }

    // 🔐 Verify the Razorpay signature — proves the payment is genuine
    // and was not tampered with on the client.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Recompute the trusted price again (never trust anything from the client)
    const { price, slot } = await calculateTrustedPrice(parkingId, start, end);

    if ((slot.availableSlots ?? 0) <= 0) {
      return res.status(409).json({ error: "No slots available" });
    }

    const token = "PK" + Math.floor(10000 + Math.random() * 90000);

    const bookingData = {
      userId: req.user.uid,
      email: req.user.email,
      parkingId,
      parkingName: parkingName || slot.name || parkingId,
      carNumber,
      ownerName: ownerName || "",
      date,
      start,
      end,
      price,
      token,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Single source of truth: one booking doc, written only after a verified payment.
    const bookingRef = await db.collection("bookings").add(bookingData);

    // Slot is only decremented after payment is confirmed — not before.
    await db
      .collection("parkingSlots")
      .doc(parkingId)
      .update({
        availableSlots: admin.firestore.FieldValue.increment(-1),
      });

    res.json({
      success: true,
      bookingId: bookingRef.id,
      token,
      price,
    });
  } catch (err) {
    console.error("verify-payment error:", err.message);
    res.status(500).json({ error: "Could not verify payment" });
  }
});

// ==============================
// HEALTH CHECK
// ==============================
app.get("/", (req, res) => {
  res.json({ status: "ParkIQ backend is running ✅" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ParkIQ backend running on port ${PORT}`);
});
