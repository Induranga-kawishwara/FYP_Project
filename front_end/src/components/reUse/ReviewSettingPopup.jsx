// ReviewSettingPopup.jsx
import React from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Modal,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
  Checkbox,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";

const ReviewSettingPopup = ({
  open,
  onClose,
  selectedOption,
  setSelectedOption,
  customReviewCount,
  setCustomReviewCount,
  tempDontAskAgain,
  setTempDontAskAgain,
  handleConfirm,
}) => {
  const theme = useTheme();

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 450,
          bgcolor: "background.paper",
          boxShadow: theme.shadows[20],
          borderRadius: 4,
          p: 4,
          outline: "none",
          position: "relative",
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
          <Close />
        </IconButton>
        <Typography variant="h6" sx={{ mb: 3, textAlign: "center" }}>
          Review Analysis Settings
        </Typography>

        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">Select Reviews to Analyze</FormLabel>
          <RadioGroup
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
            sx={{ ml: 2 }}
          >
            {[10, 100, 500, 1000].map((num) => (
              <FormControlLabel
                key={num}
                value={num.toString()}
                control={<Radio />}
                label={`${num.toLocaleString()} reviews`}
              />
            ))}
            <FormControlLabel
              value="custom"
              control={<Radio />}
              label="Custom amount"
            />
          </RadioGroup>

          {selectedOption === "custom" && (
            <TextField
              fullWidth
              label="Enter custom number"
              type="number"
              value={customReviewCount}
              onChange={(e) => setCustomReviewCount(e.target.value)}
              sx={{ mt: 2 }}
              InputProps={{
                inputProps: { min: 1, max: 10000 },
              }}
            />
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={tempDontAskAgain}
                onChange={(e) => setTempDontAskAgain(e.target.checked)}
              />
            }
            label="Don't show this again"
            sx={{ mt: 3 }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={onClose}
              sx={{ flex: 1, mr: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirm}
              sx={{ flex: 1, ml: 2 }}
            >
              Confirm
            </Button>
          </Box>
        </FormControl>
      </Box>
    </Modal>
  );
};

export default ReviewSettingPopup;
