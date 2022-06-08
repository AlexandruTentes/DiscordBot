require("./Util.js");
const bot = require("./Bot.js");
const globals = require("./Globals.js");

class Role
{
    static create_role()
    {
        return new Role();
    }

    constructor()
    {
        this.role_map = new Map();
        this.key_map = new Map();
	this.role_count = new Map();
    }

    async register(e, server_id, text_key, key, data)
    {
	if(e.author.id != globals.grandmasterid)
	{
	    return;
	}

	text_key = text_key + globals.concat_block_pattern + server_id;

	if(this.role_count.get(server_id) > globals.max_roles)
	{
	    e.reply(`You have reached the maximum number of roles (${globals.max_roles}) 
		you can set on this server!`);
	    return;
	}

        if(!bot.channel_map.has(text_key))
        {
            e.reply("Please set a text with the key: " + text_key);
            return;
        }

        let temp_key = key.unicodeToChar() + globals.concat_block_pattern + server_id;
        let role = data.substring(3, data.length - 1);
        this.role_map.set(temp_key, [role, 1]);
        this.key_map.set(temp_key, [text_key, 1]);
	
	if(this.role_count.has(server_id))
		this.role_count.set(server_id, this.role_count.get(server_id) + 1);
	else this.role_count.set(server_id, 1);
    }

    async print_all(e, server_id, text_key)
    {
        let output = 
        {
            "color": "#b342f5",
            "title": (text_key == undefined ? "All toggled roles" : "All roles for " + text_key),
            "fields": []
        };

        if(this.role_map.size > 0) 
        {           
            this.role_map.forEach((item, key) =>
            {
                item = item[0];
		let printing_data = key.split(globals.concat_block_pattern);
		key = printing_data[0];
		let id = printing_data[1];

		if(id == server_id)
                	if(text_key != undefined && this.key_map.get(key)[0] == text_key)
                 	   output.fields.push({"name": key, "value": "<@&" + item + ">", inline: true});
                	else if(text_key == undefined)
                 	   output.fields.push({"name": key + " " + this.key_map.get(key)[0], "value": "<@&" + item + ">", inline: true});
            });

            await e.reply({ embed : output});
        }
        else
            await e.reply("There are no roles set yet!");            
    }
};

module.exports = Role.create_role();