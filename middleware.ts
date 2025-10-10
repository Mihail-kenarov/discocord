// middleware.ts (or tsx)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

// Define route matcher for webhook path(s)
const isWebhookRoute = createRouteMatcher([
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isWebhookRoute(req)) {
    // If it's a webhook route, do *not* enforce auth
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static assets
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run on API routes (so we can catch /api/webhooks too)
    "/(api|trpc)(.*)",
  ],
};
