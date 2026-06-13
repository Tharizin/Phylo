"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Leaf, LogOut, Menu, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

const authedPrefixes = ["/dashboard", "/history", "/species", "/community", "/profile", "/admin"];

export function SiteHeader() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const supabase = useMemo(() => createClient(), []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);

  const isAuthedArea = authedPrefixes.some((p) => pathname?.startsWith(p));
  const showAuthedNav = isAuthedArea || isSignedIn;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setIsSignedIn(false);
          setProfile(null);
          setIsAdmin(false);
        }
        return;
      }
      if (!cancelled) setIsSignedIn(true);
      let data: { username: string; is_admin?: boolean; avatar_url?: string | null } | null = null;
      const withAvatar = await supabase
        .from("profiles")
        .select("username, avatar_url, is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (!withAvatar.error && withAvatar.data) {
        data = withAvatar.data;
      } else {
        const basic = await supabase.from("profiles").select("username, is_admin").eq("id", user.id).maybeSingle();
        if (!basic.error && basic.data) data = basic.data;
      }
      if (!cancelled && data) {
        setIsAdmin(!!data.is_admin);
        setProfile({
          username: data.username as string,
          avatar_url: (data.avatar_url as string | null) ?? null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, pathname, isAuthedArea]);

  const navItems = showAuthedNav
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/species", label: "Species" },
        { href: "/history", label: "History" },
        { href: "/community", label: "Community" },
        { href: "/help", label: "Help" },
        ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ]
    : [];

  const navLink = (href: string, label: string) => (
    <Button variant="ghost" size="sm" asChild className={cn(pathname === href && "bg-muted")}>
      <Link href={href}>{label}</Link>
    </Button>
  );

  const themeButton = (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      className="relative shrink-0"
      aria-label="Toggle theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );

  const accountMenu = showAuthedNav ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0 gap-2 pl-1.5">
          {profile ? <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size="sm" /> : null}
          <span className="hidden sm:inline">{profile?.username ?? "Account"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{profile?.username ?? "Account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">
            <Settings className="mr-2 h-4 w-4" />
            Profile settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Button size="sm" asChild className="shrink-0">
      <Link href="/login">Sign in</Link>
    </Button>
  );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={showAuthedNav ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2 font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
            Phylo
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <span key={item.href}>{navLink(item.href, item.label)}</span>
            ))}
          </nav>

          {navItems.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      href={item.href}
                      className={cn("w-full cursor-pointer", pathname === item.href && "bg-muted font-medium")}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {themeButton}
          {accountMenu}
        </div>
      </div>
    </header>
  );
}
