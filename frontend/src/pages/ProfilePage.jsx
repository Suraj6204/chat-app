import { useEffect, useMemo, useState , useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Loader2,
  Mail,
  User,
  Pencil,
  ArrowLeft
} from "lucide-react";
import toast from "react-hot-toast";

import {
  getUsernameChecks,
  normalizeUsername,
  validateUsername,
} from "../lib/username";

const ProfilePage = () => {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { authUser, isUpdatingProfile, updateProfile, updateUsername } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [usernameSuffix, setUsernameSuffix] = useState(authUser?.username ? authUser.username.slice(1) : "");
  const [savingUsername, setSavingUsername] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  useEffect(() => {
    if (!authUser) {
      navigate("/login");
    }
  }, [authUser, navigate]);

  const username = useMemo(
    () => normalizeUsername(usernameSuffix),
    [usernameSuffix],
  );
  const validation = useMemo(() => validateUsername(username), [username]);
  const checks = useMemo(() => getUsernameChecks(username), [username]);

  const editUsername = () => {
    if(inputRef.current) {
      setIsEditingUsername(true);
      setTimeout(()=> {
        inputRef.current?.focus()
      }, 0); 
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleUsernameSave = async (event) => {
    event.preventDefault();

    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }

    setSavingUsername(true);
    await updateUsername(username);
    setSavingUsername(false);
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
    <div className="min-h-screen pt-20 pb-10">
      <div className="max-w-3xl mx-auto p-4 py-8">
        <button onClick={() => navigate(-1)} className="absolute top-6 w-10 h-10 flex items-center justify-center bg-base-200 border border-base-300 shadow-md rounded-full hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer z-10 ">
          <ArrowLeft size = {24} />
        </button>
        <div className="bg-base-300 rounded-2xl p-6 space-y-8 shadow-xl shadow-base-300/40">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2 text-base-content/70">
              Update your picture and username anytime.
            </p>
          </div>

          {/* avatar upload section */}

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={selectedImg || authUser?.profilePic || "/avatar.png"}
                alt="Profile"
                className="size-32 rounded-full object-cover border-4 border-base-100 shadow-lg"
              />
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 bg-base-content hover:scale-105 p-2 rounded-full cursor-pointer transition-all duration-200 ${isUpdatingProfile ? "animate-pulse pointer-events-none" : ""}`}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>
            <p className="text-sm text-base-content/60">
              {isUpdatingProfile
                ? "Uploading..."
                : "Click the camera icon to update your photo"}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-1.5">
              <div className="text-sm text-base-content/60 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border border-base-300">
                {authUser?.fullName}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-base-content/60 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border border-base-300">
                {authUser?.email}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleUsernameSave}
            className="bg-base-200/60 rounded-2xl p-5 space-y-4 border border-base-300"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium">Username</h2>
                <p className="text-sm text-base-content/60">
                  Use a public handle that starts with #.
                </p>
              </div>
              <span className="badge badge-success badge-outline">
                {authUser?.username || "Not set"}
              </span>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Edit username</span> 
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-base z-10 font-semibold">
                  #
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  readOnly={!isEditingUsername}
                  className={`input input-bordered w-full pl-7 focus:border-transparent focus:outline-none ${isEditingUsername ? "focus:ring-primary focus:ring-1" : "focus:ring-0"} transition-colors duration-300`}
                  placeholder="Enter your username"
                  value={usernameSuffix}
                  onBlur={() => setIsEditingUsername(false)}
                  onChange={(event) =>
                    setUsernameSuffix(event.target.value.replace(/^#/, ""))
                  }
                />
                
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-primary"
                  onClick={editUsername}
                >
                  <Pencil size={18} />
                </button>                
              </div>

              <div className="mt-3 space-y-2 rounded-xl border border-base-300 bg-base-100 p-4">
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
                  {validation.message}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingUsername}
              >
                {savingUsername ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  "Save username"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium  mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{authUser.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
