import { auth, db } from "./firebase-config.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import {
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

console.log("Auth JS Loaded ✅");


// ==============================
// 🔥 ELEMENTS
// ==============================
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const email = document.getElementById("email");
const password = document.getElementById("password");

const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");

const toggleLink = document.getElementById("toggleLink");
const toggleText = document.getElementById("toggleText");
const title = document.getElementById("title");
const subtitle = document.getElementById("subtitle");

let isLogin = true;


// ==============================
// 🔄 TOGGLE LOGIN / SIGNUP
// ==============================
toggleLink.addEventListener("click", (e) => {
  e.preventDefault();

  isLogin = !isLogin;

  if (isLogin) {
    loginForm.style.display = "block";
    signupForm.style.display = "none";

    title.textContent = "Login";
    subtitle.textContent = "Login to continue";
    toggleText.textContent = "Don't have an account?";
    toggleLink.textContent = "Sign Up";

  } else {
    loginForm.style.display = "none";
    signupForm.style.display = "block";

    title.textContent = "Create Account";
    subtitle.textContent = "Sign up to continue";
    toggleText.textContent = "Already have an account?";
    toggleLink.textContent = "Login";
  }
});


// ==============================
// 🔐 LOGIN
// ==============================
loginForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const emailValue = loginEmail.value.trim();
  const passwordValue = loginPassword.value.trim();

  if (!emailValue || !passwordValue) {
    alert("Fill all fields ❌");
    return;
  }

  try {

    const userCredential = await signInWithEmailAndPassword(
      auth,
      emailValue,
      passwordValue
    );

    const user = userCredential.user;

    localStorage.setItem("user", JSON.stringify({
      name: user.email.split("@")[0],
      email: user.email
    }));

    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Invalid email or password ❌");
  }
});


// ==============================
// 🆕 SIGNUP
// ==============================
signupForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const firstName = firstNameInput.value.trim();
  const lastName = lastNameInput.value.trim();
  const userEmail = email.value.trim();
  const userPassword = password.value.trim();

  if (!firstName || !lastName || !userEmail || !userPassword) {
    alert("Fill all fields ❌");
    return;
  }

  try {

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      userEmail,
      userPassword
    );

    const user = userCredential.user;

    // 🔥 SAVE USER IN FIRESTORE
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      firstName,
      lastName,
      email: user.email,
      createdAt: new Date()
    });

    localStorage.setItem("user", JSON.stringify({
      name: firstName,
      email: user.email
    }));

    alert("Account Created ✅");

    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);

    if (err.code === "auth/email-already-in-use") {
      alert("Email already exists ⚠️");
    } else if (err.code === "auth/weak-password") {
      alert("Password must be at least 6 characters ⚠️");
    } else {
      alert(err.message);
    }
  }
});


// ==============================
// 🔥 SESSION CHECK
// ==============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("User active:", user.email);
  } else {
    console.log("No user session");
  }
});