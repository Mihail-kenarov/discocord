import { currentUser } from '@clerk/nextjs/server';
import { Suspense } from 'react';
import { ClientGatewayButton } from './ClientGatewayButton';

// Server component wrapper to fetch user and render client portion
export default async function MePage() {
  const user = await currentUser();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-white">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
        {user ? `Welcome back, ${user.firstName || user.username || 'friend'}!` : 'Welcome'}
      </h1>
      <p className="text-white/70 max-w-md text-center text-sm md:text-base">
        This is your personal space. More features coming soon.
      </p>
      <Suspense fallback={<div className="text-white/60 text-sm">Loading action...</div>}>
        <ClientGatewayButton />
      </Suspense>
    </main>
  );
}

// Client component moved to separate file to correctly scope 'use client'
