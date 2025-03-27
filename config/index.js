const defaultConfig = require("./default");
const fs = require("fs");
const path = require("path");

// Try to load local config
let localConfig = {};
const localConfigPath = path.join(__dirname, "local.js");

if (fs.existsSync(localConfigPath)) {
  localConfig = require("./local");
}

// Merge configs with local overriding default
const config = {
  ...defaultConfig,
  ...localConfig,
};

// Validate essential config values
function validateConfig() {
  const requiredValues = [
    { path: "bot.token", name: "Bot token" },
    { path: "bot.adminId", name: "Admin ID" },
  ];

  const errors = [];

  for (const { path, name } of requiredValues) {
    const value = path.split(".").reduce((obj, key) => obj && obj[key], config);
    if (!value) {
      errors.push(`${name} is not set`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join("\n")}`);
  }
}

validateConfig();

module.exports = config;
