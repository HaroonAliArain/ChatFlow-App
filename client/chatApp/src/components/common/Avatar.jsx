import { useState } from "react";

const DEFAULT_SERVER_AVATAR = "/avatars/defaultProfileImage.png";

const Avatar = ({ src, name = "", size = "md", isOnline = false, className = "" }) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl",
  };

  const dotSizes = {
    xs: "w-1.5 h-1.5 ring-1",
    sm: "w-2 h-2 ring-1",
    md: "w-2.5 h-2.5 ring-2",
    lg: "w-3 h-3 ring-2",
    xl: "w-4 h-4 ring-2",
  };

  const initial = name?.charAt(0)?.toUpperCase() || "?";

  // Generate consistent color from name
  const colors = [
    "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-indigo-500",
    "bg-teal-500", "bg-cyan-500", "bg-emerald-500", "bg-amber-500",
  ];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  // Check if we have a valid, non-default image source
  const hasValidImage = src && !imgError && !src.endsWith(DEFAULT_SERVER_AVATAR);

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {hasValidImage ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${colors[colorIndex]} rounded-full text-white flex items-center justify-center font-semibold`}
        >
          {initial}
        </div>
      )}

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-500 rounded-full ring-[var(--bg-primary)]`}
        />
      )}
    </div>
  );
};

export default Avatar;
