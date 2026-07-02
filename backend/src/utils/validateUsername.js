export const validateUsername = (username) => {
  if (!username) {
    return {
      valid: false,
      message: "Username is required.",
    };
  }

  if (!username.startsWith("#")) {
    return {
      valid: false,
      message: "Username must start with '#'.",
    };
  }

  if (username.length < 6) {
    return {
      valid: false,
      message: "Username must be at least 6 characters long.",
    };
  }

  if (username.length > 30) {
    return {
      valid: false,
      message: "Username cannot exceed 30 characters.",
    };
  }

  const usernameWithoutHash = username.slice(1);

  if (!/^[a-z0-9_]+$/.test(usernameWithoutHash)) {
    return {
      valid: false,
      message:
        "Username can contain only lowercase letters, numbers, and underscores.",
    };
  }

  if (
    usernameWithoutHash.startsWith("_") ||
    usernameWithoutHash.endsWith("_")
  ) {
    return {
      valid: false,
      message: "Username cannot start or end with an underscore.",
    };
  }

  return {
    valid: true,
  };
};