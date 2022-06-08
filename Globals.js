class Globals
{
	client = undefined;
	concat_block_pattern = "<|/~\|>";
	grandmasterid = REDUCTED
	max_texts = 50;
	max_roles = 50;
	max_songs = 500;
	youtube_api_key = [
		REDUCTED,
		REDUCTED,
		REDUCTED,
		REDUCTED
	];
	youtube_api_key_index = 0;
	bot_token = "REDUCTED";
	spotify_client_id = "REDUCTED";
	spotify_client_secret = "REDUCTED";
	spotify_limit = 100;
	youtube_limit = 100;
	command_delimiters = /[\u0000-\u001F\u0021-\u002F\u003A-\u0040\u005B-\u0060\u007B-\u007E]/g;

	static get_globals()
	{
		return new Globals();
	}

	constructor()
	{
		this.client = undefined;
	}
};

module.exports = Globals.get_globals();
