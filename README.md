# Blurnet Telegram Bot

A professional Telegram bot for managing a VPN subscription service with payment processing capabilities. Built with Node.js and the Grammy framework.

## ✨ Features

- 🚀 Multiple subscription plans (monthly, quarterly, half-yearly, yearly)
- 💳 Complete payment workflow (subscription selection, payment instructions, receipt submission)
- 👑 Admin panel for payment approvals/rejections
- 📱 Support for all major platforms (iOS, Android, macOS, Windows)
- 🔒 Privacy-focused design

## 🛠️ Technology Stack

- Node.js
- Grammy (Telegram Bot Framework)
- Environment-based configuration
- Modular code architecture

## 📋 Prerequisites

- Node.js 16.x or higher
- A Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Admin Telegram user ID

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/blurnet.git
   cd blurnet
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example environment file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   Then edit the `.env` file with your bot token and admin ID:

   ```
   BOT_API_KEY=your_telegram_bot_token
   ADMIN_ID=your_telegram_id
   ```

4. **Start the bot**

   ```bash
   npm start
   ```

## 🧰 Project Structure

```
blurnet/
├── src/
│   ├── config/       # Environment and configuration
│   ├── controllers/  # Logic for different actions
│   ├── keyboards/    # Keyboard layouts
│   ├── constants/    # Static data
│   ├── utils/        # Helper functions
│   └── bot.js        # Main bot setup
├── index.js          # Entry point
└── README.md         # Documentation
```

## 📸 Media Files

The bot uses pre-uploaded Telegram images for better performance. To update these:

1. Uncomment the `/upload_photos` command in `src/bot.js`
2. Start the bot and run the command (admin only)
3. Get the file IDs from the console output
4. Update the `PHOTO_IDS` object in `src/constants/media.js`
5. Comment out the command again

## 🚀 Usage

### Basic Commands

- `/start` - Initiates the bot with welcome message and main menu
- Send "Инструкция 📑" to get usage instructions
- Send "Начать работу с blurnet 🚀" to view and select subscription plans
- Send "Правила использования" to view the terms of service

### Admin Commands

- Payment approval/rejection via inline buttons on payment receipts

## 📱 Screenshots

(Add screenshots of your bot here)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📧 Contact

For support or inquiries, reach out to:
- Telegram: [@blurnet_support](https://t.me/blurnet_support)
- Updates: [@blurnet_news](https://t.me/blurnet_news)
```
