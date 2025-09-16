/**
 * Production-ready, combined Cloudflare Worker for a Telegram URL Shortener Bot.
 *
 * Improvements:
 * - Uses ctx.waitUntil for a non-blocking, scalable broadcast feature to prevent timeouts.
 * - Handles command-only edge cases (e.g., /shorten with no URL).
 * - Complete with all helper functions.
 */

const HELP_TEXT = `Welcome to the URL Shortener Bot! 🚀

Send me any long URL, and I'll create a short link for you using **BASE_URL_PLACEHOLDER**.

**How to use:**
1️⃣ **Simple shorten:** Just send a URL.
   \`https://my-very-long-url.com/with/path\`

2️⃣ **Custom shortcode:** Use the /shorten command.
   \`/shorten https://... my-link\`

As the admin, you can also use:
\`/broadcast Your message here\`
`;

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (request.method === "POST" && url.pathname === `/webhook`) {
            // Pass ctx to handleWebhook for waitUntil
            return handleWebhook(request, env, ctx);
        }
        if (request.method === "GET") {
            return handleRedirect(request, env);
        }
        return new Response("Method Not Allowed", { status: 405 });
    },
};

async function handleWebhook(request, env, ctx) {
    const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secretToken !== env.WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 403 });
    }

    const update = await request.json();

    if (update.callback_query) {
        return handleCallbackQuery(update.callback_query, env);
    }

    if (update.message && update.message.text) {
        // Pass ctx to handleMessage for the broadcast command
        return handleMessage(update.message, env, ctx);
    }

    return new Response("OK");
}

async function handleMessage(message, env, ctx) {
    const chatId = message.chat.id;
    const messageText = message.text.trim();

    if (messageText.startsWith("/start")) {
        return handleStartCommand(env, chatId);
    }
    if (messageText.startsWith("/broadcast")) {
        // Pass ctx to the broadcast handler
        return handleBroadcastCommand(env, ctx, chatId, messageText);
    }

    const parts = messageText.split(/\s+/);
    let command = parts[0];
    let longUrl = parts[0].startsWith('/') ? parts[1] : parts[0];
    let customCode = parts[0].startsWith('/') ? parts[2] : null;

    // Improved Edge Case Handling
    if (command.startsWith('/') && !longUrl) {
        return await sendMessage(env.BOT_TOKEN, chatId, `Please provide a URL after the command.\nExample: \`${command} https://example.com\``);
    }

    if (!isValidUrl(longUrl)) {
        return await sendMessage(env.BOT_TOKEN, chatId, "Please provide a valid URL. It should start with http:// or https://");
    }

    try {
        let shortCode = customCode;
        if (!shortCode) {
            shortCode = generateRandomCode();
        } else {
            const existing = await env.LINKS.get(shortCode);
            if (existing) {
                return await sendMessage(env.BOT_TOKEN, chatId, `Sorry, the custom code "${shortCode}" is already taken.`);
            }
        }

        await env.LINKS.put(shortCode, longUrl);
        const shortUrl = `${env.BASE_URL}/${shortCode}`;
        const replyText = `✅ Here's your short link:\n\`${shortUrl}\``;

        const inlineKeyboard = {
            inline_keyboard: [[{ text: "📋 Copy Link", callback_data: "copy_link_info" }]]
        };
        return await sendMessage(env.BOT_TOKEN, chatId, replyText, inlineKeyboard);

    } catch (error) {
        console.error(error);
        return await sendMessage(env.BOT_TOKEN, chatId, "An unexpected error occurred.");
    }
}

async function handleCallbackQuery(callbackQuery, env) {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;

    switch (data) {
        case 'show_help':
            const helpText = HELP_TEXT.replace('BASE_URL_PLACEHOLDER', env.BASE_URL);
            await answerCallbackQuery(env.BOT_TOKEN, callbackQuery.id);
            return await sendMessage(env.BOT_TOKEN, chatId, helpText);
        case 'copy_link_info':
            return await answerCallbackQuery(env.BOT_TOKEN, callbackQuery.id, { text: "Tap the link text above to copy it easily.", show_alert: true });
        default:
            return await answerCallbackQuery(env.BOT_TOKEN, callbackQuery.id);
    }
}

async function handleStartCommand(env, chatId) {
    await env.USERS.put(`user_${chatId}`, 'true');
    const welcomeMessage = `Welcome to the URL Shortener Bot! 🚀\n\nJust send me a URL to get started.`;
    const inlineKeyboard = {
        inline_keyboard: [[{ text: "❓ How to Use", callback_data: "show_help" }]]
    };
    return await sendPhoto(env.BOT_TOKEN, chatId, env.START_IMAGE_URL, welcomeMessage, inlineKeyboard);
}

// --- IMPROVED BROADCAST FUNCTION ---
async function handleBroadcastCommand(env, ctx, chatId, messageText) {
    if (String(chatId) !== String(env.ADMIN_CHAT_ID)) {
        return await sendMessage(env.BOT_TOKEN, chatId, "⛔ You are not authorized to use this command.");
    }

    const messageToSend = messageText.substring("/broadcast".length).trim();
    if (!messageToSend) {
        return await sendMessage(env.BOT_TOKEN, chatId, "Please provide a message. Usage: `/broadcast Hello everyone!`");
    }

    // Use waitUntil to perform the broadcast in the background
    ctx.waitUntil(performBroadcast(env, messageToSend, chatId));

    // Respond to the admin immediately
    return sendMessage(env.BOT_TOKEN, chatId, `📢 Broadcast started... You will receive a report when it's complete.`);
}

async function performBroadcast(env, message, adminChatId) {
    const userKeys = await env.USERS.list({ prefix: "user_" });
    let successCount = 0;
    let failCount = 0;

    const broadcastPromises = userKeys.keys.map(key => {
        const targetChatId = key.name.split('_')[1];
        return sendMessage(env.BOT_TOKEN, targetChatId, message)
            .then(response => {
                if (response.ok) {
                    successCount++;
                } else {
                    failCount++;
                }
            })
            .catch(() => {
                failCount++;
            });
    });

    // Wait for all messages to be sent in parallel
    await Promise.all(broadcastPromises);

    const report = `Broadcast complete.\n✅ Sent successfully to ${successCount} users.\n❌ Failed for ${failCount} users.`;
    await sendMessage(env.BOT_TOKEN, adminChatId, report);
}

// --- Telegram API Helpers ---

async function sendMessage(botToken, chatId, text, replyMarkup = null) {
    const payload = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
    if (replyMarkup) {
        payload.reply_markup = JSON.stringify(replyMarkup);
    }
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        console.error(`Failed to send message to ${chatId}:`, await response.text());
    }
    return response;
}

async function sendPhoto(botToken, chatId, photoUrl, caption, replyMarkup = null) {
    const payload = { chat_id: chatId, photo: photoUrl, caption: caption, parse_mode: 'Markdown' };
    if (replyMarkup) {
        payload.reply_markup = JSON.stringify(replyMarkup);
    }
    return fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function answerCallbackQuery(botToken, callbackQueryId, options = {}) {
    const payload = { callback_query_id: callbackQueryId, ...options };
    return fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

// --- Included Utility Functions ---

async function handleRedirect(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.slice(1);

  if (path) {
    const longUrl = await env.LINKS.get(path);
    if (longUrl) {
      return Response.redirect(longUrl, 302);
    } else {
      return new Response("URL Not Found", { status: 404 });
    }
  }

  return new Response("Welcome to the URL Shortener! Use the Telegram bot to create links.", { status: 200 });
}

function generateRandomCode(length = 6) {
  return Math.random().toString(36).substring(2, 2 + length);
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}