import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Snackbar,
  Alert,
  InputAdornment,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  styled,
  Paper,
} from "@mui/material";
import {
  PersonOutline,
  EmailOutlined,
  LockOutlined,
  PhoneOutlined,
  DeleteForever,
  Security,
  Edit,
  CheckCircle,
  Error,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

const GradientPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius * 3,
  background: `linear-gradient(145deg, ${
    theme.palette.background.default
  } 0%, ${alpha(theme.palette.primary.light, 0.1)} 100%)`,
  backdropFilter: "blur(10px)",
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  boxShadow: theme.shadows[10],
  position: "relative",
  overflow: "hidden",
  "&:before": {
    content: '""',
    position: "absolute",
    top: -theme.spacing(6),
    right: -theme.spacing(6),
    width: { xs: 80, md: 100 },
    height: { xs: 80, md: 100 },
    borderRadius: "50%",
    background: `radial-gradient(${alpha(
      theme.palette.primary.main,
      0.2
    )} 0%, transparent 70%)`,
  },
}));

const ProfileTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  "& .MuiOutlinedInput-root": {
    borderRadius: 12,
    transition: "all 0.3s ease",
    "&:hover fieldset": {
      borderColor: theme.palette.primary.light,
    },
    "&.Mui-focused fieldset": {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
    },
  },
}));

function Profile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [userData, setUserData] = useState({
    firstName: "",
    surname: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    isGoogleUser: false,
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = Cookies.get("idToken");
        const res = await axios.post("http://127.0.0.1:5000/profile/data", {
          id_token: token,
        });
        if (res.data && res.data.user) {
          const user = res.data.user;
          setUserData({
            firstName: user.first_name || "",
            surname: user.surname || "",
            email: user.email || "",
            phoneNumber: user.phone || "",
            isSocialUser: user.is_social_user,
            password: "",
            confirmPassword: "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        showSnackbar("Unable to load profile data.", "error");
      }
    }
    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    if (userData.password !== userData.confirmPassword) {
      showSnackbar("Passwords do not match.", "error");
      return;
    }

    try {
      const token = Cookies.get("idToken");
      const payload = {
        id_token: token,
        first_name: userData.firstName,
        surname: userData.surname,
        email: userData.email,
        phone: userData.phoneNumber,
        new_password: userData.password, // Include the new password if provided
      };

      const response = await axios.put(
        "http://127.0.0.1:5000/profile/update",
        payload
      );
      showSnackbar(
        response.data.message || "Profile Updated Successfully!",
        "success"
      );
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
      showSnackbar("Failed to Update Profile.", "error");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = Cookies.get("idToken");
      // Send DELETE request with token in the request body (using "data" key)
      await axios.delete("http://127.0.0.1:5000/profile/delete", {
        data: {
          id_token: token,
        },
      });
      showSnackbar("Account Deleted Successfully!", "success");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("Error deleting account:", error);
      showSnackbar("Failed to Delete Account.", "error");
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  return (
    <Container
      maxWidth="md"
      sx={{
        mt: { xs: 4, md: 8 },
        py: { xs: 2, md: 4 },
      }}
    >
      <GradientPaper elevation={0}>
        <Box sx={{ textAlign: "center", mb: { xs: 4, md: 6 } }}>
          <Security
            sx={{
              fontSize: { xs: 40, md: 60 },
              color: "primary.main",
              bgcolor: alpha(theme.palette.primary.light, 0.1),
              p: { xs: 1, md: 2 },
              borderRadius: "50%",
              mb: { xs: 2, md: 3 },
              boxShadow: 3,
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
              fontSize: { xs: "1.8rem", md: "2.5rem" },
              textAlign: "center",
            }}
          >
            Account Settings
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ProfileTextField
              fullWidth
              label="firstName"
              value={userData.firstName}
              onChange={(e) =>
                setUserData({ ...userData, firstName: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              disabled={userData.isGoogleUser}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ProfileTextField
              fullWidth
              label="Surname"
              value={userData.surname}
              onChange={(e) =>
                setUserData({ ...userData, surname: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutline sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              disabled={userData.isGoogleUser}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ProfileTextField
              fullWidth
              label="Email"
              type="email"
              value={userData.email}
              onChange={(e) =>
                setUserData({ ...userData, email: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              disabled={userData.isGoogleUser} // Disable email change for Google users
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <ProfileTextField
              fullWidth
              label="Phone Number"
              value={userData.phoneNumber}
              onChange={(e) =>
                setUserData({ ...userData, phoneNumber: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneOutlined sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              }}
              disabled={userData.isGoogleUser}
            />
          </Grid>
          {/* For Google users, you might choose not to show password fields */}
          {!userData.isGoogleUser && (
            <>
              <Grid item xs={12} md={6}>
                <ProfileTextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={userData.password}
                  onChange={(e) =>
                    setUserData({ ...userData, password: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <ProfileTextField
                  fullWidth
                  label="Confirm Password"
                  type="password"
                  value={userData.confirmPassword}
                  onChange={(e) =>
                    setUserData({
                      ...userData,
                      confirmPassword: e.target.value,
                    })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </>
          )}
        </Grid>

        <Box
          sx={{
            display: "flex",
            gap: { xs: 2, md: 3 },
            mt: { xs: 3, md: 4 },
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            onClick={handleUpdateProfile}
            startIcon={<Edit />}
            sx={{
              flex: 1,
              px: { xs: 4, md: 6 },
              py: { xs: 1, md: 1.5 },
              borderRadius: 3,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: theme.shadows[6],
              },
              transition: "all 0.3s ease",
            }}
            disabled={userData.isGoogleUser} // Optionally disable update for Google users
          >
            Update Profile
          </Button>
          <Button
            variant="outlined"
            onClick={() => setDeleteDialogOpen(true)}
            startIcon={<DeleteForever />}
            sx={{
              flex: 1,
              px: { xs: 4, md: 6 },
              py: { xs: 1, md: 1.5 },
              borderRadius: 3,
              borderColor: "error.main",
              color: "error.main",
              "&:hover": {
                backgroundColor: "error.lighter",
                borderColor: "error.dark",
                color: "error.dark",
              },
            }}
          >
            Delete Account
          </Button>
        </Box>
      </GradientPaper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: theme.palette.background.paper,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <DeleteForever sx={{ mr: 1, color: "error.main" }} />
          Confirm Account Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to permanently delete your account? This
            action cannot be undone and will remove all your data from our
            servers.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteAccount}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2 }}
          >
            Confirm Deletion
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbarSeverity}
          sx={{
            borderRadius: 3,
            boxShadow: theme.shadows[6],
            alignItems: "center",
            fontSize: { xs: "0.8rem", md: "1rem" },
          }}
          icon={false}
        >
          {snackbarSeverity === "success" ? (
            <CheckCircle sx={{ color: "success.main", mr: 1 }} />
          ) : (
            <Error sx={{ color: "error.main", mr: 1 }} />
          )}
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default Profile;
