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
  Alert,
  Fade,
  Divider,
  useTheme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  LockOutlined,
  VisibilityOff,
  Visibility,
  EmailOutlined,
  GitHub,
  Google,
  Fingerprint,
} from "@mui/icons-material";
import {
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import Cookies from "js-cookie";
import { auth } from "../../../Config.js";

function Login() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const responds = await axios.post("http://127.0.0.1:5000/auth/login", {
        email,
        password,
      });
      Cookies.set("idToken", responds.data.idToken, { expires: 7 });
      navigate("/shopfinder");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await axios.post("http://127.0.0.1:5000/auth/login", {
        id_token: idToken,
      });
      navigate("/shopfinder");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          `${provider.providerId} login failed. Please try again.`
      );
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
          "&:before": {
            content: '""',
            position: "absolute",
            top: -50,
            left: -50,
            width: 120,
            height: 120,
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
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: `linear-gradient(45deg, ${theme.palette.secondary.light}, transparent)`,
            filter: "blur(40px)",
            zIndex: -1,
          },
        }}
      >
        <Box
          component="form"
          onSubmit={handleLogin}
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
            Welcome Back
          </Typography>

          <Fade in={!!error}>
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

          <TextField
            fullWidth
            label="Email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                transition: "all 0.3s",
                "&:hover": {
                  boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
                },
              },
            }}
            required
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                transition: "all 0.3s",
                "&:hover": {
                  boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
                },
              },
            }}
            required
          />

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
              "Sign In"
            )}
          </Button>

          <Box
            sx={{ display: "flex", alignItems: "center", width: "100%", my: 2 }}
          >
            <Divider sx={{ flexGrow: 1 }} />
            <Typography variant="body2" sx={{ px: 2, color: "text.secondary" }}>
              Or continue with
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Box>

          <Box sx={{ display: "flex", gap: 2, width: "100%" }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleSocialLogin(new GoogleAuthProvider())}
              disabled={isLoading}
              startIcon={<Google />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                borderColor: "text.secondary",
                "&:hover": {
                  borderColor: "#db4437",
                  backgroundColor: "#db443710",
                },
              }}
            >
              Google
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleSocialLogin(new GithubAuthProvider())}
              disabled={isLoading}
              startIcon={<GitHub />}
              sx={{
                py: 1.5,
                borderRadius: 2,
                borderColor: "text.secondary",
                "&:hover": {
                  borderColor: "#333",
                  backgroundColor: "#33310",
                },
              }}
            >
              GitHub
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              mt: 2,
            }}
          >
            <Link
              onClick={() => navigate("/forgot-password")}
              variant="body2"
              sx={{
                color: "text.secondary",
                cursor: "pointer",
                "&:hover": { color: "primary.main" },
              }}
            >
              Forgot Password?
            </Link>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              New user?{" "}
              <Link
                onClick={() => navigate("/signup")}
                sx={{
                  color: "primary.main",
                  cursor: "pointer",
                  fontWeight: "bold",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Create Account
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;
