import asyncio
import logging
import os
import sys
import time
import qrcode
from neonize.aioze.client import NewAClient, ClientFactory
from neonize.aioze.events import ConnectedEv, MessageEv, PairStatusEv, ReceiptEv, CallOfferEv, event
from neonize._binder import gocode
from neonize.proto.Neonize_pb2 import GetJIDFromStoreReturnFunction, JID
from neonize.utils import log
from neonize.utils.enum import ReceiptType
import signal


sys.path.insert(0, os.getcwd())

# ── Konfigurasi ────────────────────────────────────────────────────────────────
REACTION_ENABLED = True   # set False untuk nonaktifkan reaksi
REACTION_EMOJI   = "❤️"  # emoji reaksi status WA: ❤️ 😂 😮 😢 🙏 👏
# ──────────────────────────────────────────────────────────────────────────────

# Cache untuk mencegah duplikasi status (menghindari spam)
processed_statuses = set()

def interrupted(*_):
    loop = asyncio.get_event_loop()
    asyncio.run_coroutine_threadsafe(ClientFactory.stop(), loop)


log.setLevel(logging.ERROR)
signal.signal(signal.SIGINT, interrupted)

client = NewAClient("wsr-bot.sqlite3")

STATUS_BROADCAST_JID = JID(User="status", Server="broadcast", RawAgent=0, Device=0, Integrator=0)


@client.event(ConnectedEv)
async def on_connected(_: NewAClient, __: ConnectedEv):
    print(f"[{time.strftime('%H:%M:%S')}] ⚡ Connected", flush=True)


@client.event(MessageEv)
async def on_message(client: NewAClient, message: MessageEv):
    try:
        chat   = message.Info.MessageSource.Chat
        sender = message.Info.MessageSource.Sender
        id_    = message.Info.ID

        if message.Info.Edit != "":
            return

        if chat.User != "status" or chat.Server != "broadcast":
            return

        # Cek apakah status ini sudah pernah diproses (berdasarkan ID)
        if id_ in processed_statuses:
            return
        
        # Ekstrak konten teks/caption
        msg = message.Message
        content = (
            msg.conversation or 
            msg.extendedTextMessage.text or 
            msg.imageMessage.caption or 
            msg.videoMessage.caption or 
            ""
        ).strip()
        
        # Resolve LID ke phone number
        actual_sender = sender
        if sender.Server == "lid":
            try:
                jid_buf    = sender.SerializeToString()
                bytes_ptr  = gocode.GetPNFromLID(client.uuid, jid_buf, len(jid_buf))
                protobytes = bytes_ptr.contents.get_bytes()
                gocode.FreeBytesStruct(bytes_ptr)
                model = GetJIDFromStoreReturnFunction.FromString(protobytes)
                if not model.Error:
                    actual_sender = model.Jid
            except Exception:
                pass

        if not actual_sender.User:
            return

        # Kunci unik: Nomor + Isi (Jika isi kosong, cuma Nomor)
        # Jika status berupa foto tanpa teks, 'content' akan kosong.
        content_key = f"{actual_sender.User}:{content}"
        
        # Cek apakah ID atau Konten sudah pernah diproses
        if id_ in processed_statuses or content_key in processed_statuses:
            # Jika konten kosong dan kita sudah pernah memproses status kosong dari orang ini, skip.
            # Ini mencegah spam status foto/video tanpa caption saat session error.
            return

        processed_statuses.add(id_)
        processed_statuses.add(content_key)

        # Batasi ukuran cache
        if len(processed_statuses) > 2000:
            for _ in range(50): processed_statuses.pop()

        # ── 1. Mark as Read ────────────────────────────────────────────────
        chat_proto   = chat.SerializeToString()
        sender_proto = actual_sender.SerializeToString()
        err = gocode.MarkRead(
            client.uuid,
            id_.encode(),
            int(time.time()),
            chat_proto,
            len(chat_proto),
            sender_proto,
            len(sender_proto),
            ReceiptType.READ.value,
        )

        ts = time.strftime("%H:%M:%S")
        if err:
            print(f"[{ts}] ❌ Gagal mark_read {actual_sender.User}: {err}", flush=True)
        else:
            print(f"[{ts}] 👁️  Status dari {actual_sender.User} ditandai dibaca (ID: {id_})", flush=True)

        # ── 2. Reaksi ke Status ────────────────────────────────────────────
        if REACTION_ENABLED:
            try:
                reaction_msg = await client.build_reaction(
                    chat=STATUS_BROADCAST_JID,
                    sender=actual_sender,
                    message_id=id_,
                    reaction=REACTION_EMOJI,
                )
                await client.send_message(STATUS_BROADCAST_JID, reaction_msg)
                print(f"[{ts}] {REACTION_EMOJI}  Reaksi dikirim ke status {actual_sender.User}", flush=True)
            except Exception as e:
                print(f"[{ts}] ❌ Gagal reaksi: {e}", flush=True)

    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] ❌ ERROR: {e}", flush=True)


@client.event(PairStatusEv)
async def PairStatusMessage(_: NewAClient, message: PairStatusEv):
    print(f"[{time.strftime('%H:%M:%S')}] 🔗 Logged as {message.ID.User}", flush=True)


@client.qr
async def on_qr(_: NewAClient, qr: bytes):
    print("\n" + "="*40)
    print("          SCAN QR CODE BERIKUT")
    print("="*40)
    qr_obj = qrcode.QRCode()
    qr_obj.add_data(qr)
    qr_obj.print_ascii(invert=True)
    print("="*40)
    print("Buka WhatsApp > Perangkat Tertaut > Tautkan")
    print("="*40 + "\n")


@client.paircode
async def on_paircode(client: NewAClient, code: str, connected: bool = True):
    if connected:
        print(f"[{time.strftime('%H:%M:%S')}] ✅ Pair code processed: {code}", flush=True)
    else:
        print(f"[{time.strftime('%H:%M:%S')}] 📱 Pair code: {code}", flush=True)


async def main():
    import sqlite3
    is_logged = False
    try:
        con = sqlite3.connect("wsr-bot.sqlite3")
        row = con.execute("SELECT COUNT(*) FROM whatsmeow_device").fetchone()
        con.close()
        is_logged = row[0] > 0
    except Exception:
        pass

    if not is_logged:
        print("\n--- LOGIN WHATSAPP ---")
        print("1. Scan QR Code")
        print("2. Pairing Code (Nomor HP)")
        pilihan = input("Pilih metode (1/2): ").strip()

        if pilihan == "2":
            phone = input("Masukkan nomor HP (contoh: 628123456789): ").strip()
            await client.connect()
            # Wait a bit for connection to stabilize before pairing
            await asyncio.sleep(2)
            code = await client.PairPhone(
                phone,
                show_push_notification=True,
            )
            print(f"\n[{time.strftime('%H:%M:%S')}] 📱 Kode Pairing Anda: {code}")
            print("Masukkan kode ini di WhatsApp HP Anda.")
        else:
            print(f"[{time.strftime('%H:%M:%S')}] [*] Menyiapkan QR Code...")
            await client.connect()
    else:
        await client.connect()

    await client.idle()


if __name__ == "__main__":
    asyncio.run(main())
