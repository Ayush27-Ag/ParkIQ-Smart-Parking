import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

console.log("Settings JS Loaded ✅");


// ==============================
// 🔥 ELEMENTS
// ==============================
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");
const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");

const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const userEmailInput = document.getElementById("userEmail");


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
// 🔥 AUTH GUARD + LOAD PROFILE
// ==============================
onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      const fullName = `${data.firstName || ""} ${data.lastName || ""}`.trim() || "User";

      if (menuName) menuName.innerText = fullName;
      if (menuEmail) menuEmail.innerText = data.email || user.email;
      if (profileBtn) profileBtn.innerText = fullName.charAt(0).toUpperCase();

      if (firstNameInput) firstNameInput.value = data.firstName || "";
      if (lastNameInput) lastNameInput.value = data.lastName || "";
      if (userEmailInput) userEmailInput.value = data.email || user.email;
    } else {
      const fallback = user.email.split("@")[0];
      if (menuName) menuName.innerText = fallback;
      if (menuEmail) menuEmail.innerText = user.email;
      if (profileBtn) profileBtn.innerText = fallback.charAt(0).toUpperCase();
      if (userEmailInput) userEmailInput.value = user.email;
    }
  } catch (err) {
    console.error("Profile load error:", err);
  }
});


// ==============================
// 🔥 NAVIGATION
// ==============================
window.goDashboard = () => {
  window.location.href = "dashboard.html";
};

window.goBookings = () => {
  window.location.href = "bookings.html";
};

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
