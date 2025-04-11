import React from "react";
import {
  Typography,
  Box,
  Link,
  Chip,
  Card,
  Divider,
  alpha,
} from "@mui/material";
import { Mail } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
const SubNav = ({ isMobile, sections }) => {
  const theme = useTheme();
  return (
    <>
      {" "}
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
    </>
  );
};

export default SubNav;
