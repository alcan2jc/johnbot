const { Subcommand } = require('@sapphire/plugin-subcommands');
const process = require("../../../config.json");
const { useQueue } = require('discord-player');

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
		);
	}

	async chatInputRun(interaction) {
		try {
		
			await interaction.deferReply({ content: `Stopping bot`, fetchReply: true });

			if (!interaction.member.voice.channel) 
			return interaction.editReply(
				"You have to be in a voice channel to stop the music!"
			);
		
			const queue = useQueue(interaction.guildId);
			queue.delete();

			return interaction.editReply("Bot Stopped");
		} catch (err) {
			console.log("Stop:", err);
			return interaction.editReply("Error stopping bot");
		}
	}
};