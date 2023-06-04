const { Listener } = require('@sapphire/framework');

class ChatInputCommandDenied extends Listener {
  run(error, { interaction }) {
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({
        content: error.message
      });
    }

    return interaction.reply({
      content: error.message,
      ephemeral: true
    });
  }
}

module.exports = {
  ChatInputCommandDenied
};