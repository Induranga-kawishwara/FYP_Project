import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Login from "./components/pages/LoginPage/Login";
import Signup from "./components/pages/Signup/Signup";
import Profile from "./components/pages/Profile/Profile";
import ShopFinder from "./components/pages/ShopFinder/ShopFinder";
import ForgotPassword from "./components/pages/ForgotPassword/ForgotPassword";
import PrivacyPolicy from "./components/pages/PrivacyPolicy/PrivacyPolicy";
import TermsOfService from "./components/pages/TermsOfService/TermsOfService";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate replace to="/shopfinder" />} />

        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/shopfinder" element={<ShopFinder />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>
    </Router>
  );
}

export default App;
