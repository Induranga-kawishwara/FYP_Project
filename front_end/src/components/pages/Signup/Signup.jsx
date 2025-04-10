import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Alert,
  Fade,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  PersonOutline,
  LockOutlined,
  VisibilityOff,
  Visibility,
  EmailOutlined,
  PhoneOutlined,
  Fingerprint,
} from "@mui/icons-material";

function Signup() {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    name: "",
    surname: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setValidationErrors({}); // Clear previous validation errors

    if (formData.password !== formData.confirmPassword) {
      setValidationErrors({ confirmPassword: "Passwords do not match." });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        username: `${formData.name} ${formData.surname}`.trim(),
        email: formData.email,
        phone: formData.phoneNumber,
        password: formData.password,
      };

      const response = await axios.post(
        "http://127.0.0.1:5000/auth/signup",
        payload
      );

      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      if (err.response?.status === 422) {
        const errors = err.response.data.validationErrors.reduce((acc, err) => {
          const [field, message] = err.split(":");
          acc[field] = message;
          return acc;
        }, {});
        setValidationErrors(errors);
      } else {
        setError(
          err.response?.data?.error || "Signup failed. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{ minHeight: "100vh", display: "flex", alignItems: "center" }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          my: 8,
          p: 6,
          borderRadius: 6,
          background: theme.palette.background.paper,
          boxShadow: theme.shadows[10],
        }}
      >
        <Box
          component="form"
          onSubmit={handleSignup}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Box
            sx={{
              position: "relative",
              mb: 4,
              "& svg": {
                fontSize: 60,
                color: theme.palette.primary.main,
                filter: `drop-shadow(0 4px 8px ${theme.palette.primary.light}40)`,
              },
            }}
          >
            <Fingerprint />
            <LockOutlined
              sx={{
                position: "absolute",
                right: -20,
                bottom: -10,
                fontSize: 30,
                color: theme.palette.secondary.main,
              }}
            />
          </Box>

          <Typography
            variant="h3"
            sx={{
              mb: 3,
              fontWeight: 800,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Join ShopFinder
          </Typography>

          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 3,
            }}
          >
            <TextField
              name="name"
              label="First Name"
              value={formData.name}
              onChange={handleChange}
              error={!!validationErrors.name}
              helperText={validationErrors.name}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              required
            />
            <TextField
              name="surname"
              label="Last Name"
              value={formData.surname}
              onChange={handleChange}
              error={!!validationErrors.surname}
              helperText={validationErrors.surname}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              required
            />
          </Box>

          <TextField
            fullWidth
            name="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!validationErrors.email}
            helperText={validationErrors.email}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            required
          />

          <TextField
            fullWidth
            name="phoneNumber"
            label="Phone Number"
            value={formData.phoneNumber}
            onChange={handleChange}
            error={!!validationErrors.phoneNumber}
            helperText={validationErrors.phoneNumber}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneOutlined sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            required
          />

          <TextField
            fullWidth
            name="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            error={!!validationErrors.password}
            helperText={validationErrors.password}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ color: "text.secondary" }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            required
          />

          <TextField
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type={showPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            error={
              !!validationErrors.confirmPassword || !!validationErrors.password
            }
            helperText={
              validationErrors.confirmPassword || validationErrors.password
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            required
          />

          {error && (
            <Fade>
              <Alert
                severity="error"
                sx={{
                  width: "100%",
                  border: `1px solid ${theme.palette.error.main}`,
                  bgcolor: theme.palette.error.light,
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {success && (
            <Fade>
              <Alert
                severity="success"
                sx={{
                  width: "100%",
                  border: `1px solid ${theme.palette.success.main}`,
                  bgcolor: theme.palette.success.light,
                }}
              >
                Account created successfully! Redirecting...
              </Alert>
            </Fade>
          )}

          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={isLoading}
            sx={{
              py: 2,
              borderRadius: 2,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 1,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              transition: "all 0.3s",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: `0 8px 24px ${theme.palette.primary.light}40`,
              },
            }}
          >
            {isLoading ? (
              <CircularProgress
                size={24}
                sx={{
                  color: "white",
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
                }}
              />
            ) : (
              "Create Free Account"
            )}
          </Button>

          <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
            By signing up, you agree to our{" "}
            <Link href="/terms" fontWeight="bold" color="text.primary">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" fontWeight="bold" color="text.primary">
              Privacy Policy
            </Link>
          </Typography>

          <Box
            sx={{ display: "flex", alignItems: "center", width: "100%", my: 2 }}
          >
            <Divider sx={{ flexGrow: 1 }} />
            <Typography variant="body2" sx={{ px: 2, color: "text.secondary" }}>
              OR
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Box>

          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Already have an account?{" "}
            <Link
              onClick={() => navigate("/login")}
              fontWeight="bold"
              color="primary"
              sx={{ cursor: "pointer" }}
            >
              Login here
            </Link>
          </Typography>
        </Box>
      </Box>
    </Container>
  );
}

export default Signup;
