const { Subcommand } = require('@sapphire/plugin-subcommands');
const process = require("../../../config.json");
const { queue } = require('../../index.js');
const { disposeAudioPlayer } = require('../../util.js');

module.exports = class Stop extends Subcommand {
	constructor(context) {
		super(context, {
			name: 'stop',
			category: 'Music',
            chatInputCommand: { 
				guildIds: process.env.guildIDs 
			},
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('stop')
				.setDescription('stop playing song')
        	,{ 
				idHints: ['1099863621095399424'],
				guildIDs: process.env.guildIDs 
			}
		);
	}

	async chatInputRun(interaction) {
		await interaction.deferReply({ content: `Stopping bot`, ephemeral: true, fetchReply: true });

		if (!interaction.member.voice.channel) 
		return interaction.editReply(
			"You have to be in a voice channel to stop the music!"
		);
		
		try {
			const serverQueue = queue.get(interaction.guildId);
			if (!serverQueue)
				return interaction.editReply("There is no song that I could stop!");

			serverQueue.songs = [],
			disposeAudioPlayer(interaction.guildId);
			serverQueue.connection.destroy();
			queue.delete(interaction.guildId);
			return interaction.editReply("Bot Stopped");
		} catch (err) {
			console.log("Stop:", err);
			return interaction.editReply("Error stopping bot");
		}
	}
};