const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  role: {
    type: String,
    enum: ["patient", "doctor", "admin"],
    default: "patient"
  },
  googleId: {
    type: String,
    default: null
  },
  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local"
  },
  avatar: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);