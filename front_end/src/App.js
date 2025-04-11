import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { GlobalStyles } from "@mui/material";
import { Box, Container, useScrollTrigger, Fab, Fade } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { KeyboardArrowUp } from "@mui/icons-material";
import Navbar from "./components/reUse/Navbar/Navbar";
import Footer from "./components/reUse/Footer/Footer";
import Login from "./components/pages/LoginPage/Login";
import Signup from "./components/pages/Signup/Signup";
import Profile from "./components/pages/Profile/Profile";
import ShopFinder from "./components/pages/ShopFinder/ShopFinder";
import ForgotPassword from "./components/pages/ForgotPassword/ForgotPassword";
import PrivacyPolicy from "./components/pages/PrivacyPolicy/PrivacyPolicy";
import TermsOfService from "./components/pages/TermsOfService/TermsOfService";
import TokenChecker from "./components/reUse/TokenChecker/TokenChecker";
import AboutPage from "./components/pages/AboutPage/AboutPage";

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
        <GlobalStyles styles={{ html: { scrollBehavior: "smooth" } }} />

        <Navbar />
        <Box component="main" sx={{ flexGrow: 1 }}>
          <Container maxWidth="xl" sx={{ py: 4 }}>
            <Routes>
              <Route path="/" element={<Navigate replace to="/shopfinder" />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/shopfinder"
                element={
                  <TokenChecker>
                    <ShopFinder />
                  </TokenChecker>
                }
              />
              <Route
                path="/profile"
                element={
                  <TokenChecker>
                    <Profile />
                  </TokenChecker>
                }
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/about" element={<AboutPage />} />
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
