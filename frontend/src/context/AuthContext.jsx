import { createContext, useState, useEffect } from "react";
import API from "../api/axios";

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      console.log("[AuthContext] Loaded user from localStorage:", parsed);
      setUser(parsed);
    } else {
      console.log("[AuthContext] No user in localStorage");
    }
  }, []);

  const login = async ({ email, password }) => {
    const res = await API.post("/auth/login", { email, password });

    // Check if user is a doctor and verify their profile is approved
    if (res.data.user.role === "doctor") {
      try {
        // Fetch doctor profile to check verification status using a per-request header
        const doctorRes = await API.get("/doctors/me", {
          headers: {
            Authorization: `Bearer ${res.data.token}`,
          },
        });

        // If doctor profile is not verified, reject login
        if (!doctorRes.data.data.verified) {
          const error = new Error(
            "Your doctor profile is pending admin verification. Please wait until an admin verifies your credentials.",
          );
          error.response = {
            data: {
              message:
                "Login failed: Your doctor profile is pending admin verification. Please wait for approval.",
            },
          };
          throw error;
        }
      } catch (err) {
        // Clear any stored data
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        throw err;
      }
    }

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));

    setUser(res.data.user);

    return res.data;
  };

  const register = async (data) => {
    const res = await API.post("/auth/register", data);
    return res.data;
  };

  const googleLogin = async (payload) => {
    const res = await API.post("/auth/google", payload);
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    delete API.defaults.headers.common["Authorization"];
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const updateUser = (nextUser) => {
    if (!nextUser) return;
    localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
