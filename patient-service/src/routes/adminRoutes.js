const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");
const { getAllUsers, createUser, deleteUser } = require("../controllers/adminController");

router.get(
  "/users",
  authenticate,
  authorize("admin"),
  getAllUsers
);

router.post(
  "/users",
  authenticate,
  authorize("admin"),
  createUser
);

router.delete(
  "/users/:userId",
  authenticate,
  authorize("admin"),
  deleteUser
);

module.exports = router;