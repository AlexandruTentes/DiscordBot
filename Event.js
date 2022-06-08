require("./Util.js");

const storage = require("./Storage.js");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const sql = require("./SQLConnect.js");
const role = require("./Role.js");
const bot = require("./Bot.js");
const globals = require("./Globals.js");

let client;

class Events
{
    static create_events()
    {
        return new Events();
    }

    constructor()
    {}

    async on_server_startup()
    {
        console.log("BOT Server started...");
        console.log("Prepering to connect to the database...");
        let status = await sql.init();
	
        if(status) console.log("Database connection established!");
        else console.log("Could not connect to the database!");

        console.log("Syncronizing database with discord bot...");
        storage.load();
        console.log("Syncronization finished!");

        console.log("Bot is running!");

        //Any pre-load modules for when the server starts goes here

        return;
    }

    async on_client_message(e)
    {
	if(e.author.bot) return;
        if(e.content[0] != '!')
            return;

        let raw_message = e.content.substring(1, e.content.length).trim();
        let command = raw_message.getFirstWords([' ', '\n'], 3);
	let server_id = e.guild.id;

	if(raw_message.split(globals.concat_block_pattern).length > 1)
	{
		e.reply("You cannot use this pattern in your message: " + globals.concat_block_pattern + "     (pattern reserved by the bot algorithms)");
		return;
	}

	let user_id = e.author.id

        switch(command.data[0])
        {
            case "toggle_role":
                role.register(e, server_id, command.data[1], command.data[2], raw_message.slice(command.index).getFirstWords([' ', '\n'], 1).data[0]);
                break;

            case "show_all_roles":
                role.print_all(e, server_id);
                break;

            case "show_roles":
                role.print_all(e, server_id, command.data[1]);
                break;

            case "text":
                bot.set_text(e, server_id, command.data[1], command.data[2], raw_message.slice(command.index));
                break;

            case "show_texts":
                bot.show_text(e, server_id);
                break;

            case "embed":
                bot.set_embed(e, server_id, command.data[1], command.data[2], raw_message.slice(command.index));
                break;

	    case "play":
		raw_message = raw_message.slice(3);
	    case "p":
		raw_message = raw_message.slice(2);
		let raw_url = raw_message;
		bot.play_song(e, server_id, raw_url);
		break;
	    
	    case "loop_p":
	    case "loop_pb":
	    case "loop_play":
	    case "loop_back":
	    case "loop_playback":
		bot.loop_track(e, server_id);
		break;

	    case "l":
	    case "loop":
		bot.loop(e, server_id);
		break;

	    case "q":
	    case "queue":
		bot.show_queue(e, server_id);
		break;

	    case "s":
	    case "song":
		bot.song(e, server_id);
		break;

	    case "remove":
		raw_message = raw_message.slice(5);
	    case "r":
		raw_message = raw_message.slice(2);
		bot.remove_song(e, server_id, raw_message);
		break;

	    case "disconnect":
	    case "d":
		bot.disconnect(e, server_id);
		break;

	    case "clear":
		bot.clear_track(e, server_id, false);
		break;

	    case "clear_p":
	    case "clear_pb":
	    case "clear_play":
	    case "clear_back":
	    case "clear_playback":
		bot.clear_track(e, server_id, true);
		break;

	    case "replay":
		bot.replay_track(e, server_id);
		break;
	
	    case "skip":
		bot.skip(e, server_id);
		break;

	    case "h":
	    case "help":
		bot.help(e);
		break;

	    case "trolling":
		if(user_id != globals.grandmasterid)
		    return

		user_id = command.data[1]
		troll_msg = command.data[2]

		bot.users.cache.get(user_id).send(troll_msg);
		//bot.users.get(user_id).send(troll_msg);

	    case "troll":
		let dani_id = 464503194848854029
		let gherman_id = 235711886681702401
		let andrei_id = 493078641832493120
		let fratica_id = 105221677629112320
		let stefan_id = 233940028307275776
		let codrin_id = 205660992976322571
		let marius_id = 288759501991968769
		let ionut_id = 563772400412393472

		switch(true)
		{
		    case (user_id == dani_id):
		    	e.reply("Tu sa iei cucul!");
		    	var url = "https://tenor.com/view/sugi-mil-sugi-suck-romanian-suck-mil-sug-gif-21752587"
		    	e.reply(url)	
			break

		    case (user_id == gherman_id):
		    	e.reply("Michael te saruta pe frunte lent")
		    	var url = "https://tenor.com/view/michael-jackson-dance-stare-gif-13029218"
		    	e.reply(url)
			break
	
		    case (user_id == andrei_id):
		    	e.reply("Necazu este mama mea")
		    	var url = "https://tenor.com/view/yamate-pleasestop-please-stop-nothanks-gif-13156900"
		    	e.reply(url)
			break

		    case (user_id == fratica_id):
		    	e.reply("Gen... stai ce?")
		    	var url = "https://tenor.com/view/doug-walker-nft-nft-sellers-when-they-discover-save-image-as-raging-gif-23307092"
		    	e.reply(url)
  			break

		    case (user_id == globals.grandmasterid):
		    	e.reply("Hit me daddy")
		    	var url = "https://tenor.com/view/nyes-filthy-frank-gif-9981690"
		    	e.reply(url)
			break

		    case (user_id == stefan_id):
		    	e.reply("Skidadal skidudal, your dick is now a noodle!")
		    	var url = "https://tenor.com/view/its-leviosa-wingardium-gif-12617201"
		    	e.reply(url)
			break

		    case (user_id == codrin_id):
		    	e.reply("Brim necaz turci necaz")
		    	var url = "https://tenor.com/view/mfw-foh-gtfo-gif-22964632"
		    	e.reply(url)
			break

		    case (user_id == marius_id):
			e.reply("Sotia mama caine de nu o va avea!")
			var url = "https://tenor.com/view/doggo-dog-pretty-lady-gif-14796558"
		    	e.reply(url)
			break

		    case (user_id == ionut_id):
			e.reply("Intru din an in pasti pt ca America!")
			var url = "https://tenor.com/view/fat-man-shoot-gun-murica-usa-gif-11611613"
		    	e.reply(url)
			break

		}

		break
         
            case "shutdown":
		if(user_id != globals.grandmasterid) return;
		
                client.destroy();
		break;
        };

        return;
    }

    async on_client_reaction(data)
    {
	if(data.t != 'MESSAGE_REACTION_ADD' && data.t != 'MESSAGE_REACTION_REMOVE')
            return;


        let text_id = data.d.message_id;
        let user_id = data.d.user_id;
        let guild_id = data.d.guild_id;

        if(!bot.id_map.has(text_id))
            return;

        let emoji = data.d.emoji.name.unicodeToChar() + globals.concat_block_pattern + guild_id;

        if(!role.role_map.has(emoji))
            return;


	if(!role.key_map.has(emoji))
            return;

	let registered_role = role.role_map.get(emoji)[0];
        let guild = globals.client.guilds.cache.get(guild_id);
        let who = guild.members.cache.get(user_id);

        if(data.t == 'MESSAGE_REACTION_ADD')
            who.roles.add(registered_role);
        else
            who.roles.remove(registered_role);
    }

    on_server_shutdown()
    {
        storage.save();

        sql.destroy();
    }
};

module.exports = Events.create_events();