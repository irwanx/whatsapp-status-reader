export const command = ["npmsearch", "npmjs"];
export const help = ["npmsearch <query>"];
export const tags = ["internet"];

export default async function npmSearch({ m }) {
  if (!m.text) throw "Input Query";
  const res = await fetch(`http://registry.npmjs.com/-/v1/search?text=${m.text}`);
  const { objects } = await res.json();
  if (!objects.length) throw `Query "${m.text}" not found :/`;
  const txt = objects.map(({ package: pkg }) => {
    return `*${pkg.name}* (v${pkg.version})\n_${pkg.links.npm}_\n_${pkg.description}_`;
  }).join`\n\n`;
  m.reply(txt);
}
