import React from "react";
import {
  Button,
  Typography,
  Box,
  Modal,
  IconButton,
  Alert,
  Fade,
  useTheme,
  keyframes,
  styled,
} from "@mui/material";
import { Cancel, Insights, AutoAwesome } from "@mui/icons-material";

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const GradientBorderBox = styled(Box)(({ theme }) => ({
  position: "relative",
  "&:before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "24px",
    padding: "2px",
    background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
    WebkitMask:
      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    animation: `${float} 4s ease-in-out infinite`,
  },
}));

const ExplanationPopup = ({ open, onClose, explanation }) => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const secondaryColor = theme.palette.secondary.main;

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropProps={{ transitionDuration: 500 }}
    >
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 800,
            outline: "none",
          }}
        >
          <GradientBorderBox>
            <Box
              sx={{
                position: "relative",
                bgcolor: "background.paper",
                borderRadius: "24px",
                p: 4,
                maxHeight: "80vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <IconButton
                onClick={onClose}
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  color: "text.secondary",
                  "&:hover": {
                    color: "primary.main",
                    transform: "rotate(90deg)",
                  },
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <Cancel sx={{ fontSize: 32 }} />
              </IconButton>

              <Box sx={{ textAlign: "center", mb: 4, position: "relative" }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    p: 3,
                    bgcolor: "primary.lighter",
                    borderRadius: "50%",
                    boxShadow: 6,
                    mb: 3,
                    position: "relative",
                    "&:after": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      borderRadius: "50%",
                      border: `2px solid ${primaryColor}`,
                      animation: `${float} 3s ease-in-out infinite`,
                    },
                  }}
                >
                  <Insights
                    sx={{
                      fontSize: 64,
                      color: "primary.main",
                      filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1)",
                    }}
                  />
                </Box>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: "-1px",
                    mb: 1,
                    background: `linear-gradient(45deg, ${primaryColor} 30%, ${secondaryColor} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    position: "relative",
                    display: "inline-block",
                    "&:after": {
                      content: '""',
                      position: "absolute",
                      bottom: -8,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "60%",
                      height: 3,
                      bgcolor: "primary.main",
                      borderRadius: 2,
                    },
                  }}
                >
                  AI Insight Breakdown
                </Typography>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "text.secondary",
                    letterSpacing: "0.5px",
                    mt: 1,
                  }}
                >
                  Transparent machine learning analysis
                </Typography>
              </Box>

              <Box
                sx={{
                  flex: 1,
                  overflow: "hidden",
                  position: "relative",
                  bgcolor: "background.default",
                  borderRadius: "16px",
                  border: `1px solid ${theme.palette.divider}`,
                  p: 3,
                  mb: 4,
                }}
              >
                {explanation ? (
                  <Box
                    sx={{
                      height: "40vh",
                      overflowY: "auto",
                      pr: 2,
                      "&::-webkit-scrollbar": {
                        width: 8,
                      },
                      "&::-webkit-scrollbar-track": {
                        background: theme.palette.grey[200],
                        borderRadius: 4,
                      },
                      "&::-webkit-scrollbar-thumb": {
                        background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})`,
                        borderRadius: 4,
                      },
                    }}
                  >
                    <Typography
                      variant="body1"
                      sx={{
                        lineHeight: 1.8,
                        color: "text.primary",
                        whiteSpace: "pre-line",
                        position: "relative",
                        pl: 3,
                        "&:before": {
                          content: '"»"',
                          position: "absolute",
                          left: 0,
                          color: "primary.main",
                          fontWeight: 700,
                        },
                      }}
                    >
                      {explanation}
                    </Typography>
                  </Box>
                ) : (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: "12px",
                      bgcolor: "info.lighter",
                      border: `1px solid ${theme.palette.info.light}`,
                    }}
                  >
                    <Typography variant="body1">
                      No detailed explanation available for this selection
                    </Typography>
                  </Alert>
                )}
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={onClose}
                endIcon={<AutoAwesome sx={{ color: "gold" }} />}
                sx={{
                  py: 2,
                  borderRadius: "14px",
                  background: `linear-gradient(45deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  boxShadow: 3,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 6,
                  },
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                Understand
              </Button>
            </Box>
          </GradientBorderBox>
        </Box>
      </Fade>
    </Modal>
  );
};

export default ExplanationPopup;
