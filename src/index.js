const { LogLevel, SapphireClient } = require('@sapphire/framework');
const { GatewayIntentBits, REST, Routes } = require('discord.js');
const process = require('../config.json');
const { useMainPlayer, Player } = require('discord-player');

const client = new SapphireClient({
	// logger: {
	// 	level: LogLevel.Debug
	// },
	intents: [
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	],
	loadMessageCommandListeners: true,
});

/** Declare Player */
const player = Player.singleton(client, {
	ytdlOptions: {
		requestOptions: {
			headers: {
				cookie: process.env.COOKIES
			}
		}
	}
});

client.once('ready', () => {
	console.log('Bot is now connected');
	client.user.setActivity("bruh");
	client.channels.cache.find(x => x.name === 'test').send('ready');

	const player = useMainPlayer();

	// generate dependencies report
	// console.log(player.scanDeps());
	// ^------ This is similar to @discordjs/voice's `generateDependenciesReport()` function, but with additional informations related to discord-player

	// log metadata query, search execution, etc.
	player.on('debug', console.log);
	// ^------ This shows how your search query is interpreted, if the query was cached, which extractor resolved the query or which extractor failed to resolve, etc.

	// log debug logs of the queue, such as voice connection logs, player execution, streaming process etc.
	player.events.on('debug', (queue, message) => console.log(`[DEBUG ${queue.guild.id}] ${message}`));
	// ^------ This shows how queue handles the track. It logs informations like the status of audio player, streaming process, configurations used, if streaming failed or not, etc.
});

client.login(process.env.token);

function deleteAllCommands() {
	for (let guildId in process.env.guildIDs) {
		rest.delete(Routes.applicationGuildCommand(process.env.clientID, guildId, { body: [] }))
			.then(() => console.log('Successfully deleted guild command'))
			.catch(console.error);
	}

	// for global commands
	rest.put(Routes.applicationCommands(clientId), { body: [] })
		.then(() => console.log('Successfully deleted all application commands.'))
		.catch(console.error);
}

function deleteCommand(commandId) {
	const rest = new REST().setToken(process.env.token);

	for (let guildId in process.env.guildIDs) {
		rest.delete(Routes.applicationGuildCommand(process.env.clientID, guildId, commandId))
			.then(() => console.log('Successfully deleted guild command'))
			.catch(console.error);
	}
	// for global commands
	rest.delete(Routes.applicationCommand(process.env.clientID, commandId))
		.then(() => console.log('Successfully deleted application command'))
		.catch(console.error);
}

module.exports = { client };