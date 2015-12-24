import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'
import mkdirp from 'mkdirp'

import * as paths from '../../paths'
import * as log from '../log'
import * as Remove from '../../remove'

const buildAssetsDir = '$assets'

const processAsset = function(object, key, buildPath) {
  const assetPath = object[key]

  log.pending(`Processing asset '${assetPath}'`)

  // Create directory if not exists
  const buildAssetsDirPath = path.join(buildPath, buildAssetsDir)
  try {
    const buildAssetsDirStats = fs.lstatSync(buildAssetsDirPath);

    if(!buildAssetsDirStats.isDirectory())
      mkdirp.sync(buildAssetsDirPath)
  } catch(ex) {
    mkdirp.sync(buildAssetsDirPath)
  }

  const assetSrcPath = path.join(paths.src, assetPath)
  const buildAssetPath = path.join(buildAssetsDir, Remove.path(assetPath))
  const assetDestPath = path.join(buildPath, buildAssetPath)

  fs.copySync(assetSrcPath, assetDestPath)

  object[key] = buildAssetPath

  log.done(`Done`)

  return true
}

const processIcon = function(action, key, buildPath) {
  let settings = action[key];

  if(typeof settings === 'object') {
    _.forEach(settings, (iconPath, name) => processAsset(settings, name, buildPath))
  } else {
    processAsset(action, key, buildPath)
  }
}

export default function(manifest, { buildPath }) {

  const { browser_action, page_action } = manifest

  // Process icons
  if (manifest.icons) {
    processIcon(manifest, 'icons', buildPath)
  }

  // Browser action
  if(browser_action && browser_action.default_icon) {
    processIcon(browser_action, 'default_icon', buildPath)
  }

  // Page action
  if(page_action && page_action.default_icon) {
    processIcon(page_action, 'default_icon', buildPath)
  }

  // TODO can there be more assets?

  return { manifest }
}
