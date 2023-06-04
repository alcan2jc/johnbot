const { queue } = require('./index.js');
const fs = require('fs');

function disposeAudioPlayer(guildId) {
	const serverQueue = queue.get(guildId);

    if (serverQueue === undefined) {
	    return;
    }

	const audioPlayer = serverQueue.audioPlayer;

  if (audioPlayer === undefined) {
	return;
  }

  audioPlayer.removeAllListeners();
  audioPlayer.stop(true);

  const voiceConnection = serverQueue.voiceConnection;

  if (
    voiceConnection !== undefined &&
    (voiceConnection.state.status === VoiceConnectionStatus.Connecting ||
      voiceConnection.state.status === VoiceConnectionStatus.Ready ||
      voiceConnection.state.status === VoiceConnectionStatus.Signalling)
  ) {
    voiceConnection.state.subscription?.unsubscribe();
  }
}

function log(err) {
	// fs.appendFile("./src/logs/log.txt", JSON.stringify(err), function(logErr) {
	// 	if(err) {
	// 		return console.log(logErr);
	// 	}
	// })
}

module.exports = { disposeAudioPlayer, log };