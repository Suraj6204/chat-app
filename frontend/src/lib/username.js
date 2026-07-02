export const usernamePattern = /^#[a-z0-9_]{4,30}$/;

export const normalizeUsername = (value = "") => {
  const withoutHash = value.replace(/^#/, "").toLowerCase().replace(/\s+/g, "");
  return `#${withoutHash}`;
};

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

  if (username.length > 31) {
    return {
      valid: false,
      message: "Username cannot exceed 30 characters after #.",
    };
  }

  const usernameWithoutHash = username.slice(1);

  if (!/^[a-z0-9_]+$/.test(usernameWithoutHash)) {
    return {
      valid: false,
      message: "Use only lowercase letters, numbers, and underscores.",
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
    message: "Username looks good.",
  };
};

export const getUsernameChecks = (username) => {
  const normalized = normalizeUsername(username.replace(/^#/, ""));
  const usernameWithoutHash = normalized.slice(1);

  return {
    normalized,
    startsWithHash: normalized.startsWith("#"),
    lengthValid: normalized.length >= 6 && normalized.length <= 31,
    validCharacters: /^[a-z0-9_]+$/.test(usernameWithoutHash),
    edgeUnderscore:
      !usernameWithoutHash.startsWith("_") &&
      !usernameWithoutHash.endsWith("_"),
  };
};
