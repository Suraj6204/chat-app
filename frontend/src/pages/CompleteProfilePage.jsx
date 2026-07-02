import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Loader2,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";

import AuthImagePattern from "../components/AuthImagePattern";
import { axiosInstance } from "../lib/axios";
import {
  getUsernameChecks,
  normalizeUsername,
  validateUsername,
} from "../lib/username";
import { useAuthStore } from "../store/useAuthStore";

const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useAuthStore();
  const [profilePic, setProfilePic] = useState("");
  const [preview, setPreview] = useState("");
  const [usernameSuffix, setUsernameSuffix] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availability, setAvailability] = useState({
    status: "idle",
    message: "",
  });

  const username = useMemo(
    () => normalizeUsername(usernameSuffix),
    [usernameSuffix],
  );
  const validation = useMemo(() => validateUsername(username), [username]);
  const checks = useMemo(() => getUsernameChecks(username), [username]);

  useEffect(() => {
    if (!authUser) {
      navigate("/login");
    }
  }, [authUser, navigate]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!validation.valid) {
        setAvailability({ status: "idle", message: "" });
        return;
      }

      setAvailability({
        status: "checking",
        message: "Checking availability...",
      });
      try {
        const res = await axiosInstance.get(
          `/auth/check-username/${encodeURIComponent(username)}`,
        );
        setAvailability({
          status: res.data.available ? "available" : "taken",
          message: res.data.message,
        });
      } catch (error) {
        setAvailability({
          status: "error",
          message:
            error.response?.data?.message ||
            "Unable to check username right now.",
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, validation.valid]);

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setProfilePic(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    if (availability.status === "taken") {
      toast.error("That username is already taken.");
      return;
    }

    if (availability.status === "checking") {
      toast.error("Please wait for username verification.");
      return;
    }

    setIsSubmitting(true);

    try {
      let updatedUser = authUser;

      const usernameRes = await axiosInstance.patch("/auth/update-username", {
        username,
      });
      updatedUser = usernameRes.data;

      if (profilePic) {
        try {
          const profileRes = await axiosInstance.put("/auth/update-profile", {
            profilePic,
          });
          updatedUser = profileRes.data;
        } catch (profileError) {
          console.log("Profile picture upload skipped:", profileError);
        }
      }

      setAuthUser(updatedUser);
      toast.success("Account created");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ruleItems = [
    { label: "Starts with #", ok: checks.startsWithHash },
    { label: "4-30 characters after #", ok: checks.lengthValid },
    {
      label: "Lowercase letters, numbers, underscores",
      ok: checks.validCharacters,
    },
    { label: "No leading or trailing underscore", ok: checks.edgeUnderscore },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="size-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mt-2">Finish Your Profile</h1>
              <p className="text-base-content/60">
                Pick a username and optionally add a profile picture before you
                enter the app.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  Profile Picture <span className="opacity-60">(optional)</span>
                </span>
              </label>
              <div className="flex items-center gap-4">
                <div className="avatar">
                  <div className="w-16 rounded-full ring ring-primary/20 ring-offset-base-100 ring-offset-2 overflow-hidden bg-base-200">
                    <img
                      src={preview || authUser?.profilePic || "/avatar.png"}
                      alt="Profile preview"
                    />
                  </div>
                </div>
                <label className="btn btn-outline btn-sm gap-2">
                  <Camera className="size-4" />
                  Choose image
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Username</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-success font-semibold">
                  #
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-8 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors duration-300"
                  placeholder="yourname"
                  value={usernameSuffix}
                  onChange={(event) =>
                    setUsernameSuffix(event.target.value.replace(/^#/, ""))
                  }
                />
              </div>

              <div className="mt-3 space-y-2 rounded-xl border border-base-300 bg-base-200/60 p-4">
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  Your username starts with #
                </div>

                {ruleItems.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-2 text-sm transition-colors ${item.ok ? "text-success" : "text-base-content/60"}`}
                  >
                    {item.ok ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <CircleAlert className="size-4" />
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}

                <div
                  className={`text-sm transition-colors ${validation.valid ? "text-success" : "text-warning"}`}
                >
                  {availability.status === "checking"
                    ? availability.message
                    : validation.message}
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>
      </div>

      <AuthImagePattern
        title="Almost there"
        subtitle="This final step gives your account a public username and a polished profile before you land in chat."
      />
    </div>
  );
};

export default CompleteProfilePage;
