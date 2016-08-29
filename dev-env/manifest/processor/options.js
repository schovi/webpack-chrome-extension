import script from './lib/script'
import html from './lib/html'
import path from 'path'
import fs from 'fs'

export default function(manifest, {buildPath}) {
  const {options_page} = manifest

  // Skip when there is no options_page property
  if(!options_page)
    return

  const scripts = []

  let dirname = path.dirname(options_page)

  // Process background scripts
  let scriptName = dirname + 'index.js';
  if(fs.existsSync(scriptName)) {
      scripts.push(scriptName)
  }

  // Background page
  if(options_page) {
    scripts.push(html(options_page, buildPath))
  }

  return {manifest, scripts}
}
