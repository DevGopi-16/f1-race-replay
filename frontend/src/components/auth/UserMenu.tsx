import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogIn,
  LogOut,
  User,
  UserCircle,
  UserPlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../features/auth/auth.store";

export default function UserMenu() {
  const navigate = useNavigate();

  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore(
    (state) => state.isInitialized,
  );
  const isLoading = useAuthStore(
    (state) => state.isLoading,
  );
  const logout = useAuthStore(
    (state) => state.logout,
  );

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (
      event: MouseEvent,
    ) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open]);

  if (!isInitialized) {
    return null;
  }

  if (!user) {
    return (
      <div className="user-menu-auth-actions">
        <Link
          to="/login"
          className="user-menu-login"
        >
          <LogIn
            size={15}
            strokeWidth={1.8}
          />
          <span>Login</span>
        </Link>

        <Link
          to="/register"
          className="user-menu-register"
        >
          <UserPlus
            size={15}
            strokeWidth={1.8}
          />
          <span>Sign Up</span>
        </Link>
      </div>
    );
  }

  const displayName =
    user.username || "Driver";

  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <div
      ref={menuRef}
      className="user-menu"
    >
      <button
        type="button"
        className={`user-menu-trigger ${
          open ? "is-open" : ""
        }`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.picture_url ? (
          <img
            src={user.picture_url}
            alt=""
            className="user-menu-avatar"
          />
        ) : (
          <span className="user-menu-avatar user-menu-avatar-fallback">
            {initials}
          </span>
        )}

        <span className="user-menu-name">
          {displayName}
        </span>

        <ChevronDown
          size={14}
          strokeWidth={1.8}
          className="user-menu-chevron"
        />
      </button>

      {open && (
        <div
          className="user-menu-dropdown"
          role="menu"
        >
          <div className="user-menu-profile">
            {user.picture_url ? (
              <img
                src={user.picture_url}
                alt=""
                className="user-menu-profile-avatar"
              />
            ) : (
              <span className="user-menu-profile-avatar user-menu-avatar-fallback">
                {initials}
              </span>
            )}

            <div className="user-menu-profile-info">
              <strong>{displayName}</strong>

              {user.email && (
                <span>{user.email}</span>
              )}

              {user.is_pro && (
                <small>PRO MEMBER</small>
              )}
            </div>
          </div>

          <div className="user-menu-divider" />

          <Link
            to="/profile"
            className="user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <UserCircle
              size={16}
              strokeWidth={1.8}
            />
            <span>Profile</span>
          </Link>

          <Link
            to="/settings"
            className="user-menu-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <User
              size={16}
              strokeWidth={1.8}
            />
            <span>Settings</span>
          </Link>

          <div className="user-menu-divider" />

          <button
            type="button"
            className="user-menu-item user-menu-logout"
            role="menuitem"
            onClick={handleLogout}
            disabled={isLoading}
          >
            <LogOut
              size={16}
              strokeWidth={1.8}
            />
            <span>
              {isLoading
                ? "Logging out..."
                : "Log out"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}