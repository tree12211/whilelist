module.exports = {
    token: 'OTgzNzM4OTMzNzE4NDQxOTk1.GCbp7s.xxx',
    applicationId: 'xxx',
    whitelist: {
        roleManger: 'xxx',
        roleBuyer: 'xxx',
        resetHardwareId: 3600 * 1000 * 24, // 1 day
        message: {
            blacklist: 'You are got blacklist',
            ok: 'Da ma yooooooo',
            wornghwid: 'Worng HWID',
            worngkey: 'Worng Key'
        }
    },
    scripter: {
        bf: `getgenv().Config = {}
getgenv().Config['Authorization'] = {}
getgenv().Config['Authorization']['Key'] = "{key}"
loadstring(game:HttpGet'url')()`
    },
    url: 'xxxxxx',
    port: 80
};