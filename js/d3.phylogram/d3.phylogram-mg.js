
if (!d3) { throw "d3 wasn't included!"};
(function() {
  d3.phylogram = {}
  d3.phylogram.rightAngleDiagonal = function() {
    var projection = function(d) { return [d.y, d.x]; }
    
    var path = function(pathData) {
      //return "M" + pathData[0] + ' ' + pathData[1] + " " + pathData[2];
      return "M" + pathData.join(' ');
    }
    
    function diagonal(diagonalPath, i) {
      var source = diagonalPath.source,
          target = diagonalPath.target,
          midpointX = (source.x + target.x) / 2,
          midpointY = (source.y + target.y) / 2,
          pathData = [source, {x: target.x, y: source.y}, target];
          //pathData = [source, target];
      pathData = pathData.map(projection);
      return path(pathData)
    }
    
    diagonal.projection = function(x) {
      if (!arguments.length) return projection;
      projection = x;
      return diagonal;
    };
    
    diagonal.path = function(x) {
      if (!arguments.length) return path;
      path = x;
      return diagonal;
    };
    
    return diagonal;
  }
  d3.phylogram.rightAngleDiagonalCat = function() {
    var projection = function(d) { return [d.y, d.x]; }
    
    var path = function(pathData) {
      //return "M" + pathData[0] + ' ' + pathData[1] + " " + pathData[2];
      return "M" + pathData.join(' ');
    }
    
    function diagonal(diagonalPath, i) {
      var source = diagonalPath.source,
          target = diagonalPath.target,
          midpointX = (source.x + target.x) / 2,
          midpointY = (source.y + target.y) / 2,
          pathData = [{x: target.x, y: source.y+15}, target];
          //pathData = [source, target];
      pathData = pathData.map(projection);
      return path(pathData)
    }
    
    diagonal.projection = function(x) {
      if (!arguments.length) return projection;
      projection = x;
      return diagonal;
    };
    
    diagonal.path = function(x) {
      if (!arguments.length) return path;
      path = x;
      return diagonal;
    };
    
    return diagonal;
  }
  
  d3.phylogram.styleTreeNodes = function() {
    var vis = _g.select("g.chart");

    vis.selectAll('g.node').selectAll("circle.node").remove();  // Hack

    vis.selectAll('g.leaf.node')
      .append("circle")
        .attr("class", "node leaf")
        .attr("title", function(d) { return d.attr.name; })
        .attr("r", 4.5)
        //.attr('fill', '#aaa')
        .attr("fill", function(d) {
          return HPOCOLOR( d.attr.ic_base / MAX_IC );
        })
        .on("mouseover", function(d) {
          uiHighlightHpoRow(d);
          uiHighlightPhenoblocks(d);
          uiUpdateDescription(d, null, null, null);
        })
        .on("mouseout", function(d) {
          uiHighlightHpoRow(null);
          uiHighlightPhenoblocks(null);
          uiUpdateDescription(null, null, null, null);
        })
        ;
    
    // vis.selectAll('g.root.node')
    //   .append('svg:circle')
    //     .attr("r", 4.5)
    //     .attr('fill', 'steelblue')
    //     .attr('stroke', '#369')
    //     .attr('stroke-width', '2px');

    // mg added inner for debug

    if (layoutType === 'tree') {
      vis.selectAll('g.cat.node')
        .append('circle')
          .attr("class", "node cat")
          .attr("title", function(d) { return d.attr.name; })
          .attr("r", 2)
          ;
    }

    
    if (layoutType !== 'clusters') {
      vis.selectAll('g.inner.node')
        .append('circle')
          .attr("class", function(d) { return "node inner" + ((d.fltr.collapsed && !d.fltr.override) ? " collapsed" : ""); })
          .attr("title", function(d) { return d.attr.name; })
          .attr("r", 3.5)
          .on("mouseover", function(d) {
            d3.select(this).style("stroke-width", 2);
            uiHighlightPhenoblocks(d);
            uiUpdateDescription(d, null, null, null);
          })
          .on("mouseout", function(d) {
            d3.select(this).style("stroke-width", 1);
            uiHighlightPhenoblocks(null);
            uiUpdateDescription(null, null, null, null);
          })
          ;
    }

    vis.selectAll('g.inner.node')
      .on("click", function(d) {
          if (layoutType == 'tree') {
            uiCollapseNode( d );
          }
        })
      ;
  }
  
  function scaleBranchLengths(nodes, w) {
    // Visit all nodes and adjust y pos width distance metric
    var visitPreOrder = function(root, callback) {
      callback(root)
      if (root.children) {
        for (var i = root.children.length - 1; i >= 0; i--){
          visitPreOrder(root.children[i], callback)
        };
      }
    }
    visitPreOrder(nodes[0], function(node) {
      node.rootDist = (node.parent ? node.parent.rootDist : 0) + (node.length || 0)
    })
    var rootDists = nodes.map(function(n) { return n.rootDist; });
    var yscale = d3.scale.linear()
      .domain([0, d3.max(rootDists)])
      .range([0, w]);
    visitPreOrder(nodes[0], function(node) {
      node.y = yscale(node.rootDist)
    })
    return yscale
  }
  
  var _data = null;
  var _svg = null;
  var _g = null;

  var _iconManager = null;

  var layoutWidth = 300;
  var phenotypesWidth = 260;
  var cohortWidth = 1000;
  var svgWidth = 600;
  var svgHeight = 2000;

  d3.phylogram.init = function(selector, data, options) {
    options = options || {}
    var w = options.width || d3.select(selector).style('width') || d3.select(selector).attr('width'),
        h = options.height || d3.select(selector).style('height') || d3.select(selector).attr('height'),
        w = parseInt(w),
        h = parseInt(h);

    options.width = w;
    options.height = h;

    _iconManager = d3.phenotypeIcons();

    _svg = options.vis || d3.select(selector).append("svg:svg")
        .attr("width", w)
        .attr("height", h + 110);

    var patt = _svg.append("defs")
      .append('pattern')
        .attr('id', 'presentanc')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('x', -3.5)
        .attr('y', -3.5)
        .attr('width', 7)
        .attr('height', 7)
        ;
    patt.append('circle')
        .attr('class', 'presentanc_fill')
        .attr('cx', 3.5)
        .attr('cy', 3.5)
        .attr('r', 3.5)
      ;
    patt.append("circle")
        .attr('class', 'presentanc_dot')
        .attr('cx', 3.5)
        .attr('cy', 3.5)
        .attr('r', 1.0)
        ;

    _g = _svg.append("g")
      .attr("id", "frequency-tree")
      // .attr("id", id)
      // .attr("class", "phenoblocks")
      // .attr("transform", "translate("+ (radius+offset[0]) +","+ (radius+offset[1]/2.0) +")")
      ;

    _g.append("g")
        .attr("class", "underlay")  // TODO: underlay
        ;

    _g.append("g")
        .attr("class", "layout")
        ;

    _g.append("g")
        .attr("class", "chart")
        ;

    _g.append("g")
      .attr("class", "overlay")
      ;

    // _g.append("g")
    //   .attr("class", "description")
    //   ;
    cohortWidth = data.pats[0].length * 10 + 50;
    if (data['pats'].length === 2) {
      cohortWidth += data.pats[1].length * 10 + 60;
    }

    var ret = d3.phylogram.draw(data, options);

    return {tree: ret['tree'], offsets: ret['offsets'], vis: _g}
  }

  d3.phylogram.nodeId = function(node) {
    return key(node);
  }


  function styleSearchResultRow( el ) {
    return el
        .attr("width", phenotypesWidth + cohortWidth)
        .attr("height", 12)
        .attr("x", function(d) { return d.y + 7; })
        .attr("y", function(d) { return d.x - 6; })
        .attr("fill", "gold")
        ;
  }

  function styleHighlightRow( el ) {
    return el
        .attr("width", phenotypesWidth + cohortWidth)
        .attr("height", 12)
        .attr("x", function(d) { return d.y + 7; })
        .attr("y", function(d) { return d.x - 6; })
        .attr("fill", "yellow")
        ;
  }

  function styleHighlightCol( el ) {
    return el
        .attr("width", 12)
        .attr("height", svgHeight)
        .attr("x", function(d) { return layoutWidth + d.x - 6; })   //TODO get this from var
        .attr("y", function(d) { return d.y - 10; })
        .attr("fill", "yellow")
        ;
  }

/*  d3.phylogram.updateDescription = function(hp, patient, phenotype, hpMap) {
    //console.log(phenotype, patient);
    var buf = [];

    if (hp) {
      //console.log("HP", hp);
      
      buf.push( "HP: "+ hp.attr.name +" / "+ hp.attr.hpo +" / "+ hp.attr.ic_base );
    }
    if (phenotype) {
      //console.log("Phenotype", phenotype);

      var state = d3.phylogram.getFreqState(patient.id, phenotype)

      var aid = null;
      var aname = null;
      if (state === 'presentanc' || state === 'absentanc') {
        aid = d3.phylogram.getPresentAncestor(patient, hp.attr.hpo, phenotype);


// TODO: provide a map of HPID to HP NAME, perhaps also IC globally

        // if (aid) {
        //   console.log( aid, hpMap);
        //   aname = hpMap[aid].attr.name;
        // }
      }

      buf.push( "State: "+ state + (aid ? " / Ancestor: "+ aname +" / "+ aid : "") );
    }
    if (patient) {
      //console.log("Patient", patient);

      buf.push( "Patient: "+ patient.id +" / Cohort: "+ patient.cohort );
    }

    _g.select("g.description").selectAll("text").remove("*");

    _g.select("g.description").selectAll("text")
      .data( buf, function(d, i) { return i; } )
      .enter()
        .append("text")
          .attr("dy", function(d, i) { return i * 12; })
          .attr("fill", "#000")
          .text(function(d) { return d; })
      ;
  }*/

  d3.phylogram.highlightSearchResults = function( hlSet ) {
    var hl = _g.select("g.underlay").selectAll("rect.search-result")
      .data(hlSet, function(d) { return "search-result"+hpoClass(d)+Math.random(); });

    //console.log(highlightSet);

    hl.enter()
      .append("rect")
        .attr("class", "search-result")
        .attr("opacity", 0)
        .call(styleSearchResultRow)
        .transition()
        .attr("opacity", 0.5)
        ;

    hl.exit()
      .remove();
  }

  d3.phylogram.highlightHpoRow = function( hlSet ) {
    var hl = _g.select("g.underlay").selectAll("rect.row")
      .data(hlSet, function(d) { return "row"+hpoClass(d)+Math.random(); });

    hl.enter()
      .append("rect")
        .attr("class", "row")
        .call(styleHighlightRow)
        .attr("opacity", 0.5)
        ;

    hl.exit()
      .remove();
  }

  d3.phylogram.highlightPatientCol = function( hlSet ) {
    var hl = _g.select("g.underlay").selectAll("rect.col")
      .data(hlSet, function(d) { return "col"+hpoClass(d)+Math.random(); });

    hl.enter()
      .append("rect")
        .attr("class", "col")
        .call(styleHighlightCol)
        .attr("opacity", 0.5)
        ;

    hl.exit()
      .remove();
  }

  d3.phylogram.getFreqState = function(patient, hp) {
    if (hp) {
      if ($.inArray(patient, hp['present']) >= 0) {
        return "present";
      } else if ($.inArray(patient, hp['absent']) >= 0) {
        return "absent";
      } else if ($.inArray(patient, hp['present_anc']) >= 0) {
        return "presentanc";
      } else if ($.inArray(patient, hp['absent_anc']) >= 0) {
        return "absentanc";
      }
    }
    return "unknown";
  }

  d3.phylogram.getPresentAncestor = function(patient, hpid, hp) {
    if (hp && hp.anc[patient.id] && hp.anc[patient.id][hpid]) {
      return hp.anc[patient.id][hpid];
    }

    return null;
  }

  d3.phylogram.getFreqPresent = function(cohort, node) {
    return (node.attr.freq[cohort]['present'] + node.attr.freq[cohort]['present_anc']) / node.attr.freq[cohort]['total'];
  }
  d3.phylogram.getFreqAbsent = function(cohort, node) {
    return (node.attr.freq[cohort]['absent'] + node.attr.freq[cohort]['absent_anc']) / node.attr.freq[cohort]['total'];
  }
  d3.phylogram.getFreqUnknown = function(cohort, node) {
    var present = node.attr.freq[cohort]['present'] + node.attr.freq[cohort]['present_anc'];
    var absent = node.attr.freq[cohort]['absent'] + node.attr.freq[cohort]['absent_anc'];
    return (node.attr.freq[cohort]['total'] - present - absent) / node.attr.freq[cohort]['total'];
    //return node.attr.freq[cohort]['unknown'] / node.attr.freq[cohort]['total'];
  }

  d3.phylogram.getCohortPatients = function(cohortId, data) {
    return data.pats[data.cohortMap[cohortId]];
  }

  d3.phylogram.getCohortPhenotypes = function(cohortId, data) {
    return data.phenos[data.cohortMap[cohortId]];
  }

  var layoutType = 'tree';

  d3.phylogram.draw = function(data, options) {
    var w = options.width;
    var h = options.height;
    layoutType = options.layoutType || 'tree';

    var vis = _g.select("g.chart");



    // mg descendents function
    // function getNodeLeafs(node) {
    //   var leafs = [];
    //   if (node.branchset) {
    //     console.log("Children");
    //     for (var i = node.branchset.length - 1; i >= 0; i--) {
    //       var child = node.branchset[i];
    //       leafs = leafs.concat( getNodeLeafs(child) );
    //     }

    //   } else {
    //     leafs.push( node );
    //   }
    //   return leafs;
    // }
    function getNodeLeafs(node, depth) {
      var leafs = [];

      if (node.children && node.children.length > 0) {
        //console.log( "Children", node.name );
        for (var i = node.children.length - 1; i >= 0; i--) {
          var child = node.children[i];
          leafs = leafs.concat( getNodeLeafs(child, depth+1) );
        }

      } else {
        if (depth > 0) {
          //console.log( "Leaf", node.name );
          leafs.push( node );
        }
      }

      //console.log( leafs.length );
      return leafs;
    }

    // TODO: use version in Utils
    // http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array
    function uniqueValues( arr ) {
      var uniq = arr.slice() // slice makes copy of array before sorting it
        .sort(nodeSortAlpha)
        .reduce(function(a,b){
          if (a.length < 1) a.push(b);
          if (a.slice(-1)[0].name !== b.name) a.push(b); // slice(-1)[0] means last item in array without removing it (like .pop())
          return a;
        },[]); // this empty array becomes the starting value for a

      return uniq;
    }

    var nodeWidth = 100;

    var tree = options.tree || d3.layout.cluster()
      //.size([h, w])
      .nodeSize([10,nodeWidth])  // Use nodeSize instead of size to have uniform node distr
      //.sort(function(node) { return node.children ? node.children.length : -1; })
      .separation(function(a, b) {  // Overwrite separation for custom posthoc spacing
        return 1;
      })
      .sort(function(a, b) {
        // if (a.depth < CUTOFF) {
        //   return nodeSortAlpha(a, b);
        // }
        switch (SORT) {
          case 'alpha':
            return nodeSortAlpha(a, b);
          case 'ic':
            return nodeSortIC(a, b);
          case 'clusterorder':
            return nodeSortClusterOrder(a, b);
          case 'cluster':
            return nodeSortCluster(a, b);
          case 'all':
            return nodeSortFreq1(a, b);
          case 'c1':
            return nodeSortFreq1C1(a, b);
          case 'c2':
            return nodeSortFreq1C2(a, b);
        }})
      // .children(options.children || function(node) {
      //   return node.branchset
      // });

      // Added for CUTOFF; moved to tree-filter
      // .children(options.children || function(node) {
      //   if (node.depth == CUTOFF) {  // depth to collapse  max 10 in test.json
      //     var children = getNodeLeafs(node, 0);
          
      //     // filter unique children
      //     return uniqueValues(children);

      //     // filter
      //     //return children;

      //     // truncate
      //     //return null;
      //   }

      //   return node.children;
      // })
      ;

    //console.log( tree.size(), tree.nodeSize() );

    var diagonal = options.diagonal || d3.phylogram.rightAngleDiagonal();
    var diagonalCat = options.diagonalCat || d3.phylogram.rightAngleDiagonalCat();


    function layoutClusters(node, nodeSize, width) {
      var maxWidth = width;
      var sep = nodeSize;

      function update(node, baseY) {
        // Update X pos (stored in y)
        var baseX = maxWidth;
        if (node.children && node.children.length > 0) {
          if (node.depth === 1) {
            baseX = 0;
          } else {
            baseX = maxWidth * 0.5;
          }
        }

        node.y = baseX;
        node.x = baseY;

        var baseW = maxWidth-node.y;
        var baseH = -baseY;

        if (node.children && node.children.length > 0) {
          for (var i = 0, n = node.children.length; i < n; i++) {
            var child = node.children[i];
            var shiftIncr = sep;

            // First child aligns with parents
            if (i == 0) {
              shiftIncr = 0;
            }

            baseY = update(child, baseY+shiftIncr);
          }
        }
        baseH += baseY + nodeSize;

        if (node.depth > 1) {
          baseH -= 2;
        }
        node.area = {x: node.y, y: node.x-5, w: baseW, h: Math.max(baseH, 18)};

        // Only add separation between 1st level cateogories
        if (node.depth === 1) {
          baseY += sep;
        }
        return baseY;
      }

      update(node, 0);
    }

    function layoutFlat(node, nodeSize, width) {
      var maxWidth = width;
      var maxDepth = d3.max(utils.getLeafNodes(node, "children").map(function(d) { return d.depth; }));
      var sep = nodeSize;

      function update(node, baseY) {
        // Update X pos (stored in y)
        var baseX = maxWidth;
        if (node.children && node.children.length > 0) {
          if (node.depth === 0) {
            baseX = 0;
          } else {
            baseX = maxWidth * 0.8;
          }
        }

        node.y = baseX;
        node.x = baseY;

        var baseW = maxWidth-node.y;
        var baseH = -baseY;

        if (node.children && node.children.length > 0) {
          for (var i = 0, n = node.children.length; i < n; i++) {
            var child = node.children[i];
            var shiftIncr = sep;

            // First child aligns with parents
            if (i == 0) {
              shiftIncr = 0;
            }

            baseY = update(child, baseY+shiftIncr);
          }
        }
        baseH += baseY + nodeSize;

        if (node.depth > 1) {
          baseH -= 2;
        }
        node.area = {x: node.y, y: node.x-5, w: baseW, h: baseH};

        // Only add separation between 1st level cateogories
        // if (node.depth === 1) {
        //   baseY += sep;
        // }
        return baseY;
      }

      update(node, 0);
    }

    function layoutCats(node, nodeSize, width) {
      var maxWidth = width;
      var maxDepth = d3.max(utils.getLeafNodes(node, "children").map(function(d) { return d.depth; }));
      var sep = nodeSize;

      function update(node, baseY) {
        // Update X pos (stored in y)
        var baseX = maxWidth;
        if (node.children && node.children.length > 0) {
          if (node.depth === 1) {
            baseX = 0;
          } else {
            baseX = maxWidth * 0.8;
          }
        }

        node.y = baseX;
        node.x = baseY;

        var baseW = maxWidth-node.y;
        var baseH = -baseY;

        if (node.children && node.children.length > 0) {
          for (var i = 0, n = node.children.length; i < n; i++) {
            var child = node.children[i];
            var shiftIncr = sep;

            // First child aligns with parents
            if (i == 0) {
              shiftIncr = 0;
            }

            baseY = update(child, baseY+shiftIncr);
          }
        }
        baseH += baseY + nodeSize;

        if (node.depth > 1) {
          baseH -= 2;
        }
        node.area = {x: node.y, y: node.x-5, w: baseW, h: Math.max(baseH, 18)};  // Big enough to cover icon

        // Only add separation between 1st level cateogories
        if (node.depth === 1) {
          baseY += sep;
        }
        return baseY;
      }

      update(node, 0);
    }

    function layoutTree(nodes, maxWidth) {
      // Update node positions
      var maxDepth = d3.max(nodes.map(function(d) { return d.depth; }));
      for (var i = nodes.length - 1; i >= 0; i--) {
        var node = nodes[i];

        node.proxyOffset = 0;

        // TODO: Should use a scale here... (see scaleBranches)
        // Evenly distributed by depth
        if (node.children && node.children.length > 0) {

          if (node.isroot) {
            node.y = 0;
          } else if (node.iscat) {
            node.y = 30;
          } else {
            node.y = 30 + node.depth * (maxWidth-30)/maxDepth;
          }

          // //For proxies
          // if (node.proxy && node.proxy.length > 0) {
          //   node.proxyOffset = 10 + 10 * node.proxy.length; //maxWidth/maxDepth;
          //   node.y += node.proxyOffset;
          // }
        } else {
          node.y = maxWidth;
        }
      }
    }

    // Update y position based on min y of all children
    function topAlignVert(node) {
      var minX = node.x;

      if (node.children && node.children.length > 0) {
        minX = d3.min( node.children.map(function(d) { return topAlignVert(d); }) );
        node.x = minX;
      }

      return minX;
    }

    var sep = tree.nodeSize()[0];
    function addSeparation(node, shift) {
      node.x = shift;
      if (node.children && node.children.length > 0) {
        for (var i = 0, n = node.children.length; i < n; i++) {
          var child = node.children[i];
          var shiftIncr = sep;
          if (i == 0) {
            shiftIncr = 0;
          }
          shift = addSeparation(child, shift+shiftIncr);

          if (i == n-1 && child.depth == 2) {
            shift += sep;
          }
        }
      }
      return shift;
    }


    function getNodeExtremes( nodes ) {
      var maxX = 0;
      for (var i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].x > maxX) {
          maxX = nodes[i].x;
        }
      }

      var minX = maxX;
      for (var i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].x < minX) {
          minX = nodes[i].x;
        }
      }

      return {"max":maxX|0, "min":minX|0};  // Truncate float
    }


    // Rect Areas
    function drawLayoutClusters(nodes) {
      // Reset other layout types
      _g.select('g.layout').selectAll("path.link").remove('*');

      var linkData = nodes.filter(function(d) { return (!d.isleaf && !d.isroot); });
      var link = _g.select('g.layout').selectAll("rect.link")
          // TODO: use d.uuid instead of nodeId
          .data(linkData, function(d) { return d.uuid; })
          ;
      link
        .enter().append("rect")
          .attr("class", "link")
          .attr("x", function(d) { return d.area.x; })
          .attr("y", function(d) { return d.area.y; })
          .attr("width", function(d) { return d.area.w; })
          .attr("height", function(d) { return d.area.h; })
          .style("fill", "#AAA")
          .style("stroke", "none")
          .style("opacity", 0.2)
          ;
      link
        .transition()
          .attr("x", function(d) { return d.area.x; })
          .attr("y", function(d) { return d.area.y; })
          .attr("width", function(d) { return d.area.w; })
          .attr("height", function(d) { return d.area.h; })
        ;
      link
        .exit()
        .remove();

      var iconData = nodes.filter(function(d) { return d.depth === 1; });
      var options = {
        'size': 15,
        'offsetX': 9,
        'offsetY': 4
      }
      _iconManager.draw( vis, [], options );
      _iconManager.drawSet( vis, iconData, options );
    }

    // Rect Areas
    function drawLayoutFlat(nodes) {
      // Reset other layout types
      _g.select('g.layout').selectAll("path.link").remove('*');

      var linkData = nodes;//.filter(function(d) { return (!d.isleaf && !d.isroot); });
      var link = _g.select('g.layout').selectAll("rect.link")
          .data(linkData, function(d) { return d.uuid; })
          ;
      link
        .enter().append("rect")
          .attr("class", "link")
          .attr("x", function(d) { return d.area.x; })
          .attr("y", function(d) { return d.area.y; })
          .attr("width", function(d) { return d.area.w; })
          .attr("height", function(d) { return d.area.h; })
          .style("fill", "#AAA")
          .style("stroke", "none")
          .style("opacity", 0.2)
          ;
      link
        .transition()
          .attr("x", function(d) { return d.area.x; })
          .attr("y", function(d) { return d.area.y; })
          .attr("width", function(d) { return d.area.w; })
          .attr("height", function(d) { return d.area.h; })
        ;
      link
        .exit()
        .remove();


      var iconData = [];//nodes.filter(function(d) { return d.iscat; });
      var options = {
        'size': 15,
        'offsetX': 9,
        'offsetY': 4
      }
      _iconManager.draw( vis, iconData, options );
    }

    // Rect Areas
    function drawLayoutCats(nodes) {
      // Reset other layout types
      _g.select('g.layout').selectAll("path.link").remove('*');

      var linkData = nodes.filter(function(d) { return (!d.isleaf && !d.isroot); });
      var link = _g.select('g.layout').selectAll("rect.link")
          .data(linkData, function(d) { return d.uuid; })
          ;
      link
        .enter().append("rect")
          .attr("class", "link")
          .attr("x", function(d) { return d.area.x; })
          .attr("y", function(d) { return d.area.y; })
          .attr("width", function(d) { return d.area.w; })
          .attr("height", function(d) { return d.area.h; })
          .style("fill", "#AAA")
          .style("stroke", "none")
          .style("opacity", 0.2)
          ;
      link
        .transition()
          .attr("x", function(d) { return d.area.x; })
          .attr("y", function(d) { return d.area.y; })
          .attr("width", function(d) { return d.area.w; })
          .attr("height", function(d) { return d.area.h; })
        ;
      link
        .exit()
        .remove();


      var iconData = nodes.filter(function(d) { return d.iscat; });
      var options = {
        'size': 15,
        'offsetX': 9,
        'offsetY': 4
      }
      _iconManager.draw( vis, iconData, options );
    }
      
    // Path Links
    function drawLayoutTree(nodes) {
      _g.select('g.layout').selectAll("rect.link").remove('*');

      var linkData = tree.links(nodes);//.filter(function(d) { return (d.target.children && d.target.children.length > 0); });
      var link = _g.select('g.layout').selectAll("path.link")
          // TODO: use d.uuid instead of nodeId
          .data(linkData, function(d) { return d3.phylogram.nodeId(d.source) + d3.phylogram.nodeId(d.target); })
          ;
      link
        .enter().append("path")
          .attr("class", "link")
          .attr("d", function(d) { return (d.source.isroot) ? diagonalCat(d) : diagonal(d); })
          ;
      link
        .transition()
        .attr("d", function(d) { return (d.source.isroot) ? diagonalCat(d) : diagonal(d); })
        ;
      link
        .exit()
        .remove();

      var iconData = nodes.filter(function(d) { return d.iscat; }).map(function(d) { return {'x': d.x, 'y': 0, 'id': d.id, 'uuid': d.uuid, 'attr': d.attr}; });
      var options = {
        'size': 15,
        'offsetX': 8,
        'offsetY': 0
      }
      _iconManager.draw( vis, iconData, options );
    }

    function drawNodes(nodes) {
      var node = vis.selectAll("g.node")
          // TODO: use d.uuid instead of nodeId
          .data(nodes, function(d) { return d3.phylogram.nodeId(d); })
          ;
      node
        .enter().append("svg:g")
          .attr("class", function(n) {
            if (n.children) {
              if (n.depth == 0) {
                return "root node";
              } else if (n.iscat) {
                return "cat node";
              } else {
                return "inner node";
              }
            } else {
              return "leaf node";
            }
          })
          .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
          ;
      node
        .transition()
        .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
        ;
      node
        .exit()
        .remove();

// PROXIES
      // nodes.forEach(function(d) {
      //   console.log(d.proxy);
      // })
    }


    var nodes = [];


    if (layoutType == 'tree') {
      nodes = tree( data.struct );
      
      layoutTree(nodes, layoutWidth);
      topAlignVert(nodes[0]);
      addSeparation(nodes[0], 0);

      drawLayoutTree(nodes);

    } else if (layoutType == 'flat') {
      nodes = tree( data.flat );
      
      layoutFlat(nodes[0], 10, layoutWidth);

      drawLayoutFlat(nodes);

    } else if (layoutType == 'cats') {
      nodes = tree( data.cats );
      
      layoutCats(nodes[0], 10, layoutWidth);

      drawLayoutCats(nodes);

    } else if (layoutType == 'clusters') {
      nodes = tree( data.clusters );
      
      layoutClusters(nodes[0], 10, layoutWidth);

      drawLayoutClusters(nodes);

    } else {
      console.error("Invalid Layout Type");
    }

    drawNodes(nodes);
     
    d3.phylogram.styleTreeNodes(vis)

    var offsets = getNodeExtremes(nodes);
    //console.log(offsets);

    var cohortLabelOffset = 0;//180;
    var svgPadding = 20

    svgWidth = layoutWidth + phenotypesWidth + cohortWidth + 15;
    svgHeight = offsets.max - offsets.min + svgPadding*2 + cohortLabelOffset;

    //console.log("HEIGHT", svgHeight);
    _svg
      .attr("height", svgHeight)
      .attr("width", svgWidth);

    _g
    //  .attr("transform", "translate(20 " + (-offsets.min + cohortLabelOffset + svgPadding) + ")");
      .attr("transform", "translate(5 10)");

    //d3.select(".labels-headers").style("width", (layoutWidth+phenotypesWidth+cohortWidth)+"px");
    d3.select("#labels-header-layout")
      .style("left", 0)
      .style("width", (layoutWidth)+"px");
    d3.select("#labels-header-phenotypes")
      .style("left", (layoutWidth+3)+"px")
      .style("width", (phenotypesWidth-5)+"px");
    d3.select("#labels-header-cohorts")
      .style("left", (layoutWidth+phenotypesWidth)+"px")
      .style("width", Math.max(200, (cohortWidth+5))+"px");

    d3.select("#labels-panel")
      .attr("width", svgWidth);

    // _g.select("g.description")
    //   .attr("transform", "translate(100 " + (offsets.min - 75) + ")");

    
    if (options.skipBranchLengthScaling) {
      var yscale = d3.scale.linear()
        .domain([0, w])
        .range([0, w]);
    } else {
      var yscale = scaleBranchLengths(nodes, w)
    }
    
    // if (!options.skipTicks) {
    //   vis.selectAll('line')
    //       .data(yscale.ticks(10))
    //     .enter().append('svg:line')
    //       .attr('y1', 0)
    //       .attr('y2', h)
    //       .attr('x1', yscale)
    //       .attr('x2', yscale)
    //       .attr("stroke", "#ddd");

    //   vis.selectAll("text.rule")
    //       .data(yscale.ticks(10))
    //     .enter().append("svg:text")
    //       .attr("class", "rule")
    //       .attr("x", yscale)
    //       .attr("y", 0)
    //       .attr("dy", -3)
    //       .attr("text-anchor", "middle")
    //       .attr('font-size', '8px')
    //       .attr('fill', '#ccc')
    //       .text(function(d) { return Math.round(d*100) / 100; });
    // }

    function formatHpoLabel(d) {
      //return d.id + ' - ' + d.name;
      return d.name;
    }

    function atLeastOneLeaf(nodes) {
      for (var i = nodes.length - 1; i >= 0; i--) {
        if (!nodes[i].children || nodes[i].children.length === 0) {
          return true;
        }
      }
      return false;
    }

    function allLeaf(nodes) {
      for (var i = nodes.length - 1; i >= 0; i--) {
        if (nodes[i].children && nodes[i].children.length > 0) {
          return false;
        }
      }
      return true;
    }

    function formatInnerLabel(d) {
      // if (d.children && d.children.length > 1) {
      //   return condenseName(d.name);  // Fork
      // } else if (atLeastOneLeaf(d.children)) {
      //   return condenseName(d.name);  // Last level
      // } else if (d.iscat) {
      //   return condenseName(d.name);  // Category level
      // }
      if (allLeaf(d.children)) {
        return condenseName(d.name);  // Last level above leafs
      }
      return "";
    }

    function formatCatLabel(d) {
      return d.name;
    }

    function drawLayoutTreeLabels() {
      var opt = {
        'inner': {
          'dx': -5,
          'dy': -3,
          'anchor': 'end'
        },
        'leafic': {
          'dx': -5,
          'dy': -2,
          'anchor': 'end'
        },
        'leaf': {
          'dx': 8,
          'dy': 3,
          'anchor': 'start'
        }
      };

      renderLabels(opt);
    }

    function drawLayoutFlatLabels() {
      var opt = {
        'inner': {
          'dx': -5,
          'dy': 4,
          'anchor': 'end'
        },
        'leafic': {
          'dx': -5,
          'dy': -2,
          'anchor': 'end'
        },
        'leaf': {
          'dx': 8,
          'dy': 3,
          'anchor': 'start'
        }
      };

      renderLabels(opt);
    }

    function drawLayoutCatsLabels() {
      var opt = {
        'inner': {
          'dx': -5,
          'dy': 4,
          'anchor': 'end'
        },
        'leafic': {
          'dx': -5,
          'dy': -2,
          'anchor': 'end'
        },
        'leaf': {
          'dx': 8,
          'dy': 3,
          'anchor': 'start'
        }
      };

      renderLabels(opt);
    }

    function drawLayoutClustersLabels() {
      var opt = {
        'inner': {
          'dx': 20,
          'dy': 7,
          'anchor': 'start'
        },
        'leafic': {
          'dx': -5,
          'dy': -2,
          'anchor': 'end'
        },
        'leaf': {
          'dx': 8,
          'dy': 3,
          'anchor': 'start'
        }
      };

      renderLabels(opt);
    }

    function renderLabels(opt) {
      var innerNode = vis.selectAll('g.inner.node');
      innerNode.selectAll("text").remove();
      innerNode
        .append("svg:text")
          .attr("class", ((layoutType == 'clusters') ? "label-cat" : "label-inner"))
          .attr("text-anchor", opt.inner.anchor)
          .attr("dx", opt.inner.dx)
          .attr("dy", opt.inner.dy)
          .text(function(d) { return formatInnerLabel(d); })
          .on("click", function(d) {
            console.log(d);
          })
          .on("mouseover", function(d) {
            // TODO: Add row highlighting for all leafs
            uiHighlightPhenoblocks(d);
            uiUpdateDescription(d, null, null, data.hpMap);
            d3.select(this).style('font-weight', 400);
          })
          .on("mouseout", function() {
            uiHighlightPhenoblocks(null);
            uiUpdateDescription(null, null, null, data.hpMap);
            d3.select(this).style('font-weight', 300);
          })
          ;

      var leafNode = vis.selectAll('g.leaf.node');
      leafNode.selectAll("text").remove();
      leafNode
        .append("svg:text")
          .attr("class", "label-leaf-ic")
          .attr("text-anchor", opt.leafic.anchor)
          .attr("dx", opt.leafic.dx)
          .attr("dy", opt.leafic.dy)
          .text(function(d) { return d.attr.ic_base.toFixed(2); })
          ;

      leafNode
        .append("text")
          .attr("class", function(d) { return "label-leaf hpolabel " + hpoClass(d); })  // TODO: delink from object format
          .attr("text-anchor", opt.leaf.anchor)
          .attr("dx", opt.leaf.dx)
          .attr("dy", opt.leaf.dy)
          .text(function(d) { return formatHpoLabel(d); })
          .on("click", function(d) {
            console.log(d);
            //uiSearchQuery( d.name );
          })
          .on("mouseover", function(d) {
            uiHighlightHpoRow(d);
            uiHighlightPhenoblocks(d);
            uiUpdateDescription(d, null, null, data.hpMap);
          })
          .on("mouseout", function() {
            uiHighlightHpoRow(null);
            uiHighlightPhenoblocks(null);
            uiUpdateDescription(null, null, null, data.hpMap);
          })
          ;

      var catNode = vis.selectAll('g.cat.node');
      catNode.selectAll("text").remove();
      if (layoutType == 'cats' || layoutType == 'flat') {
        catNode
          .append("text")
            .attr("class", "label-cat")
            .attr("text-anchor", 'start')
            .attr("dx", 20)
            .attr("dy", 7)
            .text(function(d) { return formatCatLabel(d); })
            .on("mouseover", function(d) {
              // TODO: Add row highlighting for all leafs
              uiHighlightPhenoblocks(d);
              uiUpdateDescription(d, null, null, data.hpMap);
              d3.select(this).style('font-weight', 400);
            })
            .on("mouseout", function() {
              uiHighlightPhenoblocks(null);
              uiUpdateDescription(null, null, null, data.hpMap);
              d3.select(this).style('font-weight', 300);
            })
            ;
      }
    }

    if (!options.skipLabels) {

      if (layoutType == 'tree') {
        drawLayoutTreeLabels();

      } else if (layoutType == 'flat') {
        drawLayoutFlatLabels();

      } else if (layoutType == 'cats') {
        drawLayoutCatsLabels();

      } else if (layoutType == 'clusters') {
        drawLayoutClustersLabels();

      } else {
        console.error("Invalid Layout Type");
      }
    }
    


    // var patOrderA = {};
    // var patOrderB = {};
/*    switch(SORTPAT) {
      case 0:
        data.pats[0].sort(patientSortAlpha);
        data.pats[1].sort(patientSortAlpha);
        break;
      case 1:
        data.pats[0].sort(patientSortFreq);
        data.pats[1].sort(patientSortFreq);
        break;
      case 2:
        data.pats[0].sort(patientSortHSMA);
        break;
      case 3:
        data.pats[0].sort(patientSortAge);
        break;
    }*/
    // for (var i = 0, n = PATA.length; i < n; i++) {
    //   pat = PATA[i];
    //   patOrderA[pat['id']] = i;
    // }
    // for (var i = 0, n = PATB.length; i < n; i++) {
    //   pat = PATB[i];
    //   patOrderB[pat['id']] = i;
    // }

/*
    var cohortLabelPadding = 10;
    var cohortBaseY = offsets.min - cohortLabelPadding;
    //var cohortBaseX = (CUTOFF+1) * 100 + 320;

    var maxDepth = d3.max( nodes.map(function(d) { return d.depth; }) );
    //var cohortBaseX = maxDepth * nodeWidth + 320;
    var cohortBaseX = 300;


    function stashPatient( d, i ) {
      // d._x = d.x;
      // d._y = d.y;
      d.x = cohortBaseX + 10 * i;
      d.y = cohortBaseY;
    }


    var cohortLabels = _g.select("g.overlay");
    cohortLabels
      .attr("transform", 'translate(300 0)')

    var cohortLabelsA = cohortLabels.selectAll('text.cohortLabel.A')
      .data( data.pats[0], function(d) { return d.id + "cohortA"; } );

    cohortLabelsA
      .enter().append('text')
        .each(stashPatient)
        .attr("class", "cohortLabel A")
        //.attr('transform', function(d, i) { var x = cohortBaseX + 10 * i; return 'translate('+ x +' '+ cohortBaseY +') rotate(-90)'; })
        .attr('transform', function(d, i) { return 'translate('+ d.x +' '+ d.y +') rotate(-90)'; })
        .attr("dx", 3)
        .attr("dy", 3)
        .attr("text-anchor", "start")
        .attr('font-size', '10px')
        .attr('fill', 'black')
        .text(function(d) { return d.id + " (" + (d.attr.HSMA == -1 ? "No" : d.attr.HSMA) + " HSMA / " + d.attr.AGE + " YRS) "; })
        .on("mouseover", function(d) {
          uiHighlightPatientCol( d, d3.phylogram.highlightPatientCol );
          d3.phylogram.updateDescription(null, d, null, data.hpMap);
        })
        .on("mouseout", function() {
          uiHighlightPatientCol( null, d3.phylogram.highlightPatientCol );
          d3.phylogram.updateDescription(null, null, null, data.hpMap);
        })
        ;

    cohortLabelsA
      .each(stashPatient)
      .transition()
      .attr('transform', function(d, i) { return 'translate('+ d.x +' '+ d.y +') rotate(-90)'; })
      ;

    cohortLabelsA
      .exit()
      .remove();

    cohortBaseX += 235;

    function stashPatient2( d, i ) {
      d.x = cohortBaseX + 10 * i;
      d.y = cohortBaseY;
    }

    var cohortLabelsB = cohortLabels.selectAll('text.cohortLabel.B')
      .data( data.pats[1], function(d) { return d.id + "cohortB"; } );

    cohortLabelsB
      .enter().append('text')
        .each(stashPatient2)
        .attr("class", "cohortLabel B")
        //.attr('transform', function(d, i) { var x = cohortBaseX + 10 * i; return 'translate('+ x +' '+ cohortBaseY +') rotate(-90)'; })
        .attr('transform', function(d, i) { return 'translate('+ d.x +' '+ d.y +') rotate(-90)'; })
        .attr("dx", 3)
        .attr("dy", 3)
        .attr("text-anchor", "start")
        .attr('font-size', '10px')
        .attr('fill', 'black')
        .text(function(d) { return d.id + " (" + d.attr.MUT + " / " + d.attr.PRO + ") "; })
        .on("mouseover", function(d) {
          uiHighlightPatientCol( d, d3.phylogram.highlightPatientCol );
          d3.phylogram.updateDescription( null, d, null, data.hpMap );
        })
        .on("mouseout", function() {
          uiHighlightPatientCol( null, d3.phylogram.highlightPatientCol );
          d3.phylogram.updateDescription( null, null, null, data.hpMap );
        })
        ;
    cohortLabelsB
      .each(stashPatient2)
      .transition()
      .attr('transform', function(d, i) { return 'translate('+ d.x +' '+ d.y +') rotate(-90)'; })
      ;
    cohortLabelsA
      .exit()
      .remove();

*/

    function getFreqClass(patient, state) {
      return d3.phylogram.getFreqState(patient, state);
    }

    vis.selectAll('g.leaf.node').each(function(d) {
      // For now, only plot two cohorts
      for (var i = 0, n = data.pats.length; i < n; i++) {
        var patients = data.pats[i];
        var phenotypes = data.phenos[i];
        var cohortId = 'C'+ (i+1);

        var freq = d3.select(this).selectAll('circle.freq.'+ cohortId)
          // TODO: use d.uuid instead of nodeId
          .data( patients, function(p, j) { return d3.phylogram.nodeId(d) + cohortId + p.id; })
          ;
        freq
          .enter().append('circle')
            .attr('class', function(p) { return ['freq', getFreqClass(p.id, phenotypes[d.id]), cohortId, p.id, hpoClass(d)].join(" "); })
            .attr('r', 3.5)
            .attr('transform', function(p) { return 'translate('+ p.x +' 0)'; })
            .on("mouseover", function(p) {
              uiHighlightPatientCol( p );
              uiHighlightHpoRow( d );
              uiHighlightPhenoblocks(d);
              uiUpdateDescription(d, p, d3.phylogram.getCohortPhenotypes(p.cohort, data)[d.id], data.hpMap);
            })
            .on("mouseout", function() {
              uiHighlightPatientCol( null );
              uiHighlightHpoRow( null );
              uiHighlightPhenoblocks(null);
              uiUpdateDescription(null, null, null, data.hpMap );
            })
            ;
        freq
          .transition()
          .attr('transform', function(p) { return 'translate('+ p.x +' 0)'; })
          ;
        freq
          .exit()
          .remove();
      }

      if (data.phenos[0] && data.phenos[0][d.id]) {
        var frequencies = [];
        var freqW = 50;
        var modX = phenotypesWidth + 10 * data.pats[0].length;
        if (data.pats.length > 1) {
          frequencies.push({'x': modX, 'w': d3.phylogram.getFreqUnknown('C1', d) * freqW, 't': 2});
          modX += frequencies.slice(-1)[0].w;
          frequencies.push({'x': modX, 'w': d3.phylogram.getFreqAbsent('C1', d) * freqW, 't': 1});
          modX += frequencies.slice(-1)[0].w;
          frequencies.push({'x': modX, 'w': d3.phylogram.getFreqPresent('C1', d) * freqW, 't': 0});

        } else {
          frequencies.push({'x': modX, 'w': d3.phylogram.getFreqPresent('C1', d) * freqW, 't': 0});
          modX += frequencies.slice(-1)[0].w;
          frequencies.push({'x': modX, 'w': d3.phylogram.getFreqAbsent('C1', d) * freqW, 't': 1});
          modX += frequencies.slice(-1)[0].w;
          frequencies.push({'x': modX, 'w': d3.phylogram.getFreqUnknown('C1', d) * freqW, 't': 2});
        }

        //console.log( frequencies );

        var freq = d3.select(this).selectAll('rect.frequencies.C1')
          // TODO: use d.uuid instead of nodeId
          .data( frequencies, function(p, j) { return d.uuid + "frequencies" + j + "C1"; })
          ;

        freq.enter().append('rect')
          .attr('class', 'frequencies C1 ' + hpoClass(d))
          .attr('transform', function(p) { return 'translate('+ p.x +' -4)'; })
          .attr('width', function(p) { return p.w; })
          .attr('height', 8)
          .attr('fill', function(p) {
            switch(p.t) {
              case 0:
                // return 'rgb(74, 144, 51)';
                return '#83568e';
              case 1:
                // return 'rgb(223, 134, 59)';
                return '#7cdcc9';
              case 2:
                return 'none';
            }
          })
          .attr('stroke', function(p) {
            // switch(p.t) {
            //   case 0:
            //     return '#5c3267';
            //   case 1:
            //     return '#0b8272';
            //   case 2:
            //     return 'none';
            // }
            return 'none';
          })
          .attr("opacity", function(p) {
            var normIc = d.attr.ic_base / MAX_IC;
            return (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
          })
          .on("mouseover", function(p) {
            uiHighlightHpoRow(d);
            uiHighlightPhenoblocks(d);
            uiUpdateDescription(d, null, null, data.hpMap);
          })
          .on("mouseout", function() {
            uiHighlightHpoRow(null);
            uiHighlightPhenoblocks(null);
            uiUpdateDescription(null, null, null, data.hpMap);
          })
          ;
        freq
          .transition()
          .attr("opacity", function(p) {
            var normIc = d.attr.ic_base / MAX_IC;
            return (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
          })
          ;
      }

      if (data.phenos[1] && data.phenos[1][d.id]) {
        var frequencies = [];
        var freqW = 50;
        var modX = phenotypesWidth + 10 * data.pats[0].length + 55;
        frequencies.push({'x': modX, 'w': d3.phylogram.getFreqPresent('C2', d) * freqW, 't': 0});
        modX += frequencies.slice(-1)[0].w;
        frequencies.push({'x': modX, 'w': d3.phylogram.getFreqAbsent('C2', d) * freqW, 't': 1});
        modX += frequencies.slice(-1)[0].w;
        frequencies.push({'x': modX, 'w': d3.phylogram.getFreqUnknown('C2', d) * freqW, 't': 2});
        //console.log( frequencies );

        var freq = d3.select(this).selectAll('rect.frequencies.C2')
          // TODO: use d.uuid instead of nodeId
          .data( frequencies, function(p, j) { return d.uuid + "frequencies" + j + "C2"; })
          ;

        freq.enter().append('rect')
          .attr('class', 'frequencies C2 ' + hpoClass(d))
          .attr('transform', function(p) { return 'translate('+ p.x +' -4)'; })
          .attr('width', function(p) { return p.w; })
          .attr('height', 8)
          .attr('fill', function(p) {
            switch(p.t) {
              case 0:
                // return 'rgb(74, 144, 51)';
                return '#83568e';
              case 1:
                // return 'rgb(223, 134, 59)';
                return '#7cdcc9';
              case 2:
                return 'none';
            }
          })
          .attr('stroke', function(p) {
            // switch(p.t) {
            //   case 0:
            //     return '#5c3267';
            //   case 1:
            //     return '#0b8272';
            //   case 2:
            //     return 'none';
            // }
            return 'none';
          })
          .attr("opacity", function(p) {
            return d.attr.ic_base / MAX_IC;
          })
          .on("mouseover", function(p) {
            uiHighlightHpoRow(d);
            uiHighlightPhenoblocks(d);
            uiUpdateDescription(d, null, null, data.hpMap);
          })
          .on("mouseout", function() {
            uiHighlightHpoRow(null);
            uiHighlightPhenoblocks(null);
            uiUpdateDescription(null, null, null, data.hpMap);
          })
          ;

        freq
          .transition()
          .attr("opacity", function(p) {
            var normIc = d.attr.ic_base / MAX_IC;
            return (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
          })
          ;
      }

    });

    return {'tree': tree, 'offsets': offsets, 'nodes': nodes};
  }

}());
