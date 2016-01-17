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
// TODO
```
* Use the name as a specific descriptor of the facet
* create dynamic facets
* show all features
- ephemeral
- download
- downloadCacheables

## More examples
// TODO