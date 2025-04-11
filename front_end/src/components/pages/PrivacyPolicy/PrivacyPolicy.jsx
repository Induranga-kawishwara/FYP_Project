import React from "react";
import {
  Container,
  Typography,
  Box,
  Link,
  Chip,
  Card,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Security,
  DataUsage,
  Share,
  Policy,
  ContactMail,
  CheckCircle,
  Cookie,
  Lock,
  Mail,
} from "@mui/icons-material";

const sections = [
  { title: "Information Collection", icon: <DataUsage />, id: "collection" },
  { title: "Use of Information", icon: <Policy />, id: "usage" },
  { title: "Information Sharing", icon: <Share />, id: "sharing" },
  { title: "Your Rights", icon: <Lock />, id: "rights" },
];

const PrivacyPolicy = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <React.Fragment>
      <div id="back-to-top-anchor" />

      {/* Mobile Floating TOC */}
      {/* Mobile Floating TOC */}
      {isMobile && (
        <Box
          sx={{
            position: "fixed",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            width: "calc(100% - 32px)",
            maxWidth: 600,
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(255,255,255,0.8)",
            borderRadius: 4,
            p: 1,
            display: "flex",
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
            boxShadow: 3,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`#${section.id}`}
              underline="none"
              sx={{ mx: 0.5, flexShrink: 0 }}
            >
              <Chip
                icon={React.cloneElement(section.icon, {
                  sx: {
                    color: "primary.main",
                    fontSize: 18,
                  },
                })}
                label={section.title}
                sx={{
                  borderRadius: 4,
                  height: 48,
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  bgcolor: "background.paper",
                  "& .MuiChip-label": {
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    px: 1.5,
                    color: "text.primary",
                  },
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: theme.shadows[2],
                  },
                }}
              />
            </Link>
          ))}
          <Link href="#contact" sx={{ mx: 0.5, flexShrink: 0 }}>
            <Chip
              icon={<Mail sx={{ color: "primary.main", fontSize: 18 }} />}
              label="Contact"
              sx={{
                borderRadius: 4,
                height: 48,
                bgcolor: "background.paper",
                "& .MuiChip-label": {
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  px: 1.5,
                  color: "text.primary",
                },
                "&:hover": {
                  transform: "scale(1.05)",
                  boxShadow: theme.shadows[2],
                },
              }}
            />
          </Link>
        </Box>
      )}

      {/* Desktop TOC */}
      {!isMobile && (
        <Box sx={{ width: 280, flexShrink: 0 }}>
          <Card
            sx={{
              p: 2,
              position: "sticky",
              top: 100,
              borderRadius: 4,
              boxShadow: theme.shadows[4],
              background: `linear-gradient(145deg, ${
                theme.palette.background.paper
              } 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`,
              backdropFilter: "blur(8px)",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                fontWeight: 700,
                px: 2,
                py: 1,
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                "&::before": {
                  content: '""',
                  width: 4,
                  height: 24,
                  bgcolor: "primary.main",
                  borderRadius: 4,
                  mr: 2,
                },
              }}
            >
              Contents
            </Typography>
            <Box
              sx={{
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: 18,
                  top: 16,
                  bottom: 16,
                  width: 2,
                  bgcolor: "divider",
                  borderRadius: 2,
                },
              }}
            >
              {sections.map((section) => (
                <Link
                  key={section.id}
                  href={`#${section.id}`}
                  underline="none"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                    pl: 4.5,
                    py: 1.5,
                    mb: 1,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateX(8px)",
                      "& .MuiTypography-root": {
                        color: "primary.main",
                      },
                      "& .dot": {
                        bgcolor: "primary.main",
                        boxShadow: `0 0 0 4px ${alpha(
                          theme.palette.primary.main,
                          0.1
                        )}`,
                      },
                    },
                  }}
                >
                  <Box
                    className="dot"
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      bgcolor: "divider",
                      position: "absolute",
                      left: 14,
                      zIndex: 1,
                      transition: "all 0.3s ease",
                    }}
                  />
                  {React.cloneElement(section.icon, {
                    sx: {
                      color: "text.secondary",
                      fontSize: 20,
                      mr: 2,
                    },
                  })}
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 500,
                      color: "text.primary",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {section.title}
                  </Typography>
                </Link>
              ))}
            </Box>
            <Divider sx={{ my: 2, borderStyle: "dashed" }} />
            <Link
              href="#contact"
              underline="none"
              sx={{
                display: "flex",
                alignItems: "center",
                px: 3,
                py: 1.5,
                borderRadius: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  bgcolor: "action.hover",
                  transform: "translateX(8px)",
                },
              }}
            >
              <Mail sx={{ color: "primary.main", mr: 2, fontSize: 22 }} />
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 500, color: "text.primary" }}
              >
                Contact Us
              </Typography>
            </Link>
          </Card>
        </Box>
      )}

      {/* Main Content */}
      <Container
        maxWidth="md"
        sx={{
          flexGrow: 1,
          position: "relative",
          p: 0,
        }}
      >
        <Box
          sx={{
            textAlign: "center",
            mb: { xs: 4, sm: 6 },
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            borderRadius: 4,
            p: { xs: 2, sm: 4, md: 6 },
            color: "white",
            boxShadow: theme.shadows[6],
          }}
        >
          <Security
            sx={{
              fontSize: { xs: 40, sm: 60 },
              color: "white",
              mb: 2,
            }}
          />
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 800,
              letterSpacing: 1,
              fontSize: { xs: "1.8rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            Privacy Policy
          </Typography>
          <Chip
            label={`Last updated: ${new Date().toLocaleDateString()}`}
            variant="outlined"
            sx={{
              mb: 3,
              color: "white",
              borderColor: "rgba(255,255,255,0.3)",
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              px: { xs: 1, sm: 2 },
            }}
          />
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: { xs: 2, sm: 4 },
            flexDirection: "column",
          }}
        >
          {/* Introduction */}
          <Card sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Introduction
            </Typography>
            <Typography
              paragraph
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
              At ShopFinder, we prioritize your privacy. This policy outlines
              how we collect, use, and protect your information through our
              AI-powered retail discovery platform. By using our services, you
              agree to the practices described below.
            </Typography>
          </Card>

          {/* Information Collection */}
          <Card id="collection" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: { xs: 2, sm: 3 },
              }}
            >
              <DataUsage
                sx={{ color: "primary.main", fontSize: { xs: 30, sm: 40 } }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                }}
              >
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

          {/* Use of Information */}
          <Card id="usage" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: { xs: 2, sm: 3 },
              }}
            >
              <Policy
                sx={{ color: "primary.main", fontSize: { xs: 30, sm: 40 } }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                }}
              >
                Use of Information
              </Typography>
            </Box>
            <Typography
              paragraph
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
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

          {/* Information Sharing */}
          <Card id="sharing" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: { xs: 2, sm: 3 },
              }}
            >
              <Share
                sx={{ color: "primary.main", fontSize: { xs: 30, sm: 40 } }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                }}
              >
                Information Sharing
              </Typography>
            </Box>
            <Typography
              paragraph
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
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

          {/* Your Rights */}
          <Card id="rights" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: { xs: 2, sm: 3 },
              }}
            >
              <Lock
                sx={{ color: "primary.main", fontSize: { xs: 30, sm: 40 } }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                }}
              >
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
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: "text.secondary",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              Submit requests via our Data Protection Portal (available in
              account settings) or email privacy@shopfinder.ai
            </Typography>
          </Card>

          {/* Contact Us */}
          <Card id="contact" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                mb: { xs: 2, sm: 3 },
              }}
            >
              <ContactMail
                sx={{ color: "primary.main", fontSize: { xs: 30, sm: 40 } }}
              />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "1.2rem", sm: "1.5rem" },
                }}
              >
                Contact Us
              </Typography>
            </Box>
            <Typography
              paragraph
              sx={{
                color: "text.secondary",
                fontSize: { xs: "0.875rem", sm: "1rem" },
              }}
            >
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
            <Typography
              variant="body2"
              sx={{
                mt: 2,
                color: "text.secondary",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              We respond within 72 hours to all verified requests
            </Typography>
          </Card>
        </Box>
      </Container>
    </React.Fragment>
  );
};

export default PrivacyPolicy;
