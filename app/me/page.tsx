import { currentUser } from '@clerk/nextjs/server';
import { Suspense } from 'react';
import { ClientGatewayButton } from './ClientGatewayButton';
import { AppSidebar } from './AppSidebar';
import { FriendsTabs, type Person } from './FriendsTabs';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

// Server component wrapper to fetch user and render client portion
export default async function MePage() {
  const user = await currentUser();

  // Sample data for now. Replace with gateway data when available.
  const guilds = [
    { id: 'g1', name: 'Gaming Squad' },
    { id: 'g2', name: 'Dev Community' },
    { id: 'g3', name: 'Music Lovers' },
    { id: 'g4', name: 'Art Studio' },
    { id: 'g5', name: 'Book Club' },
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

  const displayName = user
    ? user.username || 'User'
    : 'Guest';

  return (
    <SidebarProvider>
      <AppSidebar
        guilds={guilds}
        user={{ name: displayName, username: user?.username ?? null, imageUrl: user?.imageUrl }}
      />
      <SidebarInset className="min-h-screen">
        <header className="flex h-14 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Friends</h1>
        </header>
        <main className="flex flex-col gap-4 p-4">
          <FriendsTabs initialFriends={friends} initialPending={pending} />
          <section className="pt-4">
            <Suspense fallback={<div className="text-white/60 text-sm">Loading action...</div>}>
              <ClientGatewayButton />
            </Suspense>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Client component moved to separate file to correctly scope 'use client'
