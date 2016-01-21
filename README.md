Facettage.js
============

### Facet management for backendless datascapes
Facets are a mix of data and scripts. *Facettage* is a facet store that leverages this data/script duality: configure facets as memory structures and retrieve data like from a store.

> "Information is beautiful, but backends are ugly."                                                                                         
> _- David Backendless_

* [DOWNLOAD](https://github.com/medialab/Facettage/blob/master/facettage.js) - [minified](https://github.com/medialab/Facettage/blob/master/facettage.min.js)
* [EXAMPLES](http://medialab.github.io/Facettage/examples)
* [API REFERENCE](https://github.com/medialab/Facettage/wiki/Facettage-API-reference)

**MIT License**. Requires [D3.js](https://github.com/mbostock/d3) and [FileSaver.js](https://github.com/eligrey/FileSaver.js) to work properly.

### Problems it solves
You are prototyping a backendless dashboard. Thanks to *D3.js* or other libraries, your javascript is really efficient at filtering and transforming data into multiple facets that you visualize with generic UX modules. However **all the facets are not made equal**. Some are reusable, and you want to keep them in memory, while others are not. Some are lightweight but costly to compute, and you want to cache them, while others are the opposite. *Facettage* solves different facet management issues:

- You often want to **change how a facet is obtained**.
- Some facets are less costly if you compute them from other facets, and you grow a **facet dependency tree**.
- How to easily **generate cache files** when you have no backend?
- You want to **clear certain facets** because of RAM issues, but not *that* heavy, costly but crucial facet that is needed everywhere.

### How to use
Basically, you describe your facets and their properties before accessing them when you need it. With the proper configuration, *Facettage* relieves you from the burden of wondering how you should access each different facet.

> "Few it's more."                                                                                         
> _- Morritz Few_

#### 1. Create a facet
There are 3 ways to create a new facet:
```javascript
// Facet from data
var facet = Facettage.newFacet('jedi', {
  data: {name: 'Anakin Skywalker'}
});
```

```javascript
// Facet from file. This example requires the proper CSV file in the data cache.
var facet = Facettage.newFacet('jedi', {
  cached: true,
  type: 'csv'
});
```

```javascript
// Facet from function
var facet = Facettage.newFacet('jedi', {
  compute: function(){ return {name: 'Anakin Skywalker'}; }
});
```

#### 2. Retrieve the data from the facet

When you ask data to the facet, you do not care where it comes from.

```javascript
myFacet.retrieveData( function (data) {
  // Do something with data
});
```

*Facettage* even stores the facet from you.

```javascript
// Get the facet from its name
Facettage.getFacet('my-facet')
  .retrieveData( function (data) {
    // Do something with data
  });
```

The ```retrieveData()``` method gets the data from memory if it is available, then downloads from the cache if it is ```cached```, and finally computes it if it has a ```compute()``` method. These specific methods are also available if you want.

#### 3. Create and resolve facet dependencies
```javascript
// The 'root' data is a list of things stored in a CSV file
Facettage.newFacet('list-of-things.csv', {
  cached: true,
  type: 'csv'
});

// This facet is a filtered version of the list
Facettage.newFacet('red-things', {
  dependencies:['list-of-things.csv'],
  compute: function () {
    return Facettage.getFacet('list-of-things.csv')
      .getData()
      .filter( function (d) {
        return d.color == 'red';
      });
  }
});

// You can ask for 'red-things' from there, the dependency will be resolved before.
Facettage.getFacet('red-things')
  .retrieveData( function (redThings) {
    // Do something with redThings
  });
```

#### Generating the cache

*Facettage* helps you to download the facet data.

```javascript
// Download a facet
Facettage.getFacet('countries-stat-summary').download();
// The downloaded JSON file has the facet for name: 'countries-stat-summary'

// Download all facets that need to be
Facettage.downloadCacheables();
```

The ```downloadCacheables()``` downloads any facet that:
- is not already cached,
- has been computed,
- and is not ```uncacheable```.

Take the downloaded files, put them in the 'data/cache/' folder where *Facettage* will retrieve them. Then edit your code to activate the cache for that facet. Do not erase the ```compute()``` method, it may be useful later if you change your mind.

Note: you can specify additional methods to serialize and unserialize data.

### More

Take a look at the source code of [online examples](http://medialab.github.io/Facettage/examples/).

Also, [api reference](https://github.com/medialab/Facettage/wiki/Facettage-API-reference).

