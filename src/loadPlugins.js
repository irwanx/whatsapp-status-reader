import { readdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pluginDir = path.join(__dirname, './plugins')

export async function loadPlugins() {
  const plugins = []
  const files = await readdir(pluginDir)

  for (const file of files) {
    if (!file.endsWith('.js')) continue

    const fileUrl = pathToFileURL(path.join(pluginDir, file)).href
    const plugin = await import(fileUrl)

    plugins.push(plugin)
  }

  return plugins
}
