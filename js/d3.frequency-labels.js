if (!d3) { throw "d3 wasn't included!"};
if (!chroma) { throw "chroma wasn't included!"};

d3.frequencyLabels = function() {

  var _options = {
    width: 200,
    height: 100,
    offsetLayout: 300,
    offsetPhenos: 300,
    offsetFreq: 100,
    offsetY: 0,
    sort: function(a, b) { return d3.ascending(a.id, b.id); },
    formatter: function(d) { return d.id; }
  };

  var _id = null;
  var _svg = null;
  var _g = null;

  var _data = null;

  var _labelWidth = 10,
    _width,
    _height,
    _offsetLayout,
    _offsetPhenos,
    _offsetFreq,
    _offsetY,
    _formatter
    ;

  function stashPatientPosition( startX, startY ) {
    return function( d, i ) {
      d.x = startX + _labelWidth * i;
      d.y = startY;
    }
  }

  function styleHighlightCol( el ) {
    return el
      .attr("width", 12)
      .attr("height", _height)
      .attr("x", function(d) { return _offsetLayout + d.x - 6; })   //TODO get this from var
      .attr("y", function(d) { return d.y; })
      .attr("fill", "yellow")
      ;
  }

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
    var offsetLayout = options.offsetLayout || _options.offsetLayout;
    var offsetPhenos = options.offsetPhenos || _options.offsetPhenos;
    var offsetFreq = options.offsetFreq || _options.offsetFreq;
    var offsetY = options.offsetY || _options.offsetY;
    var formatter = options.formatter || _options.formatter;

    _id = id;
    _width = width;
    _height = height;
    _offsetLayout = offsetLayout;
    _offsetPhenos = offsetPhenos;
    _offsetFreq = offsetFreq;
    _offsetY = offsetY;
    _formatter = formatter;

    _svg = d3.select(selector).append("svg")
      .attr("width", width)
      .attr("height", height)
      ;

    var defs = _svg.append("defs");
    defs.append('polygon')
        .attr('points', '-5,0 0,-3 5,0')
        .attr('id', 'pointer')
        ;

    _g = _svg.append("g")
      .attr("id", id)
      .attr("class", "frequency-labels")
      ;

    _g.append("g")
      .attr("class", "underlay")
      ;

    _g.append("g")
      .attr("class", "chart")
      ;

    _g.append("g")
      .attr("class", "overlay")
      ;

    _g.append("g")
      .attr("class", "description")
      .attr("transform", "translate(15, 30)")
      ;

    return _g;
  }

  my.draw = function(data, options) {
    _data = data.pats;
    //console.log( _data );

    // Check valid number of cohorts
    if (_data.length < 1 || _data.length > 2) {
      console.error("Invalid number of COHORTS: expecting 1 or 2");
    }

    // Initialize options
    var sort = null;//options.sort || _options.sort;
    var offsetLayout = _offsetLayout; 
    var offsetPhenos = _offsetPhenos;
    var offsetFreq = _offsetFreq;
    var offsetY = _offsetY;


    // TODO: fix this hack
    //console.log(SORTPAT);
    switch(SORTPAT) {
      case 'id':
        sort = patientSortAlpha;
        break;
      case 'freq':
        sort = patientSortFreq;
        break;
      case 'cluster':
        sort = patientSortCluster;
        break;
      case 'clusterorder':
        sort = patientSortClusterOrder;
        break;
      default:
        sort = patientSortAttr(SORTPAT);
        break;
    }


    // Sort patients
    var cohorts = [];
    var startX = offsetPhenos;
    for (var i = 0, n = _data.length; i < n; i++) {
      _data[i].sort( sort );

      var cohort = {
        id: _data[i][0].cohort,
        startX: startX,
        formatter: _formatter[i] || _options.formatter
      };
      cohorts.push( cohort );

      _data[i].forEach( stashPatientPosition(cohort.startX, 0) );

      startX += _data[i].length * _labelWidth + offsetFreq;
    }


    var labels = _g.select("g.chart");
    labels
      .attr("transform", 'translate('+ offsetLayout +' '+ offsetY +')');

    for (var i = 0, n = cohorts.length; i < n; i++) {
      var cohort = cohorts[i];

      var cohortRectangles = labels.selectAll('rect.'+ cssclass(cohort.id))
        .data( _data[i], function(d) { return d.id +"cohort"+ cssclass(cohort.id); } );

      cohortRectangles.enter().append('rect')
        .attr("class", cssclass(cohort.id))
        .attr('width', 9)
        .attr('height', 120)
        .attr("transform", function(d) { return ['translate(', d.x-4.5, d.y-120, ')'].join(' '); })
        .style("fill", "#ddd")
        .style("opacity", 0.5)
        .on("mouseover", function(d) {
          uiHighlightPatientCol( d );
          uiUpdateDescription(null, d, null, data.hpMap);
        })
        .on("mouseout", function() {
          uiHighlightPatientCol( null );
          uiUpdateDescription(null, null, null, data.hpMap);
        })
        .on("click", function(d) {
          console.log( d );
        })
        ;

      cohortRectangles
        .transition()
        .attr("transform", function(d) { return ['translate(', d.x-4.5, d.y-115, ')'].join(' '); })
        ;

      cohortRectangles.exit()
        .remove();

      var cohortBackground = labels.selectAll('use.'+ cssclass(cohort.id))
        .data( _data[i], function(d) { return d.id +"cohort"+ cssclass(cohort.id); } );

      cohortBackground.enter().append('use')
        .attr("class", cssclass(cohort.id))
        .style("pointer-events", "none")
        .attr('xlink:href', '#pointer')
        .attr("transform", function(d) { return ['translate(', d.x, d.y, ')'].join(' '); })
        .style("pointer-events", "none")
        .style("fill", "#ccc")
        ;

      cohortBackground
        .transition()
        .attr("transform", function(d) { return ['translate(', d.x, d.y, ')'].join(' '); })
        ;

      cohortBackground.exit()
        .remove();


      var cohortLabels = labels.selectAll('text.label-patient.'+ cssclass(cohort.id))
        .data( _data[i], function(d) { return cssclass(d.id) +"cohort"+ cssclass(cohort.id); } );

      cohortLabels.enter().append('text')
        .attr("class", "label-patient "+ cssclass(cohort.id))
        .style("pointer-events", "none")
        .attr('transform', function(d) { return 'translate('+ d.x +' '+ d.y +') rotate(-90)'; })
        .attr("dx", 5)
        .attr("dy", 4)
        .text(cohort.formatter)
        ;

      cohortLabels
        .transition()
        .attr('transform', function(d) { return 'translate('+ d.x +' '+ d.y +') rotate(-90)'; })
        ;

      cohortLabels.exit()
        .remove();


      var attrNames = Object.keys(_data[i][0].attr).filter(function(a) { return (a !== 'clusterorder' && a !== 'cluster' && a !== 'aCount' && a !== 'pCount' && a !== 'uCount'); });
      var attrLabels = labels.selectAll('text.label-attr.'+ cssclass(cohort.id))
        .data( attrNames, function(a) { return "cohort"+ cssclass(cohort.id) + a; } );
        ;

      attrLabels.enter().append('text')
        .attr('class', function(a) { return ['label-attr', cssclass(cohort.id)].join(" "); })
        .style("pointer-events", "none")
        .attr('dy', 3)
        .attr('transform', function(a, k) { return ['translate(', _data[i][0].x-10, _data[i][0].y-105+k*10, ')'].join(" "); })
        .text( function(a) { return a; } )
        ;

      attrLabels
        .attr('transform', function(a, k) { return ['translate(', _data[i][0].x-10, _data[i][0].y-105+k*10, ')'].join(" "); })
        ;

      attrLabels.exit()
        .remove()
        ;

      // Draw attribute circles
      _data[i].forEach(function(p) {
        var cohortAttr = labels.selectAll('circle.attr.'+ cssclass(cohort.id) +'.'+ cssclass(p.id, 'pat'))
          .data( attrNames, function(a) { return 'attr'+a+cssclass(p.id) + cssclass(cohort.id); })
          ;

        cohortAttr.enter().append('circle')
          .attr('class', function(a) { return ['attr', cssclass(cohort.id), cssclass(p.id, 'pat')].join(" "); })
          //.style("pointer-events", "none")
          .attr('title', function(a) { return a +': '+ mapUnknownValues(p.attr[a]); })
          .attr('r', 3.5)
          .attr('transform', function(a, k) { return ['translate(', p.x, p.y-105+k*10, ')'].join(" "); })
          .attr("fill", my.formatFill(p, _data[i], attrNames))
          .attr("stroke", my.formatStroke(p, _data[i], attrNames))
          .on("mouseover", function() {
            uiHighlightPatientCol( p );
            uiUpdateDescription(null, p, null, data.hpMap);
          })
          .on("mouseout", function() {
            uiHighlightPatientCol( null );
            uiUpdateDescription(null, null, null, data.hpMap);
          })
          .on("click", function(d) {
            console.log( d );
          })
          ;
        cohortAttr
          .transition()
          .attr('transform', function(a, k) { return ['translate(', p.x, p.y-105+k*10, ')'].join(" "); })
          ;
        cohortAttr
          .exit()
          .remove();
      });

    }
  }

  my.formatFill = function(patient, patients, attrNames) {
    var attrMax = {};

    patients.forEach(function(p) {
      attrNames.forEach(function(a) {
        if (!isNaN(parseFloat(p.attr[a]))) {
          p.attr[a] = parseFloat(p.attr[a]);
        }
        if (!(a in attrMax)) {
          attrMax[a] = 0;
        }
        if (p.attr[a] > attrMax[a]) {
          attrMax[a] = p.attr[a];
        }
      })
    });

    if (('Age' in attrMax) && attrMax['Age'] == 88) {
      attrMax['Age'] = 15;
    }

    return function(a) {
      var c = "#eee";

      // No data
      if ((!(a in patient.attr)) || patient.attr[a].length == 0) {
        return c;
      }

      if ( isNaN(parseFloat(patient.attr[a])) ) {
        // String data
        switch(patientAttrMap(patient.attr[a])) {
          case 2:
            c = "#606060";
            break;
          case 1:
            c = "#8F8F8F";
            break;
          case 0:
            c = "#ccc";
            break;
          case -1:
            c = "#eee";
            break;
          default:
            c = "#8F8F8F"
            break;
        }

      } else {
        // Numeric data
        if (a in attrMax && attrMax[a] >= 0) {
          var v = Math.min(1, patient.attr[a] / attrMax[a]);
        
          if (v >= 0.667) {
            c = "#606060";
          } else if (v >= 0.334) {
            c = "#8F8F8F";
          } else if (v >= 0) {
            c = "#ccc";
          }
        }
      }

      return c;
    }
  }

  my.formatStroke = function(patient, patients, attrNames) {
    var attrMax = {};

    patients.forEach(function(p) {
      attrNames.forEach(function(a) {
        if (!isNaN(parseFloat(p.attr[a]))) {
          p.attr[a] = parseFloat(p.attr[a]);
        }
        if (!(a in attrMax)) {
          attrMax[a] = 0;
        }
        if (p.attr[a] > attrMax[a]) {
          attrMax[a] = p.attr[a];
        }
      })
    });

    if (('Age' in attrMax) && attrMax['Age'] == 88) {
      attrMax['Age'] = 15;
    }


    return function(a) {
      var c = "#ddd";

      // No data
      if ((!(a in patient.attr)) || patient.attr[a].length == 0) {
        return c;
      }

      if ( isNaN(parseFloat(patient.attr[a])) ) {
        // String data
        switch(patientAttrMap(patient.attr[a])) {
          case 2:
            c = "#505050";
            break;
          case 1:
            c = "#7F7F7F";
            break;
          case 0:
            c = "#bbb";
            break;
          case -1:
            c = "#ddd";
            break;
          default:
            c = "#7F7F7F"
            break;
        }

      } else {
        // Numeric data
        if (a in attrMax && attrMax[a] >= 0) {
          var v = Math.min(1, patient.attr[a] / attrMax[a]);
        
          if (v >= 0.667) {
            c = "#505050";
          } else if (v >= 0.334) {
            c = "#7F7F7F";
          } else if (v >= 0) {
            c = "#bbb";
          }
        }
      }
      return c;
    }
  }

  my.setHighlight = function( hlSet ) {
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

  my.formatState = function(state) {
    switch(state) {
      case 'present':
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'unknown':
        return 'Unknown';
      case 'presentanc':
        return 'Present (Ancestor)';
      case 'absentanc':
        return 'Absent (Ancestor)';
    }
  }

  my.updateDescription = function(hp, patient, phenotype, hpMap) {
    // Clear
    var block = _g.select("g.description");
    block.selectAll("text").remove();
    block.selectAll("circle").remove();

    var cMap = {
      'C1': 0,
      'C2': 1
    }

    var descr = block.append("text")
      .attr('class', 'description');

    var phenoOffset = 0;
    var patientOffset = 300;
    var yOffset = 0;

    if (hp) {
      var phenoDescr = descr.append("tspan")
        .attr("class", "description-phenotype")
        .attr('x', phenoOffset)
        .attr('y', yOffset)
        ;

      var phenoName = hp.attr.name;
      var phenoHpo = hp.attr.hpo;
      var phenoIc = hp.attr.ic_base;
      var state = null;

      if (phenotype) {
        state = d3.phylogram.getFreqState(patient.id, phenotype)

        var anc = null;
        if (state === 'presentanc' || state === 'absentanc') {
          anc = [];
          var aid = d3.phylogram.getPresentAncestor(patient, hp.attr.hpo, phenotype);
          anc.push( hpMap[aid].name );
          anc.push( aid );
          anc.push( hpMap[aid].ic_base );
        }
        
        if (anc && anc.length > 0) {
          phenoName = anc[0];
          phenoHpo = anc[1];
          phenoIc = anc[2];
        }
      }

      phenoDescr.append("tspan")
        .attr('class', 'descr-pheno-label')
        .attr('x', phenoOffset)
        .attr('y', yOffset)
        .text('PHENOTYPE')
        ;

      var phenoNameSplit = wordWrapString(phenoName, 25);
      phenoNameSplit.forEach(function(t, i) {
        yOffset += 16;
        phenoDescr.append("tspan")
          .attr('class', 'descr-pheno-name')
          .attr('x', phenoOffset)
          .attr('y', yOffset)
          .text(t)
          ;
      });

      yOffset += 14;
      var captions = phenoDescr.append("tspan")
        .attr('class', 'descr-pheno-caption')
        .attr('x', phenoOffset)
        .attr('y', yOffset)
        ;
      captions.append('tspan')
        .attr('class', 'descr-pheno-caption-id')
        .attr('x', phenoOffset)
        .text(phenoHpo)
        ;
      captions.append("tspan")
        .attr('class', 'descr-pheno-caption-ic')
        .attr('dx', 5)
        .text('(')
        ;
      block.append("circle")
        .attr('r', 4)
        .attr('cx', phenoOffset+63)
        .attr('cy', yOffset-4)
        .attr('fill', HPOCOLOR(phenoIc/MAX_IC))
        ;
      captions.append("tspan")
        .attr('class', 'descr-pheno-caption-ic')
        .attr('dx', 10)
        .text(phenoIc.toFixed(2) +')')



      if (state) {
        yOffset += 25;
        block.append("circle")
          .attr('class', 'freq '+ state)
          .attr('r', 4)
          .attr('cx', phenoOffset+5)
          .attr('cy', yOffset-5)
          ;
        var observation = phenoDescr.append("tspan")
          .attr('class', 'descr-pheno-obs')
          .attr('x', phenoOffset)
          .attr('y', yOffset)
          ;
        observation.append('tspan')
          .attr('class', 'descr-pheno-obs-name')
          //.attr('text-anchor', 'end')
          .attr('x', phenoOffset+15)
          .text('Observed')
          ;
        observation.append("tspan")
          .attr('class', 'descr-pheno-obs-value')
          .attr('dx', 5)
          .text(my.formatState(state))
          ;
      }
    }


    if (patient) {
      yOffset = 0;

      var attr = Object.keys(patient.attr).filter(function(a) { return (a !== 'clusterorder' && a !== 'cluster' && a !== 'aCount' && a !== 'pCount' && a !== 'uCount'); });
      var attrDescr = attr.map(function(a) { return [a, patient.attr[a]]; });

      var patientDescr = descr.append("tspan")
        .attr("class", "description-patient")
        .attr('x', patientOffset)
        .attr('y', yOffset)
        ;

      patientDescr.append("tspan")
        .attr('class', 'descr-patient-label')
        .attr('x', patientOffset)
        .attr('y', yOffset)
        .text('PATIENT')
        ;

      yOffset += 16;
      patientDescr.append("tspan")
        .attr('class', 'descr-patient-name')
        .attr('x', patientOffset)
        .attr('y', yOffset)
        .text(patient.id)
        ;

      yOffset += 14;
      var captions = patientDescr.append("tspan")
        .attr('class', 'descr-patient-caption')
        .attr('x', patientOffset)
        .attr('y', yOffset)
        ;
      captions.append("tspan")
        .attr('class', 'descr-patient-caption-cohort')
        .attr('dx', 0)
        .text('Cohort '+ patient.cohort)
        ;

      yOffset += 25;
      var attributes = patientDescr.append("tspan")
        .attr('class', 'descr-pheno-obs')
        .attr('x', patientOffset)
        .attr('y', yOffset)
        ;
      attrDescr.forEach(function(a, i) {
        block.append("circle")
          .attr('r', 4)
          .attr('cx', patientOffset+5)
          .attr('cy', yOffset+12*i-5)
          .attr("fill", my.formatFill(patient, _data[cMap[patient.cohort]], [a[0]])(a[0]))
          .attr("stroke", my.formatStroke(patient, _data[cMap[patient.cohort]], [a[0]])(a[0]))
          ;
        attributes.append('tspan')
          .attr('class', 'descr-patient-attr-name')
          //.attr('text-anchor', 'end')
          .attr('x', patientOffset+15)
          .attr('y', yOffset+12*i)
          .text(a[0])
          ;
        attributes.append("tspan")
          .attr('class', 'descr-patient-attr-value')
          .attr('dx', 5)
          .attr('y', yOffset+12*i)
          .text(mapUnknownValues(a[1]))
          ;
      });
    }
  }

  return my;
}
