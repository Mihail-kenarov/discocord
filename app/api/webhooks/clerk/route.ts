import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";


// Use GATEWAY_URL for GKE deployments, fallback to Docker network for local
const gatewayURL = `${process.env.GATEWAY_URL || "http://discocord_gw:8080"}/users`;


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
          clerkUserId: userId,
          username: evt.data.username,
          imageUrl: evt.data.image_url,
          createdAt: evt.data.created_at,
        };

        console.log("Creating user in gateway:", userData, "URL:", gatewayURL);

        const response = await fetch(gatewayURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
        if (!response.ok) {
          console.error("Failed to create user in gateway:", response.status, await response.text());
        }
        break;
      }

      case "user.updated": {
        const userData = {
          clerkUserId: userId,
          username: evt.data.username,
          imageUrl: evt.data.image_url,
          updatedAt: evt.data.updated_at,
        };

        await fetch(`${gatewayURL}/${userId}`, {
          method: "PUT",
          headers: gatewayHeaders(token),
          body: JSON.stringify(userData),
        });
        break;
      }

      case "user.deleted": {
        await fetch(`${gatewayURL}/${userId}`, {
          method: "DELETE",
          headers: gatewayHeaders(token),
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
