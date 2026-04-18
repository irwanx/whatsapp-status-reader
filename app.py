import asyncio
import logging
import os
import sys
import time
from neonize.aioze.client import NewAClient, ClientFactory
from neonize.aioze.events import ConnectedEv, MessageEv, PairStatusEv, ReceiptEv, CallOfferEv, event
from neonize._binder import gocode
from neonize.proto.Neonize_pb2 import GetJIDFromStoreReturnFunction
from neonize.utils import log
from neonize.utils.enum import ReceiptType
import signal


sys.path.insert(0, os.getcwd())


def interrupted(*_):
    loop = asyncio.get_event_loop()
    asyncio.run_coroutine_threadsafe(ClientFactory.stop(), loop)


log.setLevel(logging.INFO)
signal.signal(signal.SIGINT, interrupted)

client = NewAClient("wsr-bot.sqlite3")


@client.event(ConnectedEv)
async def on_connected(_: NewAClient, __: ConnectedEv):
    print(f"[{time.strftime('%H:%M:%S')}] ⚡ Connected", flush=True)


@client.event(MessageEv)
async def on_message(client: NewAClient, message: MessageEv):
    try:
        chat = message.Info.MessageSource.Chat
        sender = message.Info.MessageSource.Sender
        id_ = message.Info.ID

        if message.Info.Edit != "":
            return

        if chat.User != "status" or chat.Server != "broadcast":
            return

        # Resolve LID ke phone number (sync, tanpa executor)
        actual_sender = sender
        if sender.Server == "lid":
            try:
                jid_buf = sender.SerializeToString()
                bytes_ptr = gocode.GetPNFromLID(client.uuid, jid_buf, len(jid_buf))
                protobytes = bytes_ptr.contents.get_bytes()
                gocode.FreeBytesStruct(bytes_ptr)
                model = GetJIDFromStoreReturnFunction.FromString(protobytes)
                if not model.Error:
                    actual_sender = model.Jid
            except Exception:
                pass

        chat_proto = chat.SerializeToString()
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
            print(f"[{ts}] 👁️  Status dari {actual_sender.User} ditandai dibaca", flush=True)

    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] ❌ ERROR: {e}", flush=True)


@client.event(PairStatusEv)
async def PairStatusMessage(_: NewAClient, message: PairStatusEv):
    print(f"[{time.strftime('%H:%M:%S')}] 🔗 Logged as {message.ID.User}", flush=True)


@client.qr
async def on_qr(_: NewAClient, qr: bytes):
    pass  # abaikan QR, kita pakai pair code


@client.paircode
async def on_paircode(client: NewAClient, code: str, connected: bool = True):
    if connected:
        print(f"[{time.strftime('%H:%M:%S')}] ✅ Pair code processed: {code}", flush=True)
    else:
        print(f"[{time.strftime('%H:%M:%S')}] 📱 Pair code: {code}", flush=True)


async def main():
    await client.connect()
    await asyncio.sleep(1)  # tunggu koneksi stabil

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
        phone = input("Masukkan nomor HP (contoh: 628123456789): ").strip()
        await asyncio.sleep(1)
        code = await client.PairPhone(
            phone,
            show_push_notification=True,
        )
        print(f"[{time.strftime('%H:%M:%S')}] 📱 Masukkan kode ini di WhatsApp > Perangkat Tertaut > Tautkan Perangkat: {code}", flush=True)

    await client.idle()


if __name__ == "__main__":
    asyncio.run(main())
