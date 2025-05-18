import { performance } from "perf_hooks";

export const command = ["ping"];

export default async function ping({ m, sock }) {
  let old = performance.now();
  let neww = performance.now();
  let speed = neww - old;
  await sock.reply(m.chat, `Merespon dalam ${speed} millidetik`.trim(), m.raw);
}
