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
  Slide,
  Avatar,
  Skeleton,
  IconButton,
  Tooltip,
  Zoom,
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
  Info as InfoIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { alpha, styled, useTheme } from "@mui/material/styles";
import ExplanationPopup from "../../reUse/ExplanationPopup.jsx";
import ReviewSettingPopup from "../../reUse/ReviewSettingPopup.jsx";

const googleMapsApiKey = "AIzaSyAMTYNccdhFeYEjhT9AQstckZvyD68Zk1w";

// Enhanced Gradient Button
const GradientButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: "white",
  fontWeight: 600,
  padding: "12px 24px",
  borderRadius: 30,
  boxShadow: theme.shadows[3],
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "scale(1.05)",
    boxShadow: theme.shadows[6],
  },
}));

// Enhanced Card Component for shop cards
const ShopCard = styled(Card)(({ theme, selected }) => ({
  transition: "transform 0.3s, box-shadow 0.3s",
  cursor: "pointer",
  position: "relative",
  border: selected ? `2px solid ${theme.palette.success.main}` : "none",
  boxShadow: selected ? theme.shadows[10] : theme.shadows[2],
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: theme.shadows[8],
  },
}));

// Utility: Convert degrees to radians
const deg2rad = (deg) => deg * (Math.PI / 180);

// Haversine formula for distance calculation
const computeDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function ShopFinder() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mapRef = useRef(null);

  const [state, setState] = useState({
    query: "",
    shops: [],
    isLoading: false,
    currentLocation: null,
    selectedShop: null,
    mapCenter: { lat: 40.7128, lng: -74.006 },
    reviewCount: null,
    openExplanationModal: false,
    showReviewModal: false,
    limeExplanation: "",
    tempDontAskAgain: false,
    selectedOption: "10", // for review count
    customReviewCount: "",
    modalTriggeredBySearch: false,
    dontAskAgain: false,
    // Coverage settings
    coverage: "10", // default coverage (preset value)
    allShops: false, // if true, search for all shops (ignores coverage)
    customCoverage: "", // new state for custom coverage value
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setState((prev) => ({
          ...prev,
          currentLocation: userLocation,
          mapCenter: userLocation,
        }));
      },
      (error) => console.error("Location Error:", error)
    );
  }, []);

  // If "Don't ask again" is enabled and both reviewCount and coverage are set, search directly.
  const handleSearch = () => {
    if (
      state.dontAskAgain &&
      state.reviewCount &&
      (state.allShops || state.coverage)
    ) {
      performSearch(state.reviewCount);
    } else {
      setState((prev) => ({
        ...prev,
        showReviewModal: true,
        modalTriggeredBySearch: true,
      }));
    }
  };

  const performSearch = async (finalReviewCount) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));
      const response = await axios.post(
        "http://127.0.0.1:5000/search_product",
        {
          product: state.query,
          reviewCount: finalReviewCount,
          coverage: state.allShops ? "all" : state.coverage,
          location: state.currentLocation,
        }
      );

      setState((prev) => ({
        ...prev,
        shops: response.data.shops,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Search Error:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const selectShop = (shop) => {
    setState((prev) => ({
      ...prev,
      selectedShop: shop,
      mapCenter: { lat: shop.lat, lng: shop.lng },
    }));
    mapRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getDirections = () => {
    if (state.currentLocation && state.selectedShop) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${state.currentLocation.lat},${state.currentLocation.lng}&destination=${state.selectedShop.lat},${state.selectedShop.lng}`;
      window.open(url, "_blank");
    }
  };

  const getLimeExplanation = async () => {
    if (!state.selectedShop?.reviews?.length) {
      alert("No reviews available");
      return;
    }
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/explain_review",
        { review: state.selectedShop.reviews[0].text }
      );
      setState((prev) => ({
        ...prev,
        limeExplanation: response.data.explanation.join("\n"),
        openExplanationModal: true,
      }));
    } catch (error) {
      console.error("Explanation Error:", error);
      setState((prev) => ({
        ...prev,
        limeExplanation: "Error fetching explanation",
        openExplanationModal: true,
      }));
    }
  };

  // Confirm the popup settings (review count and coverage)
  const handleReviewModalConfirm = () => {
    const finalReviewCount =
      state.selectedOption === "custom"
        ? parseInt(state.customReviewCount)
        : parseInt(state.selectedOption);
    // Determine final coverage:
    const finalCoverage =
      state.coverage === "customcoverage"
        ? state.customCoverage
        : state.coverage;

    setState((prev) => ({
      ...prev,
      reviewCount: finalReviewCount,
      coverage: finalCoverage,
      dontAskAgain: prev.tempDontAskAgain,
      showReviewModal: false,
    }));
    if (state.modalTriggeredBySearch) performSearch(finalReviewCount);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Title Section */}
      <Box sx={{ textAlign: "center", mb: 8 }}>
        <Slide in direction="down" timeout={800}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 900,
              background: `linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              position: "relative",
              display: "inline-block",
              pb: 1,
              "&::after": {
                content: '""',
                position: "absolute",
                width: "80%",
                height: 3,
                bgcolor: "primary.main",
                bottom: 0,
                left: "10%",
                borderRadius: 2,
              },
            }}
          >
            Discover Local Shops
          </Typography>
        </Slide>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
          Find the best shops near you with AI-powered insights
        </Typography>
      </Box>

      {/* Search Section */}
      <Box sx={{ mb: 6, position: "relative" }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={9}>
            <TextField
              fullWidth
              variant="outlined"
              label="What product are you looking for?"
              value={state.query}
              onChange={(e) => setState({ ...state, query: e.target.value })}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: "primary.main", mr: 1.5 }} />
                ),
                endAdornment: (
                  <Tooltip title="Search Tips" placement="right">
                    <IconButton
                      sx={{
                        color: "primary.main",
                        "&:hover": { color: "secondary.main" },
                      }}
                    >
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ),
                sx: {
                  borderRadius: 50,
                  bgcolor: "background.default",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.main",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "secondary.main",
                  },
                },
              }}
              sx={{ bgcolor: "background.paper", borderRadius: 50 }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <GradientButton
              fullWidth
              onClick={handleSearch}
              disabled={state.isLoading}
              startIcon={
                state.isLoading ? (
                  <CircularProgress size={24} sx={{ color: "white" }} />
                ) : (
                  <SearchIcon />
                )
              }
              endIcon={
                !state.isLoading && (
                  <SettingsIcon
                    fontSize="small"
                    sx={{ ml: 1, cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setState({ ...state, showReviewModal: true });
                    }}
                  />
                )
              }
              sx={{ height: 60, borderRadius: 50 }}
            >
              {state.isLoading ? "Searching..." : "Find Shops"}
            </GradientButton>
          </Grid>
        </Grid>
      </Box>

      {/* Map Section */}
      <LoadScript googleMapsApiKey={googleMapsApiKey}>
        <Box
          ref={mapRef}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: theme.shadows[10],
            mb: 6,
            position: "relative",
          }}
        >
          <GoogleMap
            center={state.mapCenter}
            zoom={state.selectedShop ? 16 : state.currentLocation ? 14 : 12}
            mapContainerStyle={{
              height: isMobile ? "400px" : "600px",
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
                {
                  featureType: "road",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }],
                },
              ],
            }}
          >
            {/* Current Location Marker */}
            {state.currentLocation && (
              <Marker
                position={state.currentLocation}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "blue",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 3,
                }}
                label={{
                  text: "You",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              />
            )}

            {/* Shop Markers */}
            {state.shops.map((shop, index) => (
              <Marker
                key={index}
                position={{ lat: shop.lat, lng: shop.lng }}
                onClick={() => selectShop(shop)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale:
                    state.selectedShop?.lat === shop.lat &&
                    state.selectedShop?.lng === shop.lng
                      ? 12
                      : 8,
                  fillColor:
                    state.selectedShop?.lat === shop.lat &&
                    state.selectedShop?.lng === shop.lng
                      ? "#FF6B6B"
                      : "#45B7D1",
                  fillOpacity: 0.9,
                  strokeColor: "white",
                  strokeWeight: 2,
                }}
                label={{
                  text: shop.shop_name[0].toUpperCase(),
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              />
            ))}

            {/* InfoWindow for Selected Shop */}
            {state.selectedShop && state.currentLocation && (
              <InfoWindow
                position={{
                  lat: state.selectedShop.lat,
                  lng: state.selectedShop.lng,
                }}
                onCloseClick={() => setState({ ...state, selectedShop: null })}
                options={{ pixelOffset: new window.google.maps.Size(0, -40) }}
              >
                <Box>
                  {/* Shop Name with Gradient Underline */}
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      background: (theme) =>
                        `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 2,
                      textAlign: "center",
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        width: "60px",
                        height: "3px",
                        background: (theme) => theme.palette.primary.main,
                        bottom: "-5px",
                        left: "50%",
                        transform: "translateX(-50%)",
                      },
                    }}
                  >
                    {state.selectedShop.shop_name}
                  </Typography>

                  {/* Rating Section */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      mb: 2,
                      p: 1.5,
                      borderRadius: 2,
                      background: (theme) =>
                        alpha(theme.palette.success.light, 0.15),
                    }}
                  >
                    <Rating
                      value={state.selectedShop.predicted_rating || 0}
                      readOnly
                      precision={0.5}
                      size="medium"
                      sx={{
                        color: (theme) => theme.palette.warning.main,
                        "& .MuiRating-iconFilled": {
                          color: (theme) => theme.palette.warning.dark,
                        },
                      }}
                    />
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: (theme) => theme.palette.text.primary,
                        fontWeight: 600,
                      }}
                    >
                      {state.selectedShop.predicted_rating}/5
                    </Typography>
                  </Box>

                  {/* Distance Section */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 3,
                      p: 1.5,
                      borderRadius: 2,
                      background: (theme) =>
                        alpha(theme.palette.info.light, 0.15),
                    }}
                  >
                    <LocationIcon
                      sx={{ color: (theme) => theme.palette.info.main }}
                    />
                    <Typography
                      variant="body1"
                      sx={{
                        color: (theme) => theme.palette.text.secondary,
                        fontWeight: 500,
                      }}
                    >
                      {computeDistance(
                        state.currentLocation.lat,
                        state.currentLocation.lng,
                        state.selectedShop.lat,
                        state.selectedShop.lng
                      ).toFixed(2)}{" "}
                      km away
                    </Typography>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<ReviewsIcon />}
                      onClick={getLimeExplanation}
                      sx={{
                        flex: 1,
                        borderRadius: 25,
                        padding: "8px 16px",
                        textTransform: "none",
                        fontWeight: 600,
                        border: (theme) =>
                          `1px solid ${alpha(theme.palette.primary.main, 0.8)}`,
                        background: (theme) =>
                          alpha(theme.palette.primary.light, 0.1),
                        boxShadow: (theme) =>
                          `0 2px 8px ${alpha(
                            theme.palette.primary.main,
                            0.15
                          )}`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          background: (theme) =>
                            alpha(theme.palette.primary.main, 0.2),
                          transform: "translateY(-2px)",
                          boxShadow: (theme) =>
                            `0 4px 12px ${alpha(
                              theme.palette.primary.main,
                              0.25
                            )}`,
                        },
                      }}
                    >
                      Explain Rating
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<LocationIcon />}
                      onClick={getDirections}
                      sx={{
                        flex: 1,
                        borderRadius: 25,
                        padding: "8px 16px",
                        textTransform: "none",
                        fontWeight: 600,
                        boxShadow: (theme) =>
                          `0 2px 8px ${alpha(
                            theme.palette.secondary.main,
                            0.3
                          )}`,
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: (theme) =>
                            `0 4px 12px ${alpha(
                              theme.palette.secondary.main,
                              0.4
                            )}`,
                          background: (theme) => theme.palette.secondary.dark,
                        },
                      }}
                    >
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
      <Grid container spacing={4} sx={{ mt: 4 }}>
        {state.shops.length === 0 && !state.isLoading && (
          <Grid item xs={12}>
            <Box
              sx={{
                textAlign: "center",
                p: 6,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 4,
              }}
            >
              <img
                src="/empty-state.svg"
                alt="No shops found"
                style={{ height: 250, marginBottom: 24 }}
              />
              <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                No shops found
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Try adjusting your search terms or location
              </Typography>
            </Box>
          </Grid>
        )}

        {state.isLoading
          ? Array.from(new Array(4)).map((_, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Skeleton
                  variant="rounded"
                  height={200}
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    borderRadius: 4,
                  }}
                />
              </Grid>
            ))
          : state.shops.map((shop, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <Zoom in timeout={(index + 1) * 200}>
                  <ShopCard
                    selected={
                      state.selectedShop?.lat === shop.lat &&
                      state.selectedShop?.lng === shop.lng
                    }
                    onClick={() => selectShop(shop)}
                    elevation={
                      state.selectedShop?.lat === shop.lat &&
                      state.selectedShop?.lng === shop.lng
                        ? 10
                        : 3
                    }
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <CardContent
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: alpha(
                              theme.palette.primary.main,
                              state.selectedShop?.lat === shop.lat &&
                                state.selectedShop?.lng === shop.lng
                                ? 0.2
                                : 0.1
                            ),
                            color: theme.palette.primary.main,
                            width: 56,
                            height: 56,
                            mr: 3,
                          }}
                        >
                          <StoreIcon fontSize="large" />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" component="div">
                            {shop.shop_name}
                          </Typography>
                          <Rating
                            value={shop.predicted_rating || 0}
                            precision={0.5}
                            readOnly
                            size="large"
                            sx={{ color: "#FFD700" }}
                          />
                        </Box>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mb: 2 }}
                      >
                        <LocationIcon color="action" sx={{ mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {shop.address}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: { xs: 120, sm: 150 },
                          maxHeight: 200,
                          width: "auto",
                          p: 2,
                          mt: 2,
                          borderRadius: 4,
                          bgcolor: (theme) =>
                            alpha(theme.palette.primary.light, 0.15),
                          border: (theme) =>
                            `1px solid ${alpha(
                              theme.palette.primary.main,
                              0.2
                            )}`,
                          overflowY: "auto",
                          position: "relative",
                          boxShadow: (theme) =>
                            `inset 0 0 12px ${alpha(
                              theme.palette.grey[500],
                              0.1
                            )}`,
                          transition: "box-shadow 0.3s",
                          "&:hover": {
                            boxShadow: (theme) =>
                              `inset 0 0 16px ${alpha(
                                theme.palette.grey[500],
                                0.2
                              )}`,
                          },
                          "&::-webkit-scrollbar": {
                            width: 6,
                            height: 6,
                          },
                          "&::-webkit-scrollbar-track": {
                            bgcolor: "transparent",
                            borderRadius: 4,
                          },
                          "&::-webkit-scrollbar-thumb": {
                            bgcolor: (theme) =>
                              alpha(theme.palette.primary.main, 0.5),
                            borderRadius: 4,
                            border: (theme) =>
                              `2px solid ${theme.palette.background.paper}`,
                            transition: "background-color 0.3s",
                          },
                          "&::-webkit-scrollbar-thumb:hover": {
                            bgcolor: (theme) =>
                              alpha(theme.palette.primary.main, 0.8),
                          },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontStyle: "italic",
                            lineHeight: 1.6,
                            color: (theme) => theme.palette.text.secondary,
                            whiteSpace: "pre-line",
                          }}
                        >
                          {shop.summary?.detailed_summary ||
                            "No summary available"}
                        </Typography>
                      </Box>
                    </CardContent>
                  </ShopCard>
                </Zoom>
              </Grid>
            ))}
      </Grid>

      {/* Modals */}
      <ExplanationPopup
        open={state.openExplanationModal}
        onClose={() => setState({ ...state, openExplanationModal: false })}
        explanation={state.limeExplanation}
      />
      <ReviewSettingPopup
        open={state.showReviewModal}
        onClose={() => setState({ ...state, showReviewModal: false })}
        selectedOption={state.selectedOption}
        setSelectedOption={(option) =>
          setState({ ...state, selectedOption: option })
        }
        customReviewCount={state.customReviewCount}
        setCustomReviewCount={(count) =>
          setState({ ...state, customReviewCount: count })
        }
        tempDontAskAgain={state.tempDontAskAgain}
        setTempDontAskAgain={(val) =>
          setState({ ...state, tempDontAskAgain: val })
        }
        coverage={state.coverage}
        setCoverage={(val) => setState({ ...state, coverage: val })}
        allShops={state.allShops}
        setAllShops={(val) => setState({ ...state, allShops: val })}
        customCoverage={state.customCoverage}
        setCustomCoverage={(val) => setState({ ...state, customCoverage: val })}
        handleConfirm={handleReviewModalConfirm}
      />
    </Container>
  );
}

export default ShopFinder;
