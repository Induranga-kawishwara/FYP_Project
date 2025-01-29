import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "./components/pages/LoginPage/Login";
import Signup from "./components/pages/Signup/Signup";
import Profile from "./components/pages/Profile/Profile";
import ShopFinder from "./components/pages/ShopFinder/ShopFinder";
import ExplainReview from "./components/pages/ExplainReview/ExplainReview";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/shopfinder" element={<ShopFinder />} />
        <Route path="/explain-review" element={<ExplainReview />} />
      </Routes>
    </Router>
  );
}

export default App;
