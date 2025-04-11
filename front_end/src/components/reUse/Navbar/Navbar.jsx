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
} from "@mui/icons-material";
import { Link } from "react-router-dom";

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [anchorEl, setAnchorEl] = useState(null);

  const navItems = [
    { name: "Shop Finder", path: "/shopfinder", icon: <ShoppingBag /> },
    { name: "Profile", path: "/profile", icon: <Person /> },
    { name: "Login", path: "/login", icon: <Lock /> },
  ];

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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
                ShopFinder
              </Link>
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
              >
                {navItems.map((item) => (
                  <MenuItem
                    key={item.name}
                    component={Link}
                    to={item.path}
                    onClick={handleMenuClose}
                  >
                    {item.icon}
                    <Box sx={{ ml: 2 }}>{item.name}</Box>
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : (
            <Box sx={{ display: "flex", gap: 4 }}>
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  component={Link}
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
            </Box>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
