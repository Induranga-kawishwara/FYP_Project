import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  useMediaQuery,
  useTheme,
  Menu,
  MenuItem,
  Container,
} from "@mui/material";
import {
  Menu as MenuIcon,
  ShoppingBag,
  Person,
  Lock,
  Info,
} from "@mui/icons-material";
import { NavLink, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import useToken from "../../../hooks/useToken/useToken.js";

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  // Custom hook that returns a valid token if it exists.
  const token = useToken();

  // Protected navigation items (only for valid token)
  const protectedNavItems = [
    { name: "Profile", path: "/profile", icon: <Person /> },
  ];

  const publicNavItems = [
    { name: "Shop Finder", path: "/shopfinder", icon: <ShoppingBag /> },
    { name: "About", path: "/about", icon: <Info /> },
  ];

  const navItems = token
    ? [...publicNavItems, ...protectedNavItems]
    : publicNavItems;

  const authItem = token
    ? { name: "Logout", icon: <Lock /> }
    : { name: "Login", path: "/login", icon: <Lock /> };

  const handleLogout = () => {
    Cookies.remove("idToken");
    navigate("/login");
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="sticky" sx={{ bgcolor: theme.palette.background.paper }}>
      <Container maxWidth="xl">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          {/* Logo / Brand */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontSize: { xs: "0.8rem", sm: "1.3rem", md: "2rem" },
              }}
            >
              <NavLink
                to="/"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                ShopFinder
              </NavLink>
            </Typography>
          </Box>

          {isMobile ? (
            <>
              <IconButton onClick={handleMenuOpen}>
                <MenuIcon sx={{ color: theme.palette.text.primary }} />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                slotProps={{
                  paper: {
                    sx: { width: 250, maxHeight: 300, overflowY: "auto" },
                  },
                }}
              >
                {navItems.map((item) => (
                  <MenuItem
                    key={item.name}
                    component={NavLink}
                    to={item.path}
                    onClick={handleMenuClose}
                  >
                    {item.icon}
                    <Box sx={{ ml: 2 }}>{item.name}</Box>
                  </MenuItem>
                ))}
                {token ? (
                  <MenuItem
                    key="Logout"
                    onClick={() => {
                      handleMenuClose();
                      handleLogout();
                    }}
                  >
                    {authItem.icon}
                    <Box sx={{ ml: 2 }}>Logout</Box>
                  </MenuItem>
                ) : (
                  <MenuItem
                    key="Login"
                    component={NavLink}
                    to="/login"
                    onClick={handleMenuClose}
                  >
                    {authItem.icon}
                    <Box sx={{ ml: 2 }}>Login</Box>
                  </MenuItem>
                )}
              </Menu>
            </>
          ) : (
            <Box sx={{ display: "flex", gap: 4 }}>
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  component={NavLink}
                  to={item.path}
                  startIcon={item.icon}
                  sx={{
                    color: theme.palette.text.primary,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  {item.name}
                </Button>
              ))}
              {token ? (
                <Button
                  key="Logout"
                  onClick={handleLogout}
                  startIcon={authItem.icon}
                  sx={{
                    color: theme.palette.text.primary,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  Logout
                </Button>
              ) : (
                <Button
                  key="Login"
                  component={NavLink}
                  to="/login"
                  startIcon={authItem.icon}
                  sx={{
                    color: theme.palette.text.primary,
                    "&:hover": { color: theme.palette.primary.main },
                  }}
                >
                  Login
                </Button>
              )}
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
