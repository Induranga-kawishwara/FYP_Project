import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import axios from "axios"; // Assuming you're using axios for API requests

const useToken = () => {
  const [token, setToken] = useState(Cookies.get("idToken"));
  const [isValid, setIsValid] = useState(true); // New state to track token validity

  useEffect(() => {
    if (!token) {
      setIsValid(false); // If no token, set it as invalid
      return;
    }

    const validateToken = async (currentToken) => {
      try {
        // Call your backend to validate the token
        const response = await axios.post("http://localhost:5000/auth/verify", {
          id_token: currentToken,
        });

        // If backend says the token is invalid, remove it from cookies and set state to false
        if (response.data.valid) {
          console.log("Token is valid");
          setIsValid(true);
        } else {
          console.log("Token is invalid");
          Cookies.remove("idToken");
          setIsValid(false);
        }
      } catch (error) {
        console.error("Error validating token:", error);
        Cookies.remove("idToken");
        setIsValid(false); // Set token as invalid if error occurs during validation
      }
    };

    // Only validate the token if it's present
    validateToken(token);

    // Polling interval to check for token changes
    const intervalId = setInterval(() => {
      const currentToken = Cookies.get("idToken");
      setToken(currentToken); // Update token state on cookie change
    }, 1000);

    return () => clearInterval(intervalId);
  }, [token]); // Effect will run whenever `token` changes

  return { token, isValid }; // Return both token and its validity status
};

export default useToken;
