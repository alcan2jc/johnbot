
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require ("discord.js");
const { lyricsExtractor } = require('@discord-player/extractor');

const genius = lyricsExtractor();

async function showLyricsOnButtonClick(queue, track, message) {
	const interaction = queue.metadata;
                
    // Fetch Lyrics Here
    const title = track.title;
    const artist = track.author;
    
    const customId = `lyricsId${track.title} by ${track.author}`;
    const query = customId.substring(8);

    const lyricsButton = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel('Lyrics')
        .setStyle(ButtonStyle.Primary);
    
        const lyrics = await genius.search(query).catch(() => null);

    if (lyrics) {
        await interaction.followUp({
            content: message,
            components: [new ActionRowBuilder().addComponents(lyricsButton)], 
        });
    } else {
        await interaction.followUp({
            content: message
        });
    }
}

module.exports = { showLyricsOnButtonClick }