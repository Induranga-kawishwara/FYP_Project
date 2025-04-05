import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/auth/forgot_password",
        { email }
      );
      setMessage(response.data.message);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to send reset email. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper
        elevation={6}
        sx={{
          mt: 8,
          p: 4,
          borderRadius: 4,
          background: "linear-gradient(145deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <Box
          component="form"
          onSubmit={handleReset}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
            Reset Password
          </Typography>
          {message && (
            <Alert severity="success" sx={{ width: "100%" }}>
              {message}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Enter your email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={isLoading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontSize: 16,
              fontWeight: "bold",
              textTransform: "none",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-2px)" },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Send Reset Link"
            )}
          </Button>
          <Button
            fullWidth
            variant="text"
            onClick={() => navigate("/login")}
            sx={{
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Back to Login
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default ForgotPassword;
