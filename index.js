require("http").createServer((_, res) => res.end("Hay Sayangg!")).listen(8080)

const fs = require("fs")
const pino = require("pino")
const baileys = require("@adiwajshing/baileys")
const telegramBot = require("node-telegram-bot-api")
const phoneNumber = require("awesome-phonenumber")
const { Boom } = require("@hapi/boom")
const { state, saveState } = baileys.useSingleFileAuthState("session.json")

const store = baileys.makeInMemoryStore({
	logger: pino().child({
		level: "silent",
		stream: "store"
	})
})

async function startBotAutoKick() {
	const { version, isLatest } = await baileys.fetchLatestBaileysVersion()
	const Ahok = baileys.default({
		version,
		auth: state,
		printQRInTerminal: true,
		browser: ["WhatsApp Bot", "safari", "1.0.0"],
		logger: pino({
			level: "silent"
		})
	})
	
	store.bind(Ahok.ev)
	Ahok.ev.on("creds.update", saveState)
	
	Ahok.ev.on("messages.upsert", async (chatUpdate) => {
		try {
			mek = chatUpdate.messages[0]
			if (!mek.message) return 
			if (mek.key.fromMe) return
			if (!mek.key.remoteJid.endsWith("@g.us")) return
			mek.message = (Object.keys(mek.message)[0] === "ephemeralMessage") ? mek.message.ephemeralMessage.message : mek.message
			
			const idChat = mek.key.id
			const from = mek.key.remoteJid
			const fromMe = mek.key.fromMe
			const botNumber = Ahok.decodeJid(Ahok.user.id)
			const sender = Ahok.decodeJid(mek.key.participant)
			const type = await baileys.getContentType(mek.message)
			
			const groupMetadata = await Ahok.groupMetadata(from)
			const participants = await groupMetadata.participants
			const groupAdmins = await Ahok.getGroupAdmins(participants)
			
			const isBotAdmins = groupAdmins.includes(botNumber)
			const isAdmins = groupAdmins.includes(sender)
			
			if (!isBotAdmins) return
			if (isAdmins) return 
			if (type === undefined) return Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			if (type === "audioMessage") return Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			if (type === "pollCreationMessage") return Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			if (type === "liveLocationMessage") return Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			if (type === "locationMessage") return Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
			if (type === "documentMessage") return await Ahok.kickHapusPesan(Ahok, from, fromMe, idChat, sender)
			if (type === "contactMessage") return await Ahok.kickHapusPesan(Ahok, from, fromMe, idChat, sender)
			if (type === "contactsArrayMessage") return await Ahok.kickHapusPesan(Ahok, from, fromMe, idChat, sender)
			if (type === "stickerMessage") return
			
			const body = (type === "conversation") ? mek.message.conversation : (type === "imageMessage") ? mek.message.imageMessage.caption : (type === "videoMessage") ? mek.message.videoMessage.caption : (type === "extendedTextMessage") ? mek.message.extendedTextMessage.text : ""
			const kata = /http|https|.com|co.id|my id|.link|.app|youtu.be|wa.me|t.me|vcs|open|readi|ready|order|bayar|rekber|real|dana|ovo|shope|qris|pulsa/i
			const cek = await kata.exec(body)
			
			if (cek) return await Ahok.kickHapusPesan(Ahok, from, fromMe, idChat, sender)
			if (body.length > 150) return await Ahok.kickHapusPesan(Ahok, from, fromMe, idChat, sender)
			if (body === null && body === undefined) return Ahok.hapusPesan(Ahok, from, fromMe, idChat, sender)
		} catch (err) {
			console.log(err)
		}
	})
	
	Ahok.ev.on("group-participants.update", async (update) => {
		try {
			const bot = new telegramBot("5858219733:AAFhHOteV__TevTmpCAwVjWND09meohs7_Y")
			const from = update.id
			const nomor = update.participants[0]
			const botNumber = Ahok.decodeJid(Ahok.user.id)
			
			const groupMetadata = await Ahok.groupMetadata(from)
			const participants = await groupMetadata.participants
			const groupAdmins = await Ahok.getGroupAdmins(participants)
			const isBotAdmins = groupAdmins.includes(botNumber) || false
			const urlUser = await Ahok.profilePictureUrl(nomor, "image").catch((err) => false)
			
			if (update.action == "add") {
				if (!isBotAdmins) return
				if (!nomor.startsWith("62")) return Ahok.groupParticipantsUpdate(from, [nomor], "remove")
				if (!urlUser) return await bot.sendMessage("5924900681", `https://wa.me/${ nomor.split("@")[0] }\n\nJoin to Grup : ${ groupMetadata.subject }\nNama : ${ Ahok.getName(nomor) }\nNomor : ${ nomor.split("@")[0] }`)
				await bot.sendPhoto("5924900681", urlUser, {
					caption: `https://wa.me/${ nomor.split("@")[0] }\n\nJoin to Grup : ${ groupMetadata.subject }\nNama : ${ Ahok.getName(nomor) }\nNomor : ${ nomor.split("@")[0] }` 
				})
			}
		} catch (err) {
			console.log(err)
		}
	})
	
	Ahok.ev.on("call", async (update) => {
		for (let date of update) {
			if (date.isGroup == false) {
				if (date.status == "offer") {
					await Ahok.updateBlockStatus(date.from, "block")
				}
			}
		}
	})
	
	Ahok.ev.on("contacts.update", update => {
		for (let contact of update) {
			let id = Ahok.decodeJid(contact.id)
			if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
		}
	})
	
	Ahok.ev.on("connection.update", async (update) => {
		const { connection, lastDisconnect } = update
		if (connection === "connecting") console.log("Menghubungkan")
		if (connection === "open") console.log("Berhasil")
		if (connection === "close") {
			const reason = new Boom(lastDisconnect?.error)?.output.statusCode
			if (reason === baileys.DisconnectReason.badSession) {
				console.log("File Sesi Buruk Harap Hapus Sesi dan Pindai Lagi")
				Ahok.logout()
			} else if (reason === baileys.DisconnectReason.connectionClosed) {
				console.log("Koneksi ditutup")
				startBotAutoKick()
			} else if (reason === baileys.DisconnectReason.connectionLost) {
				console.log("Koneksi Hilang dari Server")
				startBotAutoKick()
			} else if (reason === baileys.DisconnectReason.connectionReplaced) {
				console.log("Koneksi Diganti, Sesi Baru Dibuka, Harap Tutup Sesi Saat Ini Terlebih Dahulu")
				Ahok.logout()
			} else if (reason === baileys.DisconnectReason.loggedOut) {
				console.log("Perangkat Keluar, Harap Pindai Lagi Dan Jalankan")
				Ahok.logout()
			} else if (reason === baileys.DisconnectReason.restartRequired) {
				console.log("Mulai Ulang Diperlukan")
				startBotAutoKick()
			} else if (reason === baileys.DisconnectReason.timedOut) {
				console.log("Waktu koneksi berakhir")
				startBotAutoKick()
			} else Ahok.end(`Alasan Putus Tidak Diketahui: ${reason} | ${connection}`)
		}
	})
	
	Ahok.decodeJid = (jid) => {
		if (!jid) return jid
		if (/:\d+@/gi.test(jid)) {
			let decode = baileys.jidDecode(jid) || {}
			return decode.user && decode.server && decode.user + "@" + decode.server || jid
		} else return jid
	}
	Ahok.getGroupAdmins = (participants) => {
		let admins = []
		for (let i of participants) {
			i.admin === "superadmin" ? admins.push(i.id) :  i.admin === "admin" ? admins.push(i.id) : ""
		}
		return admins || []
	}
	Ahok.hapusPesan = (client, from, a, b, c) => {
		return client.sendMessage(from, {
			delete: {
				remoteJid: from,
				fromMe: a,
				id: b,
				participant: c
			}
		})
	}
	Ahok.kickHapusPesan = async (client, from, a, b, c) => {
		await client.sendMessage(from, {
			delete: {
				remoteJid: from,
				fromMe: a,
				id: b,
				participant: c
			}
		})
		return client.groupParticipantsUpdate(from, [c], "remove")
	}
	Ahok.getName = (jid, withoutContact  = false) => {
		id = Ahok.decodeJid(jid)
		withoutContact = Ahok.withoutContact || withoutContact
		let vivis
		if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
			vivis= store.contacts[id] || {}
			if (!(vivis.name || vivis.subject)) vivis = Ahok.groupMetadata(id) || {}
			resolve(vivis.name || vivis.subject || phoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"))
		})
		else vivis = id === "0@s.whatsapp.net" ? { id, name: "WhatsApp" } : id === Ahok.decodeJid(Ahok.user.id) ? Ahok.user : (store.contacts[id] || {})
		return (withoutContact ? "" : vivis.name) || vivis.subject || vivis.verifiedName || phoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international")
	}
	
	return Ahok
}

startBotAutoKick()
let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	delete require.cache[file]
	require(file)
})