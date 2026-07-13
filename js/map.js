let map;
let service;
let markers = [];
let selectedParking = null;


// 🚀 INIT MAP
function initMap() {

  const defaultLocation = { lat: 28.6139, lng: 77.2090 };

  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultLocation,
    zoom: 13,
  });

  service = new google.maps.places.PlacesService(map);

  const input = document.getElementById("searchBox");
  const searchBox = new google.maps.places.SearchBox(input);

  // 🔥 AUTO SEARCH
  searchParking(defaultLocation);

  searchBox.addListener("places_changed", () => {

    const places = searchBox.getPlaces();
    if (!places.length) return;

    const place = places[0];

    let city = "";

    place.address_components?.forEach(component => {
      if (component.types.includes("locality")) {
        city = component.long_name;
      }
    });

    if (!city) city = place.name;

    city = city.toLowerCase().trim().split(",")[0];

    localStorage.setItem("selectedCity", city);

    const location = place.geometry.location;

    map.setCenter(location);

    clearMarkers();
    searchParking(location);
  });

  document
    .getElementById("confirmBookingBtn")
    .addEventListener("click", confirmBooking);
}


// 🔍 SEARCH PARKING
function searchParking(location) {

  const request = {
    location,
    radius: 3000,
    keyword: "parking",
  };

  service.nearbySearch(request, (results, status) => {

    if (status !== google.maps.places.PlacesServiceStatus.OK) {
      console.log("No parking found");
      return;
    }

    results.forEach(place => createMarker(place));
  });
}


// 📍 CREATE MARKER
function createMarker(place) {

  const marker = new google.maps.Marker({
    position: place.geometry.location,
    map,
    title: place.name,
  });

  markers.push(marker);

  marker.addListener("click", () => {
    loadParkingDetails(place);
    map.panTo(place.geometry.location);
    map.setZoom(15);
  });
}


// ❌ CLEAR
function clearMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];
}


// 🔥 LOAD PARKING
// 🔥 LOAD PARKING
async function loadParkingDetails(place) {

  try {

    const { db } = await import("./firebase-config.js");
    const { doc, getDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js"
    );

    const city = localStorage.getItem("selectedCity");

    if (!city) {
      document.getElementById("statusBox").innerText =
        "⚠️ Search city first";
      return;
    }

    const docId = city + "_parking";

    const snap = await getDoc(doc(db, "parkingSlots", docId));

    // 🔥 If this city doesn't have a specific Firestore document yet,
    // fall back to sensible defaults instead of blocking the booking.
    // This means the app works for ANY city in India out of the box —
    // you only need to add a real document for a city when you want to
    // override its price or track real slot availability for it.
    const data = snap.exists()
      ? snap.data()
      : { availableSlots: 15, totalSlots: 15, pricePerHour: 20 };

    selectedParking = {
      id: docId,
      name: place.name,
      availableSlots: data.availableSlots,
      totalSlots: data.totalSlots,
      pricePerHour: data.pricePerHour || 20,
    };

    document.getElementById("parkingDetails").innerHTML = `
      <h3>${place.name}</h3>
      <p>📍 ${place.vicinity || city}</p>
      <p>🚗 Slots: ${data.availableSlots}/${data.totalSlots}</p>
      <p>💰 ₹${selectedParking.pricePerHour}/hr</p>

      <button onclick="showBooking()"
        style="padding:10px;background:#7c3aed;color:white;border:none;border-radius:8px;">
        Book Now
      </button>
    `;

  } catch (err) {
    console.error(err);
    document.getElementById("statusBox").innerText =
      "❌ Error loading parking";
  }
}


// 📋 SHOW FORM
function showBooking() {
  document.getElementById("bookingForm").classList.remove("hidden");
}


// 💰 PRICE
function calculatePrice() {

  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;

  if (!start || !end || !selectedParking) return;

  let hours =
    (new Date(`1970-01-01T${end}`) -
      new Date(`1970-01-01T${start}`)) /
    (1000 * 60 * 60);

  if (hours <= 0) {
    document.getElementById("priceBox").innerText =
      "⚠️ Invalid time";
    return;
  }

  const price = Math.ceil(hours) * selectedParking.pricePerHour;

  document.getElementById("priceBox").innerText =
    "💰 ₹" + price;
}


// 🔄 AUTO PRICE
document.addEventListener("input", e => {
  if (e.target.id === "startTime" || e.target.id === "endTime") {
    calculatePrice();
  }
});


// ✅ CONFIRM BOOKING → goes to payment page (booking itself is created
// server-side AFTER payment is verified — see payment.js + backend)
async function confirmBooking() {

  const carNumber = document.getElementById("carNumber").value;
  const ownerName = document.getElementById("ownerName").value;
  const date = document.getElementById("bookingDate").value;
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;

  if (!carNumber || !ownerName || !date || !start || !end) {
    document.getElementById("statusBox").innerText =
      "⚠️ Fill all details";
    return;
  }

  if (!selectedParking) {
    document.getElementById("statusBox").innerText =
      "⚠️ Select parking first";
    return;
  }

  if (selectedParking.availableSlots <= 0) {
    document.getElementById("statusBox").innerText =
      "❌ No slots available";
    return;
  }

  try {

    const { auth } = await import("./firebase-config.js");

    const user = auth.currentUser;

    if (!user) {
      alert("Login required ❌");
      window.location.href = "login.html";
      return;
    }

    const hours =
      (new Date(`1970-01-01T${end}`) -
        new Date(`1970-01-01T${start}`)) /
      (1000 * 60 * 60);

    // This is only an ESTIMATE for display on the payment page.
    // The real, trusted price is recalculated server-side before
    // the Razorpay order is created — a tampered value here can't
    // be used to underpay.
    const estimatedPrice = Math.ceil(hours) * selectedParking.pricePerHour;

    // 🔥 Nothing is written to Firestore here anymore, and the slot
    // is NOT decremented yet — that only happens after payment is
    // verified by the backend, so a cancelled/failed payment never
    // leaves an orphan booking or a wrongly-reduced slot count.
    localStorage.setItem("parkingId", selectedParking.id);
    localStorage.setItem("fullLocation", selectedParking.name);
    localStorage.setItem("date", date);
    localStorage.setItem("time", start + " - " + end);
    localStorage.setItem("car", carNumber);
    localStorage.setItem("ownerName", ownerName);
    localStorage.setItem("price", estimatedPrice.toString());
    window.location.href = "payment.html";

  } catch (err) {
    console.error(err);
    document.getElementById("statusBox").innerText =
      "❌ Booking failed";
  }
}


// GLOBAL
window.initMap = initMap;
window.showBooking = showBooking;