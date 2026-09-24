"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { collectionSubNavItems, navItems, secondaryNavItems } from "./nav-items";
import { api } from "@/lib/api-client";
import type { FavoriteItem } from "@/lib/types";

function getFavoriteHref(fav: FavoriteItem) {
  switch (fav.type) {
    case "page":
      return `/pages/${fav.id}`;
    case "project":
      return "/projects";
    case "task":
      return "/tasks";
    case "note":
      return "/notes";
    case "person":
      return "/people";
    case "event":
      return "/events";
    case "file":
      return "/files";
    case "collection":
      return `/collections/${fav.id}`;
    case "collection_record":
      return fav.collectionId ? `/collections/${fav.collectionId}?record=${fav.id}` : "/collections";
    default:
      return "/timeline";
  }
}

/** Split out so `useSearchParams` sits under its own Suspense boundary. */
function CollectionSubNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const activeTab = pathname === "/collections" ? (searchParams.get("tab") ?? "") : null;
  return (
    <div className="ml-[15px] flex flex-col gap-px border-l border-sidebar-border pl-2">
      {collectionSubNavItems.map((sub) => {
        const tab = new URL(sub.href, "http://x").searchParams.get("tab") ?? "";
        return (
          <Link
            key={sub.href}
            href={sub.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-2 py-1 text-xs transition-colors",
              activeTab === tab
                ? "bg-sidebar-accent/70 font-medium text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            {sub.label}
          </Link>
        );
      })}
    </div>
  );
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    api.favorites
      .list()
      .then((data) => {
        if (!cancelled) setFavorites(data);
      })
      .catch(() => {
        // user might not be logged in yet
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div className="flex flex-col gap-4">
      {/* Primary Nav */}
      <nav className="flex flex-col gap-px px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-2 rounded-md px-2 py-[5px] text-[13px] font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-foreground/70 hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              {isActive ? (
                <motion.div
                  layoutId="sidebar-primary-active-pill"
                  className="absolute inset-0 -z-10 rounded-md bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
              <Icon className={cn("size-[15px] shrink-0", item.color)} />
              <span>{item.label}</span>
            </Link>
          );

          if (item.href !== "/collections" || !(pathname === "/collections" || pathname.startsWith("/collections/"))) {
            return link;
          }
          return (
            <div key={item.href} className="flex flex-col gap-px">
              {link}
              <Suspense fallback={null}>
                <CollectionSubNav pathname={pathname} onNavigate={onNavigate} />
              </Suspense>
            </div>
          );
        })}
      </nav>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <div className="px-2">
          <div className="mb-1 flex items-center gap-1.5 px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            <Star className="size-3 fill-amber-500 text-amber-500" />
            <span>Favorites</span>
          </div>
          <nav className="flex flex-col gap-px">
            {favorites.map((fav) => {
              const href = getFavoriteHref(fav);
              const isActive = pathname === href;
              return (
                <Link
                  key={fav.id}
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex items-center gap-2 truncate rounded-md px-2 py-1 text-xs transition-colors",
                    isActive
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                  )}
                >
                  {isActive ? (
                    <motion.div
                      layoutId="sidebar-favorite-active-pill"
                      className="absolute inset-0 -z-10 rounded-md bg-sidebar-accent"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                  <span className="truncate flex-1">{fav.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground/60 uppercase">
                    {fav.type}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Secondary Nav: Archive & Trash */}
      <div className="px-2 pt-2 border-t border-sidebar-border">
        <nav className="flex flex-col gap-px">
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-2 rounded-md px-2 py-[5px] text-xs font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                {isActive ? (
                  <motion.div
                    layoutId="sidebar-secondary-active-pill"
                    className="absolute inset-0 -z-10 rounded-md bg-sidebar-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                ) : null}
                <Icon className={cn("size-3.5 shrink-0", item.color)} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
