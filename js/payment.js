/* global Razorpay */

import { auth } from "./firebase-config.js";

// 🔗 Backend URL — update this after deploying the backend (Render/Vercel).
// For local testing, point this at your local server, e.g. "http://localhost:5000"
const BACKEND_URL = "https://parkiq-backend-pca0.onrender.com";

// 🔥 LOAD DATA
window.addEventListener("DOMContentLoaded", () => {

  const loc = localStorage.getItem("fullLocation");
  const time = localStorage.getItem("time");
  const car = localStorage.getItem("car");
  const date = localStorage.getItem("date");
  const price = localStorage.getItem("price");

  console.log("PAYMENT DATA:", { loc, time, car, date, price });

  // ❌ SAFETY CHECK
  if (!loc || !time || !car || !date) {
    updateStatus("❌ Booking data missing", "error");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 2000);

    return;
  }

  // ✅ UI LOAD (price shown here is only an estimate — the backend
  // recalculates the real, trusted amount before charging anything)
  document.getElementById("loc").innerText = loc;
  document.getElementById("time").innerText = time;
  document.getElementById("car").innerText = car;
  document.getElementById("date").innerText = date;
  document.getElementById("amount").innerText = price || "40";

  document.getElementById("payBtn")
    .addEventListener("click", payNow);
});


// 💳 PAYMENT
async function payNow(){

  const user = auth.currentUser;

  if(!user){
    alert("Please login first ❌");
    window.location.href = "login.html";
    return;
  }

  const parkingId = localStorage.getItem("parkingId");
  const parking = localStorage.getItem("fullLocation");
  const start = localStorage.getItem("time")?.split(" - ")[0];
  const end = localStorage.getItem("time")?.split(" - ")[1];

  if(!parking || !parkingId || !start || !end){
    updateStatus("❌ Booking data missing", "error");
    return;
  }

  updateStatus("Creating secure order...", "success");

  try {

    const idToken = await user.getIdToken();

    // 1️⃣ Ask the backend to create a Razorpay order with a
    // server-calculated (trusted) amount.
    const orderRes = await fetch(`${BACKEND_URL}/api/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`,
      },
      body: JSON.stringify({ parkingId, start, end }),
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      updateStatus("❌ " + (orderData.error || "Could not create order"), "error");
      return;
    }

    var options = {
      key: orderData.keyId,
      order_id: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "ParkIQ",
      description: "Parking Slot Booking",

      prefill: {
        name: user.email.split("@")[0],
        email: user.email
      },

      theme: {
        color: "#7c3aed"
      },

      // 2️⃣ On success, send the payment response to the backend for
      // signature verification. The booking is only created there,
      // after the payment is confirmed genuine.
      handler: async function (response){

        updateStatus("Verifying payment...", "success");

        try {
          const verifyRes = await fetch(`${BACKEND_URL}/api/verify-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              parkingId,
              parkingName: parking,
              carNumber: localStorage.getItem("car"),
              ownerName: localStorage.getItem("ownerName"),
              date: localStorage.getItem("date"),
              start,
              end,
            }),
          });

          const verifyData = await verifyRes.json();

          if (!verifyRes.ok || !verifyData.success) {
            updateStatus("❌ " + (verifyData.error || "Payment verification failed"), "error");
            return;
          }

          // ✅ Booking confirmed server-side — save the token for the
          // confirmation page.
          localStorage.setItem("token", verifyData.token);
          localStorage.setItem("bookingId", verifyData.bookingId);
          localStorage.setItem("price", verifyData.price.toString());

          updateStatus("Booking confirmed ✅", "success");
          setTimeout(goToConfirmation, 800);

        } catch (err) {
          console.error(err);
          updateStatus("❌ Could not verify payment. Contact support with your payment ID.", "error");
        }
      },

      modal: {
        ondismiss: function(){
          updateStatus("Payment cancelled", "error");
        }
      }
    };

    var rzp = new Razorpay(options);

    rzp.on('payment.failed', function (){
      updateStatus("Payment Failed ❌", "error");
    });

    rzp.open();

  } catch (err) {
    console.error(err);
    updateStatus("❌ Could not start payment. Try again.", "error");
  }
}


// 🔥 SUCCESS REDIRECT
function goToConfirmation(){
  window.location.href = "confirmation.html";
}


// 🔥 STATUS UI
function updateStatus(msg, type){
  const el = document.getElementById("status");
  if(!el) return;

  el.innerText = msg;
  el.style.color =
    (type === "success") ? "#22c55e" : "#ef4444";
}

window.payNow = payNow;
