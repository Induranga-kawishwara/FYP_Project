import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_APIKEY,
  authDomain: process.env.REACT_APP_AUTHDOMAIN,
  projectId: process.env.REACT_APP_PROJECTID,
  appId: process.env.REACT_APP_APPID,
};

const appFirebase = initializeApp(firebaseConfig);
const auth = getAuth(appFirebase);

export { auth };
