import html from './lib/html'

const process = function ({page, buildPath, scripts}) {
    if (!page) return

    scripts.push(html(page, buildPath))

    return true
}

export default function (manifest, {buildPath}) {
    const {options_page} = manifest;

    if (!options_page) return;

    const scripts = []

    process({page: options_page, buildPath, scripts});

    return {scripts};
}