const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const globals = require("./Globals.js");
const util = require("./Util.js");

class SpotifyAPI
{
    static get_spotifyapi()
    {
	return new SpotifyAPI();
    }

    constructor()
    {
	this.client_id = globals.spotify_client_id;
	this.client_secret = globals.spotify_client_secret;

	this.token_cache = {
	    token: undefined,
	    lifetime: 0,
	    creation_time: 0
	}
    }

    async get_token()
    {
	if(this.token_cache.token != undefined &&
	   this.token_cache.creation_time + this.token_cache.lifetime > get_time_now() + 60)
	    return;

	const result = await fetch("https://accounts.spotify.com/api/token", 
	{
  	    method: 'POST',
	    headers: {
		'Content-Type': 'application/x-www-form-urlencoded',
		'Authorization': 'Basic ' + Buffer.from(this.client_id + ':' + this.client_secret).toString('base64')	
	    },
	    body: 'grant_type=client_credentials'
	});
	
	const data = await result.json();
	
	let token_data = {
	    token: data.access_token,
	    lifetime: data.expires_in,
	    creation_time: get_time_now()
	}

	this.token_cache = token_data;
    }

    resolve_spotify_url(url)
    {
	let playlist_url = url.split(/(playlist|artist|album|track)\//);

	if(playlist_url.length != 3)  
	    return undefined;

	let playlist_id = playlist_url[2].split(globals.command_delimiters)[0];
	let playlist_link = "";

	if(url.match(/playlist\//)) 	playlist_link = `https://api.spotify.com/v1/playlists/${playlist_id}/tracks`;
	if(url.match(/album\//)) 	playlist_link = `https://api.spotify.com/v1/albums/${playlist_id}`;
	if(url.match(/artist\//)) 	playlist_link = `https://api.spotify.com/v1/artists/${playlist_id}/top-tracks`;
	if(url.match(/track\//)) 	playlist_link = `https://api.spotify.com/v1/tracks/${playlist_id}`;

	return playlist_link;
    }

    async get_song(url)
    {
	if(url.match(/track\//)) return await this.get_track(url);
	else return await this.get_tracks(url);
    }

    async get_tracks(link)
    {
	let url = this.resolve_spotify_url(link);
	await this.get_token();
	if(this.token_cache.token == undefined || url == undefined) return;

	const result = await fetch(`${url}?limit=${globals.spotify_limit}`, 
	{
	    method: 'GET',
	    headers: 
	    {
		'Content-Type': 'application/json',
		'Accept': 'application/json',
		'Authorization': 'Bearer ' + this.token_cache.token
	    }
	});

	const data = await result.json();
	let data_arr = [];

	data.items.forEach(item =>
	{
	    let str = " ";
	    item.track.artists.forEach(artist =>
	    {
		str += artist.name + " ";
	    });

	    data_arr.push(normalize_string(item.track.name + str).replace(globals.command_delimiters,''));
	});

	return data_arr;
    }

    async get_track(link)
    {
	let url = this.resolve_spotify_url(link);
	await this.get_token();
	if(this.token_cache.token == undefined || url == undefined) return;

	const result = await fetch(`${url}`, 
	{
	    method: 'GET',
	    headers: 
	    {
		'Authorization': 'Bearer ' + this.token_cache.token
	    }
	});

	const data = await result.json();
	let str = " ";

	data.artists.forEach(item =>
	{	
	    str += item.name + " ";
	});

	return [ normalize_string(data.name + str).replace(globals.command_delimiters,'') ];
    }
};

module.exports = SpotifyAPI.get_spotifyapi();