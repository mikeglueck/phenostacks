if (!d3) { throw "d3 wasn't included!"};

d3.phenotypeIcons = function() {
  var iconStyle = 'fill';
  var iconBaseSize = 200;
  var iconDef = {
    'HP:0001438': {'empty': '\u0041', 'fill': '\u0042'},
    'HP:0001871': {'empty': '\u0043', 'fill': '\u0044'},
    'HP:0000769': {'empty': '\u0045', 'fill': '\u0046'},
    'HP:0001626': {'empty': '\u0047', 'fill': '\u0048'},
    'HP:0003549': {'empty': '\u0049', 'fill': '\u004a'},
    'HP:0000598': {'empty': '\u004b', 'fill': '\u004c'},
    'HP:0000818': {'empty': '\u004d', 'fill': '\u004e'},
    'HP:0000478': {'empty': '\u004f', 'fill': '\u0050'},
    'HP:0000119': {'empty': '\u0051', 'fill': '\u0052'},
    'HP:0001507': {'empty': '\u0053', 'fill': '\u0054'},
    'HP:0000152': {'empty': '\u0055', 'fill': '\u0056'},
    'HP:0002715': {'empty': '\u0057', 'fill': '\u0058'},
    'HP:0001574': {'empty': '\u0059', 'fill': '\u005a'},
    'HP:0040064': {'empty': '\u0061', 'fill': '\u0062'},
    'HP:0001939': {'empty': '\u0063', 'fill': '\u0064'},
    'HP:0003011': {'empty': '\u0065', 'fill': '\u0066'},
    'HP:0000707': {'empty': '\u0067', 'fill': '\u0068'},
    'HP:0001197': {'empty': '\u0069', 'fill': '\u006a'},
    'HP:0002086': {'empty': '\u006b', 'fill': '\u006c'},
    'HP:0000924': {'empty': '\u006d', 'fill': '\u006e'},
    'HP:0045027': {'empty': '\u006f', 'fill': '\u0070'},
    'HP:0001608': {'empty': '\u0071', 'fill': '\u0072'},
    'HP:0002664': {'empty': '\u0073', 'fill': '\u0074'}
  };
  
  var _options = {
    width: 0.5,
    height: 0.5
  };

  var _id = null;
  var _svg = null;
  var _g = null;

  var my = function() {}

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

  my.transform = function(selection, pos) {
    selection.attr("transform", function(d) { return ['translate(', (d.y+pos.dx), ' ', (d.x+pos.dy), ')'].join(''); });
  }

  my.letterFromHP = function(hpo_id, style) {
    return iconDef[hpo_id][style];
  }

  my.draw = function(selection, data, options) {
    var size = options.size || 50;
    var rad = size / 2.0;
    var scale = size / iconBaseSize;
    var offsetX = options.offsetX;
    var offsetY = options.offsetY;

    var pos = {
      'dx': offsetX,
      'dy': offsetY,
      'scale': scale
    }

    var icons = selection.selectAll('text.icon')
      .data(data, function(d) { return d.uuid; });

    icons.enter().append("text")
      .attr("class", 'icon')
      .attr("title", function(d) { return d.attr.name; })
      .attr("font-size", pos.scale * iconBaseSize)
      .attr("font-family", "PhenoIcons")
      .attr("dx", -pos.scale * iconBaseSize / 2.0)
      .attr("dy", pos.scale * iconBaseSize / 2.0)
      .call(my.transform, pos)
      .on("mouseover", function(d) {
        uiHighlightPhenoblocks(d);
        uiUpdateDescription(d, null, null, null);
      })
      .on("mouseout", function(d) {
        uiHighlightPhenoblocks(null);
        uiUpdateDescription(null, null, null, null);
      })
      .text(function(d) { return my.letterFromHP(d.id, iconStyle); })
      ;

    icons
      .transition()
      .call(my.transform, pos)
      ;

    icons
      .exit()
      .remove();
  }

  my.drawSet = function(selection, data, options) {
    var size = options.size || 50;
    var rad = size / 2.0;
    var scale = size / iconBaseSize;
    var offsetX = options.offsetX;
    var offsetY = options.offsetY;

    var pos = {
      'dx': offsetX,
      'dy': offsetY,
      'scale': scale
    }

    var icons = selection.selectAll('g.icon')
      .data(data, function(d) { return d.uuid; });

    icons.enter().append("g")
      .attr("class", "icon")
      .call(my.transform, pos)
      ;

    var set = selection.selectAll('g.icon').selectAll('text.icon')
      .data(function(d) { return d.attr.category; }, function(d, i) { return d.uuid + i; });

    set.enter().append('text')
      .attr("class", 'icon')
      .attr("title", function(d) { return d.attr.name; })
      .attr("font-size", pos.scale * iconBaseSize)
      .attr("font-family", "PhenoIcons")
      .attr("dx", -pos.scale * iconBaseSize / 2.0)
      .attr("dy", pos.scale * iconBaseSize / 2.0)
      .attr('transform', function(d, i) { return 'translate('+ (i*size) +" 0)"; })
      .attr("title", function(d) { return d.attr.name; })
      .on("mouseover", function(d) {
        uiHighlightPhenoblocks(d);
        uiUpdateDescription(d, null, null, null);
      })
      .on("mouseout", function(d) {
        uiHighlightPhenoblocks(null);
        uiUpdateDescription(null, null, null, null);
      })
      .text(function(d) { return my.letterFromHP(d.id, iconStyle); })
      ;

    icons
      .transition()
      .call(my.transform, pos)
      ;

    icons
      .exit()
      .remove();
  }
  
  return my;
}
