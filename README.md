# auto-routes-js
[![NPM version][npm-badge]][npm-url]

A basic but configurable client-side router. The SPA experience in vanilla JS and HTML and with no hassle due to a huge framework.

No other third-party dependencies, no bundler needed, no framework necessary, just that one library and you can easily create your own SPA!

* [Install](#install)
    * [CDN](#cdn)
    * [NPM](#npm)
* [Getting Started](#getting-started)
    * [NPM (no bundler)](#npm-no-bundler)
    * [NPM (with bundler)](#npm-with-bundler)
* [Usage](#usage)
    * [Routing links](routing-links)
    * [Templating](#templating)
        * [HTML](#html)
        * [JavaScript](#javascript)
        * [Other file types](#other-file-types)
* [Configuration](#configuration)
* [API](#api)


## Install
### CDN

In your main HTML file, say `/public/index.html`, add the CDN script before you main JavaScript file, such as:

```html
<!doctype html>
<html>
  <head>
    <title>My Awesome SPA</title>
  </head>
  <body>
    <header>Welcome to My Awesome SPA</header>
    <section id="autoroutes-view"></section>
    <!-- You can use unpkg or any other NPM to CDN service -->
    <script src="https://www.unpkg.com/auto-routes-js@1.1.2/dist/Autoroutes-v1.1.2.min.js" type="module"></script>
    <script src="/src/index.js" type="module"></script>
  </body>
</html>
```


### NPM
Run:
```
npm install auto-routes-js
```


## Getting started
*Please note that the paths and folder structure in the examples below are only suggestions, you are free to use your own structure.*

Create a file named `routes.js` in `/src/routes.js`from which you export an object containing routes such as below:
```javascript
export default {
    default: '/views/welcome.html', // Mandatory. Use the full path if the backend doesn't serve this file by default
    'welcome': '/views/welcome.html', // Don't use forward slashes as first character of the route name, i.e. don't use '/welcome'
    'about': '/views/about.html',
    'wildcard': {
        ':id': {
            'nested': {
                ':otherId': '/views/wildcard.html',
            },
        },
    },
    fallback: '/views/404.html'
};
```

In your main HTML file, say `/public/index.html`, add add a tag with the id `autoroutes-view` and call the `index.js` you'll next create as a JavaScript module:

```html
<!doctype html>
<html>
  <head>
    <title>My Awesome SPA</title>
  </head>
  <body>
    <header>Welcome to My Awesome SPA</header>
    <section id="autoroutes-view"></section>
    <script src="https://www.unpkg.com/auto-routes-js@1.1.2/dist/Autoroutes-v1.1.2.min.js" type="module"></script>
    <script src="/src/index.js" type="module"></script>
  </body>
</html>
```

Then create a file named `index.js` in `/src/index.js`, such as:

```javascript
// The import statement for Autoroutes isn't necessary if you use the CDN version
import routes from './routes.js';

// Set the router's settings (none are mandatory), see the "Configuration" section further below
const settings = {
    debug: false, // Setting this value to false will prevent Autoroutes to log anything, useful for production environments
    baseFolder: 'src',
    appPath: 'http://localhost:5000'
}

// Start the router
Autoroutes.start({routes, ...settings});
```

### NPM (no bundler)
**Only if your backend can serve the `node_modules` folder or if serving routes can be configured.**

If your server isn't serving the root folder of your frontend application but you can nonetheless configure it, add a route that serves the `node_modules` folder in your server.

Just add the line below at the beginning of `/src/index.js` (make sure to fix the path):
```javascript
import Autoroutes from '/path/to/node_modules/auto-routes-js/index.js';
```


### NPM (with bundler)
Add an import to the `auto-routes-js` module at the beginning of `/src/index.js` (make sure to fix the path) and for a cleaner code you can as well remove the `.js` extension from the other import, such as:
```javascript
import Autoroutes from 'auto-routes-js';
import routes from './routes';
```


## Usage
You can use HTML and JS to create the template to be rendered for any route out of the box, but it is also possible to configure Autoroutes.js to parse other file types. Wichever you choose, it doesn't exclude the possibility to mix the templating source types, therefore you may have some routes that use a HTML file for the template while some other may have a JavaScript file or a Markdown file for that purpose.

*Autoroutes.js is very lightweight & fast and modern browsers usually lazy-load files if they've been previously fetched and that the content hasn't changed, therefore the views that the user has already visited will be loaded from memory on their browser by default. But this also means that extremely heavy template files might take a niticeable amount of time to load the first time your users's browser fetches them or if their connection or device aren't fast, especially if you use custom parsers. The [beforeNavigation](#beforenavigation) and [afterNavigation](#afterNavigation) hooks allow you to add for instance a loading screen to cover these scenarios.*


### Routing links
To navigate to another route, use the `<router-link></router-link>` element, it takes one attribute: `to`.

`to` must be provided the target route's name (works with leading `\` and without it).

**HTML example:**

```html
<router-link to="/cart"><button>View Cart</button></router-link>
```

**JavaScript example:**
```javascript
const routerLink = document.createElement('router-link');
routerLink.setAttribute('to', '/cart');
routerLink.innerHTML = '<button>View Cart</button>';

const selector = document.querySelector('#modal-footer');
selector.appendChild(routerLink); // Make sure you use a working selector
```

### Templating

You can use HTML and/or JavaScript out of the box with this router for templating your views. It is also possible to use any other file type such as `.md` but with some extra configuration as explained [further below](#other-file-types).


#### HTML
Let's say you want to add a new route such as `/counter`, you can create a file named `counter.html` with basic logics in a `<script></script>` tag to keep it in a single file.

It is not needed to add the whole boilerplate from a usual HTML file, instead you can directly use the template you want to be added to the view.

```html
<!-- Note that HTML files don't need to have only one top-level node, unlike the JavaScript alternative -->
<p>
    Click count: <span id="count">0</span>
</p>
<button id="clickMe" onclick="incrementCount">Click Me!</button>
<script> // You could refer to a script from a JavaScript file as well for a better separation of concerns
    const counter = document.getElementById('count');
    const btn = document.getElementById('clickMe');
    let count = 0;

    function incrementCount() {
        count++;
        counter.textContent = counter;
    }
</script>
```

Then add it to your `routes.js` file:

```javascript
export default {
    'counter': '/views/counter.html',
    ...otherRoutes
};
```

#### JavaScript
**You can export views as a `string` containing a HTML template such as `"<p><g>Hello!</g></p>"` or as an Array containing valid HTML template string | [Node](https://developer.mozilla.org/en-US/docs/Web/API/Node) | [Element](https://developer.mozilla.org/en-US/docs/Web/API/Element) | [Document](https://developer.mozilla.org/en-US/docs/Web/API/Document) | [DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment).**
One way to implement the same counter as above in a JavaScript file, for that you can create `counter.js`:

```javascript
const container = document.createElement('div');
const counterParag = document.createElement('p');
const btn = document.createElement('button');
let count = 0;

counterParag.innerHTML = `Click count: <span id="count">${counter}</span>`;
btn.textContent = 'Click Me!';

container.append(counterParag, btn);

btn.onclick = () => {
    count++;
    document.getElementById('counter').textContent = counter;
}

// The container will be appended by the Router
export default container;
```

Then add it to your `routes.js` file:

```javascript
export default {
    'counter': '/views/counter.js',
    ...otherRoutes
};
```

#### Other file types
You will need to provide the parser(s) for other file types to Autoroutes.js, here is an example Autoroutes.js configuration to create your views template from `.md` files using [Marked](https://marked.js.org/) (CDN import):

```javascript
import Autoroutes from 'auto-routes-js';
import routes from './routes.js';

const parsers = [ // This should always be an array, this allows you to use as many file parsers as you want
    {
        // `parse` must be a function with one parameter that returns a valid HTML string | Node | Element | Document | DocumentFragment
        parse: mdString => marked.parse(mdString),
        // `pattern` must be a valid Regular Expression (RegExp or string)
        pattern: '.md$'
    },
];

Autoroutes.start({routes, baseFolder: '/src', parsers});
```

Non-JavaScript file types are usually loaded as a string when the user's browser fetches them, make sure your parser takes a single string as an input.

## Configuration
**NOTE: you can both read and write some of the configuration properties of the Autoroute object, but it is recommended to avoid changing them after starting Autoroute.**

Some settings can be used to override the router's defaults. You can do so by passing them in an object as second parameter of the `start(routes, settings)` function of the Router, eg. in your `/src/index.js`:
```javascript
import Autoroutes from 'auto-routes-js';
import routes from './routes';
import { checkAuthenticated } from './auth';
import { updateUserData } from './services/user';

// Set the router's settings (none are mandatory), see the "Configuration" section further below
const settings = {
    baseFolder: 'src',
    appPath: process.env.NODE_ENV,
    beforeNavigation: () => {
        if (!checkAuthenticated()) return false;
        udpateUserData();
    }
}

// Start the router
Autoroutes.start({routes, ...settings});
```

### `routes`
Type: `object`

Default: `{}`

**Required**

This is the main entry for Autoroutes, this will generate the paths and display views from the specified routes.

### `beforeNavigation`
Type: `async function | function`

Default: `async () => true`

Parameters: Doesn't take any parameter.

Return value: If the navigation should be prevented, this must return the boolean `false`, otherwise this is not used.

Can be used to run pre-navigation checks for instance such as auth check, if your custom function returns `false` the navigation will be prevented.

### `afterNavigation`
Type: `async function | function`

Default: `async () => true`

Parameters: Doesn't take any parameter.

Return value: `any`, this is not used.

Can be used to run custom code post-navigation, eg. data updates. This will run before the new scripts from the newly added template if you use HTML files, else if you use JS files for templating, this will run after the template is updated

### `debug`
Type: *boolean*

Default: `true`

Will print errors encoutered by Autoroutes in the console if set to `true`, nothing will be printed if `false` making debugging a bit more complicated.

### `appPath`
Type: *string*

Default: `window.location.origin`

The [origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin) of the web app. Defaults to the current URL's origin.

### `viewsContainerId`
Type: *string*

Default: `autoroutes-view`

The main container's id in which all your views will be rendered, **this setting is not mandatory but having a container with this id in your main HTML file is mandatory**.

### `wildcardChar`
Type: *string*

Default: `:`

**This must be 1 character only!** character used for declaring dynamic routes.

### `tagName`
Type: *string*

Default: `router-link`

**This must be at least two words separated by a single dash! (see [custom elements](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements))** Tag name of Autoroutes navigation links. *Override only if you know what you're doing*.

### `baseFolder`
Type: *string*

Default: `"/"`

The base path to be prepended to the URL to fetch the view files. Leave blank if you serve all the static content from the same folder as the main HTML file of your application.

Since you should serve your main file (say `/public/index.html`) as a catch-all route from your server, the path to the other view files will usually not resolve, you might then just want to catch all requests to the path `/src` for instance, and forward them to the `src` folder of your frontend application, then you should set `baseFolder` to `/src`. For nested folders: if all your views are under `/src/views` in your folder structure for instance, you might as well set `baseFolder` to `/src/views`.

### `parsers`
Type: `Array` ([ParserObject](#parserobject))

Default: `null`


This array can be filled with custom parsers ([ParserObject](#parserobject)) for file types or template types not supported by Autoroutes.js by default. 

#### ParserObject
Each parser has to be an `object` with both the `parse` and `pattern` keys.

**Keys:**

* `parse`: `Function` with one parameter (the content to be parsed) of type string | [Node](https://developer.mozilla.org/en-US/docs/Web/API/Node) | [Element](https://developer.mozilla.org/en-US/docs/Web/API/Element) | [Document](https://developer.mozilla.org/en-US/docs/Web/API/Document) | [DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment)
* `pattern`: `string` | [Regular Expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)

**Example:**

```javascript
const parsers = [
    {
        parse: mdString => marked.parse(mdString),
        pattern: '.md$'
    },
    {
        parse: mdxString => parseCustomMd(mdxString),
        pattern: '.mdx$|.mdy$'
    }
];
```


## API
All of the following properties and methods can be accessed from the global object `Autoroutes` once Autoroutes is started. For instance you can call `Autoroutes.route` to get the current route.

### `setData(data)`
Type: `function`

*readonly*

Parameters:
 * `data` (*any*): Data to be passed to next view, can be retrieved in *current* view using `Autoroutes.draftData` and can be retrieved in next view by using `Autoroutes.getData()`.

Returns: `undefined`

### `getData()`
Type: `function`

*readonly*

Parameters: none

Returns: The data you set in the previous view using `setData(data)`. As the data is saved in the [History](https://developer.mozilla.org/en-US/docs/Web/API/History/state), it can be retrieved when the user navigates through their current session's history as well.

### `draftData`
Type: `string`

Default value: `null`

Returns the current data that will be sent to the next view. *To be honest you could just override this value instead of using `setData(data)` but it's cooler to call a function, thank you React...*

### `route`
Type: `string`

Default value: `""`

Returns the current route as declared in your routes configuration with a `/` separator between each level.

### `wildcards`
Type: Array of objects `{name: string, value: string}`

Default: `[]`

Returns a list of all the wilcards on the current route with their value. For example for a URL path `/user/1234/transactions/abc123` corresponding to the route `/user/:id/transactions/:transactionId`, this would return `[{name: ':id', value: '1234'}, {name: ':transactionId', value: 'abc123'}]`. **You should avoid mutating that value.**

### `name`
Type: `string`

*readonly*

Default: `Autoroutes`

Returns the name of the router.

### `version`
Type: `string`

*readonly*

Returns the version number of this library.


[npm-badge]: https://img.shields.io/npm/v/auto-routes-js.svg?style=flat
[npm-url]: https://www.npmjs.com/package/auto-routes-js