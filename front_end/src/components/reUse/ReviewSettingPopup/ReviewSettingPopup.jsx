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
  // New props for coverage settings:
  coverage,
  setCoverage,
  allShops,
  setAllShops,
  customCoverage,
  setCustomCoverage,
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
          Search Settings
        </Typography>

        <FormControl component="fieldset" fullWidth>
          {/* Review Count Section */}
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
              label="Enter custom review count"
              type="number"
              value={customReviewCount}
              onChange={(e) => setCustomReviewCount(e.target.value)}
              sx={{ mt: 2 }}
              InputProps={{
                inputProps: { min: 1, max: 1000 },
              }}
            />
          )}

          {/* Coverage Section */}
          <Box sx={{ mt: 4 }}>
            <FormLabel component="legend">Select Coverage</FormLabel>
            <RadioGroup
              row
              value={allShops ? "all" : coverage}
              onChange={(e) => {
                if (e.target.value === "all") {
                  setAllShops(true);
                } else if (e.target.value === "customcoverage") {
                  setAllShops(false);
                  setCoverage("customcoverage");
                } else {
                  setAllShops(false);
                  setCoverage(e.target.value);
                }
              }}
              sx={{ mt: 1 }}
            >
              <FormControlLabel value="10" control={<Radio />} label="10 km" />
              <FormControlLabel value="20" control={<Radio />} label="20 km" />
              <FormControlLabel value="50" control={<Radio />} label="50 km" />
              <FormControlLabel
                value="100"
                control={<Radio />}
                label="100 km"
              />
              <FormControlLabel
                value="all"
                control={<Radio />}
                label="All Shops"
              />
              <FormControlLabel
                value="customcoverage"
                control={<Radio />}
                label="Custom Coverage (Km)"
              />
            </RadioGroup>
            {coverage === "customcoverage" && (
              <TextField
                fullWidth
                label="Enter custom coverage (km)"
                type="number"
                value={customCoverage}
                onChange={(e) => setCustomCoverage(e.target.value)}
                sx={{ mt: 2 }}
                InputProps={{
                  inputProps: { min: 1, max: 100 },
                }}
              />
            )}
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={tempDontAskAgain}
                onChange={(e) => setTempDontAskAgain(e.target.checked)}
              />
            }
            label="Don't show this again"
            sx={{ mt: 2 }}
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
