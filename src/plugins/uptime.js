export const command = ["uptime", "runtime"];
export const help = ["uptime"];
export const tags = ["info"];

export default async function uptime({ m }) {
  let _uptime = process.uptime() * 1000;
  let uptime = clockString(_uptime);

  m.reply(
    `
┌─〔 R U N T I M E 〕
├ Bot Aktif Selama 
├ ${uptime}
└────
    `.trim()
  );
}

const clockString = (ms) => {
  let d = isNaN(ms) ? "--" : Math.floor(ms / 86400000);
  let sisaD = ms - d * 86400000;
  let h = isNaN(sisaD) ? "--" : Math.floor(sisaD / 3600000);
  let sisaH = ms - h * 3600000;
  let m = isNaN(sisaH) ? "--" : Math.floor(sisaH / 60000) % 60;
  let sisaM = ms - m * 60000;
  let s = isNaN(sisaM) ? "--" : Math.floor(sisaM / 1000) % 60;
  return `${d} Day ${h} Hours ${m} Minutes ${s} Second`;
};
