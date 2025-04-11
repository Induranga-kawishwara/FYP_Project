import React from "react";
import {
  Box,
  Typography,
  Link,
  Grid,
  Container,
  useTheme,
  IconButton,
} from "@mui/material";
import { Facebook, Twitter, Instagram, LinkedIn } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";

const Footer = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        color: theme.palette.common.white,
        py: 6,
        mt: 8,
        boxShadow: theme.shadows[8],
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              ShopFinder
            </Typography>
            <Typography variant="body2">
              Discover the best local shops with our AI-powered recommendations
              and quality predictions.
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Legal
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Link
                component={RouterLink}
                to="/privacy"
                sx={{
                  color: "inherit",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Privacy Policy
              </Link>
              <Link
                component={RouterLink}
                to="/terms"
                sx={{
                  color: "inherit",
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Terms of Service
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Connect With Us
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <IconButton
                component="a"
                href="https://facebook.com"
                target="_blank"
                rel="noopener"
                sx={{
                  color: "inherit",
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.2)" },
                }}
              >
                <Facebook fontSize="large" />
              </IconButton>
              <IconButton
                component="a"
                href="https://twitter.com"
                target="_blank"
                rel="noopener"
                sx={{
                  color: "inherit",
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.2)" },
                }}
              >
                <Twitter fontSize="large" />
              </IconButton>
              <IconButton
                component="a"
                href="https://instagram.com"
                target="_blank"
                rel="noopener"
                sx={{
                  color: "inherit",
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.2)" },
                }}
              >
                <Instagram fontSize="large" />
              </IconButton>
              <IconButton
                component="a"
                href="https://linkedin.com"
                target="_blank"
                rel="noopener"
                sx={{
                  color: "inherit",
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.2)" },
                }}
              >
                <LinkedIn fontSize="large" />
              </IconButton>
            </Box>
          </Grid>
        </Grid>

        <Box
          sx={{
            borderTop: "1px solid rgba(255, 255, 255, 0.3)",
            mt: 4,
            pt: 4,
          }}
        >
          <Typography variant="body2" align="center">
            © {new Date().getFullYear()} ShopFinder. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
