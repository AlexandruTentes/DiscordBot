exists=$(screen -ls | grep discord_bot | wc -l)
echo $exists
if(( $exists < 1 )); then
	screen -S discord_bot -m -d
	screen -S discord_bot -p 0 -X stuff "(node --trace-warnings index.js 2>&1 | tee log/Log.$(date '+%T.%F'))^M"
else
	echo "Discord bot is already running!"
fi
