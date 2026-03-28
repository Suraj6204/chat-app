import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, MessageSquare } from 'lucide-react';

import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";
import AuthImagePattern from '../components/AuthImagePattern';

const EmailVerify = () => {
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const { authUser, tempEmail, verifyEmail, resendOTP, isVerifyingEmail } = useAuthStore();
    const navigate = useNavigate();
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!tempEmail && !authUser?.email) {
            navigate("/signup");
        }
    }, [tempEmail, authUser, navigate]);

    const handleChange = (element, index) => {
        if (isNaN(element.value)) return false;
        const newOtp = [...otp.map((d, idx) => (idx === index ? element.value : d))];
        setOtp(newOtp);

        // Focus next input
        if (element.nextSibling && element.value) {
            element.nextSibling.focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const verifyHandler = async (e) => {
        e.preventDefault();
        const finalOtp = otp.join("");
        if (finalOtp.length < 6) return toast.error("Please enter full OTP");

        const success = await verifyEmail(finalOtp);
        if (success) {
            navigate("/login");
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            {/* Left Side: Form */}
            <div className="flex flex-col justify-center items-center p-6 sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    
                    {/* LOGO & Header */}
                    <div className="text-center mb-8">
                        <div className="flex flex-col items-center gap-2 group">
                            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center 
                                group-hover:bg-primary/20 transition-colors">
                                <MessageSquare className="size-6 text-primary" />
                            </div>
                            <h1 className="text-2xl font-bold mt-2">Verify Your Email</h1>
                            <p className="text-base-content/60">
                                Enter the 6-digit code sent to <br />
                                <span className="font-medium text-primary">{authUser?.email || tempEmail || "your email"}</span>
                            </p>
                        </div>
                    </div>

                    {/* OTP Inputs Form */}
                    <form onSubmit={verifyHandler} className="space-y-8">
                        <div className="flex justify-between gap-2">
                            {otp.map((data, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    maxLength="1"
                                    ref={(el) => (inputRefs.current[index] = el)}
                                    className="input input-bordered w-12 h-14 text-center text-xl font-bold focus:border-primary focus:outline-none"
                                    value={data}
                                    onChange={(e) => handleChange(e.target, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                />
                            ))}
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary w-full" 
                            disabled={isVerifyingEmail}
                        >
                            {isVerifyingEmail ? (
                                <>
                                    <Loader2 className="size-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                "Verify Email"
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="text-center space-y-2">
                        <p className="text-base-content/60">
                            Didn't receive the code?{" "}
                            <button type="button" onClick={resendOTP} className="link link-primary font-medium">Resend</button>
                        </p>
                        <p className="text-sm">
                            <Link to="/signup" className="link link-secondary opacity-70">
                                Back to Sign Up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Image Pattern */}
            <AuthImagePattern
                title="Secure Your Account"
                subtitle="Verification helps us keep your profile safe and ensures you get all job updates on time."
            />
        </div>
    );
};

export default EmailVerify;