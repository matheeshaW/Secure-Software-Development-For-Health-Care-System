import API from "./axios";

export const getMyAccount = () => API.get("/user/me");

export const updateMyAccount = (data) => API.put("/user/me", data);

export const changeMyPassword = (data) => API.put("/user/password", data);

export const deleteMyAccount = (data) =>
  API.delete("/user/me", {
    data,
  });

export const loginWithGoogle = (payload) => API.post("/auth/google", payload);

export const getGoogleAuthUrl = () => API.get("/auth/google/url");

