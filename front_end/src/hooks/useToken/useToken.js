import { useState, useEffect } from "react";
import Cookies from "js-cookie";

const useToken = () => {
  const [token, setToken] = useState(Cookies.get("idToken"));

  useEffect(() => {
    // Polling interval to check for token changes.
    const intervalId = setInterval(() => {
      const currentToken = Cookies.get("idToken");
      setToken(currentToken);
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return token;
};

export default useToken;
