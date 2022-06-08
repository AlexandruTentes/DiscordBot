
class Storage
{
	static create_storage()
	{
		return new Storage();
	}

	constructor()
	{

	}

	async load_songs(song)
	{
		return []
	}

	async save_songs(song, video)
	{
		
	}
}

module.exports = Storage.create_storage();