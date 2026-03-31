import rateLimit from "express-rate-limit";
// Signup ke liye: 1 ghante mein sirf 5 attempts (Strict)
export const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 60 * 60 sec(1min) = 60min(1hr)
    max: 5,
    message: {
        success: false,
        message: "Too many accounts created from this IP, please try again after an hour"
    },
    standardHeaders: true, 
    legacyHeaders: false,
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 * 60 sec(1min) = 15min
    max: 10,
    message: {
        success: false,
        message: "Too many attempts, please try again in 15 minutes"
    }
});