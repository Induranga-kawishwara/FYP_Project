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
import { useNavigate } from "react-router-dom";
import "./Login.css"; // ✅ Import CSS file

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const response = await axios.post("http://127.0.0.1:5000/login", {
        username,
        password,
      });
      localStorage.setItem("token", response.data.token);
      navigate("/shopfinder");
    } catch (error) {
      alert("Invalid username or password");
    }
  };

  return (
    <Container className="login-container">
      <Paper className="login-box" elevation={3}>
        <Typography className="login-title">Login</Typography>
        <Box>
          <TextField
            className="login-input"
            label="Username"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            className="login-input"
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Box>
        <Button className="login-button" onClick={handleLogin}>
          Login
        </Button>
      </Paper>
    </Container>
  );
}

export default Login;
