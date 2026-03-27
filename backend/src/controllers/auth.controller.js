import { generateOTP } from "../lib/generateOtp.js";
import redis from "../lib/redis.js";
import { sendEmail } from "../lib/sendEmail.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
// import cloudinary from "../lib/cloudinary.js";

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
    });

    if (newUser) {
      // generate jwt token here
      generateToken(newUser._id, res);
      await newUser.save();

      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const otp = generateOTP();
        
        // OTP ko Redis mein 5 mins ke liye save karein
        await redis.set(email, otp, 'EX', 300); 

        await sendEmail(email, otp);

        return res.status(200).json({
            message: "OTP sent to your email",
            success: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error sending OTP", success: false });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // 1. Redis se OTP uthao
        const storedOtp = await redis.get(email); 

        // 2. Check agar OTP expire ho gaya ya nahi mila
        if (!storedOtp) {
            return res.status(400).json({ 
              message: "OTP expired. Please resend.", 
              success: false 
            });
        }

        // 3. Match logic
        if (storedOtp === otp) {
            // MongoDB update karein
            const user = await User.findOneAndUpdate({ email }, { isVerified: true }); 

            if (!user) {
                return res.status(404).json({ message: "User not found", success: false });
            }
            
            // Verification ke baad cleanup
            await redis.del(email); 
            
            return res.status(200).json({ 
                message: "Email verified successfully!", 
                success: true 
            });
        } else {
            return res.status(400).json({ 
                message: "Invalid OTP. Try again.", 
                success: false 
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ 
            message: "Internal server error", 
            success: false 
        });
    }
};