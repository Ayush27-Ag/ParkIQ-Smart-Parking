import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const BACKEND_URL = "https://parkiq-backend-pca0.onrender.com";

let idToken = null;

const accessDenied = document.getElementById("accessDenied");
const adminContent = document.getElementById("adminContent");
const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

profileBtn.addEventListener("click", () => {
  dropdownMenu.style.display =
    dropdownMenu.style.display === "block" ? "none" : "block";
});

// ==============================
// 🔐 AUTH + ADMIN CHECK
// ==============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // force refresh so a freshly-granted admin claim is picked up
  const tokenResult = await user.getIdTokenResult(true);

  if (!tokenResult.claims.admin) {
    accessDenied.style.display = "block";
    return;
  }

  idToken = tokenResult.token;

  menuName.innerText = user.email.split("@")[0];
  menuEmail.innerText = user.email;
  profileBtn.innerText = "A";

  adminContent.style.display = "block";

  loadLocations();
  loadBookings();
});

// ==============================
// 📍 LOAD LOCATIONS
// ==============================
async function loadLocations() {
  const list = document.getElementById("locationsList");

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/parking-slots`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      list.innerHTML = `❌ ${data.error}`;
      return;
    }

    document.getElementById("statLocations").innerText = data.slots.length;

    if (data.slots.length === 0) {
      list.innerHTML = "No custom locations yet — the app uses default pricing for any city until you add one here.";
      return;
    }

    list.innerHTML = data.slots
      .map(
        (s) => `
      <div class="location-row">
        <div class="info">
          <strong>${s.displayName || s.id}</strong> (${s.id})<br>
          ₹${s.pricePerHour}/hr — ${s.availableSlots}/${s.totalSlots} slots available
        </div>
        <button onclick="deleteLocation('${s.id}')">Delete</button>
      </div>
    `
      )
      .join("");
  } catch (err) {
    console.error(err);
    list.innerHTML = "❌ Could not load locations";
  }
}

// ==============================
// 💾 SAVE (ADD/UPDATE) LOCATION
// ==============================
window.saveLocation = async function () {
  const status = document.getElementById("locStatus");

  const city = document.getElementById("locCity").value.trim().toLowerCase();
  const displayName = document.getElementById("locName").value.trim();
  const pricePerHour = document.getElementById("locPrice").value;
  const totalSlots = document.getElementById("locTotal").value;
  const availableSlots = document.getElementById("locAvailable").value;

  if (!city) {
    status.innerText = "⚠️ City / Location ID is required";
    status.style.color = "#ef4444";
    return;
  }

  const docId = city.endsWith("_parking") ? city : `${city}_parking`;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/parking-slots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        docId,
        displayName,
        pricePerHour,
        totalSlots,
        availableSlots,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      status.innerText = `❌ ${data.error}`;
      status.style.color = "#ef4444";
      return;
    }

    status.innerText = "✅ Saved";
    status.style.color = "#22c55e";

    document.getElementById("locCity").value = "";
    document.getElementById("locName").value = "";
    document.getElementById("locPrice").value = "";
    document.getElementById("locTotal").value = "";
    document.getElementById("locAvailable").value = "";

    loadLocations();
  } catch (err) {
    console.error(err);
    status.innerText = "❌ Could not save location";
    status.style.color = "#ef4444";
  }
};

// ==============================
// 🗑️ DELETE LOCATION
// ==============================
window.deleteLocation = async function (docId) {
  if (!confirm(`Delete "${docId}"? This cannot be undone.`)) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/parking-slots/${docId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!res.ok) {
      alert("❌ Could not delete location");
      return;
    }

    loadLocations();
  } catch (err) {
    console.error(err);
    alert("❌ Could not delete location");
  }
};

// ==============================
// 📋 LOAD BOOKINGS
// ==============================
async function loadBookings() {
  const list = document.getElementById("bookingsList");

  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/bookings`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      list.innerHTML = `❌ ${data.error}`;
      return;
    }

    document.getElementById("statBookings").innerText = data.bookings.length;

    const totalRevenue = data.bookings.reduce(
      (sum, b) => sum + (b.price || 0),
      0
    );
    document.getElementById("statRevenue").innerText = `₹${totalRevenue}`;

    if (data.bookings.length === 0) {
      list.innerHTML = "No bookings yet.";
      return;
    }

    list.innerHTML = data.bookings
      .slice(0, 50)
      .map(
        (b) => `
      <div class="booking-row">
        <div class="info">
          <strong>${b.parkingName || "N/A"}</strong> — ${b.carNumber || "N/A"}<br>
          ${b.date || ""} · ${b.start || ""}-${b.end || ""} · ₹${b.price || 0} · ${b.email || ""}
        </div>
      </div>
    `
      )
      .join("");
  } catch (err) {
    console.error(err);
    list.innerHTML = "❌ Could not load bookings";
  }
}

window.logout = () => {
  localStorage.clear();
  window.location.href = "login.html";
};