import { auth, db } from "./firebase-config.js";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";


// ==============================
// 🔥 ELEMENTS
// ==============================
const bookingList = document.getElementById("bookingList");
const menuName = document.getElementById("menuName");
const menuEmail = document.getElementById("menuEmail");
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");


// ==============================
// 🔽 DROPDOWN TOGGLE
// ==============================
profileBtn.addEventListener("click", () => {
  dropdownMenu.style.display =
    dropdownMenu.style.display === "block" ? "none" : "block";
});


// ==============================
// 🔥 LOAD USER DATA (FIX)
// ==============================
async function loadUserData(user) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();

      menuName.innerText = data.firstName + " " + data.lastName;
      menuEmail.innerText = data.email;
      profileBtn.innerText = data.firstName.charAt(0).toUpperCase();
    } else {
      menuName.innerText = "User";
      menuEmail.innerText = user.email;
    }

  } catch (err) {
    console.error("User load error:", err);
  }
}


// ==============================
// 🔥 LOAD BOOKINGS (FIXED)
// ==============================
async function loadBookings(user) {

  try {

    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      bookingList.innerHTML = "No bookings found 📭";
      return;
    }

    bookingList.innerHTML = "";

    snapshot.forEach(docSnap => {

      const data = docSnap.data();

      bookingList.innerHTML += `
        <div class="booking-card">

          <p>📍 ${data.parkingName || "N/A"}</p>
          <p>🚗 ${data.carNumber || "N/A"}</p>
          <p>📅 ${data.date || "N/A"}</p>
        <p>⏰ ${data.start} - ${data.end}</p>


          <p style="color:gold;">🎟 Token: ${data.token}</p>

        </div>
      `;
    });

  } catch (err) {
    console.error("BOOKING ERROR:", err);
    bookingList.innerHTML = "Error loading bookings ❌";
  }
}


// ==============================
// 🔥 AUTH CHECK (IMPORTANT FIX)
// ==============================
onAuthStateChanged(auth, (user) => {

  if (user) {
    loadUserData(user);      // 👈 profile fix
    loadBookings(user);      // 👈 booking fix
  } else {
    bookingList.innerHTML = "Please login first ❌";
  }

});


// ==============================
// 🔥 NAVIGATION
// ==============================
window.goDashboard = () => {
  window.location.href = "dashboard.html";
};

window.openBookings = () => {
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