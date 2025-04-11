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
  const navigate = useNavigate();

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const AlertMessage = ({ severity, message }) => (
    <Fade in={!!message}>
      <Alert
        severity={severity}
        sx={{
          width: "100%",
          border: `1px solid ${
            severity === "error"
              ? theme.palette.error.main
              : theme.palette.success.main
          }`,
          bgcolor:
            severity === "error"
              ? theme.palette.error.light
              : theme.palette.success.light,
        }}
      >
        {message}
      </Alert>
    </Fade>
  );

  const handleSignup = async (e) => {
    e.preventDefault();
    setValidationErrors({});
    setError("");

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

      await axios.post("http://127.0.0.1:5000/auth/signup", payload);
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
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        py: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: "100%",
          my: { xs: 4, md: 8 },
          p: { xs: 2, md: 6 },
          borderRadius: { xs: 2, md: 6 },
          background: theme.palette.background.paper,
          boxShadow: theme.shadows[10],
          overflow: "hidden",
          "&:before": {
            content: '""',
            position: "absolute",
            top: -50,
            left: -50,
            width: { xs: 80, md: 120 },
            height: { xs: 80, md: 120 },
            borderRadius: "50%",
            background: `linear-gradient(45deg, ${theme.palette.primary.light}, transparent)`,
            filter: "blur(40px)",
            zIndex: -1,
          },
          "&:after": {
            content: '""',
            position: "absolute",
            bottom: -50,
            right: -50,
            width: { xs: 80, md: 120 },
            height: { xs: 80, md: 120 },
            borderRadius: "50%",
            background: `linear-gradient(45deg, ${theme.palette.secondary.light}, transparent)`,
            filter: "blur(40px)",
            zIndex: -1,
          },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSignup}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: { xs: 2, md: 3 },
          }}
        >
          <Box
            sx={{
              position: "relative",
              mb: { xs: 2, md: 4 },
              "& svg": {
                fontSize: { xs: 40, md: 60 },
                color: theme.palette.primary.main,
                filter: `drop-shadow(0 4px 8px ${theme.palette.primary.light}40)`,
              },
            }}
          >
            <Fingerprint />
            <LockOutlined
              sx={{
                position: "absolute",
                right: { xs: -12, md: -20 },
                bottom: { xs: -12, md: -10 },
                fontSize: { xs: 20, md: 30 },
                color: theme.palette.secondary.main,
              }}
            />
          </Box>

          <Typography
            variant="h3"
            sx={{
              mb: { xs: 2, md: 3 },
              fontWeight: 800,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textAlign: "center",
              fontSize: { xs: "1.8rem", md: "2.5rem" },
            }}
          >
            Join ShopFinder
          </Typography>

          {/* Display alert messages if errors or success */}
          {error && <AlertMessage severity="error" message={error} />}
          {success && (
            <AlertMessage
              severity="success"
              message="Account created successfully! Redirecting..."
            />
          )}

          <Box
            sx={{
              width: "100%",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
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

          <Button
            fullWidth
            variant="contained"
            type="submit"
            disabled={isLoading}
            sx={{
              py: { xs: 1.5, md: 2 },
              borderRadius: 2,
              fontSize: { xs: 14, md: 16 },
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

          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mt: { xs: 1, md: 2 } }}
          >
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
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              my: { xs: 1, md: 2 },
            }}
          >
            <Divider sx={{ flexGrow: 1 }} />
            <Typography
              variant="body2"
              sx={{ px: { xs: 1, md: 2 }, color: "text.secondary" }}
            >
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
