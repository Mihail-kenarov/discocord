"use client";

import * as React from "react";
import { Suspense } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import type { AppSidebarUser, Guild, GuildChannel, GuildMessage, GuildWithChannels } from "./types";
import type { Person } from "./FriendsTabs";
import { FriendsTabs } from "./FriendsTabs";
import { ClientGatewayButton } from "./ClientGatewayButton";
import { getGuildById, listMyGuilds } from "@/app/api/callsAPI";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Hash, Paperclip, SendHorizontal, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type MeClientProps = {
  user: AppSidebarUser;
  initialGuilds: GuildWithChannels[];
  friends: Person[];
  pending: Person[];
};

type ActiveChannelState = Record<string, GuildChannel["id"]>;

export function MeClient({ user, initialGuilds, friends, pending }: MeClientProps) {
  const [guilds, setGuilds] = React.useState<GuildWithChannels[]>(initialGuilds);
  const [selectedGuildId, setSelectedGuildId] = React.useState<string | null>(null);
  const [activeChannelByGuild, setActiveChannelByGuild] = React.useState<ActiveChannelState>({});
  const [loadingGuildId, setLoadingGuildId] = React.useState<string | null>(null);

  const refreshGuildById = React.useCallback(async (guildId: string) => {
    if (!guildId) return;
    setLoadingGuildId((current) => (current === guildId ? current : guildId));
    try {
      const { data, error } = await getGuildById(guildId);
      if (error || !data) {
        if (error && error.message) {
          toast.error(error.message);
        }
        return;
      }
      setGuilds((previous) => {
        const index = previous.findIndex((guild) => guild.id === data.id);
        if (index === -1) {
          return [...previous, data];
        }
        const next = [...previous];
        next[index] = data;
        return next;
      });
    } catch (error) {
      console.error(`[MeClient] Failed to load guild ${guildId}`, error);
      toast.error("Failed to load server details.");
    } finally {
      setLoadingGuildId((current) => (current === guildId ? null : current));
    }
  }, []);

  React.useEffect(() => {
    setGuilds(initialGuilds);
  }, [initialGuilds]);

  React.useEffect(() => {
    if (!user.id) return;
    let cancelled = false;
    const controller = new AbortController();

    const loadGuilds = async () => {
      try {
        const { data, error } = await listMyGuilds(user.id, controller.signal);
        if (cancelled || controller.signal.aborted) return;
        if (error) {
          toast.error(error.message ?? "Failed to load your servers.");
          setGuilds([]);
          return;
        }
        if (data) {
          setGuilds(data);
          setSelectedGuildId((current) => current ?? (data[0]?.id ?? null));
          const firstGuild = data[0];
          if (firstGuild && firstGuild.channels.length === 0) {
            void refreshGuildById(firstGuild.id);
          }
        }
      } catch (error) {
        if (!cancelled && !controller.signal.aborted) {
          console.error("[MeClient] Failed to load guilds", error);
          toast.error("Failed to load your servers.");
          setGuilds([]);
        }
      }
    };

    void loadGuilds();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user.id, refreshGuildById]);

  const selectedGuild = React.useMemo(
    () => guilds.find((guild) => guild.id === selectedGuildId) ?? null,
    [guilds, selectedGuildId]
  );

  React.useEffect(() => {
    if (!selectedGuild) return;
    setActiveChannelByGuild((previous) => {
      const existing = previous[selectedGuild.id];
      const hasExisting = existing
        ? selectedGuild.channels.some((channel) => channel.id === existing)
        : false;
      if (hasExisting) return previous;
      const fallbackChannel = [...selectedGuild.channels]
        .sort((a, b) => a.position - b.position)[0];
      if (!fallbackChannel) return previous;
      if (existing === fallbackChannel.id) return previous;
      return { ...previous, [selectedGuild.id]: fallbackChannel.id };
    });
  }, [selectedGuild]);

  const activeChannelId = selectedGuild ? activeChannelByGuild[selectedGuild.id] ?? null : null;

  const handleSelectHome = React.useCallback(() => {
    setSelectedGuildId(null);
  }, []);

  const handleSelectGuild = React.useCallback(
    (guildId: string) => {
      setSelectedGuildId(guildId);
      const guild = guilds.find((g) => g.id === guildId);
      if (guild && guild.channels.length > 0) return;
      if (loadingGuildId === guildId) return;
      void refreshGuildById(guildId);
    },
    [guilds, loadingGuildId, refreshGuildById]
  );

  const handleGuildCreated = React.useCallback(
    (guild: Guild) => {
      setGuilds((previous) => [
        ...previous,
        {
          ...guild,
          channels: [],
          messages: [],
        },
      ]);
      setSelectedGuildId(guild.id);
      if (loadingGuildId !== guild.id) {
        void refreshGuildById(guild.id);
      }
    },
    [loadingGuildId, refreshGuildById]
  );

  React.useEffect(() => {
    if (!selectedGuildId) return;
    const guild = guilds.find((g) => g.id === selectedGuildId);
    if (!guild) return;
    if (guild.channels.length > 0) return;
    if (loadingGuildId === selectedGuildId) return;
    void refreshGuildById(selectedGuildId);
  }, [guilds, loadingGuildId, refreshGuildById, selectedGuildId]);

  const handleSelectChannel = React.useCallback(
    (channelId: GuildChannel["id"]) => {
      if (!selectedGuild) return;
      setActiveChannelByGuild((previous) => {
        if (previous[selectedGuild.id] === channelId) return previous;
        return { ...previous, [selectedGuild.id]: channelId };
      });
    },
    [selectedGuild]
  );

  return (
    <SidebarProvider>
      <AppSidebar
        guilds={guilds}
        user={user}
        activeGuildId={selectedGuildId}
        onSelectHome={handleSelectHome}
        onSelectGuild={handleSelectGuild}
        onGuildCreated={handleGuildCreated}
      />
      <SidebarInset className="flex min-h-screen flex-col bg-[#080808] text-white">
        {selectedGuild ? (
          <GuildWorkspace
            guild={selectedGuild}
            activeChannelId={activeChannelId}
            onSelectChannel={handleSelectChannel}
          />
        ) : (
          <HomeWorkspace friends={friends} pending={pending} />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}

function HomeWorkspace({ friends, pending }: { friends: Person[]; pending: Person[] }) {
  return (
    <>
      <header className="flex h-14 items-center gap-2 border-b border-white/10 bg-[#0f0f0f] px-4">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Friends</h1>
      </header>
      <main className="flex flex-1 flex-col gap-4 bg-[#080808] p-4">
        <FriendsTabs initialFriends={friends} initialPending={pending} />
        <section className="pt-4">
          <Suspense fallback={<div className="text-sm text-neutral-400">Loading action...</div>}>
            <ClientGatewayButton />
          </Suspense>
        </section>
      </main>
    </>
  );
}

type GuildWorkspaceProps = {
  guild: GuildWithChannels;
  activeChannelId: GuildChannel["id"] | null;
  onSelectChannel: (channelId: GuildChannel["id"]) => void;
};

function GuildWorkspace({ guild, activeChannelId, onSelectChannel }: GuildWorkspaceProps) {
  const sortedChannels = React.useMemo(
    () => [...guild.channels].sort((a, b) => a.position - b.position),
    [guild.channels]
  );

  const activeChannel =
    sortedChannels.find((channel) => channel.id === activeChannelId) ?? sortedChannels[0] ?? null;

  const channelMessages = React.useMemo(() => {
    if (!activeChannel) return [] as GuildMessage[];
    return guild.messages.filter((message) => message.channelId === activeChannel.id);
  }, [guild.messages, activeChannel]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#0c0c0c] px-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="inline-flex size-6 items-center justify-center rounded bg-emerald-500/20 text-emerald-300">
                #
              </span>
              {activeChannel ? activeChannel.name : "No channels"}
            </p>
            <p className="text-xs text-neutral-500">{guild.name}</p>
          </div>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-white/10 bg-[#060606] px-3 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Text Channels</p>
          {sortedChannels.length === 0 ? (
            <p className="mt-3 text-xs text-neutral-600">No channels yet.</p>
          ) : (
            <div className="mt-3 space-y-1">
              {sortedChannels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => onSelectChannel(channel.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-200"
                        : "text-neutral-400 hover:bg-white/10 hover:text-white"
                    )}
                    >
                      <Hash className={cn("size-4", isActive ? "text-emerald-300" : "text-neutral-500")} />
                      <span className="truncate">{channel.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>
        <section className="flex flex-1 flex-col bg-[#0b0b0b]">
          <ScrollArea className="flex-1">
            <div className="space-y-6 px-6 py-6">
              {channelMessages.length === 0 ? (
                <div className="flex flex-col items-center gap-3 pt-24 text-center text-neutral-500">
                  <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-neutral-700 text-neutral-400">
                    <Hash className="size-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-neutral-200">
                      Welcome to {activeChannel?.name ?? "this channel"}
                    </p>
                    <p className="text-sm text-neutral-500">
                      This is the start of your conversation. Send a message to get things going.
                    </p>
                  </div>
                </div>
              ) : (
                channelMessages.map((message) => (
                  <MessageRow key={message.id} message={message} />
                ))
              )}
            </div>
          </ScrollArea>
          <footer className="border-t border-white/10 bg-black/60 px-4 py-4">
            <form
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/60 px-3 py-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <button
                type="button"
                className="rounded-md p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Attach a file"
              >
                <Paperclip className="size-5" />
              </button>
              <input
                type="text"
                placeholder={
                  activeChannel ? `Message #${activeChannel.name}` : "No channel selected"
                }
                className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                disabled={!activeChannel}
              />
              <button
                type="button"
                className="rounded-md p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Add emoji"
              >
                <Smile className="size-5" />
              </button>
              <Button
                type="submit"
                size="icon"
                className="bg-emerald-500 text-black hover:bg-emerald-400"
                disabled={!activeChannel}
              >
                <SendHorizontal className="size-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </form>
          </footer>
        </section>
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: GuildMessage }) {
  return (
    <div className="flex items-start gap-4">
      <Avatar className="size-10 border border-white/5">
        <AvatarImage src={message.author.avatarUrl ?? undefined} alt={message.author.username} />
        <AvatarFallback>{message.author.username?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-white">{message.author.username}</span>
          <span className="text-xs text-neutral-500">{message.timestamp}</span>
        </div>
        <p className="text-sm leading-relaxed text-neutral-200 whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}
