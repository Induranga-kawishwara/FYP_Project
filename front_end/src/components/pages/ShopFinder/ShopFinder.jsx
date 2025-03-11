import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  Box,
  CircularProgress,
  Rating,
  Modal,
  useMediaQuery,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
  Checkbox,
  Fade,
  Grow,
  Slide,
  Chip,
  Avatar,
  Skeleton,
  Alert,
} from "@mui/material";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import {
  Search as SearchIcon,
  Directions as DirectionsIcon,
  Insights as InsightsIcon,
  Store as StoreIcon,
  Reviews as ReviewsIcon,
  LocationOn as LocationIcon,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { alpha, styled, useTheme } from "@mui/material/styles";
import { keyframes } from "@emotion/react";

const googleMapsApiKey = "AIzaSyAMTYNccdhFeYEjhT9AQstckZvyD68Zk1w";

// A keyframes animation (if you wish to use it in the future)
const pulse = keyframes`
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
`;

// A custom gradient button using MUI's styled API
const GradientButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: theme.palette.common.white,
  fontWeight: "bold",
  letterSpacing: "0.5px",
  transition: "transform 0.2s, box-shadow 0.2s",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

// A custom card that animates on hover
const AnimatedCard = styled(Card)(({ theme, selected }) => ({
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  border: selected ? `2px solid ${theme.palette.success.main}` : "none",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: theme.shadows[6],
    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: alpha(theme.palette.primary.main, 0.05),
    },
  },
}));

function ShopFinder() {
  // Basic state variables
  const [query, setQuery] = useState("");
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [reviewCount, setReviewCount] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [limeExplanation, setLimeExplanation] = useState("");

  // State variables for review count modal settings
  const [tempDontAskAgain, setTempDontAskAgain] = useState(false);
  const [selectedOption, setSelectedOption] = useState("10");
  const [customReviewCount, setCustomReviewCount] = useState("");
  const [modalTriggeredBySearch, setModalTriggeredBySearch] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // MUI theme and media query
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(userLocation);
          setMapCenter(userLocation);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Function to perform search (includes reviewCount in the API call)
  const performSearch = async (finalReviewCount) => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `http://127.0.0.1:5000/search_product?product=${query}&reviewCount=${finalReviewCount}`
      );
      setShops(response.data.shops);
    } catch (error) {
      console.error("Error searching shops:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for search button click
  const handleSearch = () => {
    if (dontAskAgain && reviewCount) {
      performSearch(reviewCount);
    } else {
      setModalTriggeredBySearch(true);
      setShowReviewModal(true);
    }
  };

  // When a shop is clicked, select it and update the map center
  const selectShop = (shop) => {
    setSelectedShop(shop);
    setMapCenter({ lat: shop.lat, lng: shop.lng });
  };

  // Open Google Maps directions
  const getDirections = () => {
    if (currentLocation && selectedShop) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${selectedShop.lat},${selectedShop.lng}&travelmode=driving`;
      window.open(url, "_blank");
    } else {
      alert("Please allow location access to get directions.");
    }
  };

  // Request LIME explanation for the rating using the first review text
  const getLimeExplanation = async () => {
    if (
      !selectedShop ||
      !selectedShop.reviews ||
      selectedShop.reviews.length === 0
    ) {
      alert("No reviews available for explanation.");
      return;
    }
    const reviewText = selectedShop.reviews[0].text;
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/explain_review",
        {
          review: reviewText,
        }
      );
      if (Array.isArray(response.data.explanation)) {
        setLimeExplanation(
          response.data.explanation
            .map((exp) => `🔹 ${exp.word}: ${exp.weight.toFixed(3)}`)
            .join("\n")
        );
      } else {
        setLimeExplanation("No valid explanation available.");
      }
      setOpenModal(true);
    } catch (error) {
      console.error("Error fetching explanation:", error);
      setLimeExplanation("Error fetching explanation.");
      setOpenModal(true);
    }
  };

  // Confirm the review count settings from the modal
  const handleReviewModalConfirm = () => {
    const finalReviewCount =
      selectedOption === "custom"
        ? parseInt(customReviewCount, 10)
        : parseInt(selectedOption, 10);
    if (!finalReviewCount || isNaN(finalReviewCount)) {
      alert("Please enter a valid number for custom review count.");
      return;
    }
    setReviewCount(finalReviewCount);
    setDontAskAgain(tempDontAskAgain);
    setShowReviewModal(false);
    if (modalTriggeredBySearch) {
      performSearch(finalReviewCount);
      setModalTriggeredBySearch(false);
    }
  };

  // Allow user to change review count settings manually
  const handleChangeReviewCount = () => {
    if ([10, 100, 500, 1000].includes(reviewCount)) {
      setSelectedOption(reviewCount.toString());
      setCustomReviewCount("");
    } else if (reviewCount) {
      setSelectedOption("custom");
      setCustomReviewCount(reviewCount.toString());
    } else {
      setSelectedOption("10");
      setCustomReviewCount("");
    }
    setTempDontAskAgain(dontAskAgain);
    setModalTriggeredBySearch(false);
    setShowReviewModal(true);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Title Section */}
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Slide in direction="down" timeout={500}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mb: 2,
            }}
          >
            Discover Local Shops
          </Typography>
        </Slide>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
          Find the best shops near you with AI-powered insights
        </Typography>
      </Box>

      {/* Search Section */}
      <Box sx={{ mb: 4, position: "relative" }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={9}>
            <TextField
              fullWidth
              variant="outlined"
              label="What product are you looking for?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: "action.active", mr: 1.5 }} />
                ),
                sx: {
                  borderRadius: 50,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderWidth: 2,
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: theme.palette.primary.main,
                  },
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <GradientButton
              fullWidth
              onClick={handleSearch}
              disabled={isLoading}
              size="large"
              startIcon={
                isLoading ? (
                  <CircularProgress size={24} sx={{ color: "white" }} />
                ) : (
                  <SearchIcon />
                )
              }
              sx={{ height: 56, borderRadius: 50 }}
            >
              {isLoading ? "Searching..." : "Find Shops"}
            </GradientButton>
          </Grid>
        </Grid>
      </Box>

      {/* Review Count Settings */}
      {reviewCount && (
        <Fade in={!!reviewCount}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Chip
              icon={<ReviewsIcon />}
              label={`Analyzing ${reviewCount} reviews per shop`}
              onClick={handleChangeReviewCount}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 50,
                bgcolor: alpha(theme.palette.info.main, 0.1),
                "& .MuiChip-label": { pl: 1 },
              }}
            />
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              <Button
                variant="text"
                size="small"
                onClick={handleChangeReviewCount}
                sx={{ fontWeight: 500 }}
              >
                Change Settings
              </Button>
            </Typography>
          </Box>
        </Fade>
      )}

      {/* Map Section */}
      <LoadScript googleMapsApiKey={googleMapsApiKey}>
        <Box
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: theme.shadows[6],
            mb: 4,
            border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <GoogleMap
            center={mapCenter}
            zoom={selectedShop ? 16 : currentLocation ? 14 : 12}
            mapContainerStyle={{
              height: isMobile ? "300px" : "500px",
              width: "100%",
            }}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
              ],
            }}
          >
            {currentLocation && (
              <Marker
                position={currentLocation}
                icon={{
                  // If the Google Maps API is available, use the built-in symbol
                  path:
                    window.google && window.google.maps
                      ? window.google.maps.SymbolPath.CIRCLE
                      : undefined,
                  scale: 8,
                  fillColor: theme.palette.primary.main,
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                }}
              />
            )}
            {shops.map((shop, index) => (
              <Marker
                key={index}
                position={{ lat: shop.lat, lng: shop.lng }}
                onClick={() => selectShop(shop)}
                icon={{
                  path:
                    window.google && window.google.maps
                      ? window.google.maps.SymbolPath.CIRCLE
                      : undefined,
                  scale: 6,
                  fillColor:
                    selectedShop === shop
                      ? theme.palette.success.main
                      : theme.palette.secondary.main,
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                }}
                label={{
                  text: shop.shop_name[0].toUpperCase(),
                  color: "white",
                  fontSize: "12px",
                }}
              />
            ))}
          </GoogleMap>
        </Box>
      </LoadScript>

      {/* Action Buttons */}
      {selectedShop && (
        <Box sx={{ textAlign: "center", mt: 3, mb: 6 }}>
          <GradientButton
            variant="contained"
            onClick={getDirections}
            startIcon={<DirectionsIcon sx={{ color: "white" }} />}
            sx={{ mr: 2 }}
          >
            Navigate to {selectedShop.shop_name}
          </GradientButton>
          <Button
            variant="outlined"
            color="secondary"
            onClick={getLimeExplanation}
            startIcon={<InsightsIcon />}
            sx={{
              borderWidth: 2,
              "&:hover": { borderWidth: 2 },
            }}
          >
            Explain Rating
          </Button>
        </Box>
      )}

      {/* Shop Cards Grid */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {shops.length === 0 && !isLoading && (
          <Grid item xs={12}>
            <Box sx={{ textAlign: "center", p: 4 }}>
              <img
                src="/empty-state.svg"
                alt="No shops found"
                style={{ height: 200, marginBottom: 16 }}
              />
              <Typography variant="h6" color="textSecondary">
                No shops found. Try adjusting your search!
              </Typography>
            </Box>
          </Grid>
        )}

        {isLoading
          ? Array.from(new Array(4)).map((_, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Skeleton
                  variant="rectangular"
                  height={180}
                  sx={{ borderRadius: 3 }}
                />
              </Grid>
            ))
          : shops.map((shop, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Grow in timeout={(index + 1) * 200}>
                  <div>
                    <AnimatedCard selected={selectedShop === shop}>
                      <CardContent>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 2 }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              mr: 2,
                            }}
                          >
                            <StoreIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" component="div">
                              {shop.shop_name}
                            </Typography>
                            <Rating
                              value={shop.predicted_rating || 0}
                              precision={0.5}
                              readOnly
                              sx={{ "& .MuiRating-icon": { fontSize: 28 } }}
                            />
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            mb: 1.5,
                          }}
                        >
                          <LocationIcon color="action" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {shop.address}
                          </Typography>
                        </Box>

                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            mt: 2,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontStyle: "italic" }}
                          >
                            "
                            {shop.summary?.detailed_summary ||
                              "No summary available"}
                            "
                          </Typography>
                        </Box>
                      </CardContent>
                    </AnimatedCard>
                  </div>
                </Grow>
              </Grid>
            ))}
      </Grid>

      {/* Enhanced Explanation Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: isMobile ? "90%" : 600,
            bgcolor: "background.paper",
            boxShadow: theme.shadows[10],
            borderRadius: 4,
            p: 4,
            maxHeight: "80vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
            <InsightsIcon
              color="primary"
              sx={{ mr: 1, verticalAlign: "middle" }}
            />
            Rating Explanation
          </Typography>

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              pr: 2,
              "&::-webkit-scrollbar": { width: 8 },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: alpha(theme.palette.primary.main, 0.3),
                borderRadius: 4,
              },
            }}
          >
            {limeExplanation ? (
              limeExplanation.split("\n").map((line, index) => {
                const [wordPart, weightPart] = line.split(": ");
                const weight = parseFloat(weightPart);
                return (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor:
                        weight > 0
                          ? alpha(theme.palette.success.main, 0.1)
                          : alpha(theme.palette.error.main, 0.1),
                    }}
                  >
                    {weight > 0 ? (
                      <CheckCircle color="success" sx={{ mr: 2 }} />
                    ) : (
                      <Cancel color="error" sx={{ mr: 2 }} />
                    )}
                    <Typography variant="body1" sx={{ flex: 1 }}>
                      <strong>{wordPart.replace("🔹 ", "")}</strong>
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
                        fontWeight: 500,
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
          </Box>

          <Button
            fullWidth
            variant="contained"
            onClick={() => setOpenModal(false)}
            sx={{ mt: 3, borderRadius: 50 }}
          >
            Close Explanation
          </Button>
        </Box>
      </Modal>

      {/* Review Settings Modal */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)}>
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
              onClick={handleReviewModalConfirm}
            >
              Confirm
            </Button>
          </FormControl>
        </Box>
      </Modal>
    </Container>
  );
}

export default ShopFinder;
