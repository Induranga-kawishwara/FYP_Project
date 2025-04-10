import React from "react";
import {
  Container,
  Typography,
  Box,
  Link,
  Chip,
  Fab,
  Card,
  useScrollTrigger,
  Fade,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  ArrowUpward,
  Security,
  DataUsage,
  Share,
  Policy,
  ContactMail,
  CheckCircle,
  Cookie,
  Lock,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const PrivacyPolicy = () => {
  const theme = useTheme();
  const trigger = useScrollTrigger({ threshold: 100 });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Container maxWidth="md" sx={{ py: 6, position: "relative" }}>
      <Box
        sx={{
          textAlign: "center",
          mb: 6,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          borderRadius: 4,
          p: 4,
          color: "white",
          boxShadow: theme.shadows[6],
        }}
      >
        <Security sx={{ fontSize: 60, color: "white", mb: 2 }} />
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 800, letterSpacing: 1 }}
        >
          Privacy Policy
        </Typography>
        <Chip
          label={`Last updated: ${new Date().toLocaleDateString()}`}
          variant="outlined"
          sx={{ mb: 3, color: "white", borderColor: "rgba(255,255,255,0.3)" }}
        />
      </Box>

      <Card sx={{ p: 4, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Introduction
        </Typography>
        <Typography paragraph sx={{ color: "text.secondary" }}>
          At ShopFinder, we prioritize your privacy. This policy outlines how we
          collect, use, and protect your information through our AI-powered
          retail discovery platform. By using our services, you agree to the
          practices described below.
        </Typography>
      </Card>

      <Box sx={{ display: "flex", gap: 4, flexDirection: "column" }}>
        <Card id="collection" sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <DataUsage sx={{ color: "primary.main", fontSize: 40 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Information Collection
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemIcon>
                <Cookie />
              </ListItemIcon>
              <ListItemText
                primary="Automated Collection"
                secondary="Device information, IP address, browser type, usage patterns through cookies and ML analytics"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle />
              </ListItemIcon>
              <ListItemText
                primary="User-Provided Data"
                secondary="Account details, search preferences, review feedback, and prediction corrections"
              />
            </ListItem>
          </List>
        </Card>

        <Card id="usage" sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Policy sx={{ color: "primary.main", fontSize: 40 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Use of Information
            </Typography>
          </Box>
          <Typography paragraph sx={{ color: "text.secondary" }}>
            We utilize collected data to:
          </Typography>
          <List>
            <ListItem>
              <ListItemText primary="• Train and improve our ML models for review authenticity detection" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Personalize retail recommendations and quality predictions" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Enhance XAI (Explainable AI) transparency features" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Monitor system security and prevent fraudulent activities" />
            </ListItem>
          </List>
        </Card>

        <Card id="sharing" sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Share sx={{ color: "primary.main", fontSize: 40 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Information Sharing
            </Typography>
          </Box>
          <Typography paragraph sx={{ color: "text.secondary" }}>
            We only share data with:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Trusted Service Providers"
                secondary="Cloud storage, analytics, and payment processors with strict confidentiality agreements"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Legal Requirements"
                secondary="When required by law or to protect our rights and users' safety"
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Business Transfers"
                secondary="In case of merger/acquisition, with privacy protections maintained"
              />
            </ListItem>
          </List>
        </Card>

        <Card id="rights" sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <Lock sx={{ color: "primary.main", fontSize: 40 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Your Rights
            </Typography>
          </Box>
          <List>
            <ListItem>
              <ListItemText primary="• Access and download your personal data" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Request correction of inaccurate information" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Delete non-essential account data" />
            </ListItem>
            <ListItem>
              <ListItemText primary="• Opt-out of non-essential cookies and tracking" />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            Submit requests via our Data Protection Portal (available in account
            settings) or email privacy@shopfinder.ai
          </Typography>
        </Card>

        <Card id="contact" sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
            <ContactMail sx={{ color: "primary.main", fontSize: 40 }} />
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Contact Us
            </Typography>
          </Box>
          <Typography paragraph sx={{ color: "text.secondary" }}>
            For privacy concerns or data requests:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Email"
                secondary={
                  <Link href="mailto:privacy@shopfinder.ai">
                    privacy@shopfinder.ai
                  </Link>
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Mail"
                secondary="Data Protection Officer, ShopFinder Ltd., 123 Innovation Drive, Tech Valley, CA 94016"
              />
            </ListItem>
          </List>
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            We respond within 72 hours to all verified requests
          </Typography>
        </Card>
      </Box>

      <Fade in={trigger}>
        <Fab
          onClick={scrollToTop}
          size="medium"
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
          <ArrowUpward />
        </Fab>
      </Fade>
    </Container>
  );
};

export default PrivacyPolicy;
