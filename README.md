# Blurnet Telegram Bot

A Telegram bot built with Node.js and the Grammy library to manage subscription plans, process payments, and handle admin approvals.

## Features

- **Subscription Plans**: Users can choose yearly, half-yearly, monthly, or trial plans.
- **Payment Workflow**: Sends payment details and requests receipts from users.
- **Admin Controls**: Admins can approve or reject payments with inline buttons.
- **Photo Integration**: Uses pre-uploaded Telegram photo IDs for fast media delivery.
- **Session Management**: Tracks user selections via Grammy's session middleware.

## Prerequisites

- Node.js (v16 or higher)
- Telegram Bot Token (get it from [@BotFather](https://t.me/BotFather))
- Admin Telegram ID

## Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/blurnet-bot.git
   cd blurnet-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory with:
   ```
   BOT_API_KEY=your_bot_token
   ADMIN_ID=your_admin_telegram_id
   ```

4. **Add Photo IDs**
   Update the `PHOTO_IDS` object in the code with Telegram File IDs for:
   - `tariffs`
   - `instruction`
   - `payment_success`
   - `payment_rejected`
   - `waiting`
   (See "Getting Photo IDs" below)

5. **Run the Bot**
   ```bash
   node index.js
   ```

## Getting Photo IDs

To use pre-uploaded photos:
1. Send each image (e.g., tariffs.jpg) to your bot in Telegram.
2. Use a command like `/upload_photos` (example in code comments) to log File IDs.
3. Replace placeholders in `PHOTO_IDS` with these IDs.

## Usage

- Start the bot with `/start`.
- Choose a plan via "Начать работу с blurnet".
- Follow prompts to pay and upload a receipt.
- Admin approves/rejects via inline buttons.

## Project Structure

```
blurnet-bot/
├── index.js       # Main bot logic
├── .env           # Environment variables (not tracked)
├── images/        # Local images (optional, for initial upload)
└── README.md      # This file
```

## Dependencies

- [Grammy](https://grammy.dev/) - Telegram Bot API framework
- [dotenv](https://www.npmjs.com/package/dotenv) - Environment variable management

## License

MIT License. See [LICENSE](LICENSE) for details.
