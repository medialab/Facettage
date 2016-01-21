'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var Facettage = function () {

  // Namespace
  var ns = {};

  // Properties
  ns.facetDictionary = {};
  // TODO: implement a config setting for cache location
  ns.cacheLocation = 'data/cache/';
  ns.debug = false;

  ns.getFacetList = function () {
    var result = [];

    for (var i in ns.facetDictionary) {
      result.push(ns.facetDictionary[i]);
    }

    return result;
  };

  ns.requireFacet = function (id, opts_) {
    var f = ns.getFacet(id);
    if (f) return f;
    return ns.newFacet(id, opts_);
  };

  ns.getFacet = function (id) {
    return ns.facetDictionary[id];
  };

  /**
   * Valid ways of creating a facet:
   *
   * A. With the data itself:
   *    newFacet('jedi', {data:{name:'Anakin Skywalker'}})
   *
   * B. With a cache:
   *    newFacet('jedi', {cached:true})
   *    Note: you have to ensure that the cached file is
   *          actually at the proper location
   *
   * C. With a compute method involving no dependency:
   *    newFacet('jedi', {compute:function(){return {name:'Anakin Skywalker'}}})
   *
   * D. With a compute method involving dependencies:
   *    newFacet('jediLastName', {
   *      dependencies:['jedi'],
   *      compute: function(){
   *        return getFacet('jedi').getData().name.split(' ')[1]
   *      }
   *    })
   */
  ns.newFacet = function (id, opts_) {
    var opts = opts_ || {};
    var facet = {};

    if (id) {
      if (ns.facetDictionary[id] === undefined) {
        /**
         * Facet lifecycle:
         * 1. Is it ready? YES: get the data. NO: go deeper.
         * 2. Is it cached? YES: load the data. NO: go deeper.
         * 3. Are dependencies ready? YES: compute the data.
         *    NO: Get the dependencies, then compute the data.
         *
         * NOTE: Loadability, compute method and dependencies have to be managed elsewhere.
         *       The facet object is just a helper to organize the lifecycle.
         */
        if (opts.data === undefined && !opts.cached && (opts.compute === undefined || typeof opts.compute !== 'function')) {
          console.warn('Impossible to create facet without data OR cache OR a compute method. id:' + id, facet);
          return;
        }
        facet.id = id;
        facet.data = undefined;
        facet.serialize = function (x) {
          return x;
        };
        facet.unserialize = function (x) {
          return x;
        };
        facet.formatSerialize = undefined;
        facet.formatUnserialize = undefined;
        facet.ready = false;
        facet.cached = false;
        facet.uncacheable = false;
        facet.ephemeral = false;
        facet.dependencies = [];
        facet._compute = opts.compute;
        facet.type = 'json';

        // Check and apply options
        if (opts.cached) {
          facet.cached = true;
        }
        if (opts.uncacheable) {
          facet.uncacheable = true;
        }
        if (opts.ephemeral) {
          facet.ephemeral = true;
        }

        if (opts.dependencies) {
          if (Array.isArray(opts.dependencies)) {
            facet.dependencies = opts.dependencies;
          } else {
            console.warn('Dependencies not added because they are not an array. Facet id:' + id, facet);
          }
        }

        if (!Array.isArray(facet.dependencies)) {
          console.error('Impossible to create facet because dependencies are not an array. id:' + id, facet);
          return;
        }

        if (opts.data !== undefined) {
          facet.data = opts.data;
          facet.ready = true;
        }

        if (opts.type) {
          switch (opts.type) {
            case 'json':
              facet.formatUnserialize = JSON.parse;
              facet.formatSerialize = JSON.stringify;
              break;
            case 'text':
              facet.formatUnserialize = function (x) {
                return x;
              };
              facet.formatSerialize = function (x) {
                return x;
              };
              break;
            case 'csv':
              facet.formatUnserialize = d3.csv.parse;
              facet.formatSerialize = d3.csv.format;
              break;
            case 'tsv':
              facet.formatUnserialize = d3.tsv.parse;
              facet.formatSerialize = d3.tsv.format;
              break;
            case 'csvRows':
              facet.formatUnserialize = d3.csv.parseRows;
              facet.formatSerialize = d3.csv.formatRows;
              break;
            default:
              console.warn('Unknown type ' + opts.type + ' for facet ' + id);
              break;
          }
        } else {
          facet.formatUnserialize = JSON.parse;
          facet.formatSerialize = JSON.stringify;
        }

        if (opts.serialize) {
          facet.serialize = opts.serialize;
        }

        if (opts.unserialize) {
          facet.unserialize = opts.unserialize;
        }

        facet.isReady = function () {
          return facet.ready;
        };
        facet.isCached = function () {
          return !!facet.cached;
        };
        facet.isUncacheable = function () {
          return !!facet.uncacheable;
        };
        facet.getDependencies = function () {
          return facet.dependencies;
        };

        facet.retrieveData = function (callback) {
          ns.clearEphemeralFacets();
          if (facet.isReady()) {
            if (ns.debug) {
              console.info('retrieve data: CALL ' + facet.id);
            }
            facet.callData(callback);
          } else if (facet.isCached()) {
            if (ns.debug) {
              console.info('retrieve data: LOAD ' + facet.id);
            }
            facet.loadData(callback, { computeAtFail: true });
          } else if (facet.areDependenciesReady()) {
            if (ns.debug) {
              console.info('retrieve data: COMPUTE ' + facet.id);
            }
            facet.computeData(callback);
          } else {
            var unreadyDependency = facet.dependencies.some(function (id) {
              var dependencyFacet = ns.getFacet(id);
              if (dependencyFacet && dependencyFacet.isReady && dependencyFacet.isReady()) {
                // Dependency is OK
                return false;
              } else {
                // Dependency needs to be retrieved
                if (ns.debug) {
                  console.info('retrieve data: RETRIEVE DEPENDENCY ' + dependencyFacet.id + ' of ' + facet.id);
                }
                dependencyFacet.retrieveData(function () {
                  facet.retrieveData(callback);
                });
                return true;
              }
            });
          }
        };

        facet.getData = function () {
          ns.clearEphemeralFacets();
          if (facet.isReady()) {
            return facet.data;
          } else {
            console.error('Impossible to get data because this facet is not ready: ' + facet.id, facet);
          }
        };

        facet.clear = function () {
          if (ns.debug) {
            console.info('Clear data of ' + facet.id);
          }
          facet.ready = false;
          facet.data = undefined;
        };

        facet.clearDependencies = function () {
          ns.clearEphemeralFacets();
          if (ns.debug) {
            console.info('Clear data dependencies of ' + facet.id);
          }
          facet.dependencies.forEach(function (id) {
            var dependencyFacet = ns.getFacet(id);
            dependencyFacet.clear();
            dependencyFacet.clearDependencies();
          });
        };

        // Like getData but in an asynchronous fashion
        facet.callData = function (callback) {
          ns.clearEphemeralFacets();
          if (facet.isReady()) {
            callback(facet.data);
          } else {
            console.error('Impossible to call data because this facet is not ready: ' + facet.id, facet);
          }
        };

        facet.loadData = function (callback, opts) {
          ns.clearEphemeralFacets();
          var url = ns.getFacetCacheURL(facet.id);
          d3.text(url).get(function (error, d) {
            if (error) {
              console.error('Facet loading failed for unknown reasons.\nid:' + id + '\nurl:' + url + '\n', error, facet);
              if (opts && opts.computeAtFail && facet.compute) {
                if (ns.debug) {
                  console.info('-> Now trying to compute.');
                }
                facet.computeData(callback, { withDependencies: true });
              } else {
                callback();
              }
            } else {
              facet.data = facet.unserialize(facet.formatUnserialize(d));
              facet.ready = true;
              callback(facet.data);
            }
          });
        };

        facet.areDependenciesReady = function () {
          var ready = true;
          // FIXME: stop the forEach once one false found
          facet.dependencies.forEach(function (id) {
            var dependencyFacet = ns.getFacet(id);
            if (dependencyFacet && dependencyFacet.isReady && dependencyFacet.isReady()) {
              // Dependency is OK
            } else {
                ready = false;
              }
          });
          return ready;
        };

        facet.computeData = function (callback, opts) {
          ns.clearEphemeralFacets();
          if (facet.areDependenciesReady()) {
            facet.data = facet._compute();
            facet.ready = true;
            callback(facet.data);
          } else if (opts && opts.withDependencies) {
            var unreadyDependency = facet.dependencies.some(function (id) {
              var dependencyFacet = ns.getFacet(id);
              if (dependencyFacet && dependencyFacet.isReady && dependencyFacet.isReady()) {
                // Dependency is OK
                return false;
              } else {
                // Dependency needs to be retrieved
                if (ns.debug) {
                  console.info('retrieve data: RETRIEVE DEPENDENCY ' + dependencyFacet.id + ' of ' + facet.id);
                }
                dependencyFacet.retrieveData(function () {
                  facet.retrieveData(callback);
                });
                return true;
              }
            });
          } else {
            if (ns.debug) {
              console.error('Facet not computed because dependencies are not ready. id: ' + id, facet);
            }
          }
        };

        facet.download = function () {
          var data_serialized = undefined;
          try {
            data_serialized = facet.serialize(facet.data);
          } catch (error) {
            console.error('Facet cannot be downloaded because serialization failed: ' + id, error, facet);
          }

          var data = undefined;
          try {
            data = facet.formatSerialize(data_serialized);
          } catch (error) {
            console.error('Facet cannot be downloaded because format serialization failed: ' + id, error, facet);
          }

          if (data) {
            var blob = new Blob([data], { type: "application/text;charset=utf-8" });
            saveAs(blob, ns.getFacetCacheName(facet.id));
          }
        };

        ns.facetDictionary[facet.id] = facet;
        return facet;
      } else {
        console.warn('Facet not created because its id already exists: ' + id, facet);
      }
    } else {
      console.error('Facet not created because it has no id', facet);
    }
  };

  ns.deleteFacet = function (id) {
    delete ns.facetDictionary[id];
  };

  ns.getFacetCacheURL = function (d) {
    var id = undefined;
    if ((typeof d === 'undefined' ? 'undefined' : _typeof(d)) == 'object' && d[id]) {
      // d is the facet (though it should be the id...)
      id = d[id];
    } else {
      id = d;
    }

    if (typeof id === 'string') {
      var safeId = ns.getFacetCacheName(id);
      return '' + ns.cacheLocation + safeId;
    } else {
      console.error('Cannot retrieve cache URL from id ' + id, facet);
    }
  };

  ns.getFacetCacheName = function (id) {
    return encodeURIComponent(id);
  };

  ns.clearEphemeralFacets = function () {
    ns.getFacetList().forEach(function (facet) {
      if (facet.ephemeral) {
        // delete
        facet.clear();
        ns.deleteFacet(facet.id);
      }
    });
  };

  ns.downloadCacheables = function () {
    ns.getFacetList().forEach(function (facet) {
      if (facet.isReady() && !facet.isCached() && !facet.isUncacheable()) {
        // Keep facet
      } else {
          // delete
          facet.clear();
          ns.deleteFacet(facet.id);
        }
    });
    ns.getFacetList().forEach(function (facet) {
      if (ns.debug) {
        console.info('Download cacheable facet ' + facet.id);
      }
      facet.download();
    });
  };

  return ns;
}();
