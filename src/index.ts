import Bot from "./lib/bot.js";
import getPostText from "./lib/getPostText.js";

var run = await Bot.run(getPostText); // Run the bot, supplying it the getPostText function from getPostText.ts.
console.log(`[${new Date().toISOString()}] Posts complete!`); // Write to the console, saying that the posting operation is complete.