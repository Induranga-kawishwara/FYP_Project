import React from "react";
import {
  Box,
  Typography,
  Link,
  Grid,
  Container,
  useTheme,
} from "@mui/material";
import { Facebook, Twitter, Instagram, LinkedIn } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";

const Footer = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.paper,
        color: theme.palette.text.secondary,
        py: 6,
        mt: 8,
      }}
    >
      <Container maxWidth="xl">
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: "primary.main" }}
            >
              About ShopFinder
            </Typography>
            <Typography variant="body2">
              Discover the best local shops with AI-powered recommendations and
              quality predictions.
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: "primary.main" }}
            >
              Legal
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Link component={RouterLink} to="/privacy" color="inherit">
                Privacy Policy
              </Link>
              <Link component={RouterLink} to="/terms" color="inherit">
                Terms of Service
              </Link>
            </Box>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ color: "primary.main" }}
            >
              Connect With Us
            </Typography>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Link href="https://facebook.com" target="_blank" rel="noopener">
                <Facebook sx={{ color: "inherit", fontSize: 32 }} />
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noopener">
                <Twitter sx={{ color: "inherit", fontSize: 32 }} />
              </Link>
              <Link href="https://instagram.com" target="_blank" rel="noopener">
                <Instagram sx={{ color: "inherit", fontSize: 32 }} />
              </Link>
              <Link href="https://linkedin.com" target="_blank" rel="noopener">
                <LinkedIn sx={{ color: "inherit", fontSize: 32 }} />
              </Link>
            </Box>
          </Grid>
        </Grid>

        <Box sx={{ borderTop: 1, borderColor: "divider", mt: 4, pt: 4 }}>
          <Typography variant="body2" textAlign="center">
            © {new Date().getFullYear()} ShopFinder. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
