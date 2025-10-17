import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";

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
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
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
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
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
