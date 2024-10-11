import { question, closeQuestionInterface } from './question.js';

export const handlePairingCode = async (sock, usePairingCode) => {
    if (usePairingCode && !sock.authState.creds.registered) {
        const phoneNumber = await question(`Silakan masukkan nomor WhatsApp Anda: `);
        if (/\d/.test(phoneNumber)) {
            const code = await sock.requestPairingCode(
                phoneNumber.replace(/[^0-9]/g, "")
            );
            console.log("jika ada notif whatsapp [Memasukkan kode menautkan perangkat baru] maka sudah di pastikan berhasil!");
            console.log(`Pairing code: ${code.match(/.{1,4}/g).join("-")}`);
        } else {
            console.log("Nomor telepon tidak valid.");
            process.exit();
        }
    }
    closeQuestionInterface();
}