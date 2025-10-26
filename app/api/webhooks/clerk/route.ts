import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";

function getImageUrl(data: unknown): string | undefined {
  if (data && typeof data === "object" && "image_url" in data) {
    const value = (data as { image_url?: unknown }).image_url;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);
    const eventType = evt.type;

    console.log(`Received event: ${eventType}`);

    const gatewayURL = "http://discocord_gw:8080/users";

    switch (eventType) {
      case "user.created": {
        const userData = {
          clerkUserId: evt.data.id,
          username: evt.data.username,
          email: evt.data.email_addresses?.[0]?.email_address,
          imageUrl: getImageUrl(evt.data),
          createdAt: evt.data.created_at,
        };

        await fetch(gatewayURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
        break;
      }

      case "user.updated": {
        const userData = {
          clerkUserId: evt.data.id,
          username: evt.data.username,
          email: evt.data.email_addresses?.[0]?.email_address,
          imageUrl: getImageUrl(evt.data),
          updatedAt: evt.data.updated_at,
        };

        await fetch(`${gatewayURL}/${evt.data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
        break;
      }

      case "user.deleted": {
        await fetch(`${gatewayURL}/${evt.data.id}`, {
          method: "DELETE",
        });
        break;
      }

      default:
        console.log("Unhandled event type:", eventType);
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}
