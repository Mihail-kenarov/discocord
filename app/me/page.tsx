import { currentUser } from '@clerk/nextjs/server';
import type { Person } from './FriendsTabs';
import { MeClient } from './MeClient';
import type { GuildWithChannels } from './types';

// Server component wrapper to fetch user and render client portion
export default async function MePage() {
  const user = await currentUser();

  // Sample data for now. Replace with gateway data when available.
  const guilds: GuildWithChannels[] = [
    {
      id: '1',
      name: 'Gaming Squad',
      ownerId: 'owner-1',
      iconUrl: null,
      channels: [
        { id: 101, guildId: 1, name: 'general', position: 0 },
        { id: 102, guildId: 1, name: 'strats', position: 1 },
        { id: 201, guildId: 1, name: 'Lounge', position: 0 },
      ],
      messages: [
        {
          id: 'm-101',
          channelId: 101,
          author: { username: 'alex.m' },
          timestamp: 'Today at 14:02',
          content: 'Hey squad! Raid tonight at 8pm?',
        },
        {
          id: 'm-102',
          channelId: 101,
          author: { username: 'jamie' },
          timestamp: 'Today at 14:05',
          content: 'Count me in. Need to restock potions before we jump in.',
        },
        {
          id: 'm-103',
          channelId: 102,
          author: { username: 'morgan' },
          timestamp: 'Yesterday at 21:14',
          content: 'Uploaded the new boss positioning chart in the docs channel. Take a look before tonight.',
        },
      ],
    },
    {
      id: '2',
      name: 'Dev Community',
      ownerId: 'owner-2',
      iconUrl: null,
      channels: [
        { id: 301, guildId: 2, name: 'general', position: 0 },
        { id: 302, guildId: 2, name: 'help-desk', position: 1 },
        { id: 401, guildId: 2, name: 'Standup', position: 0 },
      ],
      messages: [
        {
          id: 'm-201',
          channelId: 301,
          author: { username: 'priya' },
          timestamp: 'Today at 09:12',
          content: 'New Next.js 15 RC just dropped. Anyone tried the server actions yet?',
        },
        {
          id: 'm-202',
          channelId: 302,
          author: { username: 'leo' },
          timestamp: 'Today at 09:34',
          content: 'Stuck on a hydration mismatch error after upgrading. Sharing repro in a thread now.',
        },
      ],
    },
    {
      id: '3',
      name: 'Music Lovers',
      ownerId: 'owner-3',
      iconUrl: null,
      channels: [
        { id: 501, guildId: 3, name: 'general', position: 0 },
        { id: 502, guildId: 3, name: 'song-recs', position: 1 },
      ],
      messages: [
        {
          id: 'm-301',
          channelId: 502,
          author: { username: 'sam' },
          timestamp: 'Today at 08:03',
          content: 'Highly recommend the new Glass Animals single - perfect morning vibes.',
        },
      ],
    },
  ];

  const friends: Person[] = [
    { id: 1, name: 'Sarah Johnson' },
    { id: 2, name: 'Mike Chen' },
    { id: 3, name: 'Emma Wilson' },
    { id: 4, name: 'Alex Rodriguez' },
    { id: 5, name: 'Lisa Park' },
  ];

  const pending: Person[] = [
    { id: 'p1', name: 'David Kim' },
    { id: 'p2', name: 'Rachel Green' },
    { id: 'p3', name: 'Tom Anderson' },
  ];

  const username = user?.username ?? 'guest';
  const displayName = user?.username ?? 'Guest';

  return (
    <MeClient
      initialGuilds={guilds}
      friends={friends}
      pending={pending}
      user={{
        id: user?.id ?? 'guest',
        username,
        displayName,
        imageUrl: user?.imageUrl,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
      }}
    />
  );
}

// Client component moved to separate file to correctly scope 'use client'
