const discord = require('discord.js');
const client = new discord.Client({ intents: 32767 });
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { SlashCommandBuilder } = require('@discordjs/builders');
const config = require('./config');
const mongodb = require('mongodb').MongoClient;
const Client = new mongodb(config.url)
const wait = require('node:timers/promises').setTimeout
const express = require('express')
const app = express()
class CommandBuilder {
    getSlashCommand() {
        const commands = [];
        const redeem = new SlashCommandBuilder().setName('redeem').setDescription('Redeem your key.').addStringOption(options => options.setName('key').setRequired(true).setDescription('Your Keys')).addIntegerOption(options => options.setName('game').setRequired(true).addChoices(
            { name: 'Blox Fruit', value: 0 }
        ).setDescription('Select your game')).toJSON();
        const script = new SlashCommandBuilder().setName('script').setDescription('Get Your Script').toJSON();
        const genkey = new SlashCommandBuilder().setName('genkey').setDescription('Generate key').addIntegerOption(options => options.setName('amount').setDescription('Amount to generate').setMinValue(1).setMaxValue(99).setRequired(true)).toJSON();
        const blacklisted = new SlashCommandBuilder().setName('blacklist').setDescription('Blacklist User').addUserOption(options => options.setName('user').setDescription('Select user to blacklist').setRequired(true)).toJSON();
        const unblacklisted = new SlashCommandBuilder().setName('unblacklist').setDescription('UnBlacklist User').addUserOption(options => options.setName('user').setDescription('Select user to Unblacklist').setRequired(true)).toJSON();
        const removekey = new SlashCommandBuilder().setName('removekey').setDescription('Remove Keys').addStringOption(options => options.setName('key').setRequired(true).setDescription('Insert Key')).toJSON();
        const resethwid = new SlashCommandBuilder().setName('resethwid').setDescription('Rest HWID').addUserOption(options => options.setName('user').setRequired(false).setDescription('Reset HWID Other User (Whitelist Manager Only)')).toJSON();
        commands.push(resethwid)
        commands.push(redeem);
        commands.push(script);
        commands.push(genkey);
        commands.push(blacklisted);
        commands.push(unblacklisted);
        commands.push(removekey);
        return commands;
    }
}
class ExpressServerWhitelist {
    start(){
        app.post('/api/v1', express.json(),async (req, res) => {
            if(req.body.key == undefined || req.body.hwid == undefined || req.body.type == undefined) {
                return res.status(400).send(JSON.stringify({code: 400, message: 'Bad Request', success: false}))
            }
            const key = escape(req.body.key);
            const hwid = escape(req.body.hwid);
            const type = Number(escape(req.body.type));
            const dbos = Client.db("Whitelist");
            const getKeyInfo = await dbos.collection("keys").findOne({ key: key }).catch(error => res.status(500).send(JSON.stringify({code: 500, message: 'Bad Gateway'})));
            if(getKeyInfo){
                if(!getKeyInfo.blacklist){
                    const getUserKeyInfo = await dbos.collection("keys").find({ userid: getKeyInfo.userid}).toArray().catch(error => res.status(500).send(JSON.stringify({code: 500, message: 'Bad Gateway'})));
                    const blacklisted = getUserKeyInfo.find(e => e.blacklist === true);
                    console.log(blacklisted)
                    if(blacklisted){
                        return res.status(400).send(JSON.stringify({code: 400, message: config.whitelist.message.blacklist, success: false}))
                    }else{
                        const KeyWhitelists = await dbos.collection("whitelist").findOne({ key: key, hwid: null, type: type }).catch(error => res.status(500).send(JSON.stringify({code: 500, message: 'Bad Gateway'})));
                        if(KeyWhitelists){
                            const query = { key: key, hwid: null, type: type };
                            const payload = {
                                $set: {
                                    hwid: hwid
                                }
                            }
                            await dbos.collection("whitelist").updateOne(query, payload).catch(error => res.status(500).send(JSON.stringify({code: 500, message: 'Bad Gateway'})));
                            return res.status(200).send(JSON.stringify({code: 200, message: config.whitelist.message.ok, success: true}))
                        }else{
                            const KeyWhitelist = await dbos.collection("whitelist").findOne({ key: key, hwid: hwid, type: type }).catch(error => res.status(500).send(JSON.stringify({code: 500, message: 'Bad Gateway'})));
                            if(KeyWhitelist){
                                return res.status(200).send(JSON.stringify({code: 200, message: config.whitelist.message.ok, success: true}))
                            }else{
                                return res.status(400).send(JSON.stringify({code: 400, message: config.whitelist.message.wornghwid, success: false}))

                            }
                        }
                    }
                }else{
                    return res.status(400).send(JSON.stringify({code: 400, message: config.whitelist.message.blacklist, success: false}))

                }
            }else{
                return res.status(400).send(JSON.stringify({code: 400, message: config.whitelist.message.worngkey, success: false}))
            }
            return null; // fix memory leaks
        })
        app.listen(config.port, () => console.log('listening on port' + config.port))
    }
}
class CommandPut {
    async update(commands = [], token = string, applicationID = string) {
        const rest = new REST({ version: '9' }).setToken(token);
        try {
            console.log('Started refreshing application (/) commands.');

            await rest.put(
                Routes.applicationCommands(applicationID),
                { body: commands },
            );
            console.log('Successfully reloaded application (/) commands.');
            return { success: true, message: 'Successfully reloaded application' }
        } catch (error) {
            console.error(error.requestBody.json);
            return { success: false, message: error }
        }
    }
}
class ApplicationO2AuthBuilder {
    build(applicationID = string) {
        const url = `https://discord.com/api/oauth2/authorize?client_id=${applicationID}&permissions=8&scope=bot%20applications.commands`
        return url
    }
}

class Utils {
    randomCharacters(length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }
}

client.on('ready', async () => {
    await Client.connect().catch(error => {
        console.log('Bot is not Ready');
    });
    console.log('Mongodb Connected');
    console.log('Login as ' + client.user.username + '#' + client.user.discriminator);
    console.log('Application O2auth url: ' + new ApplicationO2AuthBuilder().build(config.applicationId));
    const commands = new CommandBuilder().getSlashCommand();
    const commandPut = new CommandPut();
    const response = await commandPut.update(commands, config.token, config.applicationId);
    if (response.success) {
        console.log('Bot is Ready');
    } else {
        console.log('Bot is not Ready');
    }
    new ExpressServerWhitelist().start();
})
client.on('interactionCreate', async (interaction) => {
    if (!interaction) return; // make sure the interaction be gone 
    if (!interaction.isSelectMenu()) return; // make sure the interaction is commands
    if (interaction.customId === 'script_select') {
        if (interaction.valueOf('bf')) {
            const dbos = Client.db("Whitelist");
            const data = await dbos.collection("keys").findOne({ userid: interaction.user.id }).catch(error => console.log(error));
            if (data) {

                const type = 0;
                let embed = new discord.MessageEmbed().setAuthor('⏲️ รอสักพัก', interaction.user.displayAvatarURL()).setDescription('```\n' + 'กำลังส่งสคิปในแชทส่วนตัว' + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                interaction.reply({ embeds: [embed], ephemeral: true });
                await wait(500);
                const callback = await dbos.collection("keys").find({
                    userid: interaction.user.id,
                    type: type,
                }).toArray().catch(error => console.log(error))
                for (let c = 0; c < callback.length; c++) {
                    let answer = config.scripter.bf;
                    console.log(callback)
                    answer = answer.replace('{key}', callback[c]['key']);
                    let embed = new discord.MessageEmbed().setAuthor(`${client.user.username} | Whitelist Manger Blox Fruit`, interaction.user.displayAvatarURL()).setDescription('```\n' + answer + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                    interaction.user.send({ embeds: [embed] }).catch(err => {
                        let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`ไม่สามรถเข้าแชทส่วนตัวได้`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                        interaction.editReply({ embeds: [embed], ephemeral: true });
                    })
                }
            } else {
                let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`คุณไม่มี Whitelist`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                interaction.reply({ embeds: [embed], ephemeral: true });

            }
        }
    } else {
        interaction.reply('Error')
    }
    return null; // fix memory leaks
})
client.on('interactionCreate', async (interaction) => {
    if (!interaction) return; // make sure the interaction be gone 
    if (!interaction.isCommand()) return; // make sure the interaction is commands
    switch (interaction.commandName) {
        case 'genkey':
            let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`คุณต้องมียศ <@&${config.whitelist.roleManger}> `).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
            if (!interaction.member.roles.cache.find(roles => roles.id === config.whitelist.roleManger)) return interaction.reply({ embeds: [embed], ephemeral: true });
            const amount = interaction.options.getInteger('amount');
            let answer = '';
            for (let i = 0; i < amount; i++) {
                const uilts = new Utils();
                const key = `${uilts.randomCharacters(5)}-${uilts.randomCharacters(5)}-${uilts.randomCharacters(5)}-${uilts.randomCharacters(5)}`.toUpperCase();
                answer += key + '\n'
            }
            embed = new discord.MessageEmbed().setAuthor('✅ สำเร็จ', interaction.user.displayAvatarURL()).setDescription('```\n' + answer + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
            interaction.reply({ embeds: [embed], ephemeral: true });
            const keys = answer.split('\n');
            keys.pop();
            for (let x = 0; x < keys.length; x++) {
                const keyss = keys[x];
                const insertData = {
                    userid: null,
                    blacklist: false,
                    key: keyss,
                    type: 0
                };
                const dbo = Client.db("Whitelist");
                await dbo.collection("keys").insertOne(insertData).then(data => { return null }).catch(error => console.log(error));
            }
            break;
        case "redeem":
            const key = interaction.options.getString("key").trim();
            const game = interaction.options.getInteger("game");
            const dbo = Client.db("Whitelist");
            const reposne = await dbo.collection("keys").findOne({ key: escape(key), userid: null, blacklist: false }).catch(error => console.log(error));
            if (reposne) {
                const query = { key: escape(key), userid: null, blacklist: false }
                let data = {
                    $set: {
                        userid: interaction.user.id,
                        type: game
                    }
                }
                await dbo.collection("keys").updateOne(query, data).catch(error => console.log(error));
                data = {
                    key: key,
                    hwid: null,
                    type: game,
                    blacklist: false,
                };
                await dbo.collection("whitelist").insertOne(data).then(data => { return null }).catch(error => console.log(error));
                const embed = new discord.MessageEmbed().setAuthor('✅ สำเร็จ', interaction.user.displayAvatarURL()).setDescription('```\n' + 'ทำการรีดีมสำเร็จ' + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                interaction.reply({ embeds: [embed], ephemeral: true });
                await wait(2000);
                if (!interaction.member.roles.cache.has(config.whitelist.roleBuyer)) {
                    const role = interaction.guild.roles.cache.find(g => g.id === config.whitelist.roleBuyer);
                    interaction.member.roles.add(role).catch(err => {
                        let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`เราไม่สามรถเพิ่มยศได้`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                        interaction.editReply({ embeds: [embed], ephemeral: true });

                    })
                }
            } else {
                let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`เหมือนเราจะหาคีย์ไม่เจอนะ`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            break;
        case 'script':
            const dbos = Client.db("Whitelist");
            const data = await dbos.collection("keys").findOne({ userid: interaction.user.id }).catch(error => console.log(error));
            if (data) {
                const embed = new discord.MessageEmbed().setAuthor(`${client.user.username} | โปรเลือกสคิป`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                const row = new discord.MessageActionRow().addComponents(new discord.MessageSelectMenu().setCustomId('script_select').setPlaceholder('Select Script').addOptions([
                    {
                        label: 'Blox Fruit',
                        value: 'bf',
                        description: ' Undetected Cheat 24 / 7 Supports.',
                        emoji: '944147831759982632'
                    }
                ]))
                interaction.reply({ components: [row], embeds: [embed], ephemeral: true });

            } else {
                let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`คุณไม่มี Whitelist`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                interaction.reply({ embeds: [embed], ephemeral: true });

            }
            break;
        case 'blacklist':
            const user = interaction.options.getUser('user');

            if (!interaction.member.roles.cache.find(roles => roles.id === config.whitelist.roleManger)) return interaction.reply({ embeds: [new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`คุณต้องมียศ <@&${config.whitelist.roleManger}> `).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818)], ephemeral: true });
            if (user) {
                const dbo = Client.db("Whitelist");
                const data = await dbo.collection("keys").find({ userid: user.id }).toArray().catch(error => console.log(error));
                if (data) {
                    for (let d = 0; d < data.length; d++) {
                        let datas = {
                            $set: {
                                blacklist: true
                            }
                        }
                        const query = { key: data[d]['key'], userid: user.id, blacklist: false }
                        await dbo.collection("keys").updateOne(query, datas).catch(error => console.log(error));
                    }
                    const embed = new discord.MessageEmbed().setAuthor('✅ สำเร็จ', interaction.user.displayAvatarURL()).setDescription('```\n' + `${user.username}#${user.discriminator} ได้ทำการ Blacklist แล้ว` + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                    interaction.reply({ embeds: [embed], ephemeral: true });
                } else {
                    let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`ผู้ใช้ไม่มี Whitelist`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                    interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } else {
                let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`หาผู้ใช้ไม่เจอ`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                interaction.reply({ embeds: [embed], ephemeral: true });
            }
            break;
        case 'unblacklist':
            const users = interaction.options.getUser('user');
            if (!interaction.member.roles.cache.find(roles => roles.id === config.whitelist.roleManger)) return interaction.reply({ embeds: [new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`คุณต้องมียศ <@&${config.whitelist.roleManger}> `).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818)], ephemeral: true });
            if (users) {
                const dbo = Client.db("Whitelist");
                const data = await dbo.collection("keys").find({ userid: users.id }).toArray().catch(error => console.log(error));
                if (data) {
                    for (let d = 0; d < data.length; d++) {
                        let datas = {
                            $set: {
                                blacklist: false
                            }
                        }
                        const query = { key: data[d]['key'], userid: users.id }
                        await dbo.collection("keys").updateOne(query, datas).catch(error => console.log(error));
                    }
                    const embed = new discord.MessageEmbed().setAuthor('✅ สำเร็จ', interaction.user.displayAvatarURL()).setDescription('```\n' + `${users.username}#${users.discriminator} ได้ทำการ UnBlacklist แล้ว` + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                    interaction.reply({ embeds: [embed], ephemeral: true });
                } else {
                    let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`ผู้ใช้ไม่มี Whitelist`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                    interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } else {
                let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`หาผู้ใช้ไม่เจอ`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                interaction.reply({ embeds: [embed], ephemeral: true });
            }
            break;
        case 'resethwid':
            const userss = interaction.options.getUser('user');
            if (userss) {
                if (!interaction.member.roles.cache.find(roles => roles.id === config.whitelist.roleManger)) return interaction.reply({ embeds: [new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`คุณต้องมียศ <@&${config.whitelist.roleManger}> `).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818)], ephemeral: true });
                const dbo = Client.db("Whitelist");
                const data = await dbo.collection("keys").find({ userid: interaction.user.id }).toArray().catch(error => console.log(error));
                console.log(data, 'user')
                if (data) {
                        for (let d = 0; d < data.length; d++) {
                            const query = { key: data[d]['key']}
                            let payload = {
                                $set: {
                                    hwid: null
                                }
                            }
                            await dbo.collection("whitelist").updateOne(query, payload).catch(error => console.log(error));
                        }
                        const embed = new discord.MessageEmbed().setAuthor('✅ สำเร็จ', interaction.user.displayAvatarURL()).setDescription('```\n' + `ได้ทำการ Reset HWID แล้ว` + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                        interaction.reply({ embeds: [embed], ephemeral: true });
                } else {
                    let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`ผู้ใช้ไม่มี Whitelist`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                    interaction.reply({ embeds: [embed], ephemeral: true });
                }
            } else {
                const dbo = Client.db("Whitelist");
                const data = await dbo.collection("keys").find({ userid: interaction.user.id }).toArray().catch(error => console.log(error));
                console.log(data, 'user2', { userid: interaction.user.id })
                if (data) {
                    const resethwid = await dbo.collection("resethwid").findOne({ userid: interaction.user.id }).catch(error => console.log(error));
                    if (resethwid) {
                        let date = new Date();
                        if (resethwid['resettime'] < date) {
                            for (let d = 0; d < data.length; d++) {
                                const query = { key: data[d]['key'] }
                                let payload = {
                                    $set: {
                                        hwid: null
                                    }
                                }
                                
                                await dbo.collection("whitelist").updateOne(query, payload).catch(error => console.log(error));
                                console.log(query, payload);
                            }
                            const embed = new discord.MessageEmbed().setAuthor('✅ สำเร็จ', interaction.user.displayAvatarURL()).setDescription('```\n' + `ได้ทำการ Reset HWID แล้ว` + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                            interaction.reply({ embeds: [embed], ephemeral: true });
                        } else {
                            date = new Date(resethwid['resettime'])
                            let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription('```\n' + `${date.getMonth()}/${date.getDate()}/${date.getFullYear()} - ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} กรถณารอจนถึงเวลานี้จึงสามรถรีได้อีกรอบได่` + '\n```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                            interaction.reply({ embeds: [embed], ephemeral: true });
                        }
                    } else {
                        const payload = {
                            userid: interaction.user.id,
                            resettime: new Date().getTime() + config.whitelist.resetHardwareId,
                        };
                        await dbo.collection("resethwid").insertOne(payload).then(data => { return null }).catch(error => console.log(error));
                        for (let d = 0; d < data.length; d++) {
                            const query = { key: data[d]['key'] }
                            let payload = {
                                $set: {
                                    hwid: null
                                }
                            }
                            await dbo.collection("whitelist").updateOne(query, payload).catch(error => console.log(error));
                        }
                        const embed = new discord.MessageEmbed().setAuthor('✅ สำเร็จ', interaction.user.displayAvatarURL()).setDescription('```\n' + `ได้ทำการ Reset HWID แล้ว` + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                        interaction.reply({ embeds: [embed], ephemeral: true });
                    }
                } else {
                    let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`ผู้ใช้ไม่มี Whitelist`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                    interaction.reply({ embeds: [embed], ephemeral: true });
                }
            }
            break;
        case 'removekey':
            if (!interaction.member.roles.cache.find(roles => roles.id === config.whitelist.roleManger)) return interaction.reply({ embeds: [new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`คุณต้องมียศ <@&${config.whitelist.roleManger}> `).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818)], ephemeral: true });
            const keyss = escape(interaction.options.getString('key'));
            const dboss = Client.db("Whitelist");
            const repsone = await dboss.collection("keys").findOne({ key: keyss}).catch(error => console.log(error));
            console.log(repsone)
            if(repsone ){
                    const element = repsone['key'];
                    const query = {
                        key: element
                    }
                    await dboss.collection("whitelist").deleteOne(query).catch(error => console.log(error));
                    await dboss.collection("keys").deleteOne(query).catch(error => console.log(error));
                
                const embed = new discord.MessageEmbed().setAuthor('✅ สำเร็จ', interaction.user.displayAvatarURL()).setDescription('```\n' + `ลบ Keys แล้ว` + '```').setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                interaction.reply({ embeds: [embed], ephemeral: true });
            }else{
                let embed = new discord.MessageEmbed().setAuthor('❌ มีอะไรผิดพลาด', interaction.user.displayAvatarURL()).setDescription(`หา Key ไม่เจอ`).setFooter(`${client.user.username}#${client.user.discriminator}`).setTimestamp(new Date()).setColor(13801818);
                interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            break;
        default:
            break; //ingoore unknow commands
    }
    return null; // fix memory leaks
})
client.login(config.token)
