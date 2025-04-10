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
          <TextField
            multiline
            fullWidth
            readOnly
            variant="outlined"
            value={explanation}
            InputProps={{
              style: {
                maxHeight: 300,
                overflowY: "auto",
              },
            }}
            sx={{ mb: 4 }}
          />
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
