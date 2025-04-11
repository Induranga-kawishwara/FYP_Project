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
  useTheme,
  styled,
  InputAdornment,
  Fade,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Email, ArrowBack, LockReset } from "@mui/icons-material";

const GradientPaper = styled(Paper)(({ theme }) => ({
  marginTop: theme.spacing(8),
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 3,
  background: `linear-gradient(145deg, ${theme.palette.background.default} 0%, ${theme.palette.primary.light}20 100%)`,
  backdropFilter: "blur(10px)",
  border: `1px solid ${theme.palette.primary.light}30`,
  boxShadow: theme.shadows[10],
  position: "relative",
  overflow: "hidden",
  "&:before": {
    content: '""',
    position: "absolute",
    top: -50,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: "50%",
    background: `radial-gradient(${theme.palette.primary.light}20 0%, transparent 70%)`,
  },
}));

const AnimatedButton = styled(Button)(({ theme }) => ({
  transition: "all 0.3s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
  },
}));

function ForgotPassword() {
  const theme = useTheme();
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
    <Container maxWidth="sm">
      <GradientPaper elevation={0}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <LockReset
            sx={{
              fontSize: 60,
              color: "primary.main",
              bgcolor: "primary.lighter",
              p: 2,
              borderRadius: "50%",
              boxShadow: 3,
              mb: 3,
            }}
          />
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.5px",
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Password Recovery
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, color: "text.secondary" }}>
            Enter your email to receive a reset link
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleReset}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: 2, md: 3 },
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            label="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                "&:hover fieldset": {
                  borderColor: theme.palette.primary.light,
                },
                "&.Mui-focused fieldset": {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
            required
          />

          <AnimatedButton
            fullWidth
            variant="contained"
            type="submit"
            disabled={isLoading}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontSize: 16,
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} sx={{ color: "white" }} />
            ) : (
              "Send Reset Instructions"
            )}
          </AnimatedButton>

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate("/login")}
            startIcon={<ArrowBack />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
              "&:hover": {
                color: "primary.main",
                backgroundColor: "primary.lighter",
              },
            }}
          >
            Return to Login
          </Button>
        </Box>

        {/* Notifications */}
        <Box sx={{ mt: 3 }}>
          <Fade in={!!message || !!error}>
            <div>
              {message && (
                <Alert
                  severity="success"
                  sx={{
                    borderRadius: 2,
                    alignItems: "center",
                    boxShadow: theme.shadows[2],
                  }}
                >
                  {message}
                </Alert>
              )}
              {error && (
                <Alert
                  severity="error"
                  sx={{
                    borderRadius: 2,
                    alignItems: "center",
                    boxShadow: theme.shadows[2],
                  }}
                >
                  {error}
                </Alert>
              )}
            </div>
          </Fade>
        </Box>
      </GradientPaper>
    </Container>
  );
}

export default ForgotPassword;
