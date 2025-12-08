export type Guild = {
  id: string;
  name: string;
  iconUrl?: string | null;
  ownerId: string;
};

export type GuildChannel = {
  id: number;
  guildId: number;
  name: string;
  position: number;
};

export type GuildMessage = {
  id: string;
  channelId: GuildChannel["id"];
  authorId: string;
  author: {
    username: string;
    imageUrl?: string | null;
  };
  timestamp: string;
  content: string;
  attachment?: {
    url: string;
    type: string;
    size: number;
  } | null;
};

export type GuildWithChannels = Guild & {
  channels: GuildChannel[];
  messages: GuildMessage[];
};

export type AppSidebarUser = {
  id: string;
  username: string;
  displayName?: string | null;
  imageUrl?: string | null;
};

export type MemberUser = {
  id: string;
  username: string;
  imageUrl?: string | null;
};
