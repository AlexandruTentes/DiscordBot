const storage = require("./Storage.js");
const globals = require("./Globals.js");
const ytdl = require('ytdl-core');
const discord_yt = require("./YouTube.js");
const youtube = new discord_yt(globals.youtube_api_key[globals.youtube_api_key_index]);
const spotify = require("./Spotify.js");
const util = require("./Util.js");
const EventEmitter = require('events')
const sql = require("./SQLConnect.js");
//const yt = require("youtube-search-without-api-key");

class Bot
{
    static create_bot()
    {
        return new Bot(); 
    }

    constructor()
    {
        this.text_map = new Map();
        this.channel_map = new Map();
        this.demo_map = new Map();
        this.id_map = new Map();
	this.song_queue = new Map();
	this.song_queue_cpy = new Map();
	this.text_count = new Map();
	this.song_cache = new Map();
	this.server_song_error_count = new Map();
	this.server_dispatcher = new Map();
	this.server_spotify_fetch = new Map();
	this.server_bot_connection = new Map();

	this.youtube_token_daily_limit = false;
    }	

    async dynamic_play_song_load_end(e, server_id, raw_video, song)
    {
	let song_data = undefined;

	if(!this.song_cache.has(song))
	    song_data = this.populate_song_cache(raw_video, song);
	else song_data = this.song_cache.get(song).slice();

	await this.pupulate_song_queue(e, server_id, song_data, song, false);
    }
		 
    async dynamic_play_song(e, server_id, song)
    {
        let raw_video = [];
	let song_key = this.server_spotify_fetch.get(server_id).songs[0].slice();

	try
	{
	    let data = undefined;

	    if(!this.song_cache.has(song_key))
	    {
		let cache_data = await storage.load_songs(song_key);

	    	if(cache_data.length == 0)    
		{	
		    console.log(`Fetching the music from youtube: ${song_key}`);
		    raw_video = [await youtube.searchVideos(song_key)];
		    storage.save_songs(song_key, raw_video);
		}
		else
		{
		    console.log(`Getting the music from the database: ${song_key}`);
		    raw_video = cache_data;
		}				
	    }
	    else
		console.log(`Getting the music from the cache: ${song_key}`);

	    this.server_spotify_fetch.get(server_id).songs.shift();
	}
	catch(err)
	{
	    if(err.errno != undefined && err.errno == 45013)
	    {
		console.log("Database connection closed, attempting reconnection");
		let status = await sql.init();
		if(status) 
		{
		    console.log("Database connection established!");
		    this.dynamic_play_song(e, server_id, song);
		}
        	else 
		{
		    console.log("Could not connect to the database!");
		    e.reply(`SQL database connection expired and could not be recovered!`);
		}
	    }
	    else if(globals.youtube_api_key_index == globals.youtube_api_key.length - 1)
	    {
	        console.log(err);
	        e.reply(`Youtube API key reached its daily usage limit, upgrade plan to play more!`);
		let url = "https://tenor.com/view/david-tennant-cry-doctor-who-sad-rain-gif-11794483"
		e.reply(url)
		this.youtube_token_daily_limit = true;
	        return;
	    }
	    else
	    {
		console.log(`Youtube token '${globals.youtube_api_key[globals.youtube_api_key_index]}' expired!`);
		globals.youtube_api_key_index++;
		this.dynamic_play_song(e, server_id, song);
		return;
	    }
	}

	if(this.youtube_token_daily_limit)
	{
	    this.youtube_token_daily_limit = false;
	    globals.youtube_api_key_index = 0;
	}

	this.dynamic_play_song_load_end(e, server_id, raw_video, song)
    }

    async set_text(e, server_id, channel, key, message)
    {
	if(e.author.id != globals.grandmasterid)
	{
	    return;
	}

	key = key + globals.concat_block_pattern + server_id;

	if(this.text_count.get(server_id) > globals.max_texts)
	{
	    e.reply(`You have reached the maximum number of texts (${globals.max_texts}) 
		you can set on this server!`);
	    return;
	}

        let local_channel = undefined;
        let key_code = false;
        let key_code_done = false;
        let skip_newline = false;
        let code = "";
        let max_i = message.length > 50 ? 50 : message.length;
        let demo_text = "";
        let temp_message = (' ' + message).slice(1);

        channel = channel.substring(2, channel.length - 1);

	if(globals.client == undefined)
	{
		console.log("Failed to load the client id!");
		return;
	}

        local_channel = globals.client.channels.cache.get(channel);
        this.channel_map.set(key, [local_channel, 1]);

        for(let i = 0; i < max_i; i++)
        {
            if(temp_message[i] == '\n')
            {
                skip_newline = true;
                demo_text += ' ';
            }
            else
                skip_newline = false;

            if(temp_message[i] == '<')
            {
                key_code = true;
                key_code_done = false;
            }

            if(key_code)
            {
                code += temp_message[i];
                max_i++;
            }

            if(temp_message[i] == '>')
            {
                key_code = false;
                key_code_done = true;
            }

            if(key_code_done)
                demo_text += code;
            else if(!key_code && !skip_newline)
                demo_text += temp_message[i];
        }

	if(local_channel == undefined)
	{
	    e.reply(`The text channel '${channel}' does not exist!`);
	    return;
	}

        this.demo_map.set(key, [demo_text + (message.length > max_i ? "..." : ""), 1]);

	if(this.text_count.has(server_id))
	    this.text_count.set(server_id, this.text_count.get(key) + 1);
	else this.text_count.set(server_id, 1)

        try 
        {
            this.text_map.set(key, [(await local_channel.send(message)).id, 1]);
            this.id_map.set(this.text_map.get(key)[0], [key, 1]);
        } 
        catch (error)
         {
            e.reply("An error has occured when attempting to set the text to channel: " + "<#"  + channel + ">");
            console.warn('Failed to set text to channel');
            console.warn(error);
        }
    }

    async set_embed(e, server_id, channel, key, message)
    {
	if(e.author.id != globals.grandmasterid)
	{
	    return;
	}

	key = key + globals.concat_block_pattern + server_id;

	if(this.text_count.get(server_id) > globals.max_texts)
	{
	    e.reply(`You have reached the maximum number of texts (${globals.max_texts}) 
		you can set on this server!`);
	    return;
	}

        let json = JSON.parse(message);
        message = json.title + " | " + json.description;
        let local_channel = undefined;
        let key_code = false;
        let key_code_done = false;
        let skip_newline = false;
        let code = "";
        let max_i = message.length > 50 ? 50 : message.length;
        let demo_text = "";
        let temp_message = (' ' + message).slice(1);

        channel = channel.substring(2, channel.length - 1);
        local_channel = globals.client.channels.cache.get(channel);
        this.channel_map.set(key, [local_channel, 1]);

        for(let i = 0; i < max_i; i++)
        {
            if(temp_message[i] == '\n')
            {
                skip_newline = true;
                demo_text += ' ';
            }
            else
                skip_newline = false;

            if(temp_message[i] == '<')
            {
                key_code = true;
                key_code_done = false;
            }

            if(key_code)
            {
                code += temp_message[i];
                max_i++;
            }

            if(temp_message[i] == '>')
            {
                key_code = false;
                key_code_done = true;
            }

            if(key_code_done)
                demo_text += code;
            else if(!key_code && !skip_newline)
                demo_text += temp_message[i];
        }

	if(local_channel == undefined)
	{
	    e.reply(`The text channel '${channel}' does not exist!`);
	    return;
	}

        this.demo_map.set(key, [demo_text + (message.length > max_i ? "..." : ""), 1]);

	if(this.text_count.has(server_id))
	    this.text_count.set(server_id, this.text_count.get(key) + 1);
	else this.text_count.set(server_id, 1)

        try 
        {
            this.text_map.set(key, [(await local_channel.send({ embed : json})).id, 1]);
            this.id_map.set(this.text_map.get(key)[0], [key, 1]);
        } 
        catch (error)
         {
            e.reply("An error has occured when attempting to set the text to channel: " + "<#"  + channel + ">");
            console.warn('Failed to set text to channel');
            console.warn(error);
        }
    }

    populate_song_cache(raw_video, song)
    {
	let song_data = [];

	raw_video.forEach(elem =>
	{
	    let song_data_info = {
	    title:	elem.title,
	    url: 	elem.url,
	    song: 	song,
	    loop: 	false
	    };

	    song_data.push(Object.assign({}, song_data_info));
	});

        this.song_cache.set(song, song_data);

	if(song_data.length == 1)
	    this.song_cache.set(song_data[0].url, song_data);

	return song_data; 
    }

    async pupulate_song_queue(e, server_id, song_data, song, to_reply)
    {
	let voice_channel = e.member.voice.channel;

	if(!this.song_queue.has(server_id))
	{
	    let song_queue_data = 	
	    {
		voice_channel: voice_channel,
		connection: null,
		song_list: [],
		playing: true,
		loop: false
	    };

	    let count = 0;
	    song_data.forEach(elem => 
	    {
		if(count <= globals.max_songs)
		    song_queue_data.song_list.push(Object.assign({}, elem));
		else 
		{
		    e.reply(`The queue has a max song count of ${globals.max_songs}! Upgrade to premium bot for more!`);
		    return;
		}

		count++;
	    });

	    try
	    {
		let conn = undefined;
		if(!this.server_bot_connection.has(server_id))
		{
		    console.log("Creating a voice channel connection...")
		    conn = await voice_channel.join();

		    if(conn)
		    {
			conn.on("disconnect", () =>
		        {
		            if(this.song_queue.has(server_id) && 
			       this.song_queue.get(server_id).connection.dispatcher)
		    	        this.song_queue.get(server_id).connection.dispatcher.end();

		            this.song_queue_cpy.delete(server_id);
		            this.song_queue.delete(server_id);
		            this.server_dispatcher.delete(server_id);
		            this.server_spotify_fetch.delete(server_id);
		            this.server_bot_connection.delete(server_id);
			    this.song_cache.delete();
		        });

			conn.voice.setSelfDeaf(true);
			this.server_bot_connection.set(server_id, conn);
		    }
		}
		else conn = this.server_bot_connection.get(server_id);

		song_queue_data.connection = conn;

		if(this.song_queue.has(server_id))
		    song_queue_data_cpy.song_list.forEach(elem => 
		    {
			this.song_queue.get(server_id).song_list.push(elem);
		    });
		else this.song_queue.set(server_id, song_queue_data);

		const song_queue_data_cpy = Object.assign({}, song_queue_data);
		song_queue_data_cpy.song_list = song_queue_data.song_list.slice();	

		if(this.song_queue_cpy.has(server_id))
		    song_queue_data_cpy.song_list.forEach(elem => 
		    {
			this.song_queue_cpy.get(server_id).song_list.push(elem);
		    });
		else this.song_queue_cpy.set(server_id, song_queue_data_cpy);	

		if(to_reply)
		{
		    let reply_msg = `Now playing ${song_data.length == 1 ? song_data[0].title : " the playlist"}`;
		    e.reply(reply_msg);
		}

		this.play(e, server_id, this.song_queue.get(server_id).song_list[0]);	    
	    } 
	    catch(err)
	    {	
		console.log(err);
		this.song_queue.delete(server_id);
		this.song_queue_cpy.delete(server_id);
		return;
	    }
	} 
	else
	{
	    if(this.song_queue_cpy.get(server_id).song_list.length + song_data.length <= globals.max_songs)
	    {
		song_data.forEach(elem => {this.song_queue_cpy.get(server_id).song_list.push(Object.assign({}, elem));});
		song_data.forEach(elem => {this.song_queue.get(server_id).song_list.push(elem);});

	    	if(to_reply) 
		{
		    let reply_msg = `${song_data.length == 1 ? 'Song' : 'Playlist'} added to the queue`;
	    	    e.reply(reply_msg);
		}
	    }
	    else e.reply(`The queue has a max song count of ${globals.max_songs}! Upgrade to premium bot for more!`);
	}
    }

    async play_song(e, server_id, song)
    {
	let voice_channel = e.member.voice.channel;

	if(!voice_channel) 
	{
	    e.reply("You need to be in a voice channel to play music!");
	    return;
	}

	let permission = voice_channel.permissionsFor(e.client.user);

	if(!permission.has("CONNECT") || !permission.has("SPEAK"))
	{
	    e.reply("You need permission to join and speak in the voice channel for the bot to work!");
	    return;
	}

	let raw_video = [];
	let song_data = [];
	let to_reply = true;
	let is_spotify_song = false;
	let is_spotify = false;

	try
	{
	    if(song.match(/^https?:\/\/(open.spotify.com)\/(playlist|artist|album|track)(.*)$/))
	    {
		is_spotify = true;

		let spotify_queue_data = 
		{
		    songs: []
		}

		let spot_songs = await spotify.get_song(song);

		if(!this.server_spotify_fetch.has(server_id))
		    this.server_spotify_fetch.set(server_id, spotify_queue_data);

		spot_songs.forEach(elem => 
		{
		    this.server_spotify_fetch.get(server_id).songs.push(elem);
		});

		if(!this.song_queue.has(server_id))
		{
		    e.reply(`Now playing the playlist!`);
		    song = this.server_spotify_fetch.get(server_id).songs[0];
		    this.server_spotify_fetch.get(server_id).songs.shift();
		    to_reply = false;
		} else is_spotify_song = true;
	    }
	    
	    if(is_spotify_song) 
	    {
		e.reply(`Spotify songs added to the queue!`);
		return;
	    }

	    let is_playlist = false;

	    if(!this.song_cache.has(song))
	    {
		if(song.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/) ||
		   song.match(/^https?:\/\/(www.youtube.com|youtube.com)\/(.*)(list\=)+/))
		{
		    is_playlist = true;
		    let cache_data = await storage.load_songs(song);
		    
		    if(cache_data.length == 0)    
		    {	
			console.log(`Fetching the music from youtube: ${song}`);
			raw_video = await youtube.getPlaylist(song);
			if(raw_video.length == 0) console.log(`ERROR: Link is not a playlist, attempting to retrieve a single video of the link instead...`);
		    }
		    else
		    {
			console.log(`Getting the music from the database: ${song}`);
			raw_video = cache_data;
		    }
		}
		
		if(!is_playlist || raw_video.length == 0)
		{
		    //song = song.replace(globals.command_delimiters, '');
		    let cache_data = await storage.load_songs(song);

	    	    if(cache_data.length == 0)    
		    {	
			console.log(`Fetching the music from youtube: ${song}`);
  		        raw_video = [await youtube.searchVideos(song)];

			storage.save_songs(song, raw_video);
		    }
		    else
		    {
			console.log(`Getting the music from the database: ${song}`);
			raw_video = cache_data;
		    }
		}

		song_data = this.populate_song_cache(raw_video, song);
	    }
	    else
	    {
		console.log(`Getting the music from the cache: ${song}`);
		song_data = this.song_cache.get(song).slice();
	    }
	}
	catch(err)
	{
	    if(err.errno != undefined && err.errno == 45013)
	    {
		console.log("Database connection closed, attempting reconnection");
		let status = await sql.init();
		if(status) 
		{
		    console.log("Database connection established!");
		    this.play_song(e, server_id, song);
		}
        	else 
		{
		    console.log("Could not connect to the database!");
		    e.reply(`SQL database connection expired and could not be recovered!`);
		}
	    }
	    else if(globals.youtube_api_key_index == globals.youtube_api_key.length - 1)
	    {
	        console.log(err);
	        e.reply(`Youtube API key reached its daily usage limit, upgrade plan to play more!`);
		let url = "https://tenor.com/view/david-tennant-cry-doctor-who-sad-rain-gif-11794483"
		e.reply(url)
		this.youtube_token_daily_limit = true;
	        return;
	    }
	    else
	    {
		console.log(`Youtube token '${globals.youtube_api_key[globals.youtube_api_key_index]}' expired!`);
		globals.youtube_api_key_index++;
		this.play_song(e, server_id, song);
		return;
	    }
	}

	if(this.youtube_token_daily_limit)
	{
	    this.youtube_token_daily_limit = false;
	    globals.youtube_api_key_index = 0;
	}
	
	await this.pupulate_song_queue(e, server_id, song_data, song, to_reply);	
    }

    async show_text(e, server_id)
    {
        let output = 
        {
            "color": "#b342f5",
            "title": "All texts set",
            "fields": []
        };

        if(this.demo_map.size > 0) 
        {
            this.demo_map.forEach((item, key) =>
            {
		let text_print_data = key.split(globals.concat_block_pattern);
		key = text_print_data[0];
		let id = text_print_data[1];

		if(id == server_id)
                	output.fields.push({"name": key, "value": item[0]});
            });

            await e.reply({ embed : output});
        }
        else
            await e.reply("There are no texts set yet!");  
    }

    music_bot_command_permission_wrapper(e, server_id, msg1, msg2)
    {
	let voice_channel = e.member.voice.channel;

	if(msg1 != undefined && !voice_channel) 
	{
	    e.reply(msg1);
	    return true;
	}

	if(msg2 != undefined && !this.song_queue.has(server_id))
	{
	    e.reply(msg2);
	    return true;
	}

	return false;
    }

    async clear_track(e, server_id, track)
    {
	if(this.music_bot_command_permission_wrapper(e, server_id,
	    `You need to be in a voice channel to clear the queue/track!`,
	    track == false ? `No songs to clear!` : undefined)) return;

	if(track) this.song_queue_cpy.delete(server_id);
	this.server_dispatcher.get(server_id).destroy();
	this.song_queue.delete(server_id);
	this.server_spotify_fetch.delete(server_id);
	if(track) e.reply("The track is now empty!");
	else e.reply("The queue is now empty!");
    }

    async remove_song(e, server_id, song)
    {
	let is_playlist = false;
	if(this.music_bot_command_permission_wrapper(e, server_id,
	    `You need to be in a voice channel to remove the song!`)) return;

	let removed_any = false;
	let reply_msg = "The following songs have been removed from the queues: \n";

	if(song == "")
	{
	    removed_any = true;

	    if(this.server_spotify_fetch.has(server_id)) 	
	    {
		let spotify_remove_index = this.server_spotify_fetch.get(server_id).songs.length - 1;
		this.server_spotify_fetch.get(server_id).songs.splice(spotify_remove_index, spotify_remove_index);
	    }
	    else if(this.song_queue_cpy.has(server_id))
	    {
	        let remove_playback_index = this.song_queue_cpy.get(server_id).song_list.length - 1;
		let remove_queue_index = this.song_queue.get(server_id).song_list.length - 1;
	        reply_msg += this.song_queue_cpy.get(server_id).song_list[remove_playback_index].title + "\n";
	        this.song_queue_cpy.get(server_id).song_list.splice(remove_playback_index, remove_playback_index);	
		this.song_queue.get(server_id).song_list.splice(remove_queue_index, remove_queue_index);
	    }
	    else removed_any = false;
	}
	else
	{
	    let song_search = [];

	    if(song.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/) ||
		song.match(/^https?:\/\/(www.youtube.com|youtube.com)\/(.*)(list\=)+/) ||
		song.match(/^https?:\/\/(open.spotify.com)\/(playlist|artist|album|track)(.*)$/))
	    {
		if(this.server_spotify_fetch.get(server_id))
		{
		    is_playlist = true;
		    this.server_spotify_fetch.get(server_id).songs.forEach((data, index) =>
		    {
			song_search.push(data);
		    });
		}

		if(this.song_cache.has(song))
		{
		    is_playlist = true;
		    this.song_cache.get(song).forEach(elem =>
		    {
		        song_search.push(elem.title);
		    });
		}
	    }
	    else
	    	song_search = song.split(globals.command_delimiters);

	    song_search.forEach(elem => 
	    {
		if(elem != "")
		{
		    //Remove from the spotify queue
		    if(this.server_spotify_fetch.has(server_id))
		    {
			this.server_spotify_fetch.get(server_id).songs.forEach((data, index) =>
			{
			    if(data.toLowerCase().match(new RegExp(elem)) ||
			       data == elem)
		            {
			        if(index != 0)
				{
				    reply_msg += data + "\n"
				    removed_any = true;
	    		    	    this.server_spotify_fetch.get(server_id).songs.splice(index, 1);   
				} 
			    }
			});
		    }

		    //Remove from playback
		    if(this.song_queue_cpy.has(server_id))
		    {
		        this.song_queue_cpy.get(server_id).song_list.forEach((data, index) =>
		        {
		            if(data.title.toLowerCase().match(new RegExp(elem)) ||
			       data.title == elem)
			    {
	    		        if(!removed_any) reply_msg += data.title + "\n";		
			        removed_any = true;
	    		        this.song_queue_cpy.get(server_id).song_list.splice(index, 1);    
			    }
		        });
		    }

		    //Remove from the queue
		    if(this.song_queue.has(server_id))
		    {
		        //Remove from song arr (disposable)
		        this.song_queue.get(server_id).song_list.forEach((data, index) =>
		    	{
		            if(data.title.toLowerCase().match(new RegExp(elem)) ||
			       data.title == elem)
		            {
			        if(index != 0)
	    		    	    this.song_queue.get(server_id).song_list.splice(index, 1);    
			    }
		    	});
		    }
		}
	    });	
	}

	if(!removed_any) 
	    reply_msg = "Could not find any song to remove, check the song name!";

	if(is_playlist) 
	    reply_msg = "Removed the playlist from both the queue and the playback!";

	e.reply(reply_msg);
    }

    async help(e)
    {
	let msg = "The bot has basic music functionality -beta- and advanced roles -early alpha- \n\n";

	msg += "The music bot makes use of 3 queues (1 for spotify 1 for youtube and 1 for playback).\n";
	msg += "The youtube/spotify queue is where the current songs are held and being played from\n";
	msg += "The playback queue stores all the songs placed in the youtube/spotify queue\n\n";
	msg += "Music commands: \n\n";

	msg += "!p or !play + link or keywords => plays a song/playlist (youtube + spotify) \n";
	msg += "!loop or !l => loop the currently playing song\n";
	msg += "!loop_playback or !loop_p or !loop_pb or !loop_play or !loop_back => loops the whole queue\n";
	msg += "!song => shows the currently playing song\n";
	msg += "!queue => shows all the songs in the queue\n";
	msg += "!r or !remove + link or keywords=> removes a song/playlist from the queue and the playback\n";
	msg += "!clear => removes all songs from the queue\n";
	msg += "!clear_playback or !clear_p or !clear_pb or !clear_play or !clear_back => removes all songs from the track\n";
	msg += "!skip => skips the currently playing songs and starts playing the next one\n";
	msg += "!replay => clears the queue and starts playing from the track\n";
	msg += "!d or !disconnect => disconnects the bot from the voice channel";

	msg += "\n\nIMPORTANT INFO: The youtube queue works on the 'first come first served' principle\n";
	msg += "IMPORTANT INFO: The spotify queue works on the 'last come first served' principle";

	msg += "\n\nThe role commands:\n\n";
	
	msg += "!toggle_role + text_key + emoji + role => sets a text (of given key) a role to toggle on emoji react\n";
	msg += "!text + channel + text_key + text => creates a text, prints it to the given channel and remembers it by key\n";
	msg += "!embed + channel + text_key + json => behaves like !text command except it creates an embed of the given json\n";
	msg += "!show_texts => prints all set texts with their keys";
	msg += "!show_roles + text_key => prints all set roles of a text with their emoji and role\n";
	msg += "!show_all_roles => prints all roles of all texts";

	msg += "\n\nFor the roles to work the bot needs the admin permissons and its bot role must be placed above the roles it is supposed to apply";

	e.reply(msg);
    }

    async show_queue(e, server_id)
    {
	if(this.music_bot_command_permission_wrapper(e, server_id,
	    `You need to be in a voice channel to show the queue!`,
	    `No songs playing currently!`)) return;

	let msg = "Songs in the queue (" + this.song_queue.get(server_id).song_list.length + "):\n\n";

	for(let i = 0; i < this.song_queue.get(server_id).song_list.length; i++)
	{
	    let item = this.song_queue.get(server_id).song_list[i];

	    if(msg.length <= 1900)
	    	msg += item.title + "\n";
	    else if(this.song_queue.get(server_id).song_list.length - i - 1 != 0)
	    {
		msg += `... (${this.song_queue.get(server_id).song_list.length - i - 1} more)`;
		break;
	    }
	}

	e.reply(msg);
    }

    async song(e, server_id)
    {
   	if(this.music_bot_command_permission_wrapper(e, server_id,
	    `You need to be in a voice channel to show the currently playing song!`,
	    `No songs playing currently!`)) return;

	let song_data = this.song_queue.get(server_id);
	let reply_msg = `Currently playing: ${song_data.song_list[0].url}`;
	e.reply(reply_msg);
    }

    async loop_track(e, server_id)
    {
	if(this.music_bot_command_permission_wrapper(e, server_id,
	    `You need to be in a voice channel to loop the currently playing track!`,
	    `Song track is empty!`)) return;

	if(!this.song_queue.get(server_id).loop)	
	{
	    let reply_msg = `Now looping current track!`;
	    e.reply(reply_msg);
	    this.song_queue.get(server_id).loop = true;
	}
	else 
	{
	    let reply_msg = `Not looping anymore!`;
	    e.reply(reply_msg);
	    this.song_queue.get(server_id).loop = false;
	}
    }

    async loop(e, server_id)
    {
	if(this.music_bot_command_permission_wrapper(e, server_id,
	    `You need to be in a voice channel to loop the currently playing song!`,
	    `No songs playing currently!`)) return;

	if(!this.song_queue.get(server_id).song_list[0].loop)
	{
	    let reply_msg = `Now looping currently playing song: ${this.song_queue.get(server_id).song_list[0].title}`;
	    e.reply(reply_msg);
	    this.song_queue.get(server_id).song_list[0].loop = true;
	}
	else 
	{
	    let reply_msg = `Not looping anymore!`;
	    e.reply(reply_msg);
	    this.song_queue.get(server_id).song_list[0].loop= false;
 	}
    }

    async skip(e, server_id)
    {
	if(e != undefined && this.music_bot_command_permission_wrapper(e, server_id,
	    `You need to be in a voice channel to skip music!`,
	    `No songs to skip!`)) return;
	
	if(this.song_queue.get(server_id).connection.dispatcher)
	    this.song_queue.get(server_id).connection.dispatcher.end();
    }

    async disconnect(e, server_id)
    {
	if(e == undefined)
	{
	    this.server_dispatcher.get(server_id).destroy();
	    this.song_queue.delete(server_id);

	    return;
	}

	let voice_channel = e.member.voice.channel;

	if(!voice_channel)
	{
	    e.reply(`You need to be in a voice channel to disconnect the bot!`);
	    return;
	}

	if(!this.server_bot_connection.has(server_id))
	{
	    e.reply("Not connected to a voice channel!");
	    return;
	}

	e.reply("See you later!");
	voice_channel.leave();
    }

    async replay_track(e, server_id)
    {
	if(this.music_bot_command_permission_wrapper(e, server_id,
	    `You need to be in a voice channel to replay the track!`)) return;

	if(this.song_queue_cpy.has(server_id))
	{
	    let cached_data = Object.assign({}, this.song_queue_cpy.get(server_id));
	    cached_data.song_list = this.song_queue_cpy.get(server_id).song_list.slice();
	    this.song_queue.delete(server_id);
	    this.song_queue.set(server_id, cached_data);

	    e.reply(`Replaying the currently available track!`);
	    this.play(e, server_id, this.song_queue.get(server_id).song_list[0]);
	}
	else e.reply("The track is empty!");
    }

    async play(e, server_id, song)
    {
	if(!this.song_queue.has(server_id)) {console.log("Song queue is empty!"); return;}

	if(song == undefined)
	{
	    if(this.song_queue.get(server_id).loop &&
		this.song_queue_cpy.has(server_id))
	    {
		if(!this.server_spotify_fetch.has(server_id))
		{
		    this.song_queue.get(server_id).song_list = 
			this.song_queue_cpy.get(server_id).song_list.slice();
	    	    song = this.song_queue.get(server_id).song_list[0];
		}
		else if(this.server_spotify_fetch.get(server_id).songs.length == 0)
		{
		    this.song_queue.get(server_id).song_list = 
			this.song_queue_cpy.get(server_id).song_list.slice();
	    	    song = this.song_queue.get(server_id).song_list[0];
		}
		else
		{
		    this.song_queue.delete(server_id);
	            return;
		}
            }
	    else
	    {
	        this.song_queue.delete(server_id);		
		if(this.server_dispatcher.has(server_id)) this.server_dispatcher.get(server_id).destroy();
	        return;
            }
	}

	let dispatcher = this.song_queue.get(server_id).connection.play(
	    ytdl(song.url, 
		{
		    quality: 'highestaudio',
		    highWaterMark: 1 << 25, 
		    filter: 'audioonly',
		    requestOptions: {
          	        headers: {
            		    //cookie: process.env.YOUTUBE_LOGIN_COOKIE,
          	        }
        	    }
		}), {highWaterMark: 1}).on("finish", () =>
	{
	    if(!this.song_queue.has(server_id)) { return; }

	    if(this.song_queue.get(server_id).song_list[0] != undefined && 
	        !this.song_queue.get(server_id).song_list[0].loop)
		this.song_queue.get(server_id).song_list.shift();

	    if(this.song_queue.get(server_id).song_list.length == 0 &&
		this.server_spotify_fetch.has(server_id))
	    {
		if(this.server_spotify_fetch.get(server_id).songs.length != 0)
		{
		    this.dynamic_play_song(e, server_id, song);
		    this.server_dispatcher.get(server_id).destroy();
		}
		else this.server_spotify_fetch.delete(server_id);
	    }

	    this.server_song_error_count.set(server_id, 0);
	    this.play(e, server_id, this.song_queue.get(server_id).song_list[0]);
	}).on("error", (err) => 
	{
	    console.log("ERROR WHEN PLAYING SONG: " + song.url);
	    console.log(err);

	    if(err.statusCode == 410)
		e.reply(`Song ${song.title} is age-restricted, cannot play!`);

	    if(this.server_song_error_count.get(server_id) >= 5 || err.statusCode == 410)
	    {	
		this.song_queue.get(server_id).song_list.shift();

		if(this.song_queue.get(server_id).song_list.length == 0 &&
		    this.server_spotify_fetch.has(server_id))
	        {
		    if(this.server_spotify_fetch.get(server_id).songs.length != 0)
		    {
		        this.dynamic_play_song(e, server_id, song);
		        this.server_dispatcher.get(server_id).destroy();
		    }
		    else this.server_spotify_fetch.delete(server_id);
	        }

		if(this.server_dispatcher.has(server_id)) this.server_dispatcher.get(server_id).destroy();
		this.play(e, server_id, this.song_queue.get(server_id).song_list[0]);
		return;	
	    }

	    if(!this.server_song_error_count.has(server_id))
		this.server_song_error_count.set(server_id, 0);

	    this.server_song_error_count.set(server_id, this.server_song_error_count.get(server_id) + 1);
	    console.log(`Attempting to fix retrieving the song... (try: ${this.server_song_error_count.get(server_id)})`);
	    if(this.server_dispatcher.has(server_id)) this.server_dispatcher.get(server_id).destroy();
	    this.play(e, server_id, this.song_queue.get(server_id).song_list[0]);
	});
	
	this.server_dispatcher.set(server_id, dispatcher);
    }
};

module.exports = Bot.create_bot();