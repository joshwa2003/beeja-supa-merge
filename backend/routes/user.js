const express = require('express');
const router = express.Router();

// Controllers
const {
    signup,
    login,
    sendOTP,
    changePassword
} = require('../controllers/auth');

// Resetpassword controllers
const {
    resetPasswordToken,
    resetPassword,
    verifyResetToken,
} = require('../controllers/resetPassword');


// Middleware
const { auth } = require('../middleware/auth');


// Routes for Login, Signup, and Authentication

// ********************************************************************************************************
//                                      Authentication routes
// ********************************************************************************************************

// Route for user signup
router.post('/signup', signup);

// Route for user login
router.post('/login', login);

// Route for sending OTP to the user's email
router.post('/sendotp', sendOTP);

// Route for Changing the password
router.post('/changepassword', auth, changePassword);

// Route for verifying token (used by auth checker)
router.get('/verify-token', auth, (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Token is valid',
    user: req.user
  });
});



// ********************************************************************************************************
//                                      Reset Password
// ********************************************************************************************************

// Route for generating a reset password token
router.post('/reset-password-token', resetPasswordToken);

// Route for resetting user's password after verification
router.post("/reset-password", resetPassword)

// Route for verifying reset token
router.get("/verify-reset-token/:token", verifyResetToken)


module.exports = router
