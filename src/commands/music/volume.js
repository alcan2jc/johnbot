const { Subcommand } = require('@sapphire/plugin-subcommands');
const process = require("../../../config.json");
const { useQueue, useTimeline } = require('discord-player');

module.exports = class Volume extends Subcommand {
    constructor(context) {
		super(context, {
			name: 'volume',
			category: 'Music',
            chatInputCommand: { 
				guildIds: process.env.guildIDs 
			},
		});
	}

    registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('volume')
				.setDescription('Allows you to increase or decrease the volume of the music')
				.addIntegerOption((option) =>
					option.setName('volume').setDescription('The volume value you want to change to (0-100)').setMinValue(0).setMaxValue(100)
				)
		);
	}

    async chatInputRun(interaction) {
		try {
			await interaction.deferReply({ content: `**Changing Volume**`, ephemeral: true, fetchReply: true });
			const queue = useQueue(interaction.guildId);
			if (!interaction.member.voice.channel)
				return interaction.followUp("You have to be in a voice channel to change the volume!");
			if (!queue || !queue.isPlaying())
				return interaction.followUp("There is no queue!");
            
            const timeline = useTimeline(interaction.guild.id);

            const volume = interaction.options.getInteger('volume');
            
            const oldVolume = timeline.volume;
            
            if (!volume)
                return interaction.editReply(`**Volume is ${oldVolume}**`);
            
			queue.node.setVolume(volume);
			return interaction.editReply(`**Volume changed from ${oldVolume} to ${volume}**`);
		} catch (err) {
			console.log("Skip:", err);
			return interaction.editReply("Error skipping bot");
		}
	}
}