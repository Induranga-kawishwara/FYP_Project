import React from "react";
import {
  Box,
  Typography,
  Grid,
  Container,
  Card,
  CardContent,
  Avatar,
  useTheme,
  styled,
  Chip,
  Divider,
} from "@mui/material";
import {
  Code,
  DataObject,
  Storage,
  Psychology,
  ModelTraining,
  Groups,
  RocketLaunch,
} from "@mui/icons-material";

const GradientHeader = styled(Box)(({ theme }) => ({
  textAlign: "center",
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 2,
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.common.white,
  marginBottom: theme.spacing(6),
  boxShadow: theme.shadows[6],
}));

const TechCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: theme.shadows[8],
  },
}));

const AboutPage = () => {
  const theme = useTheme();

  const technologies = [
    {
      icon: <Code fontSize="large" />,
      name: "React.js & Material-UI",
      description: "Dynamic frontend architecture",
    },
    {
      icon: <DataObject fontSize="large" />,
      name: "Flask (Python)",
      description: "RESTful API backend",
    },
    {
      icon: <Storage fontSize="large" />,
      name: "MongoDB",
      description: "Scalable NoSQL database",
    },
    {
      icon: <Psychology fontSize="large" />,
      name: "XGBoost",
      description: "Fake review detection model",
    },
    {
      icon: <ModelTraining fontSize="large" />,
      name: "SHAP & LIME",
      description: "Explainable AI framework",
    },
    {
      icon: <Groups fontSize="large" />,
      name: "BERT",
      description: "NLP for review summarization",
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <GradientHeader>
        <Typography variant="h2" component="h1" sx={{ fontWeight: 800, mb: 2 }}>
          Revolutionizing Retail Discovery
        </Typography>
        <Typography variant="h6" sx={{ maxWidth: 800, margin: "0 auto" }}>
          AI-powered platform transforming how you find trusted local businesses
        </Typography>
      </GradientHeader>

      {/* Mission Section */}
      <Box sx={{ mb: 8, textAlign: "center" }}>
        <Chip
          label="Our Mission"
          color="primary"
          sx={{
            px: 4,
            py: 1,
            fontSize: "1.5rem",
            mb: 4,
            background: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.primary.main} 90%)`,
          }}
        />
        <Typography
          variant="h5"
          sx={{ lineHeight: 1.6, maxWidth: 1000, mx: "auto" }}
        >
          We combat review fraud using advanced ML models while maintaining
          complete transparency through explainable AI. Our system analyzes ,
          real-time recommendations.
        </Typography>
      </Box>

      {/* Technology Stack */}
      <Box sx={{ mb: 8 }}>
        <Typography variant="h3" align="center" sx={{ fontWeight: 700, mb: 6 }}>
          Technology Stack
        </Typography>
        <Grid container spacing={4}>
          {technologies.map((tech, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <TechCard>
                <CardContent sx={{ textAlign: "center" }}>
                  <Box sx={{ color: "primary.main", mb: 2 }}>{tech.icon}</Box>
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    {tech.name}
                  </Typography>
                  <Typography color="text.secondary">
                    {tech.description}
                  </Typography>
                </CardContent>
              </TechCard>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Development Story */}
      <Box
        sx={{
          bgcolor: "background.paper",
          p: 6,
          borderRadius: 4,
          boxShadow: theme.shadows[4],
          mb: 8,
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
          Research-Driven Development
        </Typography>
        <Grid container spacing={6}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Academic Collaboration
            </Typography>
            <Typography>
              Developed through a partnership between{" "}
              <Box component="span" color="primary.main" fontWeight={600}>
                Informatics Institute of Technology
              </Box>{" "}
              and{" "}
              <Box component="span" color="secondary.main" fontWeight={600}>
                University of Westminster
              </Box>
              , ShopFinder represents cutting-edge academic research applied to
              real-world problems.
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              Technical Innovation
            </Typography>
            <Typography>
              Our hybrid approach combines{" "}
              <Box component="span" fontWeight={600}>
                ensemble learning
              </Box>{" "}
              for fraud detection with{" "}
              <Box component="span" fontWeight={600}>
                transformer models
              </Box>{" "}
              for natural language processing, achieving 92% accuracy in fake
              review identification.
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Developer Profile */}
      <Box sx={{ textAlign: "center", mb: 8 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
          Project Leadership
        </Typography>
        <Card
          sx={{
            maxWidth: 400,
            mx: "auto",
            p: 4,
            borderRadius: 4,
            boxShadow: `0 8px 32px ${theme.palette.primary.light}40`,
          }}
        >
          <Avatar
            src="/path-to-images/indurangs.jpg"
            sx={{
              width: 120,
              height: 120,
              mx: "auto",
              mb: 3,
              border: `3px solid ${theme.palette.primary.main}`,
            }}
          />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            Induranga Kawishwara
          </Typography>
          <Chip label="Lead AI Engineer" color="primary" sx={{ mb: 2 }} />
          <Typography color="text.secondary">
            Specializing in explainable AI and distributed systems, driving
            innovation in review analysis technologies.
          </Typography>
        </Card>
      </Box>

      {/* Closing Section */}
      <Box
        sx={{
          textAlign: "center",
          p: 6,
          borderRadius: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.light}20 0%, ${theme.palette.secondary.light}20 100%)`,
        }}
      >
        <RocketLaunch
          sx={{
            fontSize: 60,
            color: "primary.main",
            mb: 3,
          }}
        />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Join Our Revolution
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{ maxWidth: 600, mx: "auto" }}
        >
          We're constantly evolving with daily model updates and feature
          enhancements. Experience the future of intelligent shopping today!
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutPage;
