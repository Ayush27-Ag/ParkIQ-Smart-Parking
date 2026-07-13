import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

console.log("Dashboard JS Loaded ✅");


// ==============================
// 🔥 ELEMENTS
// ==============================
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");


// ==============================
// 🔽 DROPDOWN TOGGLE
// ==============================
if (profileBtn && dropdownMenu) {
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("active");
  });

  window.addEventListener("click", (e) => {
    if (!e.target.closest(".profile-wrapper")) {
      dropdownMenu.classList.remove("active");
    }
  });
}


// ==============================
// 🔥 LOAD USER PROFILE (Firestore + localStorage fallback)
// ==============================
async function loadUserData(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || "User";

      if (menuName) menuName.innerText = fullName;
      if (menuEmail) menuEmail.innerText = data.email || user.email;
      if (profileBtn) profileBtn.innerText = fullName.charAt(0).toUpperCase();
    } else {
      const fallback = user.email.split("@")[0];
      if (menuName) menuName.innerText = fallback;
      if (menuEmail) menuEmail.innerText = user.email;
      if (profileBtn) profileBtn.innerText = fallback.charAt(0).toUpperCase();
    }
  } catch (err) {
    console.error("User load error:", err);
  }
}


// ==============================
// 🔥 AUTH GUARD — dashboard is a protected page
// ==============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadUserData(user);
  } else {
    window.location.href = "login.html";
  }
});


// ==============================
// 🔥 NAVIGATION (shared across pages)
// ==============================
window.goDashboard = () => {
  window.location.href = "dashboard.html";
};

window.goBookings = () => {
  window.location.href = "bookings.html";
};

window.goSettings = () => {
  window.location.href = "settings.html";
};

// 🚗 FIND MY CAR — opens Google Maps directions to the last booked parking spot
window.findCar = () => {
  const location = localStorage.getItem("fullLocation");

  if (!location) {
    alert("No active booking found ❌");
    return;
  }

  const url =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(location);

  window.open(url, "_blank");
};

window.logout = () => {
  localStorage.clear();
  window.location.href = "login.html";
};
