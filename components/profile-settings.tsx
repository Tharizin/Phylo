"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Upload } from "lucide-react";
import { removeAvatarAction, uploadAvatarAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { toast } from "@/components/ui/use-toast";

export function ProfileSettings({
  username,
  avatarUrl,
  email,
}: {
  username: string;
  avatarUrl: string | null;
  email: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(avatarUrl);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("avatar", file);
    startTransition(async () => {
      const r = await uploadAvatarAction(fd);
      if (!r.ok) {
        toast({ title: "Upload failed", description: r.error, variant: "destructive" });
        return;
      }
      setPreview(r.avatarUrl);
      toast({ title: "Profile photo updated" });
      router.refresh();
    });
  }

  function onRemove() {
    startTransition(async () => {
      const r = await removeAvatarAction();
      if (!r.ok) {
        toast({ title: "Could not remove photo", description: r.error, variant: "destructive" });
        return;
      }
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      toast({ title: "Profile photo removed" });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile photo</CardTitle>
        <CardDescription>
          Upload a photo for your avatar across Phylo — community, leaderboard, and navigation.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <UserAvatar username={username} avatarUrl={preview} size="lg" />
        <div className="space-y-3">
          <div>
            <p className="font-medium">{username}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
            >
              {pending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
              Upload photo
            </Button>
            {preview ? (
              <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={onRemove}>
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, or GIF. Max 2 MB.</p>
        </div>
      </CardContent>
    </Card>
  );
}
