"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { isLink, type NavItem } from "./RoleNav";
import { cn } from "@/lib/cn";

interface Props {
  navItems: NavItem[];
  user: { name: string; avatar?: string };
  roleLabel: string;
  onLogout: () => void;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ navItems, user, roleLabel, onLogout, open, onClose }: Props) {
  const pathname = usePathname() ?? "";
  const t = useTranslations("nav");

  return (
    <aside className={cn("sidebar", open && "is-open")}>
      <div className="sidebar-logo">
        <Logo variant="reversed" height={26} />
        {onClose && (
          <button
            onClick={onClose}
            className="sidebar-close-btn"
            aria-label="Close menu"
          >
            <Icon name="x" size={18} />
          </button>
        )}
      </div>
      <nav className="sidebar-nav">
        {navItems.map((it, i) =>
          isLink(it) ? (
            <Link
              key={it.id}
              href={it.href}
              onClick={onClose}
              className={cn(
                "nav-item",
                (pathname === it.href || pathname.startsWith(it.href + "/")) && "active",
              )}
            >
              <Icon name={it.ico} size={18} />
              <span style={{ flex: 1 }}>{t(it.labelKey)}</span>
              {it.count != null && (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    background: "#BCE955",
                    color: "#152A24",
                    padding: "1px 7px",
                    borderRadius: 9999,
                  }}
                >
                  {it.count}
                </span>
              )}
            </Link>
          ) : (
            <div key={"g" + i} className="sidebar-group">
              {it.group}
            </div>
          ),
        )}
      </nav>
      <div className="sidebar-bottom">
        <Avatar src={user.avatar} size="md" name={user.name} />
        <div className="who">
          <div
            className="name"
            style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {user.name}
          </div>
          <div className="role">{roleLabel}</div>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          aria-label="Sign out"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            padding: 6,
          }}
        >
          <Icon name="log-out" size={16} />
        </button>
      </div>
    </aside>
  );
}
