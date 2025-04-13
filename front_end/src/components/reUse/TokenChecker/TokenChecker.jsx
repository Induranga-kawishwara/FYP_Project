import React, { useEffect, useState } from "react";
import { CircularProgress, Box } from "@mui/material";
import { Navigate } from "react-router-dom";
import axios from "axios";
import Cookies from "js-cookie";

const TokenChecker = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const token = Cookies.get("idToken");

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setLoading(false);
      return;
    }
    axios
      .post("http://127.0.0.1:5000/auth/verify", { id_token: token })
      .then((res) => {
        console.log(res.data.valid);
        if (res.data.valid) {
          setTokenValid(true);
        } else {
          Cookies.remove("idToken");
          setTokenValid(false);
        }
      })
      .catch(() => {
        // In case of any error, remove the token as well
        Cookies.remove("idToken");
        setTokenValid(false);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tokenValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default TokenChecker;
