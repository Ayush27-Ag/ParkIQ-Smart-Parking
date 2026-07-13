import { auth } from "./firebase-config.js";
import { updatePassword } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

window.changePass = async function(){

  const passInput = document.getElementById("newPass");
  const statusEl = document.getElementById("status");
  const newPass = passInput.value;

  if(!newPass || newPass.length < 6){
    if (statusEl){
      statusEl.innerText = "Password must be at least 6 characters ❌";
      statusEl.style.color = "#ef4444";
    }
    return;
  }

  try{
    const user = auth.currentUser;

    if(!user){
      if (statusEl){
        statusEl.innerText = "Please login again to change password ❌";
        statusEl.style.color = "#ef4444";
      }
      return;
    }

    await updatePassword(user, newPass);

    if (statusEl){
      statusEl.innerText = "Password updated ✅";
      statusEl.style.color = "#22c55e";
    }

    passInput.value = "";

  }catch(err){
    console.error(err);

    if (statusEl){
      // Firebase requires a recent login for this sensitive action
      if (err.code === "auth/requires-recent-login"){
        statusEl.innerText = "Please log out and log in again, then retry ❌";
      } else {
        statusEl.innerText = "Error: " + err.message;
      }
      statusEl.style.color = "#ef4444";
    }
  }
}