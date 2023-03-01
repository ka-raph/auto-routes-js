const Autoroutes = {
    beforeNavigation: async () => true,
    afterNavigation: async () => true,
    routes: {},
    appPath: window.location.origin,
    htmlFolder: '',
    wildcards: [],
    route: '',
    viewsContainerId: 'autoroutes-view',
    wildcardChar: ':',
    tagName: 'router-link',
    scriptsClass: 'autoroutes-script',
    debug: true
}

// Some methods must be immutable
const readOnlyProperties = {
    addListeners,
    mountView,
    navigate,
    getData,
    start,
    name: 'Autoroutes'
}
for (const [property, value] of Object.entries(readOnlyProperties)) Object.defineProperty(Autoroutes, property, {value, writable: false});


export default Autoroutes;


const MAIN_CONTAINER = document.getElementById(Autoroutes.viewsContainerId);
const EVENT_NAME = 'routerEvent';
const NAVIGATION_EVENT = new Event(EVENT_NAME, {
    bubbles: true,
    cancelable: true,
    composed: false
});


// ======================================================================================
// ==                                                                                  ==
// ==                                     METHODS                                      ==
// ==                                                                                  ==
// ======================================================================================
function start(config) {
    Object.assign(Autoroutes, config);
    window.Autoroutes = Autoroutes;
    Autoroutes.addListeners();
    if (!Autoroutes.routes.default) {
        if (Autoroutes.debug) console.error(`${Autoroutes.name}: No default route specified.`);
        return;
    }
    if (typeof Autoroutes.routes.default !== 'string') {
        if (Autoroutes.debug) console.error(`${Autoroutes.name}: Default route is not a valid string.`);
        return;
    }
    Autoroutes.mountView(getNavigationPath());
}

function addListeners() {
    // Dispatch event when clicking a router link
    document.addEventListener('click', event => {
        if (event.target && event.target.nodeType && event.target.matches(`${Autoroutes.tagName}, ${Autoroutes.tagName} *`)) {
            const targetRouterLink = event.target.nodeName === Autoroutes.tagName.toUpperCase() ? event.target : event.target.closest(Autoroutes.tagName);
            let data = {};
            try {
                data = JSON.parse(targetRouterLink.getAttribute('pathData'));
            } 
            catch(e) {
                if (Autoroutes.debug) console.error(`${Autoroutes.name}: Could not parse data to set navigation state. Data value received:`, data, 'Standard error:', e);
            }
            const path = targetRouterLink.getAttribute('to');

            navigate(path, data);
        }
    });

    // Listen to custom navigation event
    document.addEventListener(EVENT_NAME, async event => {
      Autoroutes.mountView(event.path);
    });

    // Listen to manual navigation ie. mouse navigation shortcut
    window.addEventListener('popstate', (event) => Autoroutes.mountView(getNavigationPath()));
}

async function mountView(route) {
    // Allow to run auth checks for instance
    if (await Autoroutes.beforeNavigation() === false) return;
    // Check path validity before continuing
    if (!validatePath(route)) return;

    // Get view path from route
    const fixedRoute = route !== '/' ? route : 'default';

    // Get the path of the file to load and update router's values
    Autoroutes.route = '';
    Autoroutes.wildcards = [];
    let path = getFilePath(fixedRoute.split('/'));
    if (!path) {
        if (Autoroutes.debug) console.error(`${Autoroutes.name}: The error above was triggered because of path.`, fixedRoute);
        return;
    }

    // Remove current view's scripts
    cleanScripts();

    if (path.match(/\.html/)) {
        MAIN_CONTAINER.innerHTML = await loadHTML(Autoroutes.appPath, Autoroutes.htmlFolder, path);
    }
    else if (path.match(/\.js/)) {
        MAIN_CONTAINER.innerHTML = '';
        await import(importRoute).then(async view => {
            MAIN_CONTAINER.innerHTML = await view.default;
        });
    }
    else {
        if (Autoroutes.debug) console.error(`${Autoroutes.name}: File type not supported... yet.`);
        return;
    }

    // Post-rendering hook
    await Autoroutes.afterNavigation();

    // Add and run the wiew's scripts
    loadScripts();
}

function navigate(route, data = {}) {
    const fixedPath = route.charAt(0) === '/' ? route : '/' + route; // Allows to omit leading "/"
    NAVIGATION_EVENT.path = fixedPath;
    history.pushState({data}, '', fixedPath);

    document.dispatchEvent(NAVIGATION_EVENT);
    mountView(route)
}

function getData() {
    const state = history.state !== null ? history.state.data : null;
    return state;
}



// ======================================================================================
// ==                                                                                  ==
// ==                                      UTILS                                       ==
// ==                                                                                  ==
// ======================================================================================
function validatePath(route) {
    // Only accept the `/` relative path prefix or no prefix at all
    const pathRegExp = new RegExp(/^(\/?:?[.a-zA-Z0-9-]*\/?)+$/);
    const isValidPath = pathRegExp.test(route);
    if (!isValidPath && Autoroutes.debug) console.error(`${Autoroutes.name}: Specified route is not valid, it might contain invalid characters. Relative paths prefixes other than / aren't allowed (yet).`)

    return isValidPath;
}

function getFilePath(routeArray, currentPathValue = Autoroutes.routes) {
    // Recursively go through the Autoroutes.routes object to find view's file path from the route
    const route = routeArray[0];
    if (typeof currentPathValue === 'string' && routeArray.length === 1 && routeArray[0].length === 0) return currentPathValue;
    if (route.length === 0) return getFilePath(routeArray.slice(1), currentPathValue); // Allows leading "/" in routes

    let newPathValue = currentPathValue[route];
    let wildcardRoute = '';
    if (newPathValue === null || Array.isArray(newPathValue) || (typeof newPathValue !== 'object' && typeof newPathValue !== 'string') && newPathValue !== undefined) {
        if (Autoroutes.debug) console.error(`${Autoroutes.name}: Route mismatch, routes must be either a file path (string) or an object containing file paths/nested file paths. \nReceived the following value:`, currentPathValue);
        return;
    }
    if (newPathValue === undefined && typeof currentPathValue === 'object') {
        wildcardRoute = Object.keys(currentPathValue).find(key => key.charAt(0) === Autoroutes.wildcardChar);
        if (wildcardRoute) {
            newPathValue = currentPathValue[wildcardRoute];
            Autoroutes.wildcards.push({name: wildcardRoute, value: route});
        }
        else if (Autoroutes.routes.fallback) newPathValue = Autoroutes.routes.fallback;
        else if (Autoroutes.routes.default) newPathValue = Autoroutes.routes.default;
        else {
            if (Autoroutes.debug) console.error(`${Autoroutes.name}: No fallback found for 404 routes.`);
            return;
        }
    }
    Autoroutes.route += `/${wildcardRoute || route}`;
    if (routeArray.length === 1) return newPathValue;
    else return getFilePath(routeArray.slice(1), newPathValue);
}

function getNavigationPath() {
    const urlPath = window.location.href.replace(Autoroutes.appPath, '');
    return urlPath;
}

async function loadHTML(appPath, htmlFolder, htmlRelativeUrl) {
    const VIEWS_PATH = '/' + htmlFolder;
    const htmlUrl = new URL(VIEWS_PATH + htmlRelativeUrl, appPath).href;
    const response = await fetch(htmlUrl);
    return await response.text();
}

function loadScripts() {
    // Appending a script like this doesn't work by default, it won't run the script
    const scripts = document.querySelectorAll(`#${Autoroutes.viewsContainerId} script`);

    scripts.forEach(script => {
        script.classList.add(Autoroutes.scriptsClass);
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

function cleanScripts() {
    const head = document.querySelectorAll('head');
    const scripts = document.querySelectorAll(`head ${Autoroutes.scriptsClass}`);

    scripts.forEach(script => {
        script.parentNode.removeChild(script);
    })
}