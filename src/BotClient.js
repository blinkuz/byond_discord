const Commando = require('discord.js-commando');
const path = require('path');
const sqlite = require('sqlite');
const configName = process.env.CONFIG_NAME || 'config.json';
const config = require('./' + configName);

class Bot {
  constructor(token) {
    this.token = token;
    this.client = new Commando.Client({
      'owner': config.general.ownerID,
      'commandPrefix': config.general.globalCommandPrefix,
      'unknownCommandResponse': false
    });
    this.isReady = false;
  }

  onReady() {
    return () => {
      console.log(`Client ready logged in as ${this.client.user.tag} (${this.client.user.id}). Prefix set to ${this.client.commandPrefix}. Use ${this.client.commandPrefix}help to view the commands list!`);
      this.client.user.setAFK(true);
      this.client.user.setActivity(`${this.client.commandPrefix}help`, {type: 'PLAYING'});
      this.isReady = true;
    };
  }

  onCommandPrefixChange() {
    return (guild, prefix) => {
      console.log(`Prefix ${prefix === '' ? 'removed' : `changed to ${prefix || 'the default'}`} ${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.`);
    };
  }

  onDisconnect() {
    return () => {
      console.warn('Disconnected!');
    };
  }

  onReconnect() {
    return () => {
      console.warn('Reconnecting...');
    };
  }

  onCmdErr() {
    return (cmd, err) => {
      if (err instanceof Commando.FriendlyError) {
        return;
      }
      console.error(`Error in command ${cmd.groupID}:${cmd.memberName}`, err);
    };
  }

  onCmdBlock() {
    return (msg, reason) => {
      console.log(`Command ${msg.command ? `${msg.command.groupID}:${msg.command.memberName}` : ''} blocked; ${reason}`);
    };
  }

  onCmdStatusChange() {
    return (guild, command, enabled) => {
      console.log(`Command ${command.groupID}:${command.memberName} ${enabled ? 'enabled' : 'disabled'} ${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.`);
    };
  }

  onGroupStatusChange() {
    return (guild, group, enabled) => {
      console.log(`Group ${group.id} ${enabled ? 'enabled' : 'disabled'} ${guild ? `in guild ${guild.name} (${guild.id})` : 'globally'}.`);
    };
  }

  onMessage() {
    // nothing here yet
    return (msg) => {
    };
  }

  sendMessage(channel, message) {
    this.client.guilds.first().channels.get(channel).send(message);
  }

  sendEmbed(channel, embed) {
    this.client.guilds.first().channels.get(channel).send(embed);
  }

  removeRole(role) {
    this.client.guilds.first().members.fetch().then((mCollect) => {
      mCollect.forEach((element) => {
        if(element.roles.has(role)) {
          element.roles.remove(role).catch(console.error);
        }
      });
    }).catch(console.error);
  }

  init() {
    return new Promise((resolve, reject) => {
      // register our events
      this.client
      .on('ready', this.onReady())
      .on('commandPrefixChange', this.onCommandPrefixChange())
      .on('error', console.error)
      .on('warn', console.warn)
      //.on('debug', console.log)
      .on('disconnect', this.onDisconnect())
      .on('reconnecting', this.onReconnect())
      .on('commandError', this.onCmdErr())
      .on('commandBlocked', this.onCmdBlock())
      .on('commandStatusChange', this.onCmdStatusChange())
      .on('groupStatusChange', this.onGroupStatusChange())
      .on('message', this.onMessage());

      // set provider to sqlite so we can save our settings
      this.client.setProvider(
        sqlite.open(path.join(__dirname, 'settings.sqlite3')).then(db => new Commando.SQLiteProvider(db))
      ).catch(console.error);

      // register default groups and commands
      this.client.registry
        .registerGroups([
          ['everyone', 'Commands for everyone']
        ])
        .registerDefaultGroups()
        .registerDefaultTypes()
        .registerDefaultCommands({
          'help': true,
          'prefix': true,
          'ping': true,
          'eval_': false,
          'commandState': true
        })
        .registerCommandsIn(path.join(__dirname, 'commands'));

      // login with client and bot token
      this.client.login(this.token).then(resolve(this)).catch((reason) => {reject(reason)});
    });
  }

  deinit() {
    this.isReady = false;
    return this.client.destroy();
  }
}

module.exports = Bot;
