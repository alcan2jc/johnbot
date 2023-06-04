const { Subcommand } = require('@sapphire/plugin-subcommands');
const process = require("../../../config.json");
const { player, queue } = require('../../index.js');

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
        	,{ 
				idHints: ['1099864603653054524'],
				guildIDs: process.env.guildIDs 
			}
		);
	}

    async chatInputRun(interaction) {

		await interaction.deferReply({ content: `**Skipping Song**`, ephemeral: true, fetchReply: true });
        const serverQueue = queue.get(interaction.guildId);
        if (!interaction.member.voice.channel)
		    return interaction.editReply("You have to be in a voice channel to stop the music!");
        if (!serverQueue)
			return interaction.editReply("There is no song that I could skip!");
		player.stop();
		return interaction.editReply(`Skipped: **${serverQueue.songs[0].title}**`);
    }
}