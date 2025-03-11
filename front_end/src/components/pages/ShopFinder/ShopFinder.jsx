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
  useTheme,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
  Checkbox,
} from "@mui/material";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import SearchIcon from "@mui/icons-material/Search";
import DirectionsIcon from "@mui/icons-material/Directions";
import InsightsIcon from "@mui/icons-material/Insights";

const googleMapsApiKey = "AIzaSyAMTYNccdhFeYEjhT9AQstckZvyD68Zk1w";

function ShopFinder() {
  const [query, setQuery] = useState("");
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 }); // Default: NYC
  const [limeExplanation, setLimeExplanation] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // States for review count modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewCount, setReviewCount] = useState(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [modalTriggeredBySearch, setModalTriggeredBySearch] = useState(false);
  const [selectedOption, setSelectedOption] = useState("10");
  const [customReviewCount, setCustomReviewCount] = useState("");
  const [tempDontAskAgain, setTempDontAskAgain] = useState(false);

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

  // Function to perform search with reviewCount as a query parameter
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

  // Handler for the search button click
  const handleSearch = () => {
    if (dontAskAgain && reviewCount) {
      // If user already chose and saved the review count, use it
      performSearch(reviewCount);
    } else {
      // Otherwise, ask how many reviews to analyze
      setModalTriggeredBySearch(true);
      setShowReviewModal(true);
    }
  };

  const selectShop = (shop) => {
    setSelectedShop(shop);
    setMapCenter({ lat: shop.lat, lng: shop.lng }); // Update map center
  };

  const getDirections = () => {
    if (currentLocation && selectedShop) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${selectedShop.lat},${selectedShop.lng}&travelmode=driving`;
      window.open(url, "_blank");
    } else {
      alert("Please allow location access to get directions.");
    }
  };

  const getLimeExplanation = async () => {
    if (!selectedShop || !selectedShop.reviews.length) {
      alert("No reviews available for explanation.");
      return;
    }

    const reviewText = selectedShop.reviews[0].text;

    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/explain_review",
        { review: reviewText }
      );

      console.log("LIME Response:", response.data); // Debugging log

      // Check if response is an array
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

  // Confirm handler for the review count modal
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
    // If the modal was triggered by a search action, perform the search now
    if (modalTriggeredBySearch) {
      performSearch(finalReviewCount);
      setModalTriggeredBySearch(false);
    }
  };

  // Open modal to change review count manually (not triggered by search)
  const handleChangeReviewCount = () => {
    // Pre-populate the modal with current value
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
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          fontWeight: "bold",
          color: "primary.main",
          textAlign: "center",
          mb: 4,
        }}
      >
        Shops Finder
      </Typography>

      <Box sx={{ mb: 2 }}>
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
                  <SearchIcon sx={{ color: "action.active", mr: 1 }} />
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={handleSearch}
              disabled={isLoading}
              size="large"
              startIcon={<SearchIcon />}
            >
              {isLoading ? <CircularProgress size={24} /> : "Search"}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Display current review count and option to change it */}
      {reviewCount && (
        <Box sx={{ textAlign: "right", mb: 2 }}>
          <Typography variant="caption" sx={{ mr: 1 }}>
            Current review count: {reviewCount}
          </Typography>
          <Button variant="text" onClick={handleChangeReviewCount}>
            Change Review Count
          </Button>
        </Box>
      )}

      {/* Review Count Modal */}
      <Modal open={showReviewModal} onClose={() => setShowReviewModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "white",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
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

      <LoadScript googleMapsApiKey={googleMapsApiKey}>
        <GoogleMap
          center={mapCenter}
          zoom={selectedShop ? 16 : currentLocation ? 14 : 12}
          mapContainerStyle={{
            height: isMobile ? "300px" : "500px",
            width: "100%",
            borderRadius: 8,
            margin: "20px 0",
            boxShadow: theme.shadows[3],
          }}
        >
          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
              }}
            />
          )}
          {shops.map((shop, index) => (
            <Marker
              key={index}
              position={{ lat: shop.lat, lng: shop.lng }}
              onClick={() => selectShop(shop)}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {selectedShop && (
        <Box sx={{ textAlign: "center", mt: 3 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={getDirections}
            startIcon={<DirectionsIcon />}
          >
            Get Directions to {selectedShop.shop_name}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={getLimeExplanation}
            startIcon={<InsightsIcon />}
            sx={{ ml: 2 }}
          >
            Explain with LIME
          </Button>
        </Box>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "white",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
            Why This Rating?
          </Typography>
          <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
            {limeExplanation ? (
              <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                {limeExplanation}
              </Typography>
            ) : (
              <Typography variant="body2">No explanation available.</Typography>
            )}
          </Box>
          <Button
            fullWidth
            variant="contained"
            color="error"
            sx={{ mt: 2 }}
            onClick={() => setOpenModal(false)}
          >
            Close
          </Button>
        </Box>
      </Modal>

      <Grid container spacing={3} sx={{ mt: 4 }}>
        {shops.map((shop, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card
              sx={{
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
                border: selectedShop === shop ? "2px solid green" : "none",
              }}
              onClick={() => selectShop(shop)}
            >
              <CardContent>
                <Typography variant="h6">{shop.shop_name}</Typography>
                <Rating
                  value={shop.predicted_rating || 0}
                  precision={0.5}
                  readOnly
                />
                <Typography variant="body2">{shop.address}</Typography>
                <Typography variant="body2">
                  📖 {shop.summary?.detailed_summary}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default ShopFinder;
