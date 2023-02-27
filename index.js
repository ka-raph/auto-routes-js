import { cleanScripts, loadHTML, loadScripts } from "./utils.js";

export const ROUTER_NAME = 'Autoroute';
export const CUSTOM_ELEMENT_TAG_NAME = 'router-link';
export const CUSTOM_ELEMENT_NODE_NAME = CUSTOM_ELEMENT_TAG_NAME.toUpperCase();
export const SCRIPTS_CLASS_NAME = 'autoroute-script';
export const CONTAINER_NAME = 'autoroute-view';
const MAIN_CONTAINER = document.getElementById('autoroute-view');
const WILDCARD_CHARACTER = ':';
const LAZY_EVENT_NAME = 'routerEvent';

const LAZY_EVENT = new Event(LAZY_EVENT_NAME, {
    bubbles: true,
    cancelable: true,
    composed: false
});

const readOnlyProperties = {
    addListeners,
    mountView,
    start,
}

const Autoroute = {
    beforeNavigation: async () => true,
    afterNavigation: async () => true,
    routes: {},
    appPath: window.location.origin,
    htmlFolder: '',
    wildcards: [],
    route: '',
}
// TODO add DEBUG variable

// Some methods must be immutable
for (const [property, value] of Object.entries(readOnlyProperties))  Object.defineProperty(Autoroute, property, {value, writable: false});

export default Autoroute;



function start(config) {
    Object.assign(Autoroute, config);
    window.Autoroute = Autoroute;
    Autoroute.addListeners();
    if (!Autoroute.routes.default) {
        console.error(`${ROUTER_NAME}: No default route specified.`);
        return;
    }
    if (typeof Autoroute.routes.default !== 'string') {
        console.error(`${ROUTER_NAME}: Default route is not a valid string.`);
        return;
    }
    Autoroute.mountView(getNavigationPath());
}

function addListeners() {
    // Dispatch event when clicking a router link
    document.addEventListener('click', event => {
        if (event.target && event.target.nodeType && event.target.matches(`${CUSTOM_ELEMENT_TAG_NAME}, ${CUSTOM_ELEMENT_TAG_NAME} *`)) {
            const targetRouterLink = event.target.nodeName === CUSTOM_ELEMENT_NODE_NAME ? event.target : event.target.closest(CUSTOM_ELEMENT_TAG_NAME);
            const data = targetRouterLink.getAttribute('pathData') ?? null;
            const path = targetRouterLink.getAttribute('to');
            const fixedPath = path.charAt(0) === '/' ? path : '/' + path; // Allows to omit leading "/"
            LAZY_EVENT.path = fixedPath;
            history.pushState(data, '', fixedPath);
            document.dispatchEvent(LAZY_EVENT);
        }
    });

    // Listen to custom navigation event
    document.addEventListener(LAZY_EVENT_NAME, async event => {
      Autoroute.mountView(event.path);
    });

    // Listen to manual navigation ie. mouse navigation shortcut
    window.addEventListener('popstate', (event) => Autoroute.mountView(getNavigationPath()));
}

async function mountView(route) {
    if (!validatePath(route)) return;

    // Get view path from route
    const fixedRoute = route !== '/' ? route : 'default';

    // Get the path of the file to load and update router's values
    Autoroute.route = '';
    Autoroute.wildcards = [];
    let path = getFilePath(fixedRoute.split('/'));
    if (!path) {
        console.error(`${ROUTER_NAME}: The error above was triggered because of path:`, fixedRoute);
        return;
    }

    // Remove current view's scripts
    cleanScripts();

    // Allow to run auth checks for instance
    await Autoroute.beforeNavigation();

    if (path.match(/\.html/)) {
        MAIN_CONTAINER.innerHTML = await loadHTML(Autoroute.appPath, Autoroute.htmlFolder, path);
    }
    else if (path.match(/\.js/)) {
        MAIN_CONTAINER.innerHTML = '';
        await import(importRoute).then(async view => {
            MAIN_CONTAINER.innerHTML = await view.default;
        });
    }
    else {
        console.error(`${ROUTER_NAME}: File type not supported... yet.`);
        return;
    }

    // Post-rendering hook
    await Autoroute.afterNavigation();

    // Add and run ne wiew's scripts
    loadScripts();
}

function validatePath(route) {
    // Only accept / relative path prefix or no prefix at all
    const pathRegExp = new RegExp(/^(\/?:?[.a-zA-Z0-9-]*\/?)+$/);
    const isValidPath = pathRegExp.test(route);
    if (!isValidPath) console.error(`${ROUTER_NAME}: Specified route is not valid, it might contain invalid characters. Relative paths prefixes other than / aren't allowed (yet).`)

    return isValidPath;
}

function getFilePath(routeArray, currentPathValue = Autoroute.routes) {
    // Recursively go through the Autoroute.routes object to find view's file path from the route
    const route = routeArray[0];
    if (typeof currentPathValue === 'string' && routeArray.length === 1 && routeArray[0].length === 0) return currentPathValue;
    if (route.length === 0) return getFilePath(routeArray.slice(1), currentPathValue); // Allows leading "/" in routes

    let newPathValue = currentPathValue[route];
    let wildcardRoute = '';
    if (newPathValue === null || Array.isArray(newPathValue) || (typeof newPathValue !== 'object' && typeof newPathValue !== 'string') && newPathValue !== undefined) {
        console.error(`${ROUTER_NAME}: Route mismatch, routes must be either a file path (string) or an object containing file paths/nested file paths. \nReceived the following value:`, currentPathValue);
        return;
    }
    if (newPathValue === undefined && typeof currentPathValue === 'object') {
        wildcardRoute = Object.keys(currentPathValue).find(key => key.charAt(0) === WILDCARD_CHARACTER);
        if (wildcardRoute) {
            newPathValue = currentPathValue[wildcardRoute];
            Autoroute.wildcards.push({name: wildcardRoute, value: route});
        }
        else if (Autoroute.routes.fallback) newPathValue = Autoroute.routes.fallback;
        else if (Autoroute.routes.fallback) newPathValue = Autoroute.routes.default;
        else return console.error(`${ROUTER_NAME}: No fallback found for 404 routes.`);
    }
    Autoroute.route += `/${wildcardRoute || route}`;
    if (routeArray.length === 1) return newPathValue;
    else return getFilePath(routeArray.slice(1), newPathValue);
}

function getNavigationPath() {
    const urlPath = window.location.href.replace(Autoroute.appPath, '');
    return urlPath;
}
