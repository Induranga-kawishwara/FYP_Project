import React from "react";
import { motion } from "framer-motion";
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
  alpha,
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
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(3),
  },
}));

const TechCard = styled(Card)(({ theme }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  background: theme.palette.background.paper,
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: theme.shadows[8],
    "&:before": {
      opacity: 1,
    },
  },
  "&:before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${alpha(
      theme.palette.primary.main,
      0.1
    )} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
}));

const cardVariants = {
  offscreen: { y: 50, opacity: 0 },
  onscreen: { y: 0, opacity: 1 },
};

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
    <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6, md: 8 } }}>
      {/* Gradient Header */}
      <GradientHeader>
        <Typography
          variant="h2"
          component="h1"
          sx={{
            fontWeight: 800,
            mb: 2,
            fontSize: { xs: "1.5rem", sm: "2rem", md: "3rem" },
          }}
        >
          Revolutionizing Retail Discovery
        </Typography>
        <Typography
          variant="h6"
          sx={{
            maxWidth: 800,
            mx: "auto",
            fontSize: { xs: "1rem", md: "1.25rem" },
          }}
        >
          AI-powered platform transforming how you find trusted local businesses
        </Typography>
      </GradientHeader>

      {/* Mission Section */}
      <Box sx={{ mb: { xs: 4, sm: 6 }, textAlign: "center" }}>
        <Chip
          label="Our Mission"
          sx={{
            px: { xs: 3, sm: 4 },
            py: 1.5,
            fontSize: { xs: "1rem", sm: "1.25rem" },
            mb: 4,
            background: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, ${theme.palette.primary.main} 90%)`,
            color: theme.palette.common.white,
          }}
        />
        <Typography
          variant="h5"
          sx={{
            lineHeight: 1.6,
            maxWidth: 1000,
            mx: "auto",
            fontSize: { xs: "1rem", md: "1.25rem" },
          }}
        >
          We combat review fraud using advanced ML models while maintaining
          complete transparency through explainable AI.
        </Typography>
      </Box>

      {/* Technology Stack */}
      <Box sx={{ mb: { xs: 4, sm: 8 } }}>
        <Typography
          variant="h3"
          align="center"
          sx={{
            fontWeight: 700,
            mb: { xs: 4, md: 6 },
            fontSize: { xs: "1.5rem", md: "2rem" },
          }}
        >
          Technology Stack
        </Typography>
        <Grid container spacing={4}>
          {technologies.map((tech, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <motion.div
                initial="offscreen"
                whileInView="onscreen"
                viewport={{ once: true, amount: 0.2 }}
                variants={cardVariants}
              >
                <TechCard>
                  <CardContent
                    sx={{
                      textAlign: "center",
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        color: "primary.main",
                        mb: 2,
                        fontSize: { xs: "2.5rem", md: "3rem" },
                        lineHeight: 0,
                      }}
                    >
                      {tech.icon}
                    </Box>
                    <Typography
                      variant="h5"
                      gutterBottom
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: "1.25rem", md: "1.5rem" },
                        mb: 2,
                      }}
                    >
                      {tech.name}
                    </Typography>
                    <Typography
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: "0.9rem", md: "1rem" },
                        flexGrow: 1,
                      }}
                    >
                      {tech.description}
                    </Typography>
                    <Box
                      sx={{
                        width: "40px",
                        height: "4px",
                        background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                        mt: 3,
                        borderRadius: "2px",
                      }}
                    />
                  </CardContent>
                </TechCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Development Story */}
      <Box
        sx={{
          bgcolor: "background.paper",
          p: { xs: 3, sm: 6 },
          borderRadius: 4,
          boxShadow: theme.shadows[4],
          mb: { xs: 4, sm: 8 },
        }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 700,
            mb: 4,
            fontSize: { xs: "1.5rem", md: "2rem" },
          }}
        >
          Research-Driven Development
        </Typography>
        <Grid container spacing={6}>
          <Grid item xs={12} md={6}>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 2, fontSize: { xs: "1rem", md: "1.125rem" } }}
            >
              Academic Collaboration
            </Typography>
            <Typography sx={{ fontSize: { xs: "0.9rem", md: "1rem" } }}>
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
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mb: 2, fontSize: { xs: "1rem", md: "1.125rem" } }}
            >
              Technical Innovation
            </Typography>
            <Typography sx={{ fontSize: { xs: "0.9rem", md: "1rem" } }}>
              Our hybrid approach combines{" "}
              <Box component="span" fontWeight={600}>
                ensemble learning
              </Box>{" "}
              for fraud detection with{" "}
              <Box component="span" fontWeight={600}>
                transformer models
              </Box>{" "}
              for natural language processing.
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Developer Profile */}
      <Box sx={{ textAlign: "center", mb: { xs: 4, sm: 8 } }}>
        <Typography
          variant="h3"
          gutterBottom
          sx={{
            fontWeight: 700,
            mb: 4,
            fontSize: { xs: "1.5rem", md: "2rem" },
          }}
        >
          Project Leadership
        </Typography>
        <motion.div whileHover={{ scale: 1.02 }}>
          <Card
            sx={{
              maxWidth: 400,
              mx: "auto",
              p: { xs: 3, sm: 4 },
              borderRadius: 4,
              background: `linear-gradient(135deg, ${alpha(
                theme.palette.primary.main,
                0.05
              )} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              position: "relative",
              overflow: "hidden",
              "&:before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              },
            }}
          >
            <Avatar
              src="/path-to-images/induranga.jpg"
              sx={{
                width: { xs: 80, sm: 120 },
                height: { xs: 80, sm: 120 },
                mx: "auto",
                mb: 3,
                border: `3px solid ${theme.palette.primary.main}`,
              }}
            />
            <Typography
              variant="h5"
              gutterBottom
              sx={{
                fontWeight: 600,
                fontSize: { xs: "1.25rem", md: "1.5rem" },
              }}
            >
              Induranga Kawishwara
            </Typography>
            <Chip
              label="Lead AI Engineer"
              color="primary"
              sx={{
                mb: 2,
                fontSize: { xs: "0.8rem", sm: "1rem" },
              }}
            />
            <Typography
              color="text.secondary"
              sx={{ fontSize: { xs: "0.8rem", sm: "0.9rem" } }}
            >
              Specializing in explainable AI and distributed systems.
            </Typography>
          </Card>
        </motion.div>
      </Box>

      {/* Closing Section */}
      <motion.div whileHover={{ scale: 1.02 }}>
        <Box
          sx={{
            textAlign: "center",
            p: { xs: 4, sm: 6 },
            borderRadius: 4,
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.light,
              0.1
            )} 0%, ${alpha(theme.palette.secondary.light, 0.1)} 100%)`,
          }}
        >
          <RocketLaunch
            sx={{
              fontSize: { xs: 40, sm: 60 },
              color: "primary.main",
              mb: 3,
              transition: "transform 0.3s",
            }}
          />
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              fontSize: { xs: "1.5rem", md: "2rem" },
            }}
          >
            Join Our Revolution
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              maxWidth: 600,
              mx: "auto",
              fontSize: { xs: "1rem", md: "1.25rem" },
            }}
          >
            Experience the future of intelligent shopping today!
          </Typography>
        </Box>
      </motion.div>
    </Container>
  );
};

export default AboutPage;
