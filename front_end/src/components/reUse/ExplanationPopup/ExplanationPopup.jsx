import React from "react";
import {
  Button,
  Typography,
  Box,
  Modal,
  TextField,
  IconButton,
  Alert,
} from "@mui/material";
import { Cancel, Insights } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const ExplanationPopup = ({ open, onClose, explanation }) => {
  const theme = useTheme();

  // Safe color fallbacks
  const primaryColor = theme.palette.primary.main || "#1976d2";
  const primaryLight = theme.palette.primary.light || primaryColor;
  const secondaryMain = theme.palette.secondary?.main || primaryColor;

  return (
    <Modal
      open={open}
      onClose={onClose}
      BackdropProps={{ transitionDuration: 300 }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 700,
          bgcolor: "background.paper",
          backgroundImage: `linear-gradient(to bottom, ${
            theme.palette.background.paper
          }, ${primaryLight + "20"})`,
          boxShadow: theme.shadows[24],
          borderRadius: "16px",
          p: 4,
          maxHeight: "85vh",
          overflowY: "auto",
          outline: "none",
          border: `2px solid ${primaryLight + "20"}`,
          "&:hover": {
            borderColor: primaryLight,
          },
          transition: "all 0.3s ease-in-out",
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
              bgcolor: "primary.lighter",
            },
            transition: "all 0.2s ease",
          }}
        >
          <Cancel sx={{ fontSize: 32 }} />
        </IconButton>

        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Box
            sx={{
              display: "inline-flex",
              p: 2,
              bgcolor: "primary.lighter",
              borderRadius: "50%",
              boxShadow: 3,
              mb: 3,
            }}
          >
            <Insights
              sx={{
                fontSize: 60,
                color: "primary.main",
              }}
            />
          </Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.5px",
              mb: 1,
              background: `linear-gradient(45deg, ${primaryColor} 30%, ${secondaryMain} 90%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            AI Rating Explanation
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Detailed breakdown of the assessment
          </Typography>
        </Box>

        {explanation ? (
          <TextField
            multiline
            fullWidth
            readOnly
            variant="outlined"
            value={explanation}
            InputProps={{
              style: {
                maxHeight: "40vh",
                overflowY: "auto",
                borderRadius: "12px",
                padding: "16px",
                fontSize: "1rem",
                lineHeight: "1.6",
              },
            }}
            sx={{
              mb: 4,
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "divider",
                },
                "&:hover fieldset": {
                  borderColor: "primary.light",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main",
                },
              },
              "& ::-webkit-scrollbar": {
                width: "6px",
              },
              "& ::-webkit-scrollbar-track": {
                background: theme.palette.divider,
                borderRadius: "3px",
              },
              "& ::-webkit-scrollbar-thumb": {
                background: primaryColor,
                borderRadius: "3px",
              },
            }}
          />
        ) : (
          <Alert
            severity="info"
            sx={{
              mt: 2,
              borderRadius: "12px",
              bgcolor: "info.lighter",
              "& .MuiAlert-icon": {
                color: "info.main",
              },
            }}
          >
            No explanation available for this rating.
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{
            mt: 4,
            py: 1.5,
            borderRadius: "12px",
            background: `linear-gradient(45deg, ${primaryColor} 0%, ${secondaryMain} 100%)`,
            fontSize: "1rem",
            fontWeight: 600,
            letterSpacing: "0.5px",
            boxShadow: 3,
            "&:hover": {
              boxShadow: 6,
              transform: "translateY(-2px)",
            },
            transition: "all 0.3s ease",
          }}
        >
          Got It
        </Button>
      </Box>
    </Modal>
  );
};

export default ExplanationPopup;
