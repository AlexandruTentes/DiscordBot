const db = require('mariadb');

const conn_data = 
{
    host: "localhost", 
    user: "pi", 
    password: "",
    database: "discord_bot",
    connectionLimit: 1
};

class SQL
{
    static make_connection()
    {
        return new SQL(); 
    }

    constructor()
    {
        this.connection = db.createPool(conn_data);
    }

    async init()
    {
        try
        {
            this.conn = await this.connection.getConnection();
            return true;
        }
        catch(error)
        {
            throw error;
        }
        finally
        {
            this.destroy();
        }
   
        return false;
    }

    async query(data, callback)
    {
        return await this.conn.query(data);
    }

    destroy()
    {
        if(this.conn) this.conn.end;
    }
}

module.exports = SQL.make_connection();