import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'

import * as paths from '../../paths'
import * as log from '../log'
import * as Remove from '../../util/remove';
import script from './lib/script'

export default function (manifest, {buildPath}) {
    var {web_accessible_resources} = manifest;
    if (!web_accessible_resources) return;
    //console.log(web_accessible_resources)
    web_accessible_resources.forEach(function(resource){
        var localSrc = path.join(paths.src, resource);
        var buildSrc = path.join(buildPath, resource);
        log.pending(`Copy resource '${localSrc}' to '${buildSrc}'`);
        fs.copy(localSrc, buildSrc);
    })

    log.done(`Done`);

    return {manifest}
}