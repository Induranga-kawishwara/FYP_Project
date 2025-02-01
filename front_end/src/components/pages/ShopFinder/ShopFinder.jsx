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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";
import SearchIcon from "@mui/icons-material/Search";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import StoreIcon from "@mui/icons-material/Store";
import DirectionsIcon from "@mui/icons-material/Directions";

const googleMapsApiKey = "AIzaSyAMTYNccdhFeYEjhT9AQstckZvyD68Zk1w";

function ShopFinder() {
  const [query, setQuery] = useState("");
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Get user’s current location
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

  // Function to get directions
  const getDirections = () => {
    if (currentLocation && selectedShop) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${currentLocation.lat},${currentLocation.lng}&destination=${selectedShop.lat},${selectedShop.lng}&travelmode=driving`;
      window.open(url, "_blank");
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
        Find Local Shops
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
              icon={{
                url:
                  selectedShop === shop
                    ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    : "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              }}
            />
          ))}
        </GoogleMap>
      </LoadScript>

      {selectedShop && currentLocation && (
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={getDirections}
            startIcon={<DirectionsIcon />}
          >
            Get Directions to {selectedShop.shop_name}
          </Button>
        </Box>
      )}

      {shops.length > 0 ? (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
            Found {shops.length} shops:
          </Typography>
          <Grid container spacing={3}>
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
                    <Box
                      sx={{ display: "flex", alignItems: "center", mb: 1.5 }}
                    >
                      <StoreIcon color="primary" sx={{ mr: 1.5 }} />
                      <Typography variant="h6">{shop.shop_name}</Typography>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Rating
                        value={shop.predicted_rating || 0}
                        precision={0.5}
                        readOnly
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        ({shop.reviews?.length || 0} Last 3 Months Reviews)
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <LocationOnIcon
                        color="action"
                        fontSize="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {shop.address}
                      </Typography>
                    </Box>

                    {/* Displaying Summary */}
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        📊 **Summary:**{" "}
                        {shop.summary?.detailed_summary ||
                          "No summary available"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ⭐ **Average Rating:**{" "}
                        {shop.summary?.average_rating || "N/A"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        🔥 **Most Common Rating:**{" "}
                        {shop.summary?.most_common_rating || "N/A"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        📈 **Weighted Average Rating:**{" "}
                        {shop.summary?.weighted_average_rating || "N/A"}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : (
        !isLoading && (
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ textAlign: "center", mt: 4 }}
          >
            Search for products to find nearby shops
          </Typography>
        )
      )}
    </Container>
  );
}

export default ShopFinder;
