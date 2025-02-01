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
  const [limeExplanation, setLimeExplanation] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const searchShops = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `http://192.168.1.136:5000/search_product?product=${query}`
      );
      setShops(response.data.shops);
    } catch (error) {
      console.error("Error searching shops:", error);
    } finally {
      setIsLoading(false);
    }
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
        "http://192.168.1.136:5000/explain_review",
        { review: reviewText }
      );

      setLimeExplanation(response.data.explanation);
      setOpenModal(true);
    } catch (error) {
      console.error("Error fetching explanation:", error);
    }
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

      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={9}>
            <TextField
              fullWidth
              variant="outlined"
              label="What product are you looking for?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && searchShops()}
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
              onClick={searchShops}
              disabled={isLoading}
              size="large"
              startIcon={<SearchIcon />}
            >
              {isLoading ? <CircularProgress size={24} /> : "Search"}
            </Button>
          </Grid>
        </Grid>
      </Box>

      <LoadScript googleMapsApiKey={googleMapsApiKey}>
        <GoogleMap
          center={
            selectedShop || currentLocation || { lat: 40.7128, lng: -74.006 }
          }
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
              onClick={() => setSelectedShop(shop)}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {/* Show Buttons Only When a Shop is Selected */}
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

      {/* LIME Explanation Popup Modal */}
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
            LIME Explanation
          </Typography>
          <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
            {limeExplanation.length > 0 ? (
              limeExplanation.map((exp, index) => (
                <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                  <strong>{exp.word}:</strong> {exp.weight.toFixed(3)}
                </Typography>
              ))
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

      {/* Show Shop Cards */}
      <Grid container spacing={3} sx={{ mt: 4 }}>
        {shops.map((shop, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Card
              sx={{
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-4px)" },
                border: selectedShop === shop ? "2px solid green" : "none",
              }}
              onClick={() => setSelectedShop(shop)}
            >
              <CardContent>
                <Typography variant="h6">{shop.shop_name}</Typography>
                <Rating
                  value={shop.predicted_rating || 0}
                  precision={0.5}
                  readOnly
                  size="small"
                />
                <Typography variant="body2">{shop.address}</Typography>
                <Typography variant="body2">
                  ⭐ Average Rating: {shop.summary?.average_rating || "N/A"}
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
