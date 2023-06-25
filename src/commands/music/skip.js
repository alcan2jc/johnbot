const { Subcommand } = require('@sapphire/plugin-subcommands');
const process = require("../../../config.json");
const { useQueue } = require('discord-player');

module.exports = class Skip extends Subcommand {
    constructor(context) {
		super(context, {
			name: 'skip',
			category: 'Music',
            chatInputCommand: { 
				guildIds: process.env.guildIDs 
			},
		});
	}

    registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
			.setName('skip')
			.setDescription('skip song')
		);
	}

    async chatInputRun(interaction) {
		try {
			await interaction.deferReply({ content: `**Skipping Song**`, ephemeral: true, fetchReply: true });
			const queue = useQueue(interaction.guildId);
			if (!interaction.member.voice.channel)
				return interaction.followUp("You have to be in a voice channel to stop the music!");
			if (!queue)
				return interaction.followUp("There is no song that I could skip!");

			queue.node.skip();
			return interaction.editReply(`Skipped: **${queue.currentTrack.title}**`);
		} catch (err) {
			console.log("Skip:", err);
			return interaction.editReply("Error skipping bot");
		}
	}
}