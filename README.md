# auto-routes-js
*v1.1.0*

A basic but configurable client-side router. The SPA experience in vanilla JS and HTML and with no hassle due to a huge framework.

No other third-party dependencies, no bundler needed, no framework necessary, just that one library and you can easily create your own SPA!


## Install
*Please note that the paths and folder structure in the examples below are merely suggestions, you are free to use your own structure.*

*If you do not want to use the CDN version, follow these steps AND the steps in either of the "NPM" subsections further below.*

Create a file named `route.js` in `/src/routes.js`from which you export an object containing routes such as below:
```javascript
export default {
    default: '/views/welcome.html', // Mandatory. Use the full path if the backend doesn't serve this file by default
    'welcome': '/views/welcome.html',
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

Then create a file named `index.js` in `/src/index.js`, such as:

```javascript
import routes from './routes.js';

// Set the router's settings (none are mandatory), see the "Configuration" section further below
const settings = {
    debug: false, // Setting this value to false will prevent Autoroutes to log anything, useful for production environments
    htmlFolder: 'src',
    appPath: 'http://localhost:5000'
}

// Start the router
Router.start({routes, ...settings});
```

In your main HTML file, say `/public/index.html`, add a tag with the id `autoroutes-view` and call the `index.js` you'll next create as a JavaScript module:
```html
<!doctype html>
<html>
  <head>
    <title>My Awesome SPA</title>
  </head>
  <body>
    <header>Welcome to My Awesome SPA</header>
    <section id="autoroutes-view"></section>
    <script src="https://www.unpkg.com/auto-routes-js@1.1.0/dist/Autoroutes-v1.1.0.min.js" type="module"></script> <!-- Remove that line if you don't use the CDN version -->
    <script src="/src/index.js" type="module"></script>
  </body>
</html>
```


### NPM (no bundler)
**Only if your backend can serve the `node_modules` folder or if serving routes can be configured.**

*Make sure you followed the steps of the "Install" section.*

Run:
```
npm install auto-routes-js
```

If your server isn't serving the root folder of your frontend application but you can nonetheless configure it, add a route that serves the `node_modules` folder.

Just add the line below at the beginning of `/src/index.js` (make sure to fix the path):
```javascript
import Router from '/path/to/node_modules/auto-routes-js/index.js';
```


### NPM (with bundler)
*Make sure you followed the steps of the "Install" section.*

Run: 
```
npm install auto-routes-js
```

Add an import to the `auto-routes` module at the beginning of `/src/index.js` (make sure to fix the path) and for a cleaner code you can as well remove the `.js` extension from the other import, such as:
```javascript
import Router from '/path/to/node_modules/auto-routes-js';
import routes from './routes';
```


## Usage
You can use HTML and JS to create the template to be rendered for any route. Wichever you choose, it doesn't exclude the possibility to use the other as well, therefor you may have some routes that use a TML file for the template while some other may have a JavaScript file for that purpose.

### Routing links
To navigate to another route, use the `<router-link></router-link>` element, it take two attributes: `to` and `pathData`.

`to` must be provided the target route's name (works with leading `\` and without it).
`pathData` can be provided a stringified JavaScript object that will be passed to the next route. It will be accessible by calling `History.state` in your code.

**HTML example:**

```html
<router-link to="/cart" pathData="{isLoggedIn: false}"><button>View Cart</button></router-link>
```

**JavaScript example:**
```javascript
const routerLink = document.createElement('router-link');
routerLink.setAttribute('to', '/cart');
routerLink.setAttribute('pathData', JSON.stringify({isLoggedIn: false}));
routerLink.innerHTML = '<button>View Cart</button>';

const selector = document.querySelector('#modal-footer');
selector.appendChild(routerLink); // Make sure you use a working selector
```

### Templating
The prefferred way to render your app is to use HTML template in a file with the `.html` extension and refer to this file in the routes.

But that doesn't prevent you from using JavaScript, and if you bundle your app, even TypeScript or JSX as long as your template files export valid HTML Nodes.


#### HTML
Let's say you want to add a new route such as `/counter`, you can create a file named `counter.html` with basic logics in a `<script></script>` tag to keep it in a single file.

It is not needed to add the whole boilerplate from a usual HTML file, instead you can directly use the template you want to be added to the view.

```html
<!-- Note that HTML files don't need to have only one top-level node, unlike the JavaScript alternative -->
<p>
    Click count: <span id="count">0</span>
</p>
<button id="clickMe" onclick="incrementCount">Click Me!</button>
<script> // You could refer to a script from an JavaScript file as well for a better separation of concerns
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
You want to implement the same counter as above, for that you can create `counter.js`:

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
export default container; // Note that only one top-level node must be exported for the Router. Multiple Nodes appending from JS template will soon be available.
```

Then add it to your `routes.js` file:

```javascript
export default {
    'counter': '/views/counter.js',
    ...otherRoutes
};
```


## Configuration
Some settings can be used to override the router's defaults. You can do so by passing them in an object as second parameter of the `start(routes, settings)` function of the Router, eg. in your `/src/index.js`:
```javascript
import routes from './routes';
import { checkAuthenticated } from './auth';
import { updateUserData } from './services/user';

// Set the router's settings (none are mandatory), see the "Configuration" section further below
const settings = {
    htmlFolder: 'src',
    appPath: process.env.NODE_ENV,
    beforeNavigation: () => {
        if (!checkAuthenticated()) return false;
        udpateUserData();
    }
}

// Start the router
Router.start({routes, ...settings});
```

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

### `appPath`
Type: *string*

Default: `window.location.origin`

The [origin](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin) of the web app. Defaults to the current URL's origin.


### `htmlFolder`
Type: *string*

Default: `""`

The base path to be prepended to the URL to fetch the HTML template files. This can be useful if you serve all the static content from another folder than the main HTML file of your application. This is not needed if you only use JavaScript for the templating.

Since you should serve your main file (say `/public/index.html`) as a catch-all route from your server, the path to the other HTML files will usually not resolve, you might then just want to catch all requests to the path `/src` for instance, and forward them to the `src` folder of your frontend application.