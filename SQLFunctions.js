const sql = require("./SQLConnect.js");

class SQLF
{
    static get_functions()
    {
        return new SQLF();
    }

    constructor()
    {

    }

    sanitize_sql_data(data)
    {
	let new_data = data.replace(/'/g, '');
	return new_data.replace(/"/g, '');
    }

    async load_data(table, key = undefined, key_value = undefined)
    {
        let data = [];

	if(key == undefined)
	    data = await sql.query("SELECT * FROM " + table);
	else if(key_value != undefined) 
	    data = await sql.query("SELECT * FROM " + table + " WHERE " + this.sanitize_sql_data(key) + " = '" + this.sanitize_sql_data(key_value) + "'");

        return data.slice(0, data.length);
    }

    async save(table, data)
    {
	if(!data) return;
		
	let querry = "";

        data.forEach((item, index) =>
	{
	    querry += (index == 0 ? "(" : "") + "'" + this.sanitize_sql_data(item) + "'" +
		(index != data.length - 1 ? "," : ")");
	});	

	return await sql.query("INSERT INTO " + table + " VALUE " + querry);
    }

    async save_data(table, data)
    {        
        if(!data) return;

        let output = "";

        for(let i = 0; i < data.length; i++)
        {
            output += (i != 0 ? "," : "");

            for(let j = 0; j < data[i].length; j++)
                output += (j == 0 ? "(" : "") + "'" + this.sanitize_sql_data(data[i][j]) + "'" + 
                    (j != data[0].length - 1 ? "," : ")");
        }

        if(data.length >= 1)
            return await sql.query("INSERT INTO " + table + " VALUE " + output);
    }

    async update_data(table, key, field, data)
    {
        let output = "";

        if(field.length != data.length)
            return;

        for(let i = 0; i < field.length; i++)
            output += "'" + this.sanitize_sql_data(field[i]) + "'='" + this.sanitize_sql_data(data[i]) + "'";

        if(data.length >= 1)
            return await sql.query("UPDATE " + table + " SET " + output + " WHERE 'key'=" + key);
    }

    async delete_data(table, key)
    {
        return await sql.query("DELETE FROM " + table + " WHERE 'key' = '" + this.sanitize_sql_data(key) + "'");
    }
};

module.exports = SQLF.get_functions();