const { LogLevel, SapphireClient } = require('@sapphire/framework');
const { GatewayIntentBits } = require('discord.js');
const process  = require('../config.json');
const { Player } = require('discord-player');

// const queue = new Map();

// const rest = new REST().setToken(process.env.token);
// rest.put(Routes.applicationCommands(process.env.clientID, '1099589112547246151'), { body: [] })
// 	.then(() => console.log('Successfully deleted all application commands.'))
// 	.catch(console.error);
const client = new SapphireClient ({
	// logger: {
	// 	level: LogLevel.Debug
	// },
	intents: [
		// GatewayIntentBits.DirectMessageReactions,
		// GatewayIntentBits.DirectMessages,
		// GatewayIntentBits.GuildEmojisAndStickers,
		// GatewayIntentBits.GuildMembers,
		// GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	],
	loadMessageCommandListeners: true, 
});

const getMethods = (obj) => {
	let properties = new Set()
	let currentObj = obj
	do {
		Object.getOwnPropertyNames(currentObj).map(item => properties.add(item))
	} while ((currentObj = Object.getPrototypeOf(currentObj)))
	return [...properties.keys()].filter(item => typeof obj[item] === 'function')
}

client.on('ready', () => {
	console.log('Bot is now connected');
	client.user.setActivity("bruh");
	client.channels.cache.find(x => x.name === 'test').send('ready');
});

client.login(process.env.token);

const player = Player.singleton(client);

async function loadExtractors() {
	await player.extractors.loadDefault();
}

loadExtractors();

module.exports = {client, getMethods};