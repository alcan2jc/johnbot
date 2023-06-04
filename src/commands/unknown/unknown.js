const { Command } = require('@sapphire/framework');

module.exports = class UnknownCommandCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'unknown-command',
            group: 'util',
            memberName: 'unknown-command',
            description: 'Displays help information for when an unknown command is used.',
            examples: ['unknown-command gimmefreediscordnitro'],
            unknown: true,
            hidden: true
        });
    }

    run() {
        return
    }
}