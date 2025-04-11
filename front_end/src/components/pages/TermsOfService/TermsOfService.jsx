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
import {
  Gavel,
  Storefront,
  Person,
  Copyright,
  Block,
  Info,
  Mail,
  Description,
  CheckCircle,
  Warning,
  Code,
  LockClock,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const sections = [
  {
    title: "Use of the Site",
    icon: <Storefront />,
    id: "use",
    content: [
      {
        icon: <CheckCircle />,
        primary: "Permitted Uses",
        secondary:
          "Search products, view retail locations, access AI quality assessments, and use XAI explanations",
      },
      {
        icon: <Warning />,
        primary: "Prohibited Activities",
        secondary:
          "Reverse-engineering ML models, scraping data, manipulating rating systems",
      },
    ],
  },
  {
    title: "User Accounts",
    icon: <Person />,
    id: "accounts",
    content: [
      {
        icon: <LockClock />,
        primary: "Account Requirements",
        secondary:
          "Valid contact information, email verification, review validation agreement",
      },
      {
        icon: <Code />,
        primary: "ML Monitoring",
        secondary:
          "Continuous validation detects artificial patterns and model manipulation",
      },
    ],
  },
  {
    title: "Intellectual Property",
    icon: <Copyright />,
    id: "ip",
    content: [
      {
        primary: "Proprietary Technology",
        secondary:
          "Review classifier v3.1, rating prediction NN, XAI generator",
      },
      {
        primary: "Content License",
        secondary:
          "User grants processing rights for ML improvement and metrics generation",
      },
    ],
  },
  {
    title: "Termination",
    icon: <Block />,
    id: "termination",
    content: [
      {
        primary: "Grounds for Termination",
        secondary:
          "Review manipulation, XAI exploitation, automated ML queries",
      },
      {
        primary: "Post-Termination",
        secondary:
          "API revocation, prediction anonymization, interaction archiving",
      },
    ],
  },
  {
    title: "Disclaimer",
    icon: <Info />,
    id: "disclaimer",
    content: [
      {
        primary: "Accuracy Metrics",
        secondary: "89.7% detection F1-score, ±0.32 star MAE predictions",
      },
      {
        primary: "Limitations",
        secondary:
          "Inventory changes, evolving promotional tactics, market fluctuations",
      },
    ],
  },
];

const TermsOfService = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <React.Fragment>
      <div id="back-to-top-anchor" />

      {/* Mobile Floating TOC */}
      {isMobile && (
        <Box
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: "background.paper",
            borderTop: `1px solid ${theme.palette.divider}`,
            zIndex: 1000,
            p: 1,
            display: "flex",
            overflowX: "auto",
            "&::-webkit-scrollbar": { display: "none" },
            boxShadow: 3,
          }}
        >
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`#${section.id}`}
              underline="none"
              sx={{ minWidth: 120, mx: 0.5, flexShrink: 0 }}
            >
              <Chip
                icon={React.cloneElement(section.icon, {
                  sx: { color: "primary.main" },
                })}
                label={section.title}
                sx={{
                  borderRadius: 2,
                  "& .MuiChip-label": {
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                  },
                  bgcolor: "background.default",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              />
            </Link>
          ))}
          <Link href="#contact" sx={{ minWidth: 120, mx: 0.5, flexShrink: 0 }}>
            <Chip
              icon={<Mail sx={{ color: "primary.main" }} />}
              label="Contact"
              sx={{
                borderRadius: 2,
                "& .MuiChip-label": { fontSize: "0.75rem" },
                bgcolor: "background.default",
                "&:hover": { bgcolor: "action.hover" },
              }}
            />
          </Link>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
          py: { xs: 4, sm: 6, md: 8 },
          px: { xs: 2, sm: 4 },
          maxWidth: "lg",
          margin: "0 auto",
          pb: { xs: 10, md: 0 },
        }}
      >
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
            <Gavel
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
              Terms of Service
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
            {sections.map((section) => (
              <Card
                key={section.id}
                id={section.id}
                sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: { xs: 2, sm: 3 },
                  }}
                >
                  {React.cloneElement(section.icon, {
                    sx: { color: "primary.main", fontSize: { xs: 30, sm: 40 } },
                  })}
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "1.2rem", sm: "1.5rem" },
                    }}
                  >
                    {section.title}
                  </Typography>
                </Box>
                <List>
                  {section.content.map((item, index) => (
                    <ListItem key={index}>
                      {item.icon && (
                        <ListItemIcon>
                          {React.cloneElement(item.icon, { color: "primary" })}
                        </ListItemIcon>
                      )}
                      <ListItemText
                        primary={item.primary}
                        secondary={item.secondary}
                        sx={{
                          "& .MuiListItemText-secondary": {
                            mt: 0.5,
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                          },
                          "& .MuiListItemText-primary": {
                            fontSize: { xs: "1rem", sm: "1.1rem" },
                          },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Card>
            ))}

            {/* Contact Section */}
            <Card id="contact" sx={{ p: { xs: 2, sm: 4 }, borderRadius: 3 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  mb: { xs: 2, sm: 3 },
                }}
              >
                <Mail
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
                For inquiries regarding our ML models or transparency reports:
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Description color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Technical Documentation"
                    secondary={
                      <Link href="#">
                        XAI Methodology White Paper (Available Upon Request)
                      </Link>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Mail color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email Support"
                    secondary={
                      <Link href="mailto:support@shopfinder.ai">
                        support@shopfinder.ai
                      </Link>
                    }
                  />
                </ListItem>
              </List>
            </Card>
          </Box>
        </Container>
      </Box>
    </React.Fragment>
  );
};

export default TermsOfService;
