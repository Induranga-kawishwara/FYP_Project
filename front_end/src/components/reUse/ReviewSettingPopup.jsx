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
} from "@mui/material";

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
          width: 400,
          bgcolor: "background.paper",
          boxShadow: theme.shadows[10],
          borderRadius: 4,
          p: 4,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
          How many reviews should be analyzed?
        </Typography>
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">Select an option</FormLabel>
          <RadioGroup
            value={selectedOption}
            onChange={(e) => setSelectedOption(e.target.value)}
          >
            <FormControlLabel value="10" control={<Radio />} label="10" />
            <FormControlLabel value="100" control={<Radio />} label="100" />
            <FormControlLabel value="500" control={<Radio />} label="500" />
            <FormControlLabel value="1000" control={<Radio />} label="1000" />
            <FormControlLabel
              value="custom"
              control={<Radio />}
              label="Custom"
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
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={tempDontAskAgain}
                onChange={(e) => setTempDontAskAgain(e.target.checked)}
              />
            }
            label="Don't ask again"
            sx={{ mt: 2 }}
          />
          <Button
            fullWidth
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
            onClick={handleConfirm}
          >
            Confirm
          </Button>
        </FormControl>
      </Box>
    </Modal>
  );
};

export default ReviewSettingPopup;
