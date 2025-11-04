import { Inngest } from "inngest";
import User from "../models/User.js";
import Connection from "../models/Connection.js";
import sendEmail from "../configs/nodeMailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "marvify-app" });

// Inngest function to save user data to database
const syncUserCreation = inngest.createFunction(
  { id: "sync-user-from-clerk" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;
    let username = email_addresses[0]?.email_address.split("@")[0];

    // Check availability of username
    const user = await User.findOne({ username });
    if (user) {
      username = username + Math.floor(Math.random() * 10000);
    }

    const userData = {
      _id: id,
      email: email_addresses[0]?.email_address,
      full_name: `${first_name} ${last_name}`,
      username,
      profile_picture: image_url,
    };
    await User.create(userData);
  }
);

//Inngest function to update user data in database
const syncUserUpdation = inngest.createFunction(
  { id: "update-user-from-clerk" },
  { event: "clerk/user.updated" },
  async ({ event }) => {
    const { id, first_name, last_name, email_addresses, image_url } =
      event.data;

    const updatedUserData = {
      email: email_addresses[0]?.email_address,
      full_name: `${first_name} ${last_name}`,
      profile_picture: image_url,
    };
    await User.findByIdAndUpdate(id, updatedUserData);
  }
);

// Inngest function to delete user data from database
const syncUserDeletion = inngest.createFunction(
  { id: "delete-user-from-clerk" },
  { event: "clerk/user.deleted" },
  async ({ event }) => {
    const { id } = event.data;
    await User.findByIdAndDelete(id);
  }
);

// Inngest function to send welcome email to user
const sendWelcomeEmail = inngest.createFunction(
  { id: "send-welcome-email" },
  { event: "clerk/user.created" },
  async ({ event }) => {
    const { email } = event.data;
    const subject = "Welcome to Marvify";
    const body = "Welcome to Marvify. We are glad to have you on board.";
    await sendEmail(email, subject, body);
  }
);

// Inngest function to send connection request email to user
const sendConnectionRequestEmail = inngest.createFunction(
  { id: "send-new-connection-request-email" },
  { event: "app/connection-request" },
  async ({ event, step }) => {
    const { connectionId } = step.data;

    await step.run("send-connection-request-email", async () => {
      const connection = await Connection.findById(connectionId).populate(
        "from_user_id to_user_id"
      );
      const subject = "Marvify - New Connection Request";
      const body = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Hi ${connection.to_user_id.full_name},</h2>
    <p>You have a new connection request from ${connection.from_user_id.full_name} - @${connection.from_user_id.username}</p>
    <p>Click <a href="#{process.env.FRONTEND_URL}/connections" style="color: #10b981;">here</a> to accept or reject the request</p>
    <br/>
    <p>Thanks,<br/>Marvify - Stay Connected</p>
</div>
      `;
      await sendEmail({
        to: connection.to_user_id.email,
        subject,
        body,
      });
    });
    return {
      success: true,
      message: "Connection request email sent successfully",
    };
  }
);

export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
  sendWelcomeEmail,
];
