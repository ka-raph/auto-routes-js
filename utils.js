import { CONTAINER_NAME, SCRIPTS_CLASS_NAME } from "./index.js";

export async function loadHTML(appPath, htmlFolder, htmlRelativeUrl) {
    const VIEWS_PATH = '/' + htmlFolder;
    const htmlUrl = new URL(VIEWS_PATH + htmlRelativeUrl, appPath).href;
    const response = await fetch(htmlUrl);
    return await response.text();
}

export function loadScripts() {
    // Appending a script like this doesn't work by default, it won't run the script
    const scripts = document.querySelectorAll(`#${CONTAINER_NAME} script`);

    scripts.forEach(script => {
        script.classList.add(SCRIPTS_CLASS_NAME);
        const jscript = script.outerHTML;

        // Remove the current script
        script.parentElement.removeChild(script);

        // Create document fragment that'll add and run the script
        const range = document.createRange();
        range.selectNode(document.getElementsByTagName("BODY")[0]);
        const documentFragment = range.createContextualFragment(jscript);
        document.head.appendChild(documentFragment); // TODO, use this methodology to append the whole file instead of loading it as a string?
    })
}

export function cleanScripts() {
    const head = document.querySelectorAll('head');
    const scripts = document.querySelectorAll(`head ${SCRIPTS_CLASS_NAME}`);

    scripts.forEach(script => {
        script.parentNode.removeChild(script);
    })
}
