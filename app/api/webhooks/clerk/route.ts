// app/api/webhooks/clerk/route.ts
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const evt = await verifyWebhook(req);
    const eventType = evt.type;

    console.log(`Received event: ${eventType}`);

    if (eventType === "user.created") {
      const userData = {
        clerkUserId: evt.data.id,
        email: evt.data.email_addresses?.[0]?.email_address,
        firstName: evt.data.first_name,
        lastName: evt.data.last_name,
      };


      // Use Docker internal address for the gateway
      const gatewayURL = "http://discocord_gw:8080/users";


      const resp = await fetch(gatewayURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (!resp.ok) {
        console.error("Error forwarding to gateway:", await resp.text());
        return new Response("Gateway error", { status: 502 });
      }
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}
