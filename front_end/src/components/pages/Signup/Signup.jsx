import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  Link,
  CircularProgress,
  InputAdornment,
  IconButton,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  PersonOutline,
  LockOutlined,
  VisibilityOff,
  Visibility,
  EmailOutlined,
  PhoneOutlined,
} from "@mui/icons-material";

function Signup() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    // Validate password match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      // Combine name and surname into username as expected by the backend
      const username = `${name} ${surname}`.trim();

      // Prepare the payload; note phone is sent as "phone"
      const payload = {
        username,
        email,
        phone: phoneNumber,
        password,
      };

      // Real API call to the backend
      await axios.post("http://127.0.0.1:5000/auth/signup", payload);

      // Redirect to login page after successful signup
      navigate("/login");
    } catch (err) {
      // Use the error message from the backend, if available
      setError(err.response?.data?.error || "Signup failed. Please try again.");
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
          onSubmit={handleSignup}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <LockOutlined
            sx={{
              fontSize: 40,
              color: "primary.main",
              bgcolor: "background.paper",
              p: 1.5,
              borderRadius: "50%",
              boxShadow: 3,
            }}
          />
          <Typography variant="h4" sx={{ mb: 2, fontWeight: "bold" }}>
            Create Account
          </Typography>

          {/* Name Field */}
          <TextField
            fullWidth
            label="Name"
            variant="outlined"
            value={name}
            onChange={(e) => setName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutline color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            required
          />

          {/* Surname Field */}
          <TextField
            fullWidth
            label="Surname"
            variant="outlined"
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonOutline color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            required
          />

          {/* Email Field */}
          <TextField
            fullWidth
            label="Email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            required
          />

          {/* Phone Number Field */}
          <TextField
            fullWidth
            label="Phone Number"
            variant="outlined"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneOutlined color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            required
          />

          {/* Password Field */}
          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            required
          />

          {/* Confirm Password Field */}
          <TextField
            fullWidth
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            required
          />

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}

          {/* Submit Button */}
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
              "&:hover": {
                transform: "translateY(-2px)",
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Create Account"
            )}
          </Button>

          {/* Login Link */}
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Already have an account?{" "}
              <Link
                onClick={() => navigate("/login")}
                fontWeight="bold"
                style={{ cursor: "pointer" }}
              >
                Login
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default Signup;
