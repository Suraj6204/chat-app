import User from "../models/user.model.js";

export const isUsernameAvailable = async (username) => {
  const existingUser = await User.exists({
    username: username.toLowerCase(),
  });

  return !existingUser;
};