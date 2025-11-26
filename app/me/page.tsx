import { currentUser } from '@clerk/nextjs/server';
import type { Person } from './FriendsTabs';
import { MeClient } from './MeClient';
import type { GuildWithChannels } from './displayDataModels';

// Server component wrapper to fetch user and render client portion
export default async function MePage() {
  const user = await currentUser();

  // Guild data loads client-side from the gateway.
  const guilds: GuildWithChannels[] = [];

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
