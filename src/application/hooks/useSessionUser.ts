import { useMemo } from "react";
import { useAppSelector } from "./useAppSelector";

/**
 * Returns the logged-in user in the shape AppShell/TopNav/Sidebar expect.
 * Falls back to a placeholder while session is resolving so layout components
 * don't crash on first render.
 */
export function useSessionUser() {
  const user = useAppSelector((s) => s.session.user);

  return useMemo(() => {
    if (!user) {
      return { name: "", email: "", avatar: undefined as string | undefined };
    }
    const name = `${user.firstName} ${user.lastName}`.trim() || user.email;
    return {
      name,
      email: user.email,
      avatar: user.profilePhotoUrl ?? undefined,
    };
  }, [user]);
}
