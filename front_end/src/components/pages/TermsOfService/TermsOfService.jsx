import React from "react";
import {
  Container,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
  Chip,
  Divider,
  Card,
} from "@mui/material";
import {
  ExpandMore,
  Gavel,
  Storefront,
  Person,
  Copyright,
  Block,
  Info,
  Mail,
  Description,
} from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const TermsOfService = () => {
  const theme = useTheme();

  const sections = [
    {
      title: "Use of the Site",
      icon: <Storefront />,
      content: `ShopFinder ("the Service"), developed by Induranga Kawishwara, provides a machine learning-powered platform to help users discover optimal retail locations and products. You may use this service to:
      - Search for products and view verified retail locations
      - Access AI-generated quality assessments and rating predictions
      - Filter out promotional/fake reviews using our proprietary ML models
      - View explainable AI (XAI) breakdowns of review authenticity analyses
      
      Prohibited activities include:
      - Reverse-engineering or attacking our ML models
      - Scraping review data or XAI explanations
      - Misrepresenting authentic reviews as promotional content
      - Manipulating rating prediction systems through artificial means`,
    },
    {
      title: "User Accounts",
      icon: <Person />,
      content: `To access advanced features, you may create an account by:
      1. Providing valid contact information
      2. Verifying your email address
      3. Agreeing to our review validation protocols
      
      Account holders must:
      - Maintain accurate prediction feedback records
      - Report suspected fake reviews through proper channels
      - Not share API access credentials
      
      We employ continuous ML validation to detect and suspend accounts that:
      - Submit artificial review patterns
      - Attempt to bias our rating prediction models
      - Abuse XAI transparency features for commercial scraping`,
    },
    {
      title: "Intellectual Property",
      icon: <Copyright />,
      content: `All ML models, including our:
      - Review authenticity classifier (v3.1)
      - Rating prediction neural network
      - XAI explanation generator
      are proprietary technology of Induranga Kawishwara.
      
      You retain rights to your user-generated content, but grant us license to:
      - Process reviews through our ML pipelines
      - Use anonymized data for model improvement
      - Generate aggregated quality metrics
      
      The XAI-generated explanations are for personal use only - commercial use of our transparency reports requires written permission.`,
    },
    {
      title: "Termination",
      icon: <Block />,
      content: `We may terminate access for:
      - Manipulating review sentiment scores
      - Exploiting XAI vulnerabilities
      - Automated querying of our ML endpoints
      - False reporting of legitimate reviews
      
      Upon termination:
      - All API access will be revoked
      - Saved predictions will be anonymized
      - Model interaction history will be archived
      
      Service may be suspended without notice if our ML systems detect coordinated review manipulation attempts.`,
    },
    {
      title: "Disclaimer",
      icon: <Info />,
      content: `ShopFinder's predictions are statistical estimates, not guarantees:
      - Fake review detection accuracy: 89.7% (F1-score)
      - Rating prediction MAE: ±0.32 stars
      - XAI explanations show key influencing factors, not full model logic
      
      We disclaim liability for:
      - Retailer inventory changes post-prediction
      - Evolving promotional tactics bypassing our ML filters
      - Local market fluctuations affecting quality assessments
      
      Our ML models are continuously updated - historical predictions are not retroactively adjusted.`,
    },
  ];
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
        <Gavel sx={{ fontSize: 60, color: "white", mb: 2 }} />
        <Typography
          variant="h3"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 800, letterSpacing: 1 }}
        >
          ShopFinder Terms of Service
        </Typography>
        <Chip
          label={`Last updated: ${new Date().toLocaleDateString()}`}
          variant="outlined"
          sx={{ mb: 3, color: "white", borderColor: "rgba(255,255,255,0.3)" }}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 4,
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        {/* Table of Contents */}
        <Box sx={{ width: { md: 240 }, flexShrink: 0 }}>
          <Card
            sx={{
              p: 2,
              position: "sticky",
              top: 100,
              borderRadius: 3,
              boxShadow: theme.shadows[2],
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Contents
            </Typography>
            {sections.map((section, index) => (
              <Link
                key={index}
                href={`#section-${index}`}
                underline="none"
                color="text.primary"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  py: 1.5,
                  px: 2,
                  mb: 1,
                  borderRadius: 2,
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "action.hover",
                    transform: "translateX(4px)",
                  },
                }}
              >
                <Box sx={{ color: "primary.main", mr: 1.5 }}>
                  {section.icon}
                </Box>
                {section.title}
              </Link>
            ))}
            <Divider sx={{ my: 2 }} />
            <Link
              href="#contact"
              underline="none"
              color="text.primary"
              sx={{
                display: "flex",
                alignItems: "center",
                py: 1.5,
                px: 2,
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: "action.hover",
                  transform: "translateX(4px)",
                },
              }}
            >
              <Mail sx={{ color: "primary.main", mr: 1.5 }} />
              Contact Us
            </Link>
          </Card>
        </Box>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1 }}>
          {sections.map((section, index) => (
            <Accordion
              key={index}
              id={`section-${index}`}
              defaultExpanded
              sx={{
                mb: 2,
                borderRadius: 3,
                overflow: "hidden",
                transition: "all 0.3s ease",
                "&:before": { display: "none" },
                "&.Mui-expanded": {
                  boxShadow: theme.shadows[3],
                  transform: "translateY(-2px)",
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ color: "primary.main" }}>{section.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {section.title}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  bgcolor: "background.default",
                  borderTop: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    lineHeight: 1.7,
                    color: "text.secondary",
                    "& ul": { pl: 3, mb: 2 },
                    "& li": { mb: 1 },
                    "& strong": { color: "text.primary" },
                  }}
                >
                  {section.content.split("\n").map((line, i) => (
                    <p key={i} style={{ margin: "0.8em 0" }}>
                      {line.replace(/-/g, "•")}
                    </p>
                  ))}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}

          <Card
            id="contact"
            sx={{
              mt: 6,
              p: 4,
              borderRadius: 3,
              bgcolor: "background.paper",
              boxShadow: theme.shadows[2],
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
              <Mail sx={{ mr: 1.5, color: "primary.main" }} />
              Contact Us
            </Typography>
            <Typography paragraph sx={{ mb: 2 }}>
              For inquiries regarding our ML models or transparency reports:
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Description sx={{ color: "primary.main" }} />
              <Typography variant="body1">
                <strong>XAI Methodology White Paper</strong> Available Upon
                Request
              </Typography>
            </Box>
            <Chip
              icon={<Mail />}
              label="support@shopfinder.ai"
              component="a"
              href="mailto:support@shopfinder.ai"
              clickable
              sx={{ mt: 1 }}
            />
          </Card>
        </Box>
      </Box>
    </Container>
  );
};

export default TermsOfService;
