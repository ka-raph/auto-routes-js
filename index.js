const Autoroutes = {
    beforeNavigation: async () => true,
    afterNavigation: async () => true,
    routes: {},
    appPath: window.location.origin,
    baseFolder: '/',
    wildcards: [],
    route: '',
    viewsContainerId: 'autoroutes-view',
    wildcardChar: ':',
    tagName: 'router-link',
    scriptsClass: 'autoroutes-script',
    debug: true,
    draftData: null,
    parsers: null
}

// Some methods must be immutable
const readOnlyProperties = {
    addListeners,
    mountView,
    navigate,
    getData,
    setData,
    start,
    name: 'Autoroutes',
    version: '1.1.2'
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
function start(config) { // TODO validate config
    if (config.baseFolder !== undefined) config.baseFolder.charAt(0) === '/' ? config.baseFolder : '/' + config.baseFolder;
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
    Autoroutes.mountView(window.location.pathname);
}

function addListeners() {
    // Dispatch event when clicking a router link
    document.addEventListener('click', event => {
        if (event.target && event.target.nodeType && event.target.matches(`${Autoroutes.tagName}, ${Autoroutes.tagName} *`)) {
            const targetRouterLink = event.target.nodeName === Autoroutes.tagName.toUpperCase() ? event.target : event.target.closest(Autoroutes.tagName);
            const path = targetRouterLink.getAttribute('to');

            navigate(path);
        }
    });

    // Listen to custom navigation event
    document.addEventListener(EVENT_NAME, async event => {
      Autoroutes.mountView(event.path);
    });

    // Listen to manual navigation ie. mouse navigation shortcut
    window.addEventListener('popstate', (event) => Autoroutes.mountView(window.location.pathname));
}

async function mountView(route) {
    // Allow to run auth checks for instance
    if (await Autoroutes.beforeNavigation() === false) return;

    // Check path validity before continuing
    if (!validatePath(route)) return;

    // Get view path from route
    const fixedRoute = route === '/' || route === '' ? 'default' : route;

    // Get the path of the file to load and update router's values
    Autoroutes.route = '';
    Autoroutes.wildcards = [];
    let path = getFilePath(fixedRoute.split('/'));
    Autoroutes.route = Autoroutes.route.replace('/', ''); // First dash shouldn't be shown
    if (!path) {
        if (Autoroutes.debug) console.error(`${Autoroutes.name}: The error above was triggered because of path.`, route);
        return;
    }

    // Mount view
    const fixedPath = Autoroutes.baseFolder + path;
    if (path.match(/\.html/)) {
        await loadHTMLView(fixedPath);
    }
    else if (path.match(/\.js/)) {
        await loadJSView(fixedPath);
    }
    else {
        let hasParser = false;
        for (const customParser of Autoroutes.parsers) {
            if (!path.match(customParser.pattern)) continue;
            if (!validateCustomParser(fixedPath, customParser)) return;

            hasParser = true;
            await loadCustomView(fixedPath, customParser)
            break;
        }
        if (!hasParser && Autoroutes.debug) return console.error(`${Autoroutes.name}: File type not supported... yet. Try setting up a parser for this file's type ${fixedPath}`);
    }

    // Post-rendering hook
    await Autoroutes.afterNavigation();
}

function navigate(route, data) {
    const fixedPath = route.charAt(0) === '/' ? route : '/' + route; // Allows to omit leading "/"
    NAVIGATION_EVENT.path = fixedPath;

    const fixedData = data !== undefined && data !== null ? data : Autoroutes.draftData;
    history.pushState(fixedData, '', fixedPath);

    // Ensure no data might be accidentally added in next navigation
    setData(null);

    document.dispatchEvent(NAVIGATION_EVENT);
}

function setData(data = {}) {
    Autoroutes.draftData = data;
}

function getData() {
    return history.state;
}



// ======================================================================================
// ==                                                                                  ==
// ==                                      UTILS                                       ==
// ==                                                                                  ==
// ======================================================================================
function validatePath(route) {
    // Only accept the `/` relative path prefix or no prefix at all
    const pathRegExp = new RegExp(`^(\/?${Autoroutes.wildcardChar}?[.a-zA-Z0-9-]*\/?)+$`);
    const isValidPath = pathRegExp.test(route);
    if (!isValidPath && Autoroutes.debug) console.error(`${Autoroutes.name}: Specified route is not valid, it might contain invalid characters. Relative paths prefixes other than / aren't allowed (yet).`)

    return isValidPath;
}

function getFilePath(routeArray, currentPathValue = Autoroutes.routes) {
    // Recursively go through the Autoroutes.routes object to find view's file path from the route
    const route = routeArray[0];
    if (typeof currentPathValue === 'string' && routeArray.length === 1 && routeArray[0].length === 0) return currentPathValue; // Trailing "/", path is complete
    if (route.length === 0) return getFilePath(routeArray.slice(1), currentPathValue); // Allows leading "/" in routes

    let newPathValue = currentPathValue[route];

    // Check malformated route
    if (newPathValue === null || Array.isArray(newPathValue) || (typeof newPathValue !== 'object' && typeof newPathValue !== 'string') && newPathValue !== undefined) {
        if (Autoroutes.debug) console.error(`${Autoroutes.name}: Route mismatch, routes must be either a file path (string) or an object containing file paths/nested file paths. \nReceived the following value:`, currentPathValue);
        return;
    }

    // Handle wildcard & 404
    let wildcardRoute = '';
    if (newPathValue === undefined && typeof currentPathValue === 'object') {
        wildcardRoute = Object.keys(currentPathValue).find(key => key.charAt(0) === Autoroutes.wildcardChar);
        if (wildcardRoute) {
            // Only first wildcard will be caught
            // TODO handle multiple wildcards at same level
            newPathValue = currentPathValue[wildcardRoute];
            Autoroutes.wildcards.push({name: wildcardRoute, value: route});
        }
        else if (Autoroutes.routes.fallback) newPathValue = Autoroutes.routes.fallback; // 404
        else if (Autoroutes.routes.default) newPathValue = Autoroutes.routes.default; // 404 isn't defined
        else {
            if (Autoroutes.debug) console.error(`${Autoroutes.name}: No fallback found for 404 routes.`);
            return;
        }
    }
    Autoroutes.route += `/${wildcardRoute || route}`;

    if (routeArray.length === 1) return newPathValue; // This was the last part of the route
    else return getFilePath(routeArray.slice(1), newPathValue); // Go to next route part
}

async function loadJSView(viewRelativeUrl) {
    // Import view from the JS file
    await import(viewRelativeUrl).then(async view => {
        const html = await view.default;
        if (typeof html === 'string') {
            MAIN_CONTAINER.innerHTML = html;
            return;
        }

        MAIN_CONTAINER.innerHTML = ''; // Not in the beginning of the function because if the document is massive there would be a temporary blank view
        if (Array.isArray(html)) {
            MAIN_CONTAINER.append(...html);
        }
        else if (html instanceof Node || html instanceof Element || html instanceof Document || html instanceof DocumentFragment) {
            MAIN_CONTAINER.append(html);
        }
    });
}

async function loadHTMLView(viewRelativeUrl) {
    // Fetches the view's HTML file and returns its content
    const htmlUrl = new URL(viewRelativeUrl, Autoroutes.appPath).href;
    const response = await fetch(htmlUrl);
    const viewHtml = await response.text();

    // Create document Fragment, this can allow sripts to run
    const range = document.createRange();
    range.selectNode(MAIN_CONTAINER);
    const documentFragment = range.createContextualFragment(viewHtml);

    MAIN_CONTAINER.innerHTML = '';
    MAIN_CONTAINER.appendChild(documentFragment);
}

async function loadCustomView(viewRelativeUrl, customParser) { // TODORAF refactor with JS loading function above
    // Fetches the view's HTML file and returns its content
    const fileUrl = new URL(viewRelativeUrl, Autoroutes.appPath).href;
    const response = await fetch(fileUrl);
    const viewString = await response.text();
    const viewParsed = await customParser.parse(viewString);
    let contentToAppend = null;

    if (typeof viewParsed === 'string') {
        // Create document Fragment, this can allow sripts to run
        const range = document.createRange();
        range.selectNode(MAIN_CONTAINER);
        contentToAppend = [range.createContextualFragment(viewParsed)];
    }
    else if (Array.isArray(viewParsed)) {
        contentToAppend = [...viewParsed];
    }
    else if (viewParsed instanceof Node || viewParsed instanceof Element || viewParsed instanceof Document || viewParsed instanceof DocumentFragment) {
        contentToAppend = [viewParsed];
    }
    else {
        // TODORAF handle that case
        return;
    }

    MAIN_CONTAINER.innerHTML = '';
    MAIN_CONTAINER.append(...contentToAppend);
}

function validateCustomParser(fixedPath, customParser) {
    const parserErrors = [];
    if (customParser.pattern && typeof customParser.pattern !== 'string' && !(customParser.pattern instanceof RegExp)) parserErrors.push(`${Autoroutes.name}: Pattern for custom parser is not valid.`);
    if (typeof customParser.parse !== 'function') parserErrors.push(`${Autoroutes.name}: Custom parser is not a valid function.`);
    if (parserErrors.length > 0 && Autoroutes.debug) console.error(`${Autoroutes.name}: One or more errors happened when using the provided parser for the file ${fixedPath}.`, ...parserErrors);
    return parserErrors.length === 0;
}