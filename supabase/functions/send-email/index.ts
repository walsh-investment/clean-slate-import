// send-email edge function
// A custom email provider for authentication messages using Resend
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@2.0.0";
// Initialize Resend with your API key
// You'll need to set this as a secret
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET")?.replace("v1,whsec_", "");
// You can customize these email templates
const emailTemplates = {
  signup: {
    subject: "Confirm Your Email",
    text: (token)=>`Welcome! Your confirmation code is: ${token}`,
    html: (token, confirmationUrl)=>`
      <h2>Welcome to Natural DB</h2>
      <p>Follow this link to confirm your email:</p>
      <p><a href="${confirmationUrl}">Confirm your email address</a></p>
      <p>Alternatively, enter the code: ${token}</p>
    `
  },
  magiclink: {
    subject: "Your Magic Link",
    text: (token)=>`Your login code is: ${token}`,
    html: (token, confirmationUrl)=>`
      <h2>Login to Natural DB</h2>
      <p>Follow this link to log in:</p>
      <p><a href="${confirmationUrl}">Log In</a></p>
      <p>Alternatively, enter the code: ${token}</p>
    `
  },
  recovery: {
    subject: "Reset Your Password",
    text: (token)=>`Your password reset code is: ${token}`,
    html: (token, confirmationUrl)=>`
      <h2>Reset Your Password</h2>
      <p>Follow this link to reset your password:</p>
      <p><a href="${confirmationUrl}">Reset Password</a></p>
      <p>Alternatively, enter the code: ${token}</p>
    `
  }
};
Deno.serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405
    });
  }
  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    // Verify webhook signature
    if (!hookSecret) {
      return new Response("Hook secret not configured", {
        status: 500
      });
    }
    const wh = new Webhook(hookSecret);
    let data;
    try {
      data = wh.verify(payload, headers);
    } catch (error) {
      console.error("Webhook verification failed:", error);
      return new Response("Invalid webhook signature", {
        status: 401
      });
    }
    const { user, email_data } = data;
    // Generate confirmation URL
    const confirmationUrl = `${email_data.site_url}/auth/v1/verify?token=${email_data.token_hash}&type=${email_data.email_action_type}&redirect_to=${email_data.redirect_to}`;
    // Get the appropriate email template
    const template = emailTemplates[email_data.email_action_type] || {
      subject: "Action Required",
      text: (token)=>`Your verification code is: ${token}`,
      html: (token, url)=>`<p>Your verification code is: ${token}</p><p><a href="${url}">Click here</a></p>`
    };
    // Send the email
    const { error } = await resend.emails.send({
      from: "Natural DB <notifications@yourdomain.com>",
      to: [
        user.email
      ],
      subject: template.subject,
      html: template.html(email_data.token, confirmationUrl),
      text: template.text(email_data.token)
    });
    if (error) {
      console.error("Email sending error:", error);
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    // Return successful response
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error handling request:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
});
