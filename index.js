import baileys from '@whiskeysockets/baileys'
import express from 'express'
import P from 'pino'
import qrcode from 'qrcode'

var qrwa = null
var PORT = process.env.PORT || 80 || 8080 || 3000
const app = express()
app.enable('trust proxy')
app.set("json spaces", 2)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.all('*', async (req, res) => {
    if (qrwa) return res.type('.jpg').send(qrwa)
    res.send('QRCODE BELUM TERSEDIA. SILAHKAN REFRESH TERUS MENERUS')
})
app.listen(PORT, async () => {
    console.log(`express listen on port ${PORT}`)
})

const {
    default: makeWASocket,
    fetchLatestBaileysVersion,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    DisconnectReason
} = baileys

const startSock = async () => {
    const { state, saveCreds } = await useMultiFileAuthState('auth')
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const sock = makeWASocket({
        version,
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ["Auto Read Status", '3.0'],
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid)
            let msg = await store.loadMessage(jid, key.id)

            return msg?.message || ""
        },
    })

    sock.ev.process(
        async (events) => {
            if (events['connection.update']) {
                const update = events['connection.update']
                const { connection, lastDisconnect, qr } = update
                if (connection) {
                    console.info(`Connection Status : ${connection}`)
                }
                if (qr) {
                    let qrkode = await qrcode.toDataURL(qr, { scale: 20 })
                    qrwa = Buffer.from(qrkode.split`,`[1], 'base64')
                }

                if (connection === 'open') qrwa = null
                if (connection === 'close') {
                    qrwa = null
                    if ((lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
                        await startSock()
                    } else {
                        console.log('Device Logged Out, Please Scan Again And Run.')
                        process.exit(1)
                    }
                }
            }

            if (events['presence.update']) {
                await sock.sendPresenceUpdate('unavailable')
            }

            if (events['messages.upsert']) {
                const upsert = events['messages.upsert']
                var type, msgg, body
                for (let msg of upsert.messages) {
                    if (msg.message) {
                        type = Object.entries(msg.message)[0][0]
                        msgg = (type == 'viewOnceMessageV2') ? msg.message[type].message[Object.entries(msg.message[type].message)[0][0]] : msg.message[type]
                        body = (type == 'conversation') ? msgg : (type == 'extendedTextMessage') ? msgg.text : (type == 'imageMessage') && msgg.caption ? msgg.caption : (type == 'videoMessage') && msgg.caption ? msgg.caption : (type == 'templateButtonReplyMessage') && msgg.selectedId ? msgg.selectedId : (type == 'buttonsResponseMessage') && msgg.selectedButtonId ? msgg.selectedButtonId : (type == 'listResponseMessage') && msgg.singleSelectReply.selectedRowId ? msgg.singleSelectReply.selectedRowId : ''
                    }
                    if (msg.key.remoteJid === 'status@broadcast') {
                        if (msg.message?.protocolMessage) return
                        console.log(`Lihat status ${msg.pushName} ${msg.key.participant.split('@')[0]}\n`)
                        await sock.readMessages([msg.key])
                        await delay(1000)
                        return sock.readMessages([msg.key])
                    }
                    if (msg.key.remoteJid.endsWith('@s.whatsapp.net')) {
                        if (msg.message?.protocolMessage) return
                        console.log(`Pesan baru\nDari : ${msg.pushName}\nNomor : ${msg.key.remoteJid.split('@')[0]}\nPesan: ${body}\n`)
                        sock.sendPresenceUpdate('recording', msg.key.remoteJid)
                        await delay(1000)
                        return sock.sendPresenceUpdate('recording', msg.key.remoteJid)
                    }
                }
            }

            if (events['call']) {
                async function call(json) {
                    for (const id of json) {
                        if (id.status === "offer") {
                            await sock.sendMessage(id.from, {
                                text: `Maaf untuk saat ini, Saya tidak dapat menerima panggilan, entah dalam group atau pribadi\n\nJika Membutuhkan bantuan ataupun silahkan chat`,
                                mentions: [id.from],
                            })
                            await sock.rejectCall(id.id, id.from)
                        }
                        console.log(`Ada panggilan masuk ngab\nDari : ${id.from.split("@")[0]}\n`)
                    }
                }
                return await call(events['call'])
            }

            if (events['creds.update']) {
                await saveCreds()
            }
        }
    )
    return sock
}
startSock()
process.on('uncaughtException', console.error)
