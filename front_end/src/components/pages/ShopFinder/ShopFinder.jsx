import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import { LoadScript, GoogleMap, Marker } from "@react-google-maps/api";

const googleMapsApiKey = "YOUR_GOOGLE_MAPS_API_KEY";

function ShopFinder() {
  const [query, setQuery] = useState("");
  const [shops, setShops] = useState([]);

  const searchShops = async () => {
    const response = await axios.get(
      `http://127.0.0.1:5000/search_product?product=${query}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );
    setShops(response.data.shops);
  };

  return (
    <Container>
      <Typography variant="h4">Find Shops & Reviews</Typography>
      <TextField
        label="Enter Product Name"
        fullWidth
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button variant="contained" color="primary" onClick={searchShops}>
        Search
      </Button>

      <LoadScript googleMapsApiKey={googleMapsApiKey}>
        <GoogleMap
          center={{ lat: 40.7128, lng: -74.006 }}
          zoom={12}
          mapContainerStyle={{ height: "400px", width: "100%" }}
        >
          {shops.map((shop, index) => (
            <Marker key={index} position={{ lat: shop.lat, lng: shop.lng }} />
          ))}
        </GoogleMap>
      </LoadScript>

      {shops.map((shop, index) => (
        <Card key={index} sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6">{shop.shop_name}</Typography>
            <Typography>{shop.address}</Typography>
          </CardContent>
        </Card>
      ))}
    </Container>
  );
}

export default ShopFinder;
