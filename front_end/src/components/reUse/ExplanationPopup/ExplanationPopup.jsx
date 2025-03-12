// ExplanationPopup.jsx
import React from "react";
import {
  Button,
  Typography,
  Box,
  Modal,
  Chip,
  Alert,
  IconButton,
} from "@mui/material";
import { CheckCircle, Cancel, Insights } from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";

const ExplanationPopup = ({ open, onClose, explanation }) => {
  const theme = useTheme();

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 600,
          bgcolor: "background.paper",
          boxShadow: theme.shadows[20],
          borderRadius: 4,
          p: 4,
          maxHeight: "80vh",
          overflowY: "auto",
          outline: "none",
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: "text.secondary",
          }}
        >
          <Cancel />
        </IconButton>
        <Box sx={{ mb: 4 }}>
          <Insights
            sx={{
              fontSize: 60,
              color: "primary.main",
              mb: 2,
              display: "block",
              textAlign: "center",
            }}
          />
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, textAlign: "center" }}
          >
            AI Rating Explanation
          </Typography>
        </Box>

        {explanation ? (
          explanation.split("\n").map((line, idx) => {
            const [wordPart, weightPart] = line.split(": ");
            const weight = parseFloat(weightPart);
            return (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor:
                    weight > 0
                      ? alpha(theme.palette.success.main, 0.1)
                      : alpha(theme.palette.error.main, 0.1),
                }}
              >
                {weight > 0 ? (
                  <CheckCircle sx={{ mr: 2 }} color="success" />
                ) : (
                  <Cancel sx={{ mr: 2 }} color="error" />
                )}
                <Typography variant="body1" sx={{ flex: 1 }}>
                  <strong>{wordPart.replace("ðŸ”¹ ", "")}</strong>
                </Typography>
                <Chip
                  label={
                    weight > 0 ? `+${weight.toFixed(2)}` : weight.toFixed(2)
                  }
                  sx={{
                    bgcolor:
                      weight > 0
                        ? alpha(theme.palette.success.main, 0.2)
                        : alpha(theme.palette.error.main, 0.2),
                    color:
                      weight > 0
                        ? theme.palette.success.dark
                        : theme.palette.error.dark,
                    fontWeight: 600,
                  }}
                />
              </Box>
            );
          })
        ) : (
          <Alert severity="info" sx={{ mt: 2 }}>
            No explanation available for this rating.
          </Alert>
        )}

        <Button
          fullWidth
          variant="contained"
          onClick={onClose}
          sx={{
            mt: 4,
            borderRadius: 50,
            bgcolor: "secondary.main",
            "&:hover": { bgcolor: "secondary.dark" },
          }}
        >
          Got It
        </Button>
      </Box>
    </Modal>
  );
};

export default ExplanationPopup;
