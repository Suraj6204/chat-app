import { useEffect, useState } from "react";
import { MessageSquare, Search, User, Users } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const NoChatSelected = () => {
  const { searchAll, isUsernameLoading } = useAuthStore();
  const { setSelectedUser } = useChatStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const runSearch = async () => {
      const isUserMode = trimmed.startsWith("#");
      // const apiQuery = isUserMode ? trimmed.slice(1).trim() : trimmed;
      const apiQuery = trimmed;

      if (!apiQuery && !isUserMode) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      const data = await searchAll(apiQuery);
      const users = Array.isArray(data?.users) ? data.users : [];
      const groups = Array.isArray(data?.groups) ? data.groups : [];

      const mappedUsers = users.map((user) => ({
        id: user._id,
        type: "user",
        name: user.username || "user",
        displayName: user.fullName || "Unknown",
        avatar: user.profilePic || "",
        data: user,
      }));

      const mappedGroups = groups.map((group) => ({
        id: group._id,
        type: "group",
        name: group.name || "Unnamed Group",
        description: group.description || "",
        avatar: group.groupPic || "",
        data: group,
      }));

      // Combine both arrays
      const allResults = [...mappedUsers, ...mappedGroups];

      // Logic: Agar # lagaya hai toh sirf users, nahi toh sab kuch dikhao
      const finalResults = isUserMode
        ? allResults.filter((item) => item.type === "user")
        : allResults;

      setResults(finalResults);
      setHasSearched(true);
    };

    const timer = setTimeout(runSearch, 300);
    return () => clearTimeout(timer);
  }, [searchAll, searchQuery]);

  const handleStartChat = (item) => {
    setSelectedUser(
      item.type === "group" ? { ...item.data, isGroup: true } : item.data,
    );
    setSearchQuery("");
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div className="w-full flex flex-1 flex-col items-center justify-start p-4 sm:p-8 bg-base-100/50 relative min-h-[500px]">
      {/* 1. Responsive Top-Middle Search Bar Container */}
      <div className="w-full max-w-md mt-4 mb-12 relative z-50">
        <div className="relative">
          <input
            type="text"
            placeholder="Search group or use # for user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-base-200 border border-base-300 rounded-xl focus:outline-none focus:border-primary text-sm transition-all"
          />
          <Search className="w-4 h-4 text-base-content/40 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* 2. Results Dropdown Overlay */}
        {isUsernameLoading && searchQuery.trim() && (
          <div className="absolute w-full mt-2 bg-base-100 border border-base-300 rounded-xl shadow-xl p-3 text-sm text-base-content/70">
            Searching...
          </div>
        )}

        {!isUsernameLoading && results.length > 0 && (
          <div className="absolute w-full mt-2 bg-base-100 border border-base-300 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-base-200 animate-in fade-in-50 duration-200">
            {results.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 hover:bg-base-200/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar Display */}
                  {item.avatar ? (
                    <img
                      src={item.avatar}
                      alt={item.type === "user" ? item.displayName : item.name}
                      className="w-10 h-10 rounded-full object-cover border border-base-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm relative">
                      {(item.type === "user" ? item.displayName : item.name)
                        ?.slice(0, 1)
                        .toUpperCase()}
                      {item.type === "user" ? (
                        <User className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-success-content bg-success rounded-full p-0.5" />
                      ) : (
                        <Users className="w-3 h-3 absolute -bottom-0.5 -right-0.5 text-info-content bg-info rounded-full p-0.5" />
                      )}
                    </div>
                  )}

                  {/* Text Meta Info */}
                  <div>
                    <h4 className="text-sm font-semibold text-base-content">
                      {item.type === "user" ? item.displayName : item.name}
                    </h4>
                    <p className="text-xs text-base-content/60 line-clamp-1">
                      {item.type === "user"
                        ? `${item.name}`
                        : item.description}
                    </p>
                  </div>
                </div>

                {/* Message Button */}
                <button
                  onClick={() => handleStartChat(item)}
                  className="btn btn-sm btn-primary btn-square md:btn-wide md:w-auto md:px-4 gap-2 text-xs flex items-center"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Message</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {!isUsernameLoading && hasSearched && results.length === 0 && (
          <div className="absolute w-full mt-2 bg-base-100 border border-base-300 rounded-xl shadow-xl p-3 text-sm text-base-content/70">
            No results found
          </div>
        )}
      </div>

      {/* 3. Welcome Center Display */}
      <div className="max-w-md text-center space-y-6 my-auto">
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center
             justify-center animate-bounce"
            >
              <MessageSquare className="w-8 h-8 text-primary " />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold">Welcome to Chatty!</h2>
        <p className="text-base-content/60">
          Select a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
