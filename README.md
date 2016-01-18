Facettage.js
============
**Facet management for backendless datascapes**

> "Information is beautiful, but backends are ugly."                                                                                         
> _- David Backendless_

### What it does
When you build a data-oriented static website, *Facettage* organizes how to access the different facets of data. You describe the facets and it helps you retrieve, compute and cache them.

### Problems it solves
**Imagine you have to build a backendless dashboard.** Thanks to *D3.js* or other libraries, your javascript is really efficient at filtering and transforming data into multiple facets that you visualize with generic UX modules. However **all the facets are not made equal**. Some are reusable, and you want to keep them in memory, while others are not. Some are lightweight but costly to compute, and you want to cache them, while others are the opposite. *Facettage* solves different facet management issues:

- You often want to **change how a facet is obtained**.
- Some facets are less costly if you compute them from other facets, and you grow a **facet dependency tree**.
- How to easily **generate cache files** when you have no backend?
- You want to **clear certain facets** because of RAM issues, but not *that* heavy, costly but crucial facet that is needed everywhere.

> "Data management is like graphic design: few is more."                                                                                         
> _- Morritz Few_

### How to use
Basically, you describe your facets and their properties before accessing them when you need it. With the proper configuration, *Facettage* relieves you from the burden as wondering how you should access each different facet.

#### 1. Create a facet
```javascript
// Facet from data
var facet = Facettage.newFacet('jedi', {
  data: {name: 'Anakin Skywalker'}
});

// Facet from file. This example requires the proper CSV file in the data cache.
var facet = Facettage.newFacet('jedi', {
  cached: true,
  type: 'csv'
});

// Facet from function
var facet = Facettage.newFacet('jedi', {
  compute: function(){ return {name: 'Anakin Skywalker'}; }
});
```

#### 2. Retrieve the data from the facet
```javascript
// Retrieve the data without wondering where it comes from
myFacet.retrieveData( function (data) {
  // Do something with data
});

// You can get the facet from just its name
Facettage.getFacet('my-facet')
  .retrieveData( function (data) {
    // Do something with data
  });
```
The ```retrieveData()``` method gets the data from memory if it is available, then downloads from the cache if it is ```cached```, and finally computes it if it has a ```compute()``` method. The specific methods exist and you can use them if you want.

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
Note that we used the ```getData()``` method instead of ```retrieveData()``` because dependency resolution ensured that the facet would be directly resolved.

## A complete example with recommandations
```javascript
// DECLARE FACETS
// The 'root' data consists of a list of countries from a JSON file
Facettage.newFacet('countries', {
  cached: true,
  type: 'json'
});

// Top 10 of the most populated countries
Facettage.newFacet('countries-top10-population', {
  cached: true,
  type: 'csv',
  // Note: This facet is cached and computed at the same time.
  //       In case you wonder why, explanations are provided after the code block.
  dependencies:['countries'],
  compute: function () {
    var countries = Facettage.getFacet('countries').getData();
    // Sort countries by population
    countries.sort( function (a, b){
      return b.population - a.population;
    });
    // Return the 10 first elements
    return countries.filter( function (country, i) {
      return i < 10;
    });
  }
});

// Statistic profile of the countries
Facettage.newFacet('countries-stat-summary', {
  dependencies:['countries'],
  compute: function () {
    // The following code is costly to compute while its result is very tiny
    var countries = Facettage.getFacet('countries').getData();
    var countries_population = countries.map( function (c) { return c.population });
    var countries_area = countries.map( function (c) { return c.area });
    return {
      'mean-population': d3.mean(countries_population),
      'min-population':  d3.min(countries_population),
      'max-population':  d3.max(countries_population),
      'mean-area': d3.mean(countries_area),
      'min-area':  d3.min(countries_area),
      'max-area':  d3.max(countries_area)
    };
  }
});

// A dynamic filter selecting countries by latitude and longitude
var getFacet_countryList_byLatLong = function (latMin, latMax, lonMin, lonMax) {
  // Note: we name the facet including the parameters so that there are no conflicts.
  return Facettage.newFacet('countries-lat-' + latMin +'-' + latMax +'-lon-' + lonMin +'-' + lonMax, {
    // We don't want to store these facets, that's what 'ephemeral' does
    ephemeral: true,
    compute: function () {
      return countries = Facettage.getFacet('countries')
        .getData()
        .filter(latLonFilter);

      function latLonFilter (country) {
        if (...) { return true; }
      }
    },
    // We never want to cache this facet. See below the code block for precisions.
    uncacheable: true
  });
}

// OBTAIN DATA FROM FACETS
var popTop10 = Facettage.getFacet('countries-top10-population').retrieveData();
// => Downloads the top 10 because it is cached (cache has priority over computing)

var summary = Facettage.getFacet('countries-stat-summary').retrieveData();
// => Downloads the root data 'countries' first, because it is a dependency,
//    then computes the 'countries-stat-summary' data.

var facet_northernHemisphere = getFacet_countryList_byLatLong(0, +Infinity, -Infinity, +Infinity);
var countries_northernHemisphere = facet_northernHemisphere.retrieveData();
// => Root data 'countries' is already retained in memory so it is not downloaded again,
//    then northern countries are computed.

var facet_southernHemisphere = getFacet_countryList_byLatLong(-Infinity, 0, -Infinity, +Infinity);
var countries_southernHemisphere = facet_northernHemisphere.retrieveData();
// => facet_northernHemisphere is cleared because it is ephemeral,
//    then southern countries are computed from 'countries' data.
```
Remarks:
- Facets are retrieved from their name. To avoid conflicts, use the most explicit naming.
- Some facets are dynamically generated. The parameters should be included in the name like in the example above.
- The ```ephemeral``` setting is used for facets you don't even want to store in memory
- The facet ```countries-top10-population``` has a ```compute()``` method that is never used because the facet is ```cached```. This is a common case where the ```compute()``` method was once used to generate the cache.
- The facet ```countries-stat-summary``` is costly to compute and is not cached. It would really be a good idea to do it.

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

You can specify additional methods to serialize and unserialize data. Our example above can be edited this way:
```javascript
Facettage.newFacet('countries-stat-summary', {
  // This facet is now cached. The resulting file is stored in /data/cache/.
  cached: true,
  dependencies:['countries'],
  compute: function () { ... },
  // Unserialize will be executed after retrieving the file from the cache
  unserialize: function (data) {
    // Numbers have to be parsed
    data['mean-population'] = parseInt( data['mean-population'], 10 );
    data['min-population'] = parseInt( data['min-population'], 10 );
    data['max-population'] = parseInt( data['max-population'], 10 );
    data['mean-area'] = parseInt( data['mean-area'], 10 );
    data['min-area'] = parseInt( data['min-area'], 10 );
    data['max-area'] = parseInt( data['max-area'], 10 );
  }
});
```
