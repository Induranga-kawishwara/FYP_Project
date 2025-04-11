import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_APIKEY,
  authDomain: process.env.REACT_APP_AUTHDOMAIN,
  projectId: process.env.REACT_APP_PROJECTID,
  appId: process.env.REACT_APP_APPID,
};

console.log("Firebase Config:", firebaseConfig); // Log the config to check if it's correct
const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);

export { auth };
