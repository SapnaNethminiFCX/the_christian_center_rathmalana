"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { TccrWordmark } from "@/components/ui/TccrWordmark";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface Props {
  initialActive?: string;
  onSignUp: () => void;
}

// V2 labels — Home / Bible School / Cell Groups / Contact.
// Targets are section ids on the landing page that the floating nav
// smooth-scrolls to (top, modules grid, modules grid, FAQ). Labels are
// resolved per-locale via the `nav.*` keys in src/messages/*.json.
const LINKS = [
  { id: "home", labelKey: "home", target: "top" },
  { id: "school", labelKey: "bibleSchool", target: "modules" },
  { id: "cells", labelKey: "cellGroups", target: "modules" },
  { id: "contact", labelKey: "contact", target: "faq" },
] as const;

export function FloatingNav({ initialActive = "home", onSignUp }: Props) {
  const [active, setActive] = useState(initialActive);
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const t = useTranslations("nav");

  const handleNav = (id: string, target: string) => {
    setActive(id);

    if (id === "home") {
      if (pathname === "/") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push("/");
      }
      return;
    }

    if (pathname === "/") {
      const el = document.getElementById(target);
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    } else {
      router.push(`/#${target}`);
    }
  };

  return (
    <nav className="floating-nav">
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          handleNav("home", "top");
        }}
        style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
      >
        <TccrWordmark />
      </a>
      <div className="nav-links">
        {LINKS.map((l) => (
          <a
            key={l.id}
            href="#"
            className={active === l.id ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              handleNav(l.id, l.target);
            }}
          >
            {t(l.labelKey)}
          </a>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LanguageSwitcher />
        <Button size="sm" onClick={onSignUp}>
          {t("signUp")}
        </Button>
      </div>
    </nav>
  );
}
