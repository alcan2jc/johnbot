const { InteractionHandler, InteractionHandlerTypes } = require('@sapphire/framework');

const { lyricsExtractor } = require('@discord-player/extractor');
const { useQueue, useTimeline  } = require('discord-player');
const { EmbedBuilder } = require('discord.js');

const genius = lyricsExtractor();

class LyricsButtonHandler extends InteractionHandler {
  constructor(ctx, options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button
    });
  }

  async parse(interaction) {

    const customId = interaction.customId.substring(0, 8);

    if (customId !== 'lyricsId') {
      return this.none();
    }

    const query = interaction.customId.substring(8);

    // Fetch Lyrics Here
	const lyrics = await genius.search(query).catch(() => null);
    

    return this.some(lyrics);
  }

  async run(interaction, lyrics) {

    const trimmedLyrics = lyrics.lyrics.substring(0, 1997);
    
    const embed = new EmbedBuilder()
			.setTitle(lyrics.title)
			.setURL(lyrics.url)
			.setThumbnail(lyrics.thumbnail)
			.setAuthor({
				name: lyrics.artist.name,
				iconURL: lyrics.artist.image,
				url: lyrics.artist.url
			})
			.setDescription(trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics)
			.setColor('Yellow');

		return interaction.reply({ 
            embeds: [embed],
            ephemeral: true
        });
  }
}

module.exports = {
  LyricsButtonHandler
};