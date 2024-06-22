const { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } = require('discord.js');
const moment = require('moment');
const fs = require('fs');

const configFile = 'C:\\discord-bot\\config.json';
const configFileContent = require(configFile);
const config = configFileContent;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

let dutyTimes = {};
let dutyTimeLogs = {};

// Define the commands
const commands = [
  {
    name: 'dutybe',
    description: 'Szolgálatba lépés',
  },
  {
    name: 'dutyki',
    description: 'Szolgálatból kilépés',
  },
  {
    name: 'dutylist',
    description: 'Szolgálatban lévő személyek',
  },
  {
    name: 'dutyall',
    description: 'Szolgálati idők',
  },
  {
    name: 'dutyreset',
    description: 'Szolgálati idők tőrlése',
  },
];

client.on('ready', () => {
  console.log('BOT elérhető!');
  const rest = new REST({ version: '10' }).setToken(config.token);

  (async () => {
    try {
      // Register commands only once
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands },
      );

      console.log('Sikeressen létrehozva a parancsok');
    } catch (error) {
      console.error(error);
    }
  })();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'dutybe') {
    // Handle the dutybe command
    const member = interaction.member;
    if (!member) {
      interaction.reply('A megfelelő Discord szerver csatornában használd ezt a parancsot!');
      return;
    }
    const guild = interaction.guild;
    if (!guild) {
      interaction.reply('Failed to retrieve guild information.');
      return;
    }
    const dutyRole = guild.roles.cache.get(config.dutyRoleId);
    if (!dutyRole) {
      interaction.reply('Failed to retrieve duty role.');
      return;
    }
    member.roles.add(dutyRole);
    const startTime = moment();
    dutyTimes[interaction.user.id] = startTime;
    interaction.user.send(`**Szolgálat kezdete:** ${startTime.format('HH:mm:ss')}.`); // Send a direct message to the user who triggered the command
  } else if (interaction.commandName === 'dutyki') {
    // Handle the dutyki command
    const member = interaction.member;
    if (!member) {
      interaction.reply('A megfelelő Discord szerver csatornában használd ezt a parancsot!');
      return;
    }
    const guild = interaction.guild;
    if (!guild) {
      interaction.reply('Failed to retrieve guild information.');
      return;
    }
    const dutyRole = guild.roles.cache.get(config.dutyRoleId);
    if (!dutyRole) {
      interaction.reply('Failed to retrieve duty role.');
      return;
    }
    if (!dutyTimes[interaction.user.id]) {
      interaction.reply('***Nem vagy szolgálatban!***');
      return;
    }
    member.roles.remove(dutyRole);
    const endTime = moment();
    const dutyTime = moment.duration(endTime.diff(dutyTimes[interaction.user.id]));
    const hours = dutyTime.hours();
    const minutes = dutyTime.minutes();
    const seconds = dutyTime.seconds();
    interaction.user.send(`*Szolgálat vége:* ${endTime.format('HH:mm:ss')}. **Szolgálatban voltál:__ ${hours} órát, ${minutes} percet, és ${seconds} másodpercet.__**`); // Send a direct message to the user who triggered the command
    delete dutyTimes[interaction.user.id];

    // Log the duty time
    fs.appendFileSync('dutylog.txt', `${interaction.user.username} - ${hours} órát, ${minutes} percet, és ${seconds} másodpercet.\n`);
  } else if (interaction.commandName === 'dutylist') {
    // Handle the dutylist command
    const member = interaction.member;
    if (!member) {
      interaction.reply('A megfelelő Discord szerver csatornában használd ezt a parancsot!');
      return;
    }
    const guild = interaction.guild;
    if (!guild) {
interaction.reply('Failed to retrieve guild information.');
      return;
    }
    const adminRole = guild.roles.cache.find(role => role.id === config.adminRoleId);
    if (!member ||!member.permissions ||!member.permissions.has('ADMINISTRATOR') &&!member.roles.cache.has(adminRole.id)) {
      interaction.reply('Nincs hozzáférési engedélyed ehhez a parancshoz!');
      return;
    }

    const dutyList = [];
    for (const userId in dutyTimes) {
      const dutyTime = moment.duration(moment().diff(dutyTimes[userId]));
      const hours = dutyTime.hours();
      const minutes = dutyTime.minutes();
      const seconds = dutyTime.seconds();
      dutyList.push(`${client.users.cache.get(userId).username} - ${hours} órát, ${minutes} percet, és ${seconds} másodpercet.`);
    }

    if (dutyList.length > 0) {
      const embed = new EmbedBuilder()
      .setTitle('Szolgálatban lévők')
      .setDescription(dutyList.join('\n'));

      interaction.reply({ embeds: [embed] });
    } else {
      interaction.reply('Nincs szolgálatban lévő személy!');
    }
  } else if (interaction.commandName === 'dutyall') {
    // Handle the dutyall command
    const member = interaction.member;
    if (!member) {
      interaction.reply('A megfelelő Discord szerver csatornában használd ezt a parancsot!');
      return;
    }
    const guild = interaction.guild;
    if (!guild) {
      interaction.reply('Failed to retrieve guild information.');
      return;
    }
    const adminRole = guild.roles.cache.find(role => role.id === config.adminRoleId);
    if (!member ||!member.permissions ||!member.permissions.has('ADMINISTRATOR') &&!member.roles.cache.has(adminRole.id)) {
      interaction.reply('Nincs hozzáférési engedélyed ehhez a parancshoz!');
      return;
    }

    const dutyTimesSummary = fs.readFileSync('dutylog.txt', 'utf8');
    if (dutyTimesSummary) {
      const dutyLogLines = dutyTimesSummary.split('\n');
      const dutyTimeLogs = {};

      dutyLogLines.forEach(line => {
        if (line) {
          const [username, dutyTime] = line.split(' - ');
          const [hours, minutesAndSeconds] = dutyTime.split(' órát, ');
          const [minutes, seconds] = minutesAndSeconds.split(' és ');
          let dutyTimeLog = dutyTimeLogs[username] || { days: 0, hours: 0, minutes: 0, seconds: 0 };
      
          dutyTimeLog.seconds += parseInt(seconds.replace(' másodpercet.', ''));
          dutyTimeLog.minutes += parseInt(minutes.replace(' percet', ''));
      
          // Convert seconds to minutes and hours
          while (dutyTimeLog.seconds >= 60) {
            dutyTimeLog.minutes += 1;
            dutyTimeLog.seconds -= 60;
          }
      
          // Convert minutes to hours
          while (dutyTimeLog.minutes >= 60) {
            dutyTimeLog.hours += 1;
            dutyTimeLog.minutes -= 60;
          }
      
          // Convert hours to days
          while (dutyTimeLog.hours >= 24) {
            dutyTimeLog.days += 1;
            dutyTimeLog.hours -= 24;
          }
      
          dutyTimeLog.hours += parseInt(hours);
          dutyTimeLogs[username] = dutyTimeLog;
        }
      });
      
      const dutyAllList = Object.keys(dutyTimeLogs).map(username => {
        const dutyTimeLog = dutyTimeLogs[username];
        return `${username} - ${dutyTimeLog.days} napot, ${dutyTimeLog.hours} órát, ${dutyTimeLog.minutes} percet, és ${dutyTimeLog.seconds} másodpercet.`;
      });

      if (dutyAllList.length > 0) {
        const dutyAllEmbed = new EmbedBuilder()
        .setTitle('Szolgálati idők')
        .setDescription(dutyAllList.join('\n'));

        interaction.reply({ embeds: [dutyAllEmbed] });
      } else {
        interaction.reply('Nincs megjelenithető szolgálati idők!');
      }
    } else {
      interaction.reply('Nincs megjelenithető szolgálati idők!');
    }
  } else if (interaction.commandName === 'dutyreset') {
    // Handle the dutyreset command
    const member = interaction.member;
    if (!member) {
      interaction.reply('A megfelelő Discord szerver csatornában használd ezt a parancsot!');
      return;
    }
    const guild = interaction.guild;
    if (!guild) {
      interaction.reply('Failed to retrieve guild information.');
      return;
    }
    const adminRole = guild.roles.cache.find(role => role.id === config.adminRoleId);
    if (!member ||!member.permissions ||!member.permissions.has('ADMINISTRATOR') &&!member.roles.cache.has(adminRole.id)) {
      interaction.reply('Nincs hozzáférési engedélyed ehhez a parancshoz!');
      return;
    }

    dutyTimes = {};
    dutyTimeLogs = {};
    fs.writeFileSync('dutylog.txt', '');
    interaction.reply('Szolgálati idők törölve!');
  }
});

client.on('error', (error) => {
  console.error('Bot error:', error);
});

client.login(config.token);