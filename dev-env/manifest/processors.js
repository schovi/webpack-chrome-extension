import Csp         from './processor/csp'
import PackageJson from './processor/package_json'
import Assets      from './processor/assets'
import Action      from './processor/action'
import Background  from './processor/background'
import Content     from './processor/content'
import Overrides   from './processor/overrides'
import Locales   from './processor/locales'
import Options   from './processor/options'
import War   from './processor/war'

const processors = [
    // Fix csp for devel
    Csp,
    // Mege package.json
    PackageJson,
    // Process assets
    Assets,
    // Process action (browse, or page)
    Action,
    // Process background script
    Background,
    // Process content script
    Content,
    // Process overrides
    Overrides,
    // Process locales
    Locales,
    // Process options page
    Options,
    // Process Web accessible resources
    War
]

export default processors
