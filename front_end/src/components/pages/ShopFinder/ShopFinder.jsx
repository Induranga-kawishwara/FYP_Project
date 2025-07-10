import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useToken from "../../../hooks/useToken/useToken.js";
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
  useTheme,
  alpha,
  styled,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Search as SearchIcon,
  Store as StoreIcon,
  Reviews as ReviewsIcon,
  LocationOn as LocationIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Directions as DirectionsIcon,
  Storefront,
} from "@mui/icons-material";
import {
  LoadScript,
  GoogleMap,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import ExplanationPopup from "../../reUse/ExplanationPopup/ExplanationPopup.jsx";
import ReviewSettingPopup from "../../reUse/ReviewSettingPopup/ReviewSettingPopup.jsx";

const GradientButton = styled(Button)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
  color: "white",
  fontWeight: 700,
  padding: "16px 32px",
  borderRadius: 50,
  boxShadow: theme.shadows[4],
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[8],
    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`,
  },
}));

const ShopCard = styled(Card)(({ theme, selected }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius * 2,
  transition: "all 0.3s ease",
  overflow: "visible",
  cursor: "pointer",
  border: selected ? `2px solid ${theme.palette.success.main}` : "none",
  boxShadow: selected ? theme.shadows[10] : theme.shadows[2],
  "&:hover": {
    transform: "translateY(-8px)",
    boxShadow: theme.shadows[8],
    "&::after": { opacity: 1 },
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.shape.borderRadius * 2,
    boxShadow: theme.shadows[16],
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
}));

const deg2rad = (deg) => deg * (Math.PI / 180);
const computeDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
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
  const { token, isValid } = useToken();
  const navigate = useNavigate();
  const googleMapsApiKey = "AIzaSyAMTYNccdhFeYEjhT9AQstckZvyD68Zk1w";

  // Shop search related states
  const [query, setQuery] = useState("");
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });

  // Pagination-related states
  const offsetRef = useRef([]);
  const [hasMoreShops, setHasMoreShops] = useState(true);
  const [showLoadMoreButton, setShowLoadMoreButton] = useState(false);

  // Review settings states
  const [reviewCount, setReviewCount] = useState(null);
  const [selectedOption, setSelectedOption] = useState("10");
  const [customReviewCount, setCustomReviewCount] = useState("");
  const [tempDontAskAgain, setTempDontAskAgain] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [coverage, setCoverage] = useState("10");
  const [customCoverage, setCustomCoverage] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [modalTriggeredBySearch, setModalTriggeredBySearch] = useState(false);

  // UPDATED: Opening hours filter states
  const [filterType, setFilterType] = useState("none"); // "none", "date", or "datetime"
  const [openingDate, setOpeningDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [openingTime, setOpeningTime] = useState("12:00 PM");

  // Explanation Popup state
  const [openExplanationModal, setOpenExplanationModal] = useState(false);
  const [explanationContent, setExplanationContent] = useState("");

  // Login Required Modal state
  const [loginRequiredModalOpen, setLoginRequiredModalOpen] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(userLocation);
        setMapCenter(userLocation);
      },
      (error) => console.error("Location Error:", error)
    );

    if (token && isValid) {
      (async () => {
        try {
          const res = await axios.get(
            "http://127.0.0.1:5000/profile/review_settings",
            {
              params: { id_token: token },
            }
          );
          if (res.data && res.data.review_settings) {
            const settings = res.data.review_settings;
            if (
              ["10", "20", "30", "50"].includes(
                settings.review_count.toString()
              )
            ) {
              setSelectedOption(settings.review_count.toString());
              setCustomReviewCount("");
            } else {
              setSelectedOption("custom");
              setCustomReviewCount(settings.review_count.toString());
            }
            if (["1", "5", "10", "50"].includes(settings.coverage.toString())) {
              setCoverage(settings.coverage.toString());
              setCustomCoverage("");
            } else {
              setCoverage("customcoverage");
              setCustomCoverage(settings.coverage.toString());
            }
            setDontAskAgain(settings.remember_settings);
            setTempDontAskAgain(settings.remember_settings);
            setReviewCount(parseInt(settings.review_count));
          }
        } catch (error) {
          console.error("Error loading review settings:", error);
        }
      })();
    }
  }, []);

  const handleSearch = () => {
    if (dontAskAgain && (!token || !isValid)) {
      setLoginRequiredModalOpen(true);
      return;
    }

    if (reviewCount && coverage) {
      performSearch(reviewCount);
    } else {
      setShowReviewModal(true);
      setModalTriggeredBySearch(true);
    }
  };

  const performSearch = async (finalReviewCount) => {
    try {
      setIsLoading(true);
      setShops([]);

      // Time conversion function
      const convertTimeTo24Hour = (timeStr) => {
        const [time, period] = timeStr.split(" ");
        let [hours, minutes] = time.split(":");
        if (period === "PM" && hours !== "12") {
          hours = parseInt(hours, 10) + 12;
        } else if (period === "AM" && hours === "12") {
          hours = "00";
        }
        return `${hours.padStart(2, "0")}:${minutes}:00`;
      };

      const requestData = {
        product: query,
        reviewCount: finalReviewCount,
        coverage: coverage === "customcoverage" ? customCoverage : coverage,
        location: currentLocation,
        filterType: filterType,
      };

      // Conditionally add date/time parameters
      if (filterType !== "none") {
        requestData.openingDate = openingDate;

        if (filterType === "datetime") {
          requestData.openingTime = convertTimeTo24Hour(openingTime);
        }
      }

      const response = await axios.post(
        "http://127.0.0.1:5000/product/search_product",
        requestData
      );

      const newShops = response.data.shops;

      if (newShops.length === 0) {
        setHasMoreShops(false);
      } else {
        setShops(newShops);
        const newPlaceIds = newShops.map((shop) => shop.place_id);
        offsetRef.current = newPlaceIds;
      }

      setIsLoading(false);
      setShowLoadMoreButton(true);
    } catch (error) {
      console.error("Search Error:", error);
      setIsLoading(false);
    }
  };

  const loadMoreShops = async () => {
    setIsLoading(true);
    try {
      // Time conversion function
      const convertTimeTo24Hour = (timeStr) => {
        const [time, period] = timeStr.split(" ");
        let [hours, minutes] = time.split(":");
        if (period === "PM" && hours !== "12") {
          hours = parseInt(hours, 10) + 12;
        } else if (period === "AM" && hours === "12") {
          hours = "00";
        }
        return `${hours.padStart(2, "0")}:${minutes}:00`;
      };

      const requestData = {
        product: query,
        reviewCount: reviewCount,
        coverage: coverage === "customcoverage" ? customCoverage : coverage,
        location: currentLocation,
        offset: offsetRef.current,
        filterType: filterType,
      };

      // Conditionally add date/time parameters
      if (filterType !== "none") {
        requestData.openingDate = openingDate;

        if (filterType === "datetime") {
          requestData.openingTime = convertTimeTo24Hour(openingTime);
        }
      }

      const response = await axios.post(
        "http://127.0.0.1:5000/product/search_product",
        requestData
      );

      const newShops = response.data.shops;

      if (newShops.length === 0) {
        setHasMoreShops(false);
      } else {
        setShops((prevShops) => [...prevShops, ...newShops]);
        const newPlaceIds = newShops.map((shop) => shop.place_id);
        offsetRef.current = [...offsetRef.current, ...newPlaceIds];
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error loading more shops:", error);
      setIsLoading(false);
    }
  };

  const selectShop = (shop) => {
    setSelectedShop(shop);
    setMapCenter({ lat: shop.lat, lng: shop.lng });
    mapRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getDirections = () => {
    if (currentLocation && selectedShop) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${selectedShop.lat},${selectedShop.lng}`;
      window.open(url, "_blank");
    }
  };

  const getXaiExplanation = () => {
    if (!selectedShop?.xai_explanations) return;
    setExplanationContent(selectedShop.xai_explanations);
    setOpenExplanationModal(true);
  };

  const handleReviewModalConfirm = async () => {
    if (dontAskAgain && (!token || !isValid)) {
      setLoginRequiredModalOpen(true);
      return;
    }

    const finalReviewCount =
      selectedOption === "custom"
        ? parseInt(customReviewCount)
        : parseInt(selectedOption);
    const finalCoverage =
      coverage === "customcoverage" ? customCoverage : coverage;
    setReviewCount(finalReviewCount);
    setCoverage(finalCoverage);
    setDontAskAgain(tempDontAskAgain);
    setShowReviewModal(false);

    if (token && isValid) {
      try {
        await axios.put(
          "http://127.0.0.1:5000/profile/Update_review_settings",
          {
            id_token: token,
            review_count: finalReviewCount,
            coverage: finalCoverage,
            remember_settings: tempDontAskAgain,
          }
        );
      } catch (error) {
        console.error("Error updating review settings:", error);
      }
    }

    if (modalTriggeredBySearch) {
      performSearch(finalReviewCount);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Animated Title Section */}
      <Box sx={{ textAlign: "center", mb: 8 }}>
        <Slide in direction="down" timeout={800}>
          <Box>
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
                fontWeight: 900,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: "inline-block",
                position: "relative",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  width: "100%",
                  height: 4,
                  background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)`,
                  bottom: -8,
                  left: 0,
                  borderRadius: 2,
                  animation: "shine 3s infinite",
                },
              }}
            >
              Discover Local Shops
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ mt: 3, letterSpacing: 1 }}
            >
              Find the best shops near you with AI-powered insights
            </Typography>
          </Box>
        </Slide>
      </Box>

      {/* Search Section */}
      <Box sx={{ mb: 6 }}>
        <Grid container spacing={3} alignItems="center">
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
                  <SearchIcon
                    sx={{ color: "primary.main", mr: 2, fontSize: 28 }}
                  />
                ),
                endAdornment: (
                  <Tooltip title="Search Tips" arrow>
                    <IconButton
                      sx={{
                        color: "primary.main",
                        "&:hover": { color: "secondary.main" },
                      }}
                    >
                      <InfoIcon fontSize="medium" />
                    </IconButton>
                  </Tooltip>
                ),
                sx: {
                  borderRadius: 50,
                  bgcolor: alpha(theme.palette.background.default, 0.8),
                  backdropFilter: "blur(8px)",
                  "& .MuiOutlinedInput-input": { py: 2 },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: alpha(theme.palette.primary.main, 0.3),
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
              startIcon={
                isLoading ? (
                  <CircularProgress size={24} sx={{ color: "white" }} />
                ) : (
                  <SearchIcon sx={{ fontSize: 28 }} />
                )
              }
              endIcon={
                !isLoading && (
                  <SettingsIcon
                    sx={{
                      ml: 1,
                      cursor: "pointer",
                      transition: "transform 0.3s",
                      "&:hover": { transform: "rotate(30deg)" },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReviewModal(true);
                    }}
                  />
                )
              }
              sx={{ height: 64, borderRadius: 50 }}
            >
              {isLoading ? "Searching..." : "Find Shops"}
            </GradientButton>
          </Grid>
        </Grid>
      </Box>

      {/* Interactive Map */}
      <LoadScript googleMapsApiKey={googleMapsApiKey}>
        <Box
          ref={mapRef}
          sx={{
            borderRadius: 4,
            overflow: "hidden",
            boxShadow: theme.shadows[12],
            mb: 6,
            position: "relative",
            border: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <GoogleMap
            center={mapCenter}
            zoom={selectedShop ? 16 : currentLocation ? 14 : 12}
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
            {currentLocation && (
              <Marker
                position={currentLocation}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: "#2196F3",
                  fillOpacity: 0.9,
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
            {shops.map((shop, index) => (
              <Marker
                key={index}
                position={{ lat: shop.lat, lng: shop.lng }}
                onClick={() => selectShop(shop)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: selectedShop?.lat === shop.lat ? 12 : 8,
                  fillColor:
                    selectedShop?.lat === shop.lat ? "#FF6B6B" : "#4ECDC4",
                  fillOpacity: 0.9,
                  strokeColor: "white",
                  strokeWeight: 2,
                }}
                label={{
                  text: shop.name[0].toUpperCase(),
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              />
            ))}
            {selectedShop && currentLocation && (
              <InfoWindow
                position={{ lat: selectedShop.lat, lng: selectedShop.lng }}
                onCloseClick={() => setSelectedShop(null)}
              >
                <Box sx={{ p: 2, minWidth: 300 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      mb: 2,
                    }}
                  >
                    {selectedShop.name}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Rating
                      value={selectedShop.predicted_rating || 0}
                      readOnly
                      precision={0.5}
                      size="medium"
                      sx={{ color: "#FFD700" }}
                    />
                    <Typography variant="body1" color="text.secondary">
                      {computeDistance(
                        currentLocation.lat,
                        currentLocation.lng,
                        selectedShop.lat,
                        selectedShop.lng
                      ).toFixed(2)}{" "}
                      km away
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ReviewsIcon />}
                      onClick={getXaiExplanation}
                      sx={{
                        borderRadius: 25,
                        textTransform: "none",
                        boxShadow: theme.shadows[2],
                      }}
                    >
                      Explain Rating
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<DirectionsIcon />}
                      onClick={getDirections}
                      sx={{
                        borderRadius: 25,
                        textTransform: "none",
                        boxShadow: theme.shadows[2],
                      }}
                    >
                      Directions
                    </Button>
                  </Box>
                </Box>
              </InfoWindow>
            )}
          </GoogleMap>
        </Box>
      </LoadScript>

      {/* Shop Results Grid */}
      <Grid container spacing={4} sx={{ mt: 4 }}>
        {shops.length === 0 && !isLoading ? (
          <Grid item xs={12}>
            <Box
              sx={{
                textAlign: "center",
                p: 6,
                bgcolor: alpha(theme.palette.primary.main, 0.03),
                borderRadius: 4,
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Storefront
                sx={{
                  fontSize: { xs: "2rem", sm: "3rem", md: "4rem" },
                  mb: 4,
                  opacity: 0.8,
                  color: theme.palette.text.disabled,
                }}
              />
              <Typography variant="h6" color="textSecondary" sx={{ mb: 2 }}>
                No matching shops found
              </Typography>
              <Typography variant="body1" color="textSecondary">
                Try adjusting your search criteria or expanding the search area
              </Typography>
            </Box>
          </Grid>
        ) : isLoading ? (
          // Skeleton Loader
          Array.from(new Array(4)).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Skeleton
                variant="rounded"
                height={300}
                sx={{
                  borderRadius: 4,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }}
              />
            </Grid>
          ))
        ) : (
          // Show Shops
          shops.map((shop, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Zoom in timeout={(index + 1) * 200}>
                <ShopCard
                  selected={selectedShop?.lat === shop.lat}
                  onClick={() => selectShop(shop)}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          width: 64,
                          height: 64,
                          mr: 3,
                        }}
                      >
                        <StoreIcon fontSize="large" />
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{shop.name}</Typography>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mt: 1 }}
                        >
                          <Rating
                            value={shop.predicted_rating || 0}
                            readOnly
                            size="small"
                          />
                          <Typography variant="subtitle1">
                            ({shop.predicted_rating}/5)
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                      <LocationIcon sx={{ color: "action" }} />
                      <Typography variant="body2" color="text.secondary">
                        {shop.address}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {shop.summary || "No summary available"}
                    </Typography>
                  </CardContent>
                </ShopCard>
              </Zoom>
            </Grid>
          ))
        )}
      </Grid>

      {/* Load More Button */}
      {showLoadMoreButton && hasMoreShops && (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Button
            onClick={loadMoreShops}
            variant="outlined"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : "Load More"}
          </Button>
        </Box>
      )}

      {/* Explanation Popup */}
      <ExplanationPopup
        open={openExplanationModal}
        onClose={() => setOpenExplanationModal(false)}
        explanation={explanationContent}
      />

      {/* UPDATED: Review Settings Popup with new opening hours filter */}
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
        coverage={coverage}
        setCoverage={setCoverage}
        customCoverage={customCoverage}
        setCustomCoverage={setCustomCoverage}
        filterType={filterType}
        setFilterType={setFilterType}
        openingDate={openingDate}
        setOpeningDate={setOpeningDate}
        openingTime={openingTime}
        setOpeningTime={setOpeningTime}
      />

      {/* Login Required Modal */}
      <Dialog
        open={loginRequiredModalOpen}
        onClose={() => setLoginRequiredModalOpen(false)}
      >
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <Typography>
            You must be logged in to save review settings.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginRequiredModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setLoginRequiredModalOpen(false);
              navigate("/login");
            }}
          >
            Login
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ShopFinder;
