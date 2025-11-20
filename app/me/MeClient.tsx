"use client";

import * as React from "react";
import { Suspense } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { GuildWorkspace } from "./GuildWorkspace";
import type { AppSidebarUser, Guild, GuildChannel, GuildMessage, GuildWithChannels } from "./types";
import type { Person } from "./FriendsTabs";
import { FriendsTabs } from "./FriendsTabs";
import { ClientGatewayButton } from "./ClientGatewayButton";
import { getGuildById, listMyGuilds, getChannelMessages, postChannelMessage } from "@/app/api/callsAPI";
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

  const replaceChannelMessages = React.useCallback((guildId: string, channelId: number, messages: GuildMessage[]) => {
    setGuilds((prev) => prev.map((g) => {
      if (g.id !== guildId) return g;
      const others = g.messages.filter((m) => m.channelId !== channelId);
      return { ...g, messages: [...others, ...messages] };
    }));
  }, []);

  const appendMessage = React.useCallback((guildId: string, message: GuildMessage) => {
    setGuilds((prev) => prev.map((g) => g.id === guildId ? { ...g, messages: [...g.messages, message] } : g));
  }, []);

  const handleLoadChannelMessages = React.useCallback(async (guildId: string, channelId: number) => {
    const { data, error } = await getChannelMessages(channelId, { limit: 50 });
    if (error) {
      toast.error(error.message ?? "Failed to load messages");
      return;
    }
    if (data) replaceChannelMessages(guildId, channelId, data);
  }, [replaceChannelMessages]);

  const handleSendMessage = React.useCallback(async (
    guildId: string,
    channelId: number,
    content: string,
    options?: { attachment?: File | null }
  ) => {
    const hasAttachment = Boolean(options?.attachment);
    if (!content.trim() && !hasAttachment) return false;
    const { data, error } = await postChannelMessage(channelId, {
      authorId: user.id,
      content,
      attachmentFile: options?.attachment ?? undefined,
    });
    if (error || !data) {
      toast.error(error?.message ?? "Failed to send message");
      return false;
    }
    const createdAt = new Date(data.created_at);
    const msg: GuildMessage = {
      id: String(data.id),
      channelId: Number(data.channel_id),
      author: { username: user.username, imageUrl: user.imageUrl ?? null },
      timestamp: isNaN(createdAt.getTime()) ? String(data.created_at) : createdAt.toLocaleString(),
      content: data.content,
      attachment: data.attachment ?? null,
    };
    appendMessage(guildId, msg);
    return true;
  }, [appendMessage, user.id, user.username, user.imageUrl]);

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "18rem",
      } as React.CSSProperties}
    >
      <AppSidebar
        guilds={guilds}
        user={user}
        activeGuildId={selectedGuildId}
        onSelectHome={handleSelectHome}
        onSelectGuild={handleSelectGuild}
        onGuildCreated={handleGuildCreated}
      />
      <SidebarInset className="flex h-screen min-h-0 flex-col overflow-hidden bg-[#080808] text-white">
        {selectedGuild ? (
          <GuildWorkspace
            guild={selectedGuild}
            activeChannelId={activeChannelId}
            onSelectChannel={handleSelectChannel}
            onLoadChannelMessages={handleLoadChannelMessages}
            onSendMessage={handleSendMessage}
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
      <main className="flex flex-1 min-h-0 flex-col gap-4 overflow-y-auto bg-[#080808] p-4">
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
