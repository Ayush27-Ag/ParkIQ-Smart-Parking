// =========================
// 🔥 LOAD DATA (LOCAL + FIRESTORE FALLBACK)
// =========================
window.addEventListener("DOMContentLoaded", async () => {

  let loc = localStorage.getItem("fullLocation");
  let time = localStorage.getItem("time");
  let car = localStorage.getItem("car");
  let date = localStorage.getItem("date");
  let token = localStorage.getItem("token");

  console.log("LOCAL DATA:", { loc, time, car, date, token });

  // 🔥 अगर localStorage empty है → Firestore से fetch करो
  if (!loc || !time || !car || !date || !token) {
    try {
      const { db, auth } = await import("./firebase-config.js");

      const {
        collection,
        query,
        where,
        getDocs,
        orderBy,
        limit
      } = await import("https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js");

      const user = auth.currentUser;

      if (user) {

        const q = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();

          loc = data.parkingName || data.location;
          car = data.carNumber || data.car;
          date = data.date;
          time = data.start
            ? data.start + " - " + data.end
            : data.time;
          token = data.token;

          // 🔥 localStorage update (important)
          localStorage.setItem("fullLocation", loc);
          localStorage.setItem("car", car);
          localStorage.setItem("date", date);
          localStorage.setItem("time", time);
          localStorage.setItem("token", token);
        }
      }

    } catch (err) {
      console.error("Firestore fetch error:", err);
    }
  }

  // ❌ still no data
  if (!loc || !time || !car || !date || !token) {
    const el = document.getElementById("homeLoc");
    if (el) el.innerText = "No booking data ❌";
    return;
  }

  // =========================
  // 🔥 SAFE TEXT SETTER
  // =========================
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  // =========================
  // 🔥 POPUP DATA
  // =========================
  setText("popLoc", "📍 " + loc);
  setText("popTime", "🕒 " + time);
  setText("popCar", "🚗 " + car);
  setText("popDate", "📅 " + date);
  setText("popToken", "🎫 " + token);

  // =========================
  // 🔥 SHOW POPUP
  // =========================
  const popup = document.getElementById("successPopup");
  if (popup) popup.classList.remove("hide");

  // =========================
  // 🔥 HOME CARD
  // =========================
  setText("homeLoc", "📍 " + loc);
  setText("homeTime", "🕒 " + time);
  setText("homeCar", "🚗 " + car);
  setText("homeDate", "📅 " + date);
  setText("homeToken", "🎫 Token: " + token);

  // =========================
  // 🔥 AUTO HIDE POPUP
  // =========================
  setTimeout(() => {
    if (popup) popup.classList.add("hide");
  }, 3000);
});


// ==============================
// 🔽 DROPDOWN
// ==============================
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

if (profileBtn && dropdownMenu) {
  profileBtn.addEventListener("click", () => {
    dropdownMenu.classList.toggle("active");
  });
}

window.addEventListener("click", (e) => {
  if (!e.target.closest(".profile-wrapper")) {
    dropdownMenu.classList.remove("active");
  }
});


// ==============================
// 🔥 LOAD USER (LOCAL STORAGE)
// ==============================
window.addEventListener("DOMContentLoaded", () => {

  const user = JSON.parse(localStorage.getItem("user"));

  const menuName = document.getElementById("menuName");
  const menuEmail = document.getElementById("menuEmail");

  if (user && menuName && menuEmail) {

    const name = user.name || user.email.split("@")[0];

    menuName.innerText = name;
    menuEmail.innerText = user.email;

    if (profileBtn) {
      profileBtn.innerText = name.charAt(0).toUpperCase();
    }
  }
});


// ==============================
// 🔥 NAVIGATION
// ==============================
function goDashboard() {
  window.location.href = "dashboard.html";
}

function goBookings() {
  window.location.href = "bookings.html";
}

function findCar() {
  const location = localStorage.getItem("fullLocation");

  if (!location) {
    alert("No location found ❌");
    return;
  }

  const url =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(location);

  window.open(url, "_blank");
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}


// ==============================
// 🔥 GLOBAL
// ==============================
window.goDashboard = goDashboard;
window.goBookings = goBookings;
window.findCar = findCar;
window.logout = logout;