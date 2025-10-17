"use client";
import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export type Person = {
  id: string | number;
  name: string;
  imageUrl?: string | null;
};

export function FriendsTabs({
  initialFriends,
  initialPending,
  className,
}: {
  initialFriends: Person[];
  initialPending: Person[];
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState(initialFriends);
  const [pending, setPending] = useState(initialPending);

  const filteredFriends = useMemo(
    () => filterByQuery(friends, query),
    [friends, query]
  );
  const filteredPending = useMemo(
    () => filterByQuery(pending, query),
    [pending, query]
  );

  function accept(id: Person["id"]) {
    setPending((prev) => {
      const p = prev.find((x) => x.id === id);
      if (!p) return prev;
      setFriends((f) => [p, ...f]);
      return prev.filter((x) => x.id !== id);
    });
  }
  function deny(id: Person["id"]) {
    setPending((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search friends..."
          className="max-w-md"
        />
      </div>
      <Tabs defaultValue="friends" className="w-full">
        <TabsList>
          <TabsTrigger value="friends">All Friends</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        <TabsContent value="friends" className="mt-4">
          <div className="flex flex-col gap-2">
            {filteredFriends.map((p) => (
              <FriendRow key={p.id} person={p} />)
            )}
            {filteredFriends.length === 0 && (
              <p className="text-sm text-muted-foreground">No friends match your search.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <div className="flex flex-col gap-2">
            {filteredPending.map((p) => (
              <PendingRow key={p.id} person={p} onAccept={() => accept(p.id)} onDeny={() => deny(p.id)} />)
            )}
            {filteredPending.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FriendRow({ person }: { person: Person }) {
  return (
    <Card className="bg-card/60">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 w-full">
        <Avatar className="size-8">
          <AvatarImage src={person.imageUrl ?? undefined} alt={person.name} />
          <AvatarFallback>{initials(person.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium">{person.name}</span>
        <div className="flex items-center gap-1 justify-self-end">
          <Button size="icon" variant="ghost" aria-label="More">
            <MoreVertical className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PendingRow({ person, onAccept, onDeny }: { person: Person; onAccept: () => void; onDeny: () => void }) {
  return (
    <Card className="bg-card/60">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2 w-full">
        <Avatar className="size-8">
          <AvatarImage src={person.imageUrl ?? undefined} alt={person.name} />
          <AvatarFallback>{initials(person.name)}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm font-medium">{person.name}</span>
        <div className="flex items-center gap-2 justify-self-end">
          <Button size="icon" className="bg-green-600 text-white hover:bg-green-700" onClick={onAccept} aria-label="Accept">
            <Check className="size-4" />
          </Button>
          <Button size="icon" variant="destructive" onClick={onDeny} aria-label="Deny">
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function filterByQuery(list: Person[], q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter((p) => p.name.toLowerCase().includes(s));
}

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts[1]?.[0] ?? "";
  return (first + last || first || "?").toUpperCase();
}
