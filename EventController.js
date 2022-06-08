const e = require("./Event.js");

module.exports = class EventController
{
    constructor(bot)
    {
        bot.on('ready', e.on_server_startup);
        bot.on('message', e.on_client_message);
        bot.on('raw', e.on_client_reaction);
    }
}