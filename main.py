import logging
import os
import signal
import sys
import time
from datetime import datetime
from neonize.client import NewClient
from neonize.events import (
    ConnectedEv, MessageEv, PairStatusEv,
    ReceiptEv, HistorySyncEv, event,
)
from neonize.utils import log
from neonize.utils.enum import ReceiptType

os.environ["NEONIZE_LOG_LEVEL"] = "DISABLED"
os.environ["WHATSMEOW_LOG_LEVEL"] = "NONE"

sys.path.insert(0, os.getcwd())

DB_NAME = "./wsr-bot.db"

logging.basicConfig(level=logging.CRITICAL)
log.setLevel(logging.CRITICAL)
logging.getLogger("neonize").setLevel(logging.CRITICAL)
logging.getLogger("whatsmeow").setLevel(logging.CRITICAL)

def get_time_str():
    return datetime.now().strftime("%H.%M - %d %b")

def handle_exit(*_):
    print("\n[!] Keluar...")
    event.set()
    os._exit(0)

signal.signal(signal.SIGINT, handle_exit)
signal.signal(signal.SIGTERM, handle_exit)

client = NewClient(DB_NAME)

def fix_jid(jid):
    try:
        if jid.Server == "lid":
            return client.get_pn_from_lid(jid)
    except Exception:
        pass
    return jid

@client.event(PairStatusEv)
def on_pair_status(_: NewClient, msg: PairStatusEv):
    print(f"[*] Terhubung sebagai: {msg.ID.User}")

@client.event(ConnectedEv)
def on_connected(_: NewClient, __: ConnectedEv):
    print("⚡ Bot sudah online!")

@client.event(ReceiptEv)
def on_receipt(_: NewClient, receipt: ReceiptEv): pass

@client.event(HistorySyncEv)
def on_history_sync(_: NewClient, hs: HistorySyncEv): pass

@client.event(MessageEv)
def on_message(c: NewClient, message: MessageEv):
    try:
        info = message.Info
        if info.Edit and info.Edit != "":
            return
        chat = fix_jid(info.MessageSource.Chat)
        sender = fix_jid(info.MessageSource.Sender)
        time_str = get_time_str()
        if chat.User == "status" and chat.Server == "broadcast":
            c.mark_read(info.ID, chat=chat, sender=sender, receipt=ReceiptType.READ)
            print(f"[📢 {time_str}] - {sender.User} dibaca")
    except Exception as e:
        print(f"[ERROR on_message] {e}")

if __name__ == "__main__":
    if not os.path.exists(DB_NAME):
        phone = input("Masukkan nomor HP (contoh: 628xxxxxxxx): ").strip()
        client.PairPhone(phone, show_push_notification=True)
        time.sleep(2)

    print("[*] Memanggil client.connect()...")
    client.connect()
    print("[*] client.connect() selesai")