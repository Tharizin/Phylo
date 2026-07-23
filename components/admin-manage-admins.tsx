"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  grantAdminAction,
  revokeAdminAction,
  searchUsersByUsernameAction,
  type AdminProfileRow,
} from "@/app/actions/admin";
import { isProtectedAdminUsername } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function AdminManageAdmins({ initialAdmins }: { initialAdmins: AdminProfileRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminProfileRow[]>([]);
  const [searching, setSearching] = useState(false);

  async function runSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const res = await searchUsersByUsernameAction(q);
    setSearching(false);
    if (res.ok) setSearchResults(res.users.filter((u) => !u.is_admin));
    else setSearchResults([]);
  }

  function grant(userId: string) {
    startTransition(async () => {
      const r = await grantAdminAction(userId);
      if (r.ok) {
        router.refresh();
        setSearchResults([]);
        setSearchQuery("");
      } else alert(r.error);
    });
  }

  function revoke(userId: string) {
    startTransition(async () => {
      const r = await revokeAdminAction(userId);
      if (r.ok) router.refresh();
      else alert(r.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage admins</CardTitle>
        <CardDescription>Grant or revoke admin access. The tharizin account cannot be revoked.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-3">
          <Label htmlFor="admin-search">Grant admin access</Label>
          <Input
            id="admin-search"
            value={searchQuery}
            onChange={(e) => void runSearch(e.target.value)}
            placeholder="Search by username…"
          />
          {searching ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </p>
          ) : searchResults.length > 0 ? (
            <div className="rounded-md border">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between border-b px-3 py-2 last:border-0">
                  <span className="font-medium">{user.username}</span>
                  <Button size="sm" disabled={pending} onClick={() => grant(user.id)}>
                    Grant admin
                  </Button>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <p className="text-sm text-muted-foreground">No non-admin users found.</p>
          ) : null}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Current admins</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialAdmins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No admins found.
                  </TableCell>
                </TableRow>
              ) : (
                initialAdmins.map((admin) => {
                  const protectedAdmin = isProtectedAdminUsername(admin.username);
                  return (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.username}
                        {protectedAdmin ? (
                          <span className="ml-2 text-xs text-muted-foreground">(protected)</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        {protectedAdmin ? (
                          <span className="text-xs text-muted-foreground">Cannot revoke</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            disabled={pending}
                            onClick={() => revoke(admin.id)}
                          >
                            Revoke
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
