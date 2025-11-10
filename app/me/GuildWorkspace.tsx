"use client";

import * as React from "react";
import type { GuildChannel, GuildMessage, GuildWithChannels, MemberUser } from "./types";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash, Paperclip, SendHorizontal, Smile, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getGuildMembers, getUsersByIds } from "@/app/api/callsAPI";
import { toast } from "sonner";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif"];
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

type PendingAttachment = {
  file: File;
  previewUrl: string;
};

type SendMessageHandler = (
  guildId: string,
  channelId: number,
  content: string,
  options?: { attachment?: File | null }
) => Promise<boolean | void> | boolean | void;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type GuildWorkspaceProps = {
  guild: GuildWithChannels;
  activeChannelId: GuildChannel["id"] | null;
  onSelectChannel: (channelId: GuildChannel["id"]) => void;
  onLoadChannelMessages: (guildId: string, channelId: number) => Promise<void> | void;
  onSendMessage: SendMessageHandler;
};

export function GuildWorkspace({
  guild,
  activeChannelId,
  onSelectChannel,
  onLoadChannelMessages,
  onSendMessage,
}: GuildWorkspaceProps) {
  const [showMembers, setShowMembers] = React.useState(true);
  const [members, setMembers] = React.useState<MemberUser[] | null>(null);
  const [membersLoading, setMembersLoading] = React.useState(false);

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

  const activeChannelIdentifier = activeChannel?.id ?? null;

  React.useEffect(() => {
    if (!activeChannelIdentifier) return;
    void onLoadChannelMessages(guild.id, activeChannelIdentifier);
  }, [guild.id, activeChannelIdentifier, onLoadChannelMessages]);

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      setMembersLoading(true);
      try {
        const { data: idsData, error: idsErr } = await getGuildMembers(guild.id, controller.signal);
        if (cancelled || controller.signal.aborted) return;
        if (idsErr || !idsData) {
          setMembers([]);
          return;
        }
        const idsOrdered = Array.from(new Set([idsData.ownerId, ...idsData.memberIds].filter(Boolean)));
        const { data: profiles, error: profErr } = await getUsersByIds(idsOrdered, controller.signal);
        if (cancelled || controller.signal.aborted) return;
        if (profErr || !profiles) {
          setMembers([]);
          return;
        }
        const byId = new Map(profiles.map((p) => [p.id, p] as const));
        const ordered = idsOrdered.map((id) => byId.get(id) ?? { id, username: id, imageUrl: null });
        setMembers(ordered);
      } catch {
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [guild.id]);

  return (
    <div className="flex flex-1 min-h-0 flex-col">
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setShowMembers((value) => !value)}
            className={cn(
              "text-neutral-400 hover:text-white",
              showMembers && "text-emerald-300 hover:text-emerald-200"
            )}
            aria-pressed={showMembers}
            aria-label="Toggle members panel"
            title="Toggle members"
          >
            <Users className="size-5" />
          </Button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ChannelSidebar
          channels={sortedChannels}
          activeChannelId={activeChannel?.id ?? null}
          onSelectChannel={onSelectChannel}
        />
        <ChannelChat
          guildId={guild.id}
          channel={activeChannel}
          messages={channelMessages}
          onSendMessage={onSendMessage}
        />
        {showMembers && <MembersPanel members={members} loading={membersLoading} />}
      </div>
    </div>
  );
}

type ChannelSidebarProps = {
  channels: GuildChannel[];
  activeChannelId: GuildChannel["id"] | null;
  onSelectChannel: (channelId: GuildChannel["id"]) => void;
};

function ChannelSidebar({ channels, activeChannelId, onSelectChannel }: ChannelSidebarProps) {
  return (
    <aside className="w-64 border-r border-white/10 bg-[#060606] px-3 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Text Channels</p>
      {channels.length === 0 ? (
        <p className="mt-3 text-xs text-neutral-600">No channels yet.</p>
      ) : (
        <div className="mt-3 space-y-1">
          {channels.map((channel) => {
            const isActive = activeChannelId === channel.id;
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
  );
}

type ChannelChatProps = {
  guildId: string;
  channel: GuildChannel | null;
  messages: GuildMessage[];
  onSendMessage: SendMessageHandler;
};

function ChannelChat({ guildId, channel, messages, onSendMessage }: ChannelChatProps) {
  const [draft, setDraft] = React.useState("");
  const [attachment, setAttachment] = React.useState<PendingAttachment | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const replaceAttachment = React.useCallback((next: PendingAttachment | null) => {
    setAttachment((previous) => {
      if (previous?.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }
      return next;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  React.useEffect(() => {
    setDraft("");
    replaceAttachment(null);
  }, [channel?.id, replaceAttachment]);

  React.useEffect(() => {
    return () => {
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachment]);

  const handleAttachmentClick = React.useCallback(() => {
    if (!channel) return;
    fileInputRef.current?.click();
  }, [channel]);

  const handleAttachmentChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error("Only PNG, JPG, and GIF files are supported.");
        event.target.value = "";
        return;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast.error("Attachments must be 5 MB or less.");
        event.target.value = "";
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      replaceAttachment({ file, previewUrl });
    },
    [replaceAttachment]
  );

  const handleRemoveAttachment = React.useCallback(() => {
    replaceAttachment(null);
  }, [replaceAttachment]);

  const sendMessage = React.useCallback(async () => {
    if (!channel) return;
    const hasAttachment = Boolean(attachment);
    if (!draft.trim() && !hasAttachment) return;
    const result = await Promise.resolve(
      onSendMessage(guildId, channel.id, draft, { attachment: attachment?.file ?? null })
    );
    if (result === false) return;
    setDraft("");
    replaceAttachment(null);
  }, [attachment, channel, draft, guildId, onSendMessage, replaceAttachment]);

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendMessage();
    },
    [sendMessage]
  );

  const handleTextareaKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  const disabled = !channel;
  const canSend = Boolean(channel) && (!!draft.trim() || Boolean(attachment));

  return (
    <section className="flex flex-1 min-h-0 flex-col bg-[#0b0b0b]">
      <ScrollArea className="flex-1 min-h-0">
        <MessageHistory channel={channel} messages={messages} />
      </ScrollArea>
      <footer className="border-t border-white/10 bg-black/60 px-4 py-4">
        <form
          className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/60 px-3 py-2"
          onSubmit={handleSubmit}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="sr-only"
            onChange={handleAttachmentChange}
            tabIndex={-1}
          />
          <button
            type="button"
            className="rounded-md p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Attach an image or GIF"
            onClick={handleAttachmentClick}
            disabled={disabled}
          >
            <Paperclip className="size-5" />
          </button>
          <div className="flex flex-1 flex-col gap-2">
            {attachment && (
              <SelectedAttachmentPreview attachment={attachment} onRemove={handleRemoveAttachment} />
            )}
            <textarea
              placeholder={
                channel ? `Message #${channel.name} (Shift+Enter for newline)` : "No channel selected"
              }
              className="min-h-[2.25rem] flex-1 resize-none bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none disabled:cursor-not-allowed"
              disabled={disabled}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              rows={1}
            />
          </div>
          <button
            type="button"
            className="rounded-md p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Add emoji"
            disabled={disabled}
          >
            <Smile className="size-5" />
          </button>
          <Button
            type="submit"
            size="icon"
            className="bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50"
            disabled={!canSend}
          >
            <SendHorizontal className="size-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </footer>
    </section>
  );
}

type SelectedAttachmentPreviewProps = {
  attachment: PendingAttachment;
  onRemove: () => void;
};

function SelectedAttachmentPreview({ attachment, onRemove }: SelectedAttachmentPreviewProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-black/40 px-3 py-2">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-md border border-white/5 bg-black/50">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob previews require a native img element */}
          <img
            src={attachment.previewUrl}
            alt={attachment.file.name}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{attachment.file.name}</p>
          <p className="text-xs text-neutral-400">{formatBytes(attachment.file.size)}</p>
        </div>
      </div>
      <button
        type="button"
        className="ml-auto text-xs font-medium text-neutral-400 transition hover:text-white"
        onClick={onRemove}
        aria-label="Remove attachment"
      >
        Remove
      </button>
    </div>
  );
}

type MessageHistoryProps = {
  channel: GuildChannel | null;
  messages: GuildMessage[];
};

function MessageHistory({ channel, messages }: MessageHistoryProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 pt-24 text-center text-neutral-500">
        <div className="flex size-14 items-center justify-center rounded-full border border-dashed border-neutral-700 text-neutral-400">
          <Hash className="size-6" />
        </div>
        <div>
          <p className="text-lg font-semibold text-neutral-200">
            Welcome to {channel?.name ?? "this channel"}
          </p>
          <p className="text-sm text-neutral-500">
            This is the start of your conversation. Send a message to get things going.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-6">
      {messages.map((message) => (
        <MessageRow key={message.id} message={message} />
      ))}
    </div>
  );
}

function MessageRow({ message }: { message: GuildMessage }) {
  return (
    <div className="flex items-start gap-4">
      <Avatar className="size-10 border border-white/5">
        <AvatarImage src={message.author.imageUrl ?? undefined} alt={message.author.username} />
        <AvatarFallback>{message.author.username?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-white">{message.author.username}</span>
          <span className="text-xs text-neutral-500">{message.timestamp}</span>
        </div>
        {message.content && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-200">{message.content}</p>
        )}
        {message.attachment && message.attachment.type.startsWith("image/") && (
          <MessageAttachment attachment={message.attachment} />
        )}
      </div>
    </div>
  );
}

type MessageAttachmentProps = {
  attachment: NonNullable<GuildMessage["attachment"]>;
};

function MessageAttachment({ attachment }: MessageAttachmentProps) {
  const [loaded, setLoaded] = React.useState(false);
  const label = attachment.type === "image/gif" ? "GIF" : "Image";

  return (
    <div className="mt-2 w-full overflow-hidden rounded-lg border border-white/10 bg-black/40">
      {!loaded && <div className="h-48 w-full animate-pulse rounded bg-white/5" />}
      {/* eslint-disable-next-line @next/next/no-img-element -- chat attachments can be remote or blob URLs */}
      <img
        src={attachment.url}
        alt={`${label} attachment`}
        className={cn(
          "max-h-96 w-full object-contain bg-black transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        loading="lazy"
      />
      <div className="border-t border-white/5 px-3 py-1 text-xs text-neutral-400">
        {label} - {formatBytes(attachment.size)}
      </div>
    </div>
  );
}

type MembersPanelProps = {
  members: MemberUser[] | null;
  loading: boolean;
};

function MembersPanel({ members, loading }: MembersPanelProps) {
  return (
    <aside className="w-64 border-l border-white/10 bg-[#060606] px-3 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Members</p>
      <ScrollArea className="mt-3 h-[calc(100%-2rem)] pr-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-md px-2 py-1.5">
                <div className="size-8 animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : !members || members.length === 0 ? (
          <p className="text-xs text-neutral-600">No members to show.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/5">
                <Avatar className="size-8 border border-white/10">
                  <AvatarImage src={member.imageUrl ?? undefined} alt={member.username} />
                  <AvatarFallback>{member.username?.charAt(0)?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm text-neutral-200">{member.username}</span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
