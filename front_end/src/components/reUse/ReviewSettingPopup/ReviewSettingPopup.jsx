import React from "react";
import {
  TextField,
  Button,
  Typography,
  Box,
  Modal,
  Radio,
  RadioGroup,
  Grid,
  FormControlLabel,
  FormLabel,
  Checkbox,
  IconButton,
  Divider,
  Fade,
  useTheme,
  styled,
  MenuItem,
  Select,
  InputAdornment,
} from "@mui/material";
import {
  Close,
  Settings,
  Explore,
  RateReview,
  AccessTime,
  CalendarToday,
} from "@mui/icons-material";

const GradientButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: "white",
  fontWeight: 600,
  padding: "12px 24px",
  borderRadius: "12px",
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

const SettingCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[2],
  transition: "all 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

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
  coverage,
  setCoverage,
  customCoverage,
  setCustomCoverage,
  // Opening hours filter props
  filterByOpening,
  setFilterByOpening,
  openingDate,
  setOpeningDate,
  openingTime,
  setOpeningTime,
}) => {
  const theme = useTheme();

  // Generate time options for the dropdown
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 || 12;
    const period = i < 12 ? "AM" : "PM";
    return `${hour.toString().padStart(2, "0")}:00 ${period}`;
  });

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 600 },
            maxWidth: "95%",
            maxHeight: "90vh",
            overflowY: "auto",
            bgcolor: "background.paper",
            borderRadius: { xs: "8px", sm: "16px" },
            boxShadow: theme.shadows[24],
            p: { xs: 3, sm: 4 },
            outline: "none",
            border: `2px solid ${theme.palette.primary.light}20`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 3,
              position: "relative",
            }}
          >
            <Settings
              sx={{
                fontSize: { xs: 28, sm: 32 },
                color: "primary.main",
                mr: 2,
                bgcolor: "primary.lighter",
                p: 1,
                borderRadius: "50%",
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Advanced Search Settings
            </Typography>
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
                transition: "all 0.3s ease",
              }}
            >
              <Close />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 4, borderColor: "divider" }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* Review Analysis Section */}
            <SettingCard>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <RateReview sx={{ color: "primary.main", mr: 2 }} />
                <FormLabel component="legend" sx={{ fontWeight: 600 }}>
                  Review Analysis Settings
                </FormLabel>
              </Box>

              <RadioGroup
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value)}
              >
                <Grid container spacing={2}>
                  {["10", "20", "30", "50"].map((num) => (
                    <Grid item xs={12} sm={6} key={num}>
                      <FormControlLabel
                        value={num.toString()}
                        control={<Radio color="primary" />}
                        label={`${num.toLocaleString()} reviews`}
                        sx={{
                          borderRadius: "8px",
                          p: 1,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      />
                    </Grid>
                  ))}
                  <Grid item xs={12}>
                    <FormControlLabel
                      value="custom"
                      control={<Radio color="primary" />}
                      label="Custom amount"
                      sx={{ "&:hover": { bgcolor: "action.hover" } }}
                    />
                  </Grid>
                </Grid>
              </RadioGroup>

              {selectedOption === "custom" && (
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Custom Review Count"
                  type="number"
                  value={customReviewCount}
                  onChange={(e) => setCustomReviewCount(e.target.value)}
                  sx={{ mt: 2 }}
                  InputProps={{
                    inputProps: { min: 1, max: 1000 },
                    sx: { borderRadius: "8px" },
                  }}
                />
              )}
            </SettingCard>

            {/* Coverage Section */}
            <SettingCard>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Explore sx={{ color: "primary.main", mr: 2 }} />
                <FormLabel component="legend" sx={{ fontWeight: 600 }}>
                  Search Coverage
                </FormLabel>
              </Box>

              <RadioGroup
                row
                value={coverage}
                onChange={(e) => setCoverage(e.target.value)}
                sx={{ gap: 2 }}
              >
                <Grid container spacing={2}>
                  {["1", "5", "10", "50", "customcoverage"].map((value) => (
                    <Grid item xs={6} sm={4} key={value}>
                      <FormControlLabel
                        value={value}
                        control={<Radio color="primary" />}
                        label={
                          value === "customcoverage" ? "Custom" : `${value} km`
                        }
                        sx={{
                          borderRadius: "8px",
                          p: 1,
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>

              {coverage === "customcoverage" && (
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Custom Coverage (km)"
                  type="number"
                  value={customCoverage}
                  onChange={(e) => setCustomCoverage(e.target.value)}
                  sx={{ mt: 2 }}
                  InputProps={{
                    inputProps: { min: 1, max: 100 },
                    sx: { borderRadius: "8px" },
                  }}
                />
              )}
            </SettingCard>

            {/* NEW: Opening Hours Filter Section */}
            <SettingCard>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <AccessTime sx={{ color: "primary.main", mr: 2 }} />
                <FormLabel component="legend" sx={{ fontWeight: 600 }}>
                  Opening Hours Filter
                </FormLabel>
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={filterByOpening}
                    onChange={(e) => setFilterByOpening(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Show only shops open at specific time
                  </Typography>
                }
              />

              {filterByOpening && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Date"
                      value={openingDate}
                      onChange={(e) => setOpeningDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Select
                      fullWidth
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      displayEmpty
                      renderValue={(selected) => selected || "Select time"}
                      startAdornment={
                        <InputAdornment position="start">
                          <AccessTime fontSize="small" />
                        </InputAdornment>
                      }
                    >
                      {timeOptions.map((time) => (
                        <MenuItem key={time} value={time}>
                          {time}
                        </MenuItem>
                      ))}
                    </Select>
                  </Grid>
                </Grid>
              )}
            </SettingCard>

            {/* Preferences Section */}
            <SettingCard>
              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={tempDontAskAgain}
                    onChange={(e) => setTempDontAskAgain(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Remember these settings
                  </Typography>
                }
              />
            </SettingCard>

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                mt: 4,
              }}
            >
              <Button
                variant="outlined"
                color="primary"
                onClick={onClose}
                sx={{
                  flex: 1,
                  borderRadius: "12px",
                  py: 1.5,
                  borderWidth: 2,
                  "&:hover": { borderWidth: 2 },
                }}
              >
                Cancel
              </Button>
              <GradientButton
                variant="contained"
                onClick={handleConfirm}
                sx={{ flex: 1, py: 1.5 }}
              >
                Apply Settings
              </GradientButton>
            </Box>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default ReviewSettingPopup;
