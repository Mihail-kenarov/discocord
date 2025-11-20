import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";

const gatewayURL = "http://discocord_gw:8080/users";

function gatewayHeaders(userId: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.SERVICE_API_TOKEN;
  if (token) {
    headers["X-Service-Token"] = token;
    headers["X-User-ID"] = userId;
  }
  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);
    const eventType = evt.type;
    const userId = evt.data?.id;

    if (typeof userId !== "string" || userId.length === 0) {
      console.error("Webhook missing user id", { eventType, data: evt.data });
      return new Response("Invalid webhook payload", { status: 400 });
    }

    console.log(`Received event: ${eventType}`);

    switch (eventType) {
      case "user.created": {
        const userData = {
          clerkUserId: userId,
          username: evt.data.username,
          email: evt.data.email_addresses?.[0]?.email_address,
          imageUrl: evt.data.image_url,
          createdAt: evt.data.created_at,
        };

        await fetch(gatewayURL, {
          method: "POST",
          headers: gatewayHeaders(userId),
          body: JSON.stringify(userData),
        });
        break;
      }

      case "user.updated": {
        const userData = {
          clerkUserId: userId,
          username: evt.data.username,
          email: evt.data.email_addresses?.[0]?.email_address,
          imageUrl: evt.data.image_url,
          updatedAt: evt.data.updated_at,
        };

        await fetch(`${gatewayURL}/${userId}`, {
          method: "PUT",
          headers: gatewayHeaders(userId),
          body: JSON.stringify(userData),
        });
        break;
      }

      case "user.deleted": {
        await fetch(`${gatewayURL}/${userId}`, {
          method: "DELETE",
          headers: gatewayHeaders(userId),
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
