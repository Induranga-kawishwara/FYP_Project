import React from "react";
import { Container, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";

function Profile() {
  const navigate = useNavigate();
  const username = "John Doe"; // Replace with actual username from JWT

  return (
    <Container>
      <Typography variant="h4">Profile</Typography>
      <Typography variant="h6">Welcome, {username}!</Typography>
      <Button
        variant="contained"
        color="secondary"
        onClick={() => navigate("/shopfinder")}
      >
        Find Shops
      </Button>
    </Container>
  );
}

export default Profile;
