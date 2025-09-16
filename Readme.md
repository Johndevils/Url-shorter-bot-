l# Telegram URL Shortener on Cloudflare Workers

A powerful, serverless URL shortening bot for Telegram, built to run entirely on the Cloudflare edge network. It's fast, secure, and infinitely scalable, all while running on a generous free tier.


*(The bot greets users with an interactive welcome screen)*

## ✨ Features

-   **🚀 Edge-Hosted:** Deployed on Cloudflare Workers for minimal latency and high availability worldwide.
-   **🔗 Custom Domains:** Serve shortened links from your own domain (e.g., `link.yourdomain.com`).
-   **🎨 Custom Shortcodes:** Users can provide their own custom aliases for links.
-   **👑 Admin Controls:** Includes a secure, admin-only `/broadcast` command to send messages to all users.
-   **🤖 Interactive UI:** Uses modern inline keyboards for a user-friendly experience, including a "Copy Link" helper and a `/help` menu.
-   **🖼️ Rich Onboarding:** Welcomes new users with an image and clear instructions via the `/start` command.
-   **🔒 Secure:** Uses a webhook secret to validate requests from Telegram and an admin ID to protect sensitive commands.
-   **💰 Cost-Effective:** The entire stack (Workers, KV Storage) is designed to operate within Cloudflare's generous free tier.

## ⚙️ How It Works

The project consists of a single Cloudflare Worker that acts as a router for two main functions:

1.  **URL Redirection (GET Requests):**
    -   A user visits a short link like `https://yourdomain.com/shortcode`.
    -   The Worker intercepts the request, looks up the `shortcode` in a Cloudflare KV namespace (`LINKS`).
    -   If found, it issues an HTTP 302 redirect to the original long URL. Otherwise, it returns a 404.

2.  **Telegram Bot Webhook (POST Requests):**
    -   A user interacts with the bot on Telegram.
    -   Telegram sends an update to the Worker's secure webhook endpoint (`/webhook`).
    -   The Worker validates the request, processes the command (`/start`, `/shorten`, `/broadcast`, or a plain URL), and interacts with the KV namespaces (`LINKS` for URLs, `USERS` for user IDs).
    -   It then uses the Telegram Bot API to send a reply back to the user.

## 🛠️ Setup and Deployment Guide

Follow these steps to deploy your own instance of the bot.

### 1. Prerequisites

-   A **Cloudflare account**.
-   A **custom domain** connected to your Cloudflare account.
-   **Node.js** and **npm** installed on your machine.
-   **Wrangler CLI** installed globally: `npm install -g wrangler`.
-   A **Telegram Bot Token**. Get one by talking to [@BotFather](https://t.me/BotFather).
-   Your personal **Telegram Chat ID**. Get it by messaging [@userinfobot](https://t.me/userinfobot). This will be your `ADMIN_CHAT_ID`.

### 2. Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/urlshortener-bot.git
    cd urlshortener-bot
    ```

2.  **Login to Wrangler:**
    ```bash
    npx wrangler login
    ```

### 3. Configuration

1.  **Create KV Namespaces:**
    You need two KV namespaces: one for links and one to store user IDs for broadcasting.
    ```bash
    npx wrangler kv:namespace create LINKS
    npx wrangler kv:namespace create USERS
    ```
    Wrangler will output the `id` for each namespace.

2.  **Configure `wrangler.toml`:**
    Open the `wrangler.toml` file and fill in the placeholders:
    -   `BASE_URL`: Your custom domain for short links (e.g., `"https://short.my.app"`).
    -   `id` for `LINKS`: Paste the ID you got from the `kv:namespace create LINKS` command.
    -   `id` for `USERS`: Paste the ID you got from the `kv:namespace create USERS` command.

3.  **Set Production Secrets:**
    Use Wrangler to securely store your bot token, webhook secret, and admin ID. These will be encrypted and available only to your Worker.
    ```bash
    # Generate a strong, random string for your webhook secret
    # On Linux/macOS: openssl rand -hex 16
    
    npx wrangler secret put BOT_TOKEN
    # (Paste your Bot Token from @BotFather and press Enter)

    npx wrangler secret put WEBHOOK_SECRET
    # (Paste your randomly generated secret and press Enter)

    npx wrangler secret put ADMIN_CHAT_ID
    # (Paste your numeric Telegram Chat ID and press Enter)
    ```

### 4. Deployment

1.  **Deploy the Worker:**
    ```bash
    npx wrangler deploy
    ```
    After deployment, Wrangler will give you a `.workers.dev` URL.

2.  **Add a Custom Route:**
    In your Cloudflare Dashboard:
    -   Navigate to your domain.
    -   Go to **Workers & Pages** from the left sidebar.
    -   Click **Add route**.
    -   **Route:** `yourdomain.com/*` (replace with your actual domain and use a wildcard).
    -   **Service:** Select your `urlshortener-bot` Worker.
    -   **Environment:** Production.
    -   Click **Save**.

3.  **Set the Telegram Webhook:**
    The final step is to tell Telegram where to send bot updates. Run the following `curl` command in your terminal, replacing the placeholders with your actual values.
    ```bash
    curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://yourdomain.com/webhook&secret_token=<WEBHOOK_SECRET>"
    ```
    **Example:**
    ```bash
    curl "https://api.telegram.org/bot12345:ABC-DEF/setWebhook?url=https://short.my.app/webhook&secret_token=a1b2c3d4e5f6a1b2c3d4e5f6"
    ```
    If successful, Telegram will respond with `{"ok":true,"result":true,"description":"Webhook was set"}`.

Your bot is now live and ready to use!

## 🚀 Usage

### For Users

-   **Start the bot:** Send `/start` to see the welcome message.
-   **Get Help:** Click the **❓ How to Use** button.
-   **Shorten a URL:** Just send any valid URL as a message.
-   **Create a Custom Link:** `/shorten https://example.com/a-very-long-url my-custom-link`

### For Admins

-   **Broadcast a Message:** Send a message to every user who has started the bot.
    `/broadcast This is an important update for everyone!`

## 💻 Technology Stack

-   **Runtime:** Cloudflare Workers
-   **Database:** Cloudflare KV
-   **API:** Telegram Bot API
-   **Deployment:** Wrangler CLI
Telegram sends an update to the Worker's secure webhook endpoint (/webhook).

The Worker validates the request, processes the command (/start, /shorten, /broadcast, or a plain URL), and interacts with the KV namespaces (LINKS for URLs, USERS for user IDs).

It then uses the Telegram Bot API to send a reply back to the user.

🛠️ Setup and Deployment Guide

Follow these steps to deploy your own instance of the bot.

1. Prerequisites

A Cloudflare account.

A custom domain connected to your Cloudflare account.

Node.js and npm installed on your machine.

Wrangler CLI installed globally: npm install -g wrangler.

A Telegram Bot Token. Get one by talking to @BotFather.

Your personal Telegram Chat ID. Get it by messaging @userinfobot. This will be your ADMIN_CHAT_ID.

2. Installation

Clone the repository:

code
Bash
download
content_copy
expand_less

git clone https://github.com/your-username/urlshortener-bot.git
cd urlshortener-bot

Login to Wrangler:

code
Bash
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
npx wrangler login
3. Configuration

Create KV Namespaces:
You need two KV namespaces: one for links and one to store user IDs for broadcasting.

code
Bash
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
npx wrangler kv:namespace create LINKS
npx wrangler kv:namespace create USERS

Wrangler will output the id for each namespace.

Configure wrangler.toml:
Open the wrangler.toml file and fill in the placeholders:

BASE_URL: Your custom domain for short links (e.g., "https://short.my.app").

id for LINKS: Paste the ID you got from the kv:namespace create LINKS command.

id for USERS: Paste the ID you got from the kv:namespace create USERS command.

Set Production Secrets:
Use Wrangler to securely store your bot token, webhook secret, and admin ID. These will be encrypted and available only to your Worker.

code
Bash
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
# Generate a strong, random string for your webhook secret
# On Linux/macOS: openssl rand -hex 16

npx wrangler secret put BOT_TOKEN
# (Paste your Bot Token from @BotFather and press Enter)

npx wrangler secret put WEBHOOK_SECRET
# (Paste your randomly generated secret and press Enter)

npx wrangler secret put ADMIN_CHAT_ID
# (Paste your numeric Telegram Chat ID and press Enter)
4. Deployment

Deploy the Worker:

code
Bash
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
npx wrangler deploy

After deployment, Wrangler will give you a .workers.dev URL.

Add a Custom Route:
In your Cloudflare Dashboard:

Navigate to your domain.

Go to Workers & Pages from the left sidebar.

Click Add route.

Route: yourdomain.com/* (replace with your actual domain and use a wildcard).

Service: Select your urlshortener-bot Worker.

Environment: Production.

Click Save.

Set the Telegram Webhook:
The final step is to tell Telegram where to send bot updates. Run the following curl command in your terminal, replacing the placeholders with your actual values.

code
Bash
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
curl "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://yourdomain.com/webhook&secret_token=<WEBHOOK_SECRET>"

Example:

code
Bash
download
content_copy
expand_less
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END
curl "https://api.telegram.org/bot12345:ABC-DEF/setWebhook?url=https://short.my.app/webhook&secret_token=a1b2c3d4e5f6a1b2c3d4e5f6"

If successful, Telegram will respond with {"ok":true,"result":true,"description":"Webhook was set"}.

Your bot is now live and ready to use!

🚀 Usage
For Users

Start the bot: Send /start to see the welcome message.

Get Help: Click the ❓ How to Use button.

Shorten a URL: Just send any valid URL as a message.

Create a Custom Link: /shorten https://example.com/a-very-long-url my-custom-link

For Admins

Broadcast a Message: Send a message to every user who has started the bot.
/broadcast This is an important update for everyone!

💻 Technology Stack

Runtime: Cloudflare Workers

Database: Cloudflare KV

API: Telegram Bot API

Deployment: Wrangler CLI
