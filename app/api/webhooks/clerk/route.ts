import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";


const gatewayURL = "http://discocord_gw:8080/users";


function gatewayHeaders(token?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    const token = await authResult.getToken();
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
          id: userId,
          username: evt.data.username,
          email: evt.data.email_addresses?.[0]?.email_address,
          imageUrl: evt.data.image_url,
          createdAt: evt.data.created_at,
        };

        const res = await fetch(gatewayURL, {
          method: "POST",
          headers: gatewayHeaders(null),
          body: JSON.stringify(userData),
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[Webhook] Failed to create user ${userId}: ${res.status} ${errorText}`);
        }
        break;
      }

      case "user.updated": {
        const userData = {
          id: userId,
          username: evt.data.username,
          email: evt.data.email_addresses?.[0]?.email_address,
          imageUrl: evt.data.image_url,
          updatedAt: evt.data.updated_at,
        };

        const res = await fetch(`${gatewayURL}/${userId}`, {
          method: "PUT",
          headers: gatewayHeaders(token),
          body: JSON.stringify(userData),
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[Webhook] Failed to update user ${userId}: ${res.status} ${errorText}`);
        }
        break;
      }

      case "user.deleted": {
        const res = await fetch(`${gatewayURL}/${userId}`, {
          method: "DELETE",
          headers: gatewayHeaders(token),
        });
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[Webhook] Failed to delete user ${userId}: ${res.status} ${errorText}`);
        }
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
