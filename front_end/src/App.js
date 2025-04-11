import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { Box, Container, useScrollTrigger, Fab, Fade } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { KeyboardArrowUp } from "@mui/icons-material";
import Cookies from "js-cookie";
import Navbar from "./components/reUse/Navbar/Navbar";
import Footer from "./components/reUse/Footer/Footer";
import Login from "./components/pages/LoginPage/Login";
import Signup from "./components/pages/Signup/Signup";
import Profile from "./components/pages/Profile/Profile";
import ShopFinder from "./components/pages/ShopFinder/ShopFinder";
import ForgotPassword from "./components/pages/ForgotPassword/ForgotPassword";
import PrivacyPolicy from "./components/pages/PrivacyPolicy/PrivacyPolicy";
import TermsOfService from "./components/pages/TermsOfService/TermsOfService";

// RequireAuth component for protecting routes
function RequireAuth({ children }) {
  const token = Cookies.get("idToken");
  // You may add additional token validity checks here
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// PublicRoute component prevents logged-in users from accessing public pages
function PublicRoute({ children }) {
  const token = Cookies.get("idToken");
  if (token) {
    return <Navigate to="/shopfinder" replace />;
  }
  return children;
}

const ScrollTop = () => {
  const theme = useTheme();
  const trigger = useScrollTrigger({ threshold: 100 });

  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Fade in={trigger}>
      <Fab
        size="small"
        onClick={handleClick}
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
          color: "white",
          "&:hover": {
            boxShadow: theme.shadows[6],
            transform: "scale(1.1)",
          },
          transition: "all 0.3s ease",
        }}
      >
        <KeyboardArrowUp />
      </Fab>
    </Fade>
  );
};

function App() {
  return (
    <Router>
      <Box
        sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <Navbar />
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            <Routes>
              <Route path="/" element={<Navigate replace to="/shopfinder" />} />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <Signup />
                  </PublicRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/shopfinder"
                element={
                  <RequireAuth>
                    <ShopFinder />
                  </RequireAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
            </Routes>
          </Container>
        </Box>
        <Footer />
        <ScrollTop />
      </Box>
    </Router>
  );
}

export default App;
