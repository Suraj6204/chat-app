import { generateOTP } from "../lib/generateOtp.js";
import { sendToQueue } from "../lib/rabbitmq.js";
import redis from "../lib/redis.js";
import { sendEmail } from "../lib/sendEmail.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

const toAuthPayload = (user) => ({
  _id: user._id,
  fullName: user.fullName,
  email: user.email,
  profilePic: user.profilePic,
  isVerified: user.isVerified,
  unreadCounts: user.unreadCounts,
});

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
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

      res.status(201).json(toAuthPayload(newUser));
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

    res.status(200).json(toAuthPayload(user));
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
      { new: true },
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
    await redis.set(email, otp, "EX", 300);

    const otpHtml = `
            <div style="font-family: sans-serif; text-align: center; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #6366f1;">Chatty Verification</h2>
                <p>Your OTP is given below . It will expire in 5 minutes:</p>
                <h1 style="background: #f3f4f6; display: inline-block; padding: 10px 20px; border-radius: 5px; letter-spacing: 5px;">
                    ${otp}
                </h1>
                <p style="font-size: 12px; color: #888; margin-top: 20px;">If you didn't request this OTP, please ignore this email.</p>
            </div>
        `;

    await sendEmail(email, "Chatty - OTP Verification Code", otpHtml);

    return res.status(200).json({
      message: "OTP sent to your email",
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error sending OTP", success: false });
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
        success: false,
      });
    }

    // 3. Match logic
    if (storedOtp === otp) {
      // MongoDB update karein
      const user = await User.findOneAndUpdate({ email }, { isVerified: true });

      if (!user) {
        return res
          .status(404)
          .json({ message: "User not found", success: false });
      }

      //RabbitMQ Producer
      const welcomeData = {
        email: user.email,
        name: user.fullName, // Adjust as per your model
        subject: "Welcome to Chat-App! 🚀",
      };

      sendToQueue("welcome_emails", welcomeData);

      // Verification ke baad cleanup
      await redis.del(email);

      return res.status(200).json({
        message: "Email verified successfully!",
        success: true,
      });
    } else {
      return res.status(400).json({
        message: "Invalid OTP. Try again.",
        success: false,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { id: userToBlockId } = req.params;
    const myId = req.user._id;

    if (myId.toString() === userToBlockId)
      return res.status(400).json({ message: "You cannot block yourself" });

    // Current user ke blockedUsers array mein ID add karo
    const updatedUser = await User.findByIdAndUpdate(
      myId,
      { $addToSet: { blockedUsers: userToBlockId } },
      { new: true },
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { id: userToUnblockId } = req.params;
    const myId = req.user._id;

    // $pull array se specific ID ko remove kar deta hai
    const updatedUser = await User.findByIdAndUpdate(
      myId,
      { $pull: { blockedUsers: userToUnblockId } },
      { new: true },
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
