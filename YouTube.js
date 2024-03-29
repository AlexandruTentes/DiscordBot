const Video = require("./Video");
const snekfetch = require("snekfetch");
const url = require("url");
const globals = require("./Globals.js");

class YouTube {

	constructor(key) {
		this.key = key;
		this.base = "https://www.googleapis.com/youtube/v3"
		this.max_playlist = globals.youtube_limit;
	}

	async getVideoByID(id) {
		const part = "contentDetails,snippet";
		try {
			const res = await snekfetch.get(`${this.base}/videos?part=${part}&key=${this.key}&id=${id}`);
			return new Video(JSON.parse(res.text));
		} catch (err) {
			throw new Error("Couldn't retrieve video");
		}
	}

	async getVideo(link) {
		const parsed = url.parse(link, true);
		const id = parsed.query.v;
		if (!!id && this.testID(id)) return await this.getVideoByID(id);
		else throw new Error("Cannot resolve video ID");
	}

	async searchVideos(query) {
		const max = 1;
		const part = "snippet";
		const type = "video";
		const url = encodeURI(`${this.base}/search?part=${part}&key=${this.key}&maxResults=${max}&type=${type}&q=${query}`);

		try {
			const res = await snekfetch.get(url);
			return await this.getVideoByID(JSON.parse(res.text).items[0].id.videoId);
		} catch (err) {
			throw new Error("Couldn't retrieve video");
		}
	}

	async getPlaylistByID(id) {
		const part = "snippet";
		try {
			const res = await snekfetch.get(`${this.base}/playlistItems?part=${part}&key=${this.key}&playlistId=${id}&maxResults=${this.max_playlist}`);
			var videos = await Promise.all(JSON.parse(res.text).items.map(async item => {
				try
				{
			    	    	return await this.getVideoByID(item.snippet.resourceId.videoId);
				}
				catch(err)
				{
					return null;
				}
			}));
		} catch (err) {
			return [];
			//throw new Error("Couldn't retrieve playlist");
		}
		return videos.filter(v => !!v);
	}

	async getPlaylist(link) {
		const parsed = url.parse(link, true);
		const id = parsed.query.list;
		if (!!id && this.testID(id)) return await this.getPlaylistByID(id);
		else throw new Error("Cannot resolve playlist ID");
	}

	testID(id) {
		return /[A-Za-z0-9_-]+/.test(id);
	}
}

module.exports = YouTube;
