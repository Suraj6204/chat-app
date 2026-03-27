export const isVerified = async (req, res, next) => {
    try {
        // Step 1: req.user already contains the user object from protectRoute
        const user = req.user; 

        // Step 2: Directly check the field (No extra DB call needed)
        if (!user || !user.isVerified) {
            return res.status(403).json({
                message: "Please verify your email to perform this action.",
                success: false
            });
        }
        next(); 
    } catch (error) {
        console.log("Error in isVerified middleware: ", error.message);
        return res.status(500).json({ 
            message: "Internal server error", 
            success: false 
        });
    }
};