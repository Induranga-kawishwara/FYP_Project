import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
} from "@mui/material";
import "./Profile.css";

function Profile() {
  const [username, setUsername] = useState("John Doe");
  const [email, setEmail] = useState("johndoe@example.com");
  const [password, setPassword] = useState("");

  const handleUpdateProfile = async () => {
    alert("Profile Updated!");
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account?")) {
      alert("Account Deleted!");
    }
  };

  return (
    <Container className="profile-container">
      <Paper className="profile-box" elevation={3}>
        <Typography className="profile-title">User Profile</Typography>
        <Box>
          <TextField
            className="profile-input"
            label="Username"
            variant="filled"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            InputProps={{ style: { color: "white" } }}
          />
          <TextField
            className="profile-input"
            label="Email"
            variant="filled"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{ style: { color: "white" } }}
          />
          <TextField
            className="profile-input"
            label="New Password"
            variant="filled"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{ style: { color: "white" } }}
          />
        </Box>
        <Button
          className="profile-button update-button"
          variant="contained"
          onClick={handleUpdateProfile}
        >
          Update Profile
        </Button>
        <Button
          className="profile-button delete-button"
          variant="contained"
          onClick={handleDeleteAccount}
        >
          Delete Account
        </Button>
      </Paper>
    </Container>
  );
}

export default Profile;
