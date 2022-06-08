const discord = require("discord.js");
const events = require("./EventController");
const bot_setup = require("./Bot.js");
const storage = require("./Storage");
const globals = require("./Globals");

let bot = new discord.Client();
let token = globals.bot_token;

//Store the bot object
globals.client = bot;

//Loading the bot events
new events(bot);

bot.login(token);

let bot_status;
let shutdown = false;
let attempted = false;

async function run()
{ 
    while(true)
    {
        if(bot.token == null)
	    shutdown = true;

        if(shutdown)
        {
	    await storage.save();

            break;
        }

        if(shutdown && !attempted)
        {
            await new Promise(resolve => setTimeout(resolve, 5000));

            bot.login(token);
            attempted = true;
            shutdown = false;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

run();