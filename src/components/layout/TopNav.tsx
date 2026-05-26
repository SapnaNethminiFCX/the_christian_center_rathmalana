"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Icon } from "@/components/ui/Icon";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import type { NotificationItem } from "@/lib/mock/notifications";
import type { Role } from "@/application/slices/sessionSlice";

interface Props {
  title: string;
  user: { name: string; avatar?: string };
  roleLabel: string;
  roles?: string[];
  activeRole?: Role | null;
  onSwitchRole?: (role: Role) => void;
  notifications: NotificationItem[];
  dashboardHref: string;
  onLogout: () => void;
  onNotificationClick?: (n: NotificationItem) => void;
  onToggleSidebar?: () => void;
  rightExtras?: React.ReactNode;
}

export function TopNav({
  title,
  user,
  roleLabel,
  roles,
  activeRole,
  onSwitchRole,
  notifications,
  dashboardHref,
  onLogout,
  onNotificationClick,
  onToggleSidebar,
  rightExtras,
}: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const showBack = pathname !== dashboardHref;
  const isDark = mounted && theme === "dark";

  return (
    <header className="topbar">
      <div className="left">
        <button
          className="icon-btn hamburger-btn"
          aria-label="Toggle menu"
          title="Toggle menu"
          onClick={onToggleSidebar}
        >
          <Icon name="menu" size={20} />
        </button>
        {showBack && (
          <button
            className="back-btn"
            aria-label="Go back"
            title="Go back"
            onClick={() => router.back()}
          >
            <Icon name="arrow-left" size={16} />
          </button>
        )}
        <h1>{title}</h1>
      </div>
      <div className="right">
        {rightExtras}


        <LanguageSwitcher />

        <button
          className="icon-btn"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          title={isDark ? "Light mode" : "Dark mode"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          <Icon name={isDark ? "sun" : "moon"} size={18} />
        </button>
        <NotificationBell items={notifications} onItemClick={onNotificationClick} />
        <UserMenu
          user={user}
          role={roleLabel}
          roles={roles}
          activeRole={activeRole}
          onSwitchRole={onSwitchRole}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
