// Go through tree and add filter attribute

var utils = {
  getLeafNodes: function(node, attr) {
    var callback = function(n, p, d) { return (!n[attr] || n[attr].length === 0) ? n : null; };
    return utils.preorderDepthList(node, attr, callback);
  },
  getUniqueNodes: function(node, attr) {
    var callback = function(n, p, d) { return n; };
    return uniqueValuesObject( utils.preorderDepthList(node, attr, callback), 'id' );
  },
  preorderDepthVisit: function(node, attr, callback) {
    function traverse(node, path, depth) {
      callback(node, path, depth);
      if (node[attr] && node[attr].length > 0) {
        for (var i = node[attr].length - 1; i >= 0; i--) {
          traverse(node[attr][i], path.concat([node]), depth+1);
        }
      }
    }
    traverse(node, [], 0);
  },
  postorderDepthCollect: function(node, attr, callback) {
    function traverse(node, path, depth) {
      var coll = [];
      if (node[attr] && node[attr].length > 0) {
        for (var i = node[attr].length - 1; i >= 0; i--) {
          coll.push(traverse(node[attr][i], path.concat([node]), depth+1));
        }
      }
      return callback(node, path, depth, coll);
    }
    return traverse(node, [], 0);
  },
  preorderDepthList: function(node, attr, callback) {
    function traverse(node, path, depth) {
      var result = callback(node, path, depth);
      result = (result) ? [result] : [];  // Could be cleaner
      if (node[attr] && node[attr].length > 0) {
        for (var i = node[attr].length - 1; i >= 0; i--) {
          result = result.concat( traverse(node[attr][i], path.concat([node]), depth+1) );
        }
      }
      return result;
    }
    return traverse(node, [], 0);
  },
  preorderDepthParent: function(node, callback) {
    function traverse(node, path, depth) {
      var result = callback(node, path, depth);
      result = (result) ? [result] : [];  // Could be cleaner
      if (node._parent) {
        result = result.concat( traverse(node._parent, path.concat([node]), depth+1) );
      }
      return result;
    }
    return traverse(node, [], 0);
  },
  copyNode: function(node) {
    return {
      'name': node.attr.name,  
      'id': node.id,  // UUID
      'uuid': node._uuid,  // Replace id with this
      'density': node._density, // DEBUG
      'children': [],
      'attr': node.attr,
      'fltr': node._filters,
      'isleaf': node._leaf,
      'isroot': node._root,
      'iscat': node._cat,
      'proxy': node._proxies
    };
  },
  initNode: function(node, path, depth, childrenAttr) {
    // Relink node
    node._parent = (path.length > 0) ? path.slice(-1)[0] : null;
    node.parent = node._parent; // TODO: fix this hack
    node._children = node[childrenAttr];

    // Store depth
    node._depth = depth;

    // Flag root and leafs
    node._root = (depth === 0);
    node._leaf = (!node._children || node._children.length === 0);
    node._cat = (depth === 1);
    node._uuid = key(node);  // TODO: set this using PATH; set ID here as well

    // Add filter attributes
    node._filters = {
      // 'disabled': false,
      // 'hidden': false,
      'collapsed': false,
      'override': false,
      // 'accordion': false,
      'flattened': false
    }

    node._proxies = [];
  },
  canCollapse: function(node) {
    // Don't collapse leaf nodes
    if (node._leaf) { return false; }
    // Don't collapse parent of only leaf nodes
    if (node._children && utils.areAllLeafs(node._children)) { return false; }
    return true;
  },
  areAllLeafs: function(nodes) {
    for (var i = nodes.length - 1; i >= 0; i--) {
      if (!nodes[i]._leaf) { return false; }
    }
    return true;
  },
  areAnyLeafs: function(nodes) {
    for (var i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i]._leaf) { return true; }
    }
    return false;
  },
  exceedsDuplicationOrDepth: function(node, maxDuplication, depthLimit) {
    // Special case when collapse at root
    if (node._root && depthLimit === 0) { return true; }
    // Can only collapse if has children
    if (!node._root && node._children && node._children.length > 0) {
      // And exceeds depth or duplication
      if (node._depth >= depthLimit || node._density >= maxDuplication) {
        return true;
      }
    }
    return false;
  },
  allUnknown: function(node) {
    var leafs = utils.getLeafNodes(node, '_children');
    var p = 0;
    var a = 0;
    leafs.forEach(function(d) {
      p += d.attr.freq.all.present + d.attr.freq.all.present_anc;
      a += d.attr.freq.all.absent + d.attr.freq.all.absent_anc;
    });

    return (p+a === 0);
  }
}

function TreeFilter( treeData, options ) {
  // Merge options with defaults
  this.options = $.extend( false, {'childrenAttr': 'children'}, options );

  // Set data and initialize
  this.data = this._init( treeData );

  this.nodes = this._getNodesMap(this.data);

  this.calcChildDensity();
}

TreeFilter.prototype.collapseNode = function(uuid, collapsed) {
  var node = this.nodes[uuid];
  if (utils.canCollapse(node)) {
    node._filters['override'] = collapsed;
  }
  //console.log("Set override:", node._filters['override'], "for id", node.id, node);
}

TreeFilter.prototype.collapseTree = function(maxDuplication, depthLimit) {
  var callback = function(node, path, depth) {
    if (utils.canCollapse(node)) {
      // If exceeds maxDuplication or depthLimit
      if (utils.exceedsDuplicationOrDepth(node, maxDuplication, depthLimit)) {
        node._filters['collapsed'] = true;

      // Or parent is collapsed, but not leaf or parent of leaf
      } else if (path.length > 0 && path.slice(-1)[0]._filters['collapsed']) {
        node._filters['collapsed'] = true;

      } else {
        node._filters['collapsed'] = false;
      }

    } else {
      node._filters['collapsed'] = false;
    }
  };

  utils.preorderDepthVisit( this.data, "_children", callback);
}

TreeFilter.prototype.flattenTree = function(maxDuplication, depthLimit) {
  var callback = function(node, path, depth) {
    if (node._leaf) {
      node._filters['flattened'] = false;

      // If subdivisions at level do not exist -- but this leads to conflicts
      var includeDepth = depthLimit;
      // if (node._depth <= depthLimit) {
      //   includeDepth = node._depth - 1;
      // }

      // Set ancestors to flattened, except depth==1 and direct parent
      if (path.length > 0) {
        for (var i = path.length-1; i >= 0; i--) {
          var anc = path[i];
          if (anc._depth > 1 && anc._depth !== includeDepth) {  // Skip root and first level
            anc._filters['flattened'] = true;
          } else {
            anc._filters['flattened'] = false;
          }
        }
      }
    }
  };

  utils.preorderDepthVisit( this.data, "_children", callback);
}

TreeFilter.prototype.getTree = function() {
  return this._tree( this.data );
}

TreeFilter.prototype.getFilteredTree = function() {
  return this._filterTree( this.data );
}

TreeFilter.prototype.getFlat = function() {
  var flat = this._flat( this.data );
  //console.log( "FLAT", flat );
  return flat[0];
}

TreeFilter.prototype.getCats = function() {
  var flat = this._cats( this.data );
  //console.log( "FLAT", flat );
  return flat[0];
}

TreeFilter.prototype.getClusters = function() {
  return this._clusters( this.data );
}

TreeFilter.prototype.getClusters2 = function() {
  return this._clusters2( this.data );
}

TreeFilter.prototype.getNodes = function() {
  return this._filterNodes( this.data );
}

// TODO: Fix this, should return an array of all nodes with same ID
TreeFilter.prototype._getNodesMap = function(node) {
  var nodes = this._getNodes(node);

  var nodesMap = {};
  for (var i = nodes.length - 1; i >= 0; i--) {
    var node = nodes[i];
    var uuid = node._uuid;
    nodesMap[uuid] = node;
  }

  return nodesMap;
}

TreeFilter.prototype._getNodes = function(node, excludeSelf) {
  node = node || this.data;
  excludeSelf = excludeSelf || false;
  var callback = function(n, p, d) { return n; };
  var result = utils.preorderDepthList(node, '_children', callback);
  return (excludeSelf) ? result.slice(1) : result;
}

TreeFilter.prototype._copyNodes = function(node, excludeSelf) {
  node = node || this.data;
  excludeSelf = excludeSelf || false;
  var callback = function(n, p, d) { return utils.copyNode(n); };
  var result = utils.preorderDepthList(node, '_children', callback);
  return (excludeSelf) ? result.slice(1) : result;
}

TreeFilter.prototype._getInternalNodes = function(node, excludeSelf) {
  node = node || this.data;
  excludeSelf = excludeSelf || false;
  var callback = function(n, p, d) { return (!n._leaf && !n._root) ? n : null; };
  var result = utils.preorderDepthList(node, '_children', callback);
  return (excludeSelf) ? result.slice(1) : result;
}

TreeFilter.prototype._copyInternalNodes = function(node, excludeSelf) {
  node = node || this.data;
  excludeSelf = excludeSelf || false;
  var callback = function(n, p, d) { return (!n._leaf && !n._root) ? utils.copyNode(n) : null; };
  var result = utils.preorderDepthList(node, '_children', callback);
  return (excludeSelf) ? result.slice(1) : result;
}

TreeFilter.prototype._getLeafNodes = function(node, excludeSelf) {
  node = node || this.data;
  excludeSelf = excludeSelf || false;
  var callback = function(n, p, d) { return (n._leaf) ? n : null; };
  var result = utils.preorderDepthList(node, '_children', callback);
  return (excludeSelf) ? result.slice(1) : result;
}

TreeFilter.prototype._copyLeafNodes = function(node, excludeSelf) {
  node = node || this.data;
  excludeSelf = excludeSelf || false;
  var callback = function(n, p, d) { return (n._leaf) ? utils.copyNode(n) : null; };
  var result = utils.preorderDepthList(node, '_children', callback);
  return (excludeSelf) ? result.slice(1) : result;
}

TreeFilter.prototype._getAncestors = function(node, excludeSelf) {
  node = node || this.data;
  excludeSelf = excludeSelf || false;
  var callback = function(n, p, d) { return n; };
  var result = utils.preorderDepthParent(node, callback);
  return (excludeSelf) ? result.slice(1) : result;
}


TreeFilter.prototype._tree = function(node, cutoff) {
  var newNode = utils.copyNode(node);

  if (node._children && node._children.length > 0) {
    for (var i = node._children.length - 1; i >= 0; i--) {
      newNode.children.push( this._tree(node._children[i]) );
    }
  }

  return newNode;
}


TreeFilter.prototype._filterTree = function(node) {
  var newNode = utils.copyNode(node);

  if (node._children && node._children.length > 0) {
    if (node._filters['collapsed'] && !node._filters['override']) {
      var children = this._copyLeafNodes(node);

      if (FILTEREMPTY) {
        var filtered = children.filter(function(d) { return !utils.allUnknown(d); });
        children = filtered;
      }

      var uniqueLeafs = uniqueValuesObject( children, 'id' );
      newNode.children = uniqueLeafs;

      // HACKY -- Calculating proxies; this should be moved out
      var internals = this._getInternalNodes(node, true);  // Skip node
      //var uniqueInternals = uniqueValuesObject( internals, 'id' );  // Get unique
      //newNode.proxy = uniqueInternals;

      // Group By Depth
      var depthGroup = {};
      for (var i = internals.length - 1; i >= 0; i--) {
        var depth = internals[i]._depth;
        if (!(depth in depthGroup)) {
          depthGroup[depth] = [];
        }
        depthGroup[depth].push(internals[i]);
      }

      var proxyGroups = [];
      var keyMap = Object.keys(depthGroup).sort();
      for (var i = 0, n = keyMap.length; i < n; i++) {
        var key = keyMap[i];
        proxyGroups.push( uniqueValuesObject( depthGroup[key], 'id' ) );
      }
      newNode.proxy = proxyGroups;

      // Group by "General" or "specific"?

    } else {
      // var context = this;
      // newNode.children = node._children.map(function(d) { return context._filterTree(d); });

      for (var i = node._children.length - 1; i >= 0; i--) {
        var child = node._children[i];

        if (!FILTEREMPTY || (FILTEREMPTY && !utils.allUnknown(child))) {
          newNode.children.push( this._filterTree(child) );
        }
      }
    }
  }

  return newNode;
}

TreeFilter.prototype._flat = function(node) {
  // TODO: this is losing all absent leafs


  // Return a copy of the current node, recurse children
  var newNode = utils.copyNode(node);
  if (node._children && node._children.length > 0) {
    var children = [];
    for (var i = node._children.length - 1; i >= 0; i--) {
      children = children.concat( this._flat(node._children[i]) );
    }

    if (FILTEREMPTY) {
      var filtered = children.filter(function(d) { return !utils.allUnknown(d); });
      children = filtered;
    }
    var uniqueLeafs = uniqueValuesObject(children, 'id');
    newNode.children = uniqueLeafs;
  }
  return [newNode];
}

TreeFilter.prototype._cats = function(node) {
  // TODO: this is losing all absent leafs

  if (node._filters['flattened']) {
    // Skip current node, but return its children
    var children = [];
    for (var i = node._children.length - 1; i >= 0; i--) {
      children = children.concat( this._cats(node._children[i]) );
    }

    if (FILTEREMPTY) {
      var filtered = children.filter(function(d) { return !utils.allUnknown(d); });
      children = filtered;
    }

    var uniqueLeafs = uniqueValuesObject( children, 'id' );
    return uniqueLeafs;

  } else {
    // Otherwise, return a copy of the current node, recurse children
    var newNode = utils.copyNode(node);
    if (node._children && node._children.length > 0) {
      var children = [];
      for (var i = node._children.length - 1; i >= 0; i--) {
        children = children.concat( this._cats(node._children[i]) );
      }

      if (FILTEREMPTY) {
        var filtered = children.filter(function(d) { return !utils.allUnknown(d); });
        children = filtered;
      }
      var uniqueLeafs = uniqueValuesObject(children, 'id');
      newNode.children = uniqueLeafs;
    }
    return [newNode];
  }
}

TreeFilter.prototype._clusters2 = function(data) {
  var context = this;

  function hpoClassToID(hpClass) {
    return hpClass.slice(0, 2) + ":" + hpClass.slice(2);
  }

  function convertPath(node) {
    var path = node._uuid.split('-');//.map(function(d) { return hpoClassToID(d); });
    var ancList = [];
    for (var i = 2, n = path.length; i < n; i++) {
      var aid = path.slice(0, i).join('-');
      var anc = context.nodes[aid];
      var ic = anc.attr.ic_base;
      ancList.push( {'id': aid, 'node': node, 'anc': anc, 'ic': ic} );
    }
    return ancList;
  }

  // Get all paths of ancestors, then go from root down and select the highest IC at each depth
  // Need to choose a stopping point, likely based on voting the number of occurrences
  // This needs to loop over all leaf nodes, will not be cheap

  // Get all leaf nodes (non unique)
  var leafNodes = this._getLeafNodes(data);
  if (FILTEREMPTY) {
    leafNodes = leafNodes.filter(function(d) { return !utils.allUnknown(d); });
  }

  // Recover path to root for each unique leaf id
  var leafMap = {};  // Map to non unique leaf nodes
  var leafPaths = {};  // Map to non unique paths to root 
  leafNodes.forEach(function(d) {
    if (!(d.id in leafMap)) {
      leafMap[d.id] = [];
    }
    leafMap[d.id].push(d);

    if (!(d.id in leafPaths)) {
      leafPaths[d.id] = [];
    }
    leafPaths[d.id].push( convertPath(d) );
  });

  for (var hpid in leafPaths) {
    console.log( hpid, leafMap[hpid][0].attr.name );
    leafPaths[hpid].forEach(function(d) {
      console.log(d, sumArray(d.map(function(d) { return d.ic; })));
    });
  }



  // var leafMap = {};
  // var leafCount = {};
  // var leafAncestors = {};
  // for (var i = 0, n = leafNodes.length; i < n; i++) {
  //   var l = leafNodes[i];
  //   if (!(l.id in leafMap)) {
  //     leafMap[l.id] = [];
  //   }
  //   leafMap[l.id].push( l );

  //   if (!(l.id in leafCount)) {
  //     leafCount[l.id] = 0;
  //   }

  //   if (!(l.id in leafAncestors)) {
  //     leafAncestors[l.id] = [];
  //   }
  //   var anc = this._getAncestors(l, true);
  //   anc = anc.filter(function(n) { return !n._root; });  // Remove root node
  //   leafAncestors[l.id] = leafAncestors[l.id].concat( anc );
  // }
  // //console.log(leafCount)

  // // Get candidates
  // var candidates = [];
  // var candidatesMap = {};
  // var candidatesCount = {};  // Debug
  // for (var leafId in leafAncestors) {
  //   //var ancestors = uniqueValuesObject( leafAncestors[leafId], 'id' );
  //   var ancestors = leafAncestors[leafId];

  //   if (ancestors.length > 0) {
  //     var cands = argmax(ancestors, function(n) { return n.attr.ic_base; }).map(function(d) { return ancestors[d]; });
  //     //console.log(cands);

  //     candidates = candidates.concat(cands);

  //     cands.forEach(function(d) {
  //       if (!(d.id in candidatesMap)) {
  //         candidatesMap[d.id] = [];
  //       }
  //       candidatesMap[d.id].push( d );

  //       if (!(d.id in candidatesCount)) {
  //         candidatesCount[d.id] = 0;
  //       }
  //       candidatesCount[d.id] += 1;
  //     });
  //   }
  // }
  // for (var candId in candidatesCount) {
  //   var uniqueCands = uniqueValuesObject( candidatesMap[candId], '_uuid' );
  //   var cands = argmax( uniqueCands, function(d) { return context.nodes[d._uuid].ic_base; });
  //   console.log( candId, candidatesCount[candId] );
  //   uniqueCands.forEach(function(d) { console.log( d.attr.name, d._uuid ); });
  // }

  // candidates = uniqueValuesObject( candidates, 'id' );


}

TreeFilter.prototype._clusters = function(data) {
  var context = this;

  var leafNodes = this._getLeafNodes(data);
  if (FILTEREMPTY) {
    leafNodes = leafNodes.filter(function(d) { return !utils.allUnknown(d); });
  }
  //leafNodes = leafNodes.sort(function(a, b) { return d3.descending(a.attr.ic_base, b.attr.ic_base); });

  var leafMap = {};
  var leafCount = {};
  var leafAncestors = {};
  for (var i = 0, n = leafNodes.length; i < n; i++) {
    var l = leafNodes[i];
    if (!(l.id in leafMap)) {
      leafMap[l.id] = [];
    }
    leafMap[l.id].push( l );

    if (!(l.id in leafCount)) {
      leafCount[l.id] = 0;
    }

    if (!(l.id in leafAncestors)) {
      leafAncestors[l.id] = [];
    }
    var anc = this._getAncestors(l, true);
    anc = anc.filter(function(n) { return !n._root; });  // Remove root node
    leafAncestors[l.id] = leafAncestors[l.id].concat( anc );
  }
  //console.log(leafCount)

  // Get candidates
  var candidates = [];
  var candidatesMap = {};
  var candidatesCount = {};  // Debug
  for (var leafId in leafAncestors) {
    //var ancestors = uniqueValuesObject( leafAncestors[leafId], 'id' );
    var ancestors = leafAncestors[leafId];

    if (ancestors.length > 0) {
      var cands = argmax(ancestors, function(n) { return n.attr.ic_base; }).map(function(d) { return ancestors[d]; });
      //console.log(cands);

      candidates = candidates.concat(cands);

      cands.forEach(function(d) {
        if (!(d.id in candidatesMap)) {
          candidatesMap[d.id] = [];
        }
        candidatesMap[d.id].push( d );

        if (!(d.id in candidatesCount)) {
          candidatesCount[d.id] = 0;
        }
        candidatesCount[d.id] += 1;
      });
    }
  }
  candidates = uniqueValuesObject( candidates, 'id' );


  function icLeafMax(node) {
    var l = uniqueValuesObject( context._getLeafNodes(node), 'id' );
    if (l.length > 0) {
        return d3.max(l.map(function(n) { return n.attr.ic_base; }))
    } else {
        return node.attr.ic_base;
    }
  }
  function icLeafAvg(node) {
    var l = uniqueValuesObject( context._getLeafNodes(node), 'id' );
    if (l.length > 0) {
        return averageArray(l.map(function(n) { return n.attr.ic_base; }))
    } else {
        return node.attr.ic_base;
    }
  }
  function icLeafMin(node) {
    var l = uniqueValuesObject( context._getLeafNodes(node), 'id' );
    if (l.length > 0) {
        return d3.min(l.map(function(n) { return n.attr.ic_base; }))
    } else {
        return node.attr.ic_base;
    }
  }

  function getCategory(node) {
    var cat = node;
    while (cat && !cat._cat) {
      cat = cat._parent;
    }
    return cat;
  }

  function candidateCategory(node) {
    var leafs = context._getLeafNodes(node);
    var categories = [];
    for (var i = 0, n = leafs.length; i < n; i++) {
      categories = categories.concat( getCategory(leafs[i]) );
    }
    var unique = uniqueValuesObject(categories, 'id');
    return unique;
  }

  var root = utils.copyNode(data);

  //candidates = candidates.sort(function(a, b) { return d3.descending( a._depth, b._depth ) || d3.descending( a.attr.ic_base, b.attr.ic_base ); });
  //candidates = candidates.sort(function(a, b) { return d3.descending( icLeafMax(a), icLeafMax(b) ) || d3.ascending( a.attr.ic_base, b.attr.ic_base ); });
  //candidates = candidates.sort(function(a, b) { return d3.ascending( icLeafAvg(a), icLeafAvg(b) ) || d3.ascending( a.attr.ic_base, b.attr.ic_base ); });
  candidates = candidates.sort(function(a, b) { return d3.ascending( icLeafMin(a), icLeafMin(b) ) || d3.ascending( a.attr.ic_base, b.attr.ic_base ); });
  for (var i = 0, n = candidates.length; i < n; i++) {
    var c = candidates[i];

    var l = uniqueValuesObject(this._getLeafNodes(c), 'id');
    
    // Filter leafs that have already been added to the cluster tree
    l = l.filter(function(n) { return (leafCount[n.id] === 0); });

    if (l.length > 0) {
      var cluster = utils.copyNode(c);
      cluster.attr.category = candidateCategory(c);
      root.children.push( cluster );

      l.forEach(function(d) {
        //console.log( "  ", d.attr.name );
        leafCount[d.id] += 1;
        var leafCopy = utils.copyNode(d);
        cluster.children.push(leafCopy);
      });

      // Update max ic
      cluster.attr.ic_max = d3.max(cluster.children.map(function(d) { return d.attr.ic_base; }));
    }

    // Debug
    // console.log( c.attr.name, candidatesCount[c.id], c._depth, c.attr.ic_base, icLeafMax(c), icLeafAvg(c), icLeafMin(c) );
    // l.forEach(function(d) { console.log( "  ", d.attr.name ); });
  }
  //console.log("CLUSTER", root);

  return root;

  //   for leaf in sorted(allLeafs, key=lambda n: n.attr('base_ic'), reverse=True):
  //       # if allNodesCount[leaf.id] > 0:
  //       #     continue

  //       ancestors = leaf.ancestors(exclude_self=True)
  //       #minLoss = 999

  //       candidate = np.argmax(map(lambda n: n.attr('base_ic'), ancestors))
  //       candidates[ancestors[candidate].id] += 1



  // var allNodes = this._getNodes(data);
  // //console.log(allNodes);

  // // Count duplicates
  // var dupCount = {};
  // for (var i = 0, n = allNodes.length; i < n; i++) {
  //   var node = allNodes[i];
  //   var nodeId = node.id;
  //   if (!(nodeId in dupCount)) {
  //     dupCount[nodeId] = 0;
  //   }
  //   dupCount[nodeId]++;
  // }

  // // All unique nodes in tree
  // var nodes = uniqueValuesObject( allNodes, 'id' );
  // // for (var i = 0, n = nodes.length; i < n; i++) {
  // //   var node = nodes[i];
  // //   if (node.id == 'HP:0001622') {
  // //     console.log(node);
  // //   }
  // // }


  // var subtrees = [];
  // var overallMaxIC = this.maxIC();

  // // Want to sort by depth, but unique values needs to return the deepest
  // // nodes.sort(function(a, b) { return d3.descending(a._depth, b._depth); });
  // //console.log(nodes);

  // var leafCheck = {};
  // for (var i = nodes.length-1; i >= 0; i--) {
  //   var node = nodes[i];

  //   if (node._leaf) {
  //     leafCheck[node.id] = 0;
  //   }

  //   // Skip leafs
  //   if (node._leaf || node._root) {
  //     continue;
  //   }

  //   // Must have al least one leaf
  //   var leafs = this._getLeafNodes(node, true);  // Exclude self
  //   if (leafs.length < 1) {
  //     continue;
  //   }

  //   var nodeId = node.id;
  //   var ics = leafs.map(function(d) { return d.attr.ic_base; });  // Map all leafs to ic score
  //   var leafCount = ics.length;
  //   var avgIC = averageArray(ics);
  //   var maxIC = d3.max(ics);

  //   subtrees.push({
  //     'node': node,
  //     'count_dup' : dupCount[nodeId],
  //     'count_leaf': leafCount, 
  //     'ic_loss': overallMaxIC - avgIC,
  //     'ic_avg': avgIC, 
  //     'ic_max': maxIC
  //   });
  // }

  // function stScore(st) {
  //   return st.ic_loss/* / st.count_dup * st.ic_max*/;
  // }

  // function stCheckParent(test, node) {
  //   var parent = node;
  //   while (!parent._root) {
  //     if (parent.id == test.id) {
  //       return true;
  //     }
  //     parent = parent._parent;
  //   }

  //   return false;
  // }

  // subtrees.sort(function(a, b) { return d3.ascending(stScore(a), stScore(b)) || d3.descending(a.node._depth, b.node._depth); });
  // var checked = [];
  // for (var i = 0, n = subtrees.length; i < n; i++) {
  //   var st = subtrees[i];

  //   if (st.node._root) {
  //     continue;
  //   }

  //   var isParent = false;
  //   var isReplaced = false;
  //   (function() {
  //     for (var i = checked.length-1; i >= 0; i--) {
  //       var check = checked[i];

  //       if (stCheckParent(st.node, check.node)) {
  //         //console.log("is parent", st.node.attr.name, st.count_leaf, check.node.attr.name, check.count_leaf);
  //         isParent = true;
  //         // if (st.count_leaf > check.count_leaf) {
  //         //   checked[i] = st;
  //         //   console.log("replaced");
  //         //   isReplaced = true;
  //         //   break;
  //         // }
  //       }
  //     }
  //   })();

  //   if (!isParent) {
  //     checked.push(st);
  //   // }

  //   // if (!isParent || isParent && isReplaced) {
  //     //console.log( st.node.attr.name, stScore(st), st.ic_loss, st.count_dup, st.ic_avg, st.ic_max );

  //     (function(context) {
  //       var leafs = context._getLeafNodes(st.node, true);  // Exclude self
  //       for (var i = 0, n = leafs.length; i < n; i++) {
  //         leafCheck[leafs[i].id] += 1;
  //       }
  //   })(this);
  //   }
  // }

  // console.log(leafCheck);

  // for (var hpid in leafCheck) {
  //   if (leafCheck[hpid] === 0) {
  //     console.log("Missing Leaf:", hpid);
  //   }
  // }

  // var context = this;
  // var root = utils.copyNode( this.data );
  // root.children = checked.map(function(d) { return context._filterTree( context.nodes[d.node._uuid] ); });
  // return root;
}



TreeFilter.prototype._init = function(data) {
  var childrenAttr = this.options.childrenAttr;

  var init = function(n, p, d) { utils.initNode(n, p, d, childrenAttr); };
  utils.preorderDepthVisit(data, childrenAttr, init);

  return data;
}


TreeFilter.prototype._visitPreOrder = function(node, callback) {
  callback(node);
  if (node._children && node._children.length > 0) {
    for (var i = node._children.length - 1; i >= 0; i--) {
      this._visitPreOrder( node._children[i], callback );
    }
  }
}

TreeFilter.prototype._accumPostOrder = function(node, callback) {
  var accum = null;
  if (node._children && node._children.length > 0) {
    accum = 0;
    for (var i = node._children.length - 1; i >= 0; i--) {
      accum += this._accumPostOrder( node._children[i], callback );
    }
  }
  return callback(node, accum);
}

TreeFilter.prototype._maxPostOrder = function(node, callback) {
  var max = null;
  if (node._children && node._children.length > 0) {
    max = 0;
    for (var i = node._children.length - 1; i >= 0; i--) {
      max = Math.max(max, this._maxPostOrder( node._children[i], callback ));
    }
  }
  return callback(node, max);
}


TreeFilter.prototype.addAttr = function(attr, values, field) {
  var update = function(node) {
    if (values[node['id']]) {
      node['attr'][attr] = values[node['id']][field];
    } else {
      node['attr'][attr] = null;
    }
  };

  this._visitPreOrder( this.data, update );
}

TreeFilter.prototype.accumAttr = function(attr, empty) {
  // TODO: Rethink this -- it's calculating over the entire tree, not just a subtree (so there are hidden nodes inflating the counts)
  // This should probably be an average frequency over leaf nodes 

  // !!!These should be calculated on the backend

  var update = function(node, accum) {
    if (accum === null) { // basecase
      if (node.attr[attr] === null) {  // no data
        node.attr[attr] = empty;
      }
      return node.attr[attr];
    }
    node.attr[attr] = accum;
    return accum;
  }

  this._accumPostOrder( this.data, update )
}

// TreeFilter.prototype.calcFreq = function( cohorts, totalArr ) {
//   var accFreq = {};
//   var accTotal = 0;

//   var counts = [];
//   for (var i = 0, n = cohorts.length; i < n; i++) {
//     counts.push({});

//     var phenotypes = cohorts[i];
//     for (var id in phenotypes) {
//       counts[i][id] = {
//         "present": phenotypes[id]['present'].length,
//         "absent": phenotypes[id]['absent'].length,
//         "unknown": phenotypes[id]['unknown'].length
//       };
//     }
//   }

//   for (var i = 0, n = counts.length; i < n; i++) {
//     var phenotypes = counts[i];

//     for (var id in phenotypes) {
//       if (!accFreq.hasOwnProperty(id)) {
//         accFreq[id] = {'present':0,'absent':0,'unknown':0};
//       }
//       accFreq[id]['present'] += counts[i][id]['present'];
//       accFreq[id]['absent'] += counts[i][id]['absent'];
//       accFreq[id]['unknown'] += counts[i][id]['unknown'];
//     }
//   }

//   for (var i = 0, n = counts.length; i < n; i++) {
//     var phenotypes = counts[i];
//     var cId = 'C' + (i+1);

//     this.addAttr('freq'+cId+'P', phenotypes, 'present');
//     this.addAttr('freq'+cId+'A', phenotypes, 'absent');
//     this.addAttr('freq'+cId+'U', phenotypes, 'unknown');
    
//     this.accumAttr('freq'+cId+'P', 0);
//     this.accumAttr('freq'+cId+'A', 0);
//     this.accumAttr('freq'+cId+'U', totalArr[i]);

//     accTotal += totalArr[i];
//   }

//   var freq = accFreq;
//   var cId = '';

//   this.addAttr('freq'+cId+'P', freq, 'present');
//   this.addAttr('freq'+cId+'A', freq, 'absent');
//   this.addAttr('freq'+cId+'U', freq, 'unknown');
  
//   this.accumAttr('freq'+cId+'P', 0);
//   this.accumAttr('freq'+cId+'A', 0);
//   this.accumAttr('freq'+cId+'U', accTotal);

// }

// Each node gets max of all children
TreeFilter.prototype.calcMaxIc = function() {
  var update = function(node, max) {
    if (max === null) { // basecase
      node.attr['ic_max'] = node.attr.ic_base;
      return node.attr.ic_max;
    }
    node.attr['ic_max'] = max;
    return max;
  }

  this._maxPostOrder( this.data, update )
}

// Get overall Max
TreeFilter.prototype.maxIC = function() {
    var nodes = this._getNodes(this.data);

    var max = 0.0;
    for (var i = nodes.length - 1; i >= 0; i--) {
      var node = nodes[i];
      if (node.attr.ic_base > max) {
        max = node.attr.ic_base;
      }
    }
    return max;
}

// Get overall depth
TreeFilter.prototype.maxDepth = function() {
    var nodes = this._getLeafNodes(this.data);

    var max = 0.0;
    for (var i = nodes.length - 1; i >= 0; i--) {
      var node = nodes[i];
      if (node._depth > max) {
        max = node._depth;
      }
    }
    return max;
}

// Calculate metric to determine if it's better to expand node or not
// Rewrite this as a recursive function for entire tree
TreeFilter.prototype.calcChildDensity = function() {
  var context = this;

  var update = function(node) {
    if (node._children && node._children.length > 0) {
      var childLeafNodes = context._getLeafNodes( node );
      var leafCountsHash = countArrayElements( childLeafNodes, "id" );
      var leafCounts = dictValToArray( leafCountsHash );
      
      node._density = averageArray(leafCounts);

    } else {
      // No children, so do not collapse
      node._density = 0.0;
    }
  }

  this._visitPreOrder( this.data, update );
}