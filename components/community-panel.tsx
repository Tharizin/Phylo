"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserCheck, UserMinus, UserPlus } from "lucide-react";
import {
  acceptFriendRequestAction,
  removeFriendAction,
  sendFriendRequestAction,
} from "@/app/actions/friendships";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/user-avatar";

export type CommunityUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  alltime_species: number;
  weekly_species: number;
  alltime_points: number;
  weekly_points: number;
  friendship_status: string;
  friendship_id: string | null;
  is_friend: boolean;
  is_pending_incoming: boolean;
  is_pending_outgoing: boolean;
};

export function CommunityPanel({ users, currentUserId }: { users: CommunityUser[]; currentUserId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? users.filter((u) => u.username.toLowerCase().includes(q)) : users;
    const friends = list.filter((u) => u.is_friend && u.user_id !== currentUserId);
    const others = list.filter((u) => !u.is_friend || u.user_id === currentUserId);
    return { friends, others };
  }, [users, query, currentUserId]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function UserCard({ u }: { u: CommunityUser }) {
    const isSelf = u.user_id === currentUserId;
    return (
      <Card className={u.is_friend ? "border-primary/30 bg-primary/5" : undefined}>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar username={u.username} avatarUrl={u.avatar_url} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-medium">{u.username}</p>
                {isSelf ? <Badge variant="secondary">You</Badge> : null}
                {u.is_friend && !isSelf ? <Badge variant="outline">Friend</Badge> : null}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium text-foreground">{u.alltime_species}</span> all-time species
                </span>
                <span>
                  <span className="font-medium text-foreground">{u.weekly_species}</span> this week
                </span>
                <span>
                  {Number(u.weekly_points).toFixed(2)} wk pts · {Number(u.alltime_points).toFixed(2)} all-time
                </span>
              </div>
            </div>
          </div>
          {!isSelf ? (
            <div className="flex shrink-0 gap-2">
              {u.is_pending_incoming && u.friendship_id ? (
                <>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await acceptFriendRequestAction(u.friendship_id!);
                        if (r.ok) refresh();
                      })
                    }
                  >
                    <UserCheck className="mr-1 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await removeFriendAction(u.friendship_id!);
                        if (r.ok) refresh();
                      })
                    }
                  >
                    Decline
                  </Button>
                </>
              ) : u.is_friend && u.friendship_id ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await removeFriendAction(u.friendship_id!);
                      if (r.ok) refresh();
                    })
                  }
                >
                  <UserMinus className="mr-1 h-4 w-4" />
                  Remove friend
                </Button>
              ) : u.is_pending_outgoing ? (
                <Button size="sm" variant="secondary" disabled>
                  Request sent
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await sendFriendRequestAction(u.user_id);
                      if (r.ok) refresh();
                    })
                  }
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  Add friend
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.friends.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Friends</h2>
          <div className="grid gap-3">
            {filtered.friends.map((u) => (
              <UserCard key={u.user_id} u={u} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {filtered.friends.length ? "Everyone else" : "All users"}
        </h2>
        <div className="grid gap-3">
          {filtered.others.map((u) => (
            <UserCard key={u.user_id} u={u} />
          ))}
        </div>
        {filtered.others.length === 0 && filtered.friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users match your search.</p>
        ) : null}
      </section>
    </div>
  );
}
