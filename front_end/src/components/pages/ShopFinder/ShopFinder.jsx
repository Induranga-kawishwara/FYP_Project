import React, { useState, useEffect, useRef } from "react";
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
  useMediaQuery,
  Fade,
  Grow,
  Slide,
  Chip,
  Avatar,
  Skeleton,
} from "@mui/material";
import {
  LoadScript,
  GoogleMap,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import {
  Search as SearchIcon,
  Store as StoreIcon,
  Reviews as ReviewsIcon,
  LocationOn as LocationIcon,
} from "@mui/icons-material";
import { alpha, styled, useTheme } from "@mui/material/styles";
import ExplanationPopup from "../../reUse/ExplanationPopup";
import ReviewSettingPopup from "../../reUse/ReviewSettingPopup";

const googleMapsApiKey = "AIzaSyAMTYNccdhFeYEjhT9AQstckZvyD68Zk1w";

// Custom Gradient Button
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

// Animated Card Component for shop cards
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

// Convert degrees to radians
const deg2rad = (deg) => deg * (Math.PI / 180);

// Haversine formula to compute distance (in km) between two lat/lng points
const computeDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function ShopFinder() {
  // State variables
  const [query, setQuery] = useState("");
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [reviewCount, setReviewCount] = useState(null);
  const [openExplanationModal, setOpenExplanationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [limeExplanation, setLimeExplanation] = useState("");

  // State for review settings modal
  const [tempDontAskAgain, setTempDontAskAgain] = useState(false);
  const [selectedOption, setSelectedOption] = useState("10");
  const [customReviewCount, setCustomReviewCount] = useState("");
  const [modalTriggeredBySearch, setModalTriggeredBySearch] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Create a ref for the map container so we can scroll to it
  const mapRef = useRef(null);

  // Get user's current location on mount
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

  // Function to perform shop search (includes reviewCount parameter)
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

  // Search button handler
  const handleSearch = () => {
    if (dontAskAgain && reviewCount) {
      performSearch(reviewCount);
    } else {
      setModalTriggeredBySearch(true);
      setShowReviewModal(true);
    }
  };

  // When a shop card is clicked, select that shop, center map, and scroll up to map
  const selectShop = (shop) => {
    setSelectedShop(shop);
    setMapCenter({ lat: shop.lat, lng: shop.lng });
    // Scroll to map container if available
    if (mapRef.current) {
      mapRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Get Directions: open Google Maps with directions from current location to selected shop
  const getDirections = () => {
    if (currentLocation && selectedShop) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${selectedShop.lat},${selectedShop.lng}&travelmode=driving`;
      window.open(url, "_blank");
    } else {
      alert("Please allow location access to get directions.");
    }
  };

  // Get LIME Explanation for the first review of the selected shop
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
      setOpenExplanationModal(true);
    } catch (error) {
      console.error("Error fetching explanation:", error);
      setLimeExplanation("Error fetching explanation.");
      setOpenExplanationModal(true);
    }
  };

  // Confirm review count settings from the ReviewSettingsModal
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
                  "& .MuiOutlinedInput-notchedOutline": { borderWidth: 2 },
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
          ref={mapRef}
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
            {/* Current Location Marker */}
            {currentLocation && (
              <Marker
                position={currentLocation}
                icon={{
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
                  scale: selectedShop === shop ? 9 : 6,
                  fillColor: selectedShop === shop ? "green" : "red",
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

            {/* InfoWindow on selected shop marker showing km, explanation, and destination buttons */}
            {selectedShop && currentLocation && (
              <InfoWindow
                position={{ lat: selectedShop.lat, lng: selectedShop.lng }}
                onCloseClick={() => setSelectedShop(null)}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    {selectedShop.shop_name}{" "}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    <Rating
                      value={selectedShop.predicted_rating || 0}
                      readOnly
                      precision={0.5}
                      size="small"
                      sx={{ verticalAlign: "middle" }}
                    />
                  </Typography>
                  <Typography variant="body2">
                    {`Distance: ${computeDistance(
                      currentLocation.lat,
                      currentLocation.lng,
                      selectedShop.lat,
                      selectedShop.lng
                    ).toFixed(2)} km`}
                  </Typography>
                  <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                    <Button variant="outlined" onClick={getLimeExplanation}>
                      XAI Explanation
                    </Button>
                    <Button variant="contained" onClick={getDirections}>
                      Get Directions
                    </Button>
                  </Box>
                </Box>
              </InfoWindow>
            )}
          </GoogleMap>
        </Box>
      </LoadScript>

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
                  <div onClick={() => selectShop(shop)}>
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

      <ExplanationPopup
        open={openExplanationModal}
        onClose={() => setOpenExplanationModal(false)}
        explanation={limeExplanation}
      />

      <ReviewSettingPopup
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        selectedOption={selectedOption}
        setSelectedOption={setSelectedOption}
        customReviewCount={customReviewCount}
        setCustomReviewCount={setCustomReviewCount}
        tempDontAskAgain={tempDontAskAgain}
        setTempDontAskAgain={setTempDontAskAgain}
        handleConfirm={handleReviewModalConfirm}
      />
    </Container>
  );
}

export default ShopFinder;
