if (!d3) { throw "d3 wasn't included!"};
if (!chroma) { throw "chroma wasn't included!"};

d3.phenoblocks = function() {
  var cGreen = chroma('#008933'); //[74, 144, 51];
  var cOrange = chroma('#f57300'); //[223, 134, 59];
  var cPurple = chroma('#5c3267'); //chroma('#5a4aa6');
  var cYellow = chroma('gold');
  var cGrey = chroma("#333");

  var scales = [
    chroma.scale([cYellow, cPurple]).mode('lch')
    //chroma.scale([cGreen, cYellow, cOrange]).mode('lab'),
    //chroma.scale([cGreen.desaturate(2), cYellow.desaturate(2), cOrange.desaturate(2)]).mode('lab'),
    //chroma.scale([cGreen.desaturate(3), cYellow.desaturate(3), cOrange.desaturate(3)]).mode('lab')
  ];

  var color = function() {
    return function(score) {
      return scales[0](score);
      //var scale = chroma.cubehelix();
      // var scale = chroma.cubehelix()
      //   .start(600)
      //   .rotations(-0.75)
      //   .gamma(1.0)
      //   .lightness([0.1, 1.0]);
      // return scale(score);
    }
  };

  var boost = 0.75;
  var iboost = 1.0 - boost;

  var getSimilarPresent = function(node) {
    // Must be present in both cohorts
    if (node.attr.trend.present[0] === 0 || node.attr.trend.present[1] === 0) {
      return 0;
    }
    
    var diff = Math.abs( node.attr.trend.present[0] - node.attr.trend.present[1] );
    var freq = boost + iboost * averageArray( node.attr.trend.present );
    var sim = 1.0 - diff;
    var normIc = node.attr.ic_base / MAX_IC;
    return sim * freq * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }
  var getSimilarAbsent = function(node) {
    // Must be absent in both cohorts
    if (node.attr.trend.absent[0] === 0 || node.attr.trend.absent[1] === 0) {
      return 0;
    }

    var diff = Math.abs( node.attr.trend.absent[0] - node.attr.trend.absent[1] );
    var freq = boost + iboost * averageArray( node.attr.trend.absent );
    var sim = 1.0 - diff;
    var normIc = node.attr.ic_base / MAX_IC;
    return sim * freq * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }
  var getDifferentPresent = function(node) {
    var diff = Math.abs( node.attr.trend.present[0] - node.attr.trend.present[1] );
    var freq = boost + iboost * averageArray( node.attr.trend.present );
    var normIc = node.attr.ic_base / MAX_IC;
    return diff * freq * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }
  var getDifferentAbsent = function(node) {
    var diff = Math.abs( node.attr.trend.absent[0] - node.attr.trend.absent[1] );
    var freq = boost + iboost * averageArray( node.attr.trend.absent );
    var normIc = node.attr.ic_base / MAX_IC;
    return diff * freq * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getCompareSim = function(node) {
    var present = 1.0 - Math.abs( node.attr.trend.present[0] - node.attr.trend.present[1] );
    var absent = 1.0 - Math.abs( node.attr.trend.absent[0] - node.attr.trend.absent[1] );
    var sim = boost + iboost * (present+absent)/2.0
    var normIc = node.attr.ic_base / MAX_IC;
    return sim * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getCompareDiff = function(node) {
    var present = Math.abs( node.attr.trend.present[0] - node.attr.trend.present[1] );
    var absent = Math.abs( node.attr.trend.absent[0] - node.attr.trend.absent[1] );
    var sim = boost + iboost * (present+absent)/2.0
    var normIc = node.attr.ic_base / MAX_IC;
    return sim * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getCompareOutliers = function(node) {
    var outliersTest = [];
    outliersTest.push( (node.attr.trend.present[0] > 0) ? 1.0 - node.attr.trend.present[0] : 0.0 );
    outliersTest.push( (node.attr.trend.present[1] > 0) ? 1.0 - node.attr.trend.present[1] : 0.0 );
    outliersTest.push( (node.attr.trend.absent[0] > 0) ? 1.0 - node.attr.trend.absent[0] : 0.0 );
    outliersTest.push( (node.attr.trend.absent[1] > 0) ? 1.0 - node.attr.trend.absent[1] : 0.0 );
    var avg = averageArray(outliersTest.filter(function(d) { return d > 0; }));
    var outliers = (avg) ? avg : 0.0;
    var normIc = node.attr.ic_base / MAX_IC;
    return outliers * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getCompareEntropy = function(node) {
    var cohortEntropy = [];
    for (var i = 0, n = 2; i <= n; i++) {
      var vals = [node.attr.trend.present[i], node.attr.trend.absent[i], node.attr.trend.unknown[i]];
      cohortEntropy.push( calculateEntropy(vals) );
    }
    var entropy = Math.abs(cohortEntropy[0] - cohortEntropy[1]);
    var normIc = node.attr.ic_base / MAX_IC;
    return entropy * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getFrequentPresent = function(node) {
    var freq = node.attr.trend.present[0];
    var normIc = node.attr.ic_base / MAX_IC;
    return freq * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getFrequentAbsent = function(node) {
    var freq = node.attr.trend.absent[0];
    var normIc = node.attr.ic_base / MAX_IC;
    return freq * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getInfrequentPresent = function(node) {
    var freq = (node.attr.trend.present[0]) ? 1.0 - node.attr.trend.present[0] : 0.0;
    var normIc = node.attr.ic_base / MAX_IC;
    return freq * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getInfrequentAbsent = function(node) {
    var freq = (node.attr.trend.absent[0]) ? 1.0 - node.attr.trend.absent[0] : 0.0;
    var normIc = node.attr.ic_base / MAX_IC;
    return freq * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getOutliers = function(node) {
    var outliersTest = [];
    outliersTest.push( (node.attr.trend.present[0] > 0) ? 1.0 - node.attr.trend.present[0] : 0.0 );
    outliersTest.push( (node.attr.trend.absent[0] > 0) ? 1.0 - node.attr.trend.absent[0] : 0.0 );
    var avg = averageArray(outliersTest.filter(function(d) { return d > 0; }));
    var outliers = (avg) ? avg : 0.0;
    var normIc = node.attr.ic_base / MAX_IC;
    return outliers * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getEntropy = function(node) {
    var entropy = calculateEntropy( [node.attr.trend.present[0], node.attr.trend.absent[0], node.attr.trend.unknown[0]] );
    var normIc = node.attr.ic_base / MAX_IC;
    return entropy * (normIc + (1.0-FREQUENCYIC) * (1.0-normIc));
  }

  var getCompareMetric = function(type) {
    switch (type) {
      case 'sim':
        return getCompareSim;
      case 'diff':
        return getCompareDiff;
      case 'simp':
        return getSimilarPresent;
      case 'sima':
        return getSimilarAbsent;
      case 'diffp':
        return getDifferentPresent;
      case 'diffa':
        return getDifferentAbsent;
      case 'outliers':
        return getCompareOutliers;
      case 'entropy':
        return getCompareEntropy;
      default:
        console.error("PhenoBlocks: Unknown Type");
    }
  }

  var getSingleMetric = function(type) {
    switch (type) {
      case 'freqp':
        return getFrequentPresent;
      case 'freqa':
        return getFrequentAbsent;
      case 'infreqp':
        return getInfrequentPresent;
      case 'infreqa':
        return getInfrequentAbsent;
      case 'outliers':
        return getOutliers;
      case 'entropy':
        return getEntropy;
      default:
        console.error("PhenoBlocks: Unknown Type");
    }
  }

  var getFill = function(metric) {
    var c = color();

    return function(node) {
      return c( metric(node) );
    }
  }

  var alphaSort = function(a, b) {
    return d3.ascending(a.attr.name, b.attr.name) || d3.ascending(a.attr.ic_max, b.attr.ic_max);
  }

  var getSort = function(metric) {
    return function(a, b) {
      return d3.descending(metric(a), metric(b)) || d3.ascending(a.attr.ic_max, b.attr.ic_max);
    };
  }

  var arc = function() {
    return d3.svg.arc()
      .startAngle(function(d) { return d.x; })
      .endAngle(function(d) { return d.x + d.dx; })
      .innerRadius(function(d) { return Math.sqrt(d.y); })
      .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
      ;
  };

  var arcCenter = function() {
    return d3.svg.arc()
      .startAngle(function(d) { return d.x + d.dx/2.0; })
      .endAngle(function(d) { return d.x + d.dx/2.0; })
      .innerRadius(function(d) { return Math.sqrt(d.y + d.dy/2.0); })
      .outerRadius(function(d) { return Math.sqrt(d.y + d.dy/2.0); })
      ;
  };

  var arcEdge = function() {
    return d3.svg.arc()
      .startAngle(function(d) { return d.x + d.dx/2.0; })
      .endAngle(function(d) { return d.x + d.dx/2.0; })
      .innerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
      .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); })
      ;
  };

  var partition = function(radius) {
    return d3.layout.partition()
      .sort(_sortPartition)
      .size([2 * Math.PI, radius * radius])
      .value(function(d) { return 1; })
      ;
  };

  var _key = function(d) {
    var k = [], p = d;
    while (p) {
      k.push( hpoClass(p) );
      p = p.parent;
    }
    return k.reverse().join("-");
  }

  var _hpoClass = function(d) {
    return d.attr.hpo.split(":").join("");
  }

  var _uuid = function(d) {
    return "phenoblocks-"+ _id +"-node-"+ _key(d);
  }

  var _options = {
    'radius': 150,
    'width': 200,
    'height': 200,
    'labelHeight': 25,
    'offset': [20, 20],
    'title': 'PhenoBlocks',
    'type': 'diff',
    'compare': true
  };

  var _id = null;
  var _svg = null;
  var _g = null;
  var _arc = null;
  var _arcCenter = null;
  var _arcEdge = null;
  var _layout = null;
  var _comp = null;
  var _fill = null;
  var _sort = null;
  var _sortPartition = null;
  var _data = null;
  var _hidden = false;

  var my = function() {

  }

  my.id = function(value) {
    if (!arguments.length) return _id;
    _id = value;
    return my;
  }

  my.group = function(value) {
    if (!arguments.length) return _g;
    _g = value;
    return my;
  }

  my.init = function(selector, options) {
    options = options || {'type': 'diff'};

    var id = options.id || Math.random();
    var width = options.width || _options.width;
    var height = options.height || _options.height;
    var radius = options.radius || _options.radius;
    var offset = options.offset || _options.offset;
    var title = options.title || _options.title;
    var type = options.type || _options.type;
    var compare = options.compare; // || _options.compare;  // Need to fix this because of case when compare == false

    var labelHeight = options.labelHeight || _options.labelHeight;

    _comp = (compare) ? getCompareMetric(type) : getSingleMetric(type);
    _fill = getFill(_comp);
    _sort = getSort(_comp);
    _sortPartition = alphaSort;

    _id = id;

    _svg = d3.select(selector).append("svg")
      .attr("id", _id)
      .attr("width", width)
      .attr("height", height)
      ;

    var patt = _svg.append("defs")
      .append('polygon')
        .attr('points', "0,0 -4,-10  0,-9 4,-10")
        .attr('id', 'arrow')
        ;

    _svg.append("text")
    .attr("class", "label-phenoblocks")
      .attr("dx", width/2.0)
      .attr("dy", 18)
      .text(title)
      .on("click", my.toggleHidden)
      ;

    _g = _svg.append("g")
      .attr("class", "phenoblocks")
      .attr("transform", "translate("+ (radius+offset[0]) +" "+ (radius+offset[1]+labelHeight) +")")
      ;

    _svg.append("g")
      .attr("class", "info")
      .attr("transform", "translate("+ (radius*2+offset[0]*2) +" "+ (labelHeight+offset[1]) +")")
      ;

    _g.append("circle")
      .attr("r", radius*1.02)
      //.style("fill", "#eee")
      .style("fill", "none")
      .style("stroke", "#eee")
      .style("stroke-width", 1.5)
      ;

    _g.append("g")
      .attr("class", "chart")
      ;

    _g.append("g")
      .attr("class", "overlay")
      ;

    _arc = arc();
    _arcCenter = arcCenter();
    _arcEdge = arcEdge();

    _layout = partition( radius );

    return _g;
  }

  my.draw = function(tree, options) {
    _data = _layout.nodes(tree);
    
    var path = _g.select("g.chart").selectAll("path")
      .data(_data, function(d) { return _uuid(d); });

    path.enter().append("path")
      .attr("class", function(d) { return _hpoClass(d); })
      .attr("d", _arc)
      .style("fill", function(d) { return _fill(d); })
      .style("stroke", "#5c3267")
      .style("stroke-width", 0.2)
      .on("click", function(d) {
        uiSearchQuery( d.name );
        console.log(d);//d.attr.hpo, d.attr.name, d.attr.ic_max);
      })
      .on("mouseover", function(d) {
        uiHighlightHpoRow(d, d3.phylogram.highlightHpoRow);
        uiHighlightPhenoblocks(d);
        uiUpdateDescription(d, null, null, null);
      })
      .on("mouseout", function() {
        uiHighlightHpoRow(null, d3.phylogram.highlightHpoRow);
        uiHighlightPhenoblocks(null);
        uiUpdateDescription(null, null, null, null);
      })
      ;

    path
      .transition()  //<-- TODO fix bug here when removing nodes (all unknown)
      .style("fill", function(d) { return _fill(d); })
      .attr("d", _arc)
      ;

    path.exit()
      .remove();


    var leafs = uniqueValuesObject( utils.getLeafNodes(_data[0], "children"), 'id' );
    leafs = leafs.filter(function(d) { return (!utils.allUnknown(d) && _comp(d) > 0.0); });
    leafs = leafs.sort(_sort).slice(0, 20);

    var baseY = 10;
    var listPosY = function(d, i) { return baseY+10*i; };
    var labelFormat = function(d) {
      var max = 20,
          name = condenseName(d.attr.name);
      return (name.length > max) ? name.substr(0, max) +"..." : name;
    };

    var list = _svg.select("g.info").selectAll("text")
      .data(leafs, function(d) { return d.id; });

    list.enter().append("text")
      .attr("class", function(d) { return "label-phenoblocks-info "+ hpoClass(d); })
      .attr("y", listPosY)
      .text(labelFormat)
      .on("click", function(d) {
        uiSearchQuery( d.name );
        console.log(d.attr.hpo, d.attr.name, d.attr.ic_max);
      })
      .on("mouseover", function(d) {
        uiHighlightHpoRow(d, d3.phylogram.highlightHpoRow);
        uiHighlightPhenoblocks(d);
        uiUpdateDescription(d, null, null, null);
      })
      .on("mouseout", function() {
        uiHighlightHpoRow(null, d3.phylogram.highlightHpoRow);
        uiHighlightPhenoblocks(null);
        uiUpdateDescription(null, null, null, null);
      })

    list
      .transition()
      .attr("y", listPosY);

    list.exit()
      .remove();
  }

  my.setHighlight = function(d) {
    _g.select("g.overlay").selectAll("path")
      .remove("*")
      ;

    _g.select("g.overlay").selectAll("use")
      .remove("*")
      ;

    _svg.select("g.info").selectAll("text")
      .style("font-weight", 300)
      ;

    if (d) {
      var hlSet = filterByHpoId(d.attr.hpo, _data);

      // Highlight all leaf nodes
      // if (!d.isleaf) {
      //   var leafs = utils.getLeafNodes( d, 'children' );
      //   for (var i = 0, n = leafs.length; i < n; i++) {
      //     var l = leafs[i];
      //     hlSet = hlSet.concat( filterByHpoId(l.attr.hpo, _data) );
      //   }
      // }

      var hl = _g.select("g.overlay").selectAll("path")
        .data(hlSet);
      hl.enter()
        .append("path")
          .attr("d", _arc)
          .style("pointer-events", "none")
          .style("fill", "none")
          .style("stroke", "#333")
          ;

      var hl2 = _g.select("g.overlay").selectAll("use")
        .data(hlSet);
      hl2.enter()
        .append("use")
          .attr('xlink:href', '#arrow')
          .attr("transform", function(d) {
            // HACKY!
            var a = _arcEdge(d).split(" ")[6].split(",");
            //console.log(d.id, d.x)
            return ['translate(', parseFloat(a[0]), parseFloat(a[1]), ') rotate(', ((d.x+d.dx/2.0)*57.2958) ,')'].join(' ');   // Convert to degrees from radians
          })
          .style("pointer-events", "none")
          .style("fill", "#333")
          ;

      //console.log("text."+ hpoClass(d));
      var hl3 = _svg.select("g.info").selectAll("text."+ hpoClass(d))
        .style("font-weight", 400)
        ;
    }
  }

  // BUGGY
  // my.toggleHidden = function() {
  //   _hidden = !_hidden;

  //   var height = options.height || _options.height;
  //   if (_hidden) {
  //     height = options.labelHeight || _options.labelHeight;
  //   }

  //   _svg
  //     .transition()
  //     .attr("height", height)
  //     ;
  // }

  return my;
}
