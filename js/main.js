      var vis, nodes, options;
      var SORT = 'ic';
      var SORTPAT = 'id';
      var CUTOFF = 2;
      var DENSITY = 4;
      var FILTEREMPTY = false;

      var MAX_IC = 0;
      var MAX_DEPTH = 0;

      var FREQUENCYIC = 1.0;

      var newData, newStructure, newPat, newPhe;
      var HPO, PATA, PATB, PHENO, PHENO2;


//var HPOCOLOR = chroma.scale(['#cab2d6', '#6a3d9a']);
//var HPOCOLOR = chroma.scale(['#ffffff', '#6a3d9a']);
var HPOCOLOR = chroma.scale(['#ffffff', '#505050']);
// var cPurple = chroma('#5c3267'); //chroma('#5a4aa6');
// var cYellow = chroma('gold');
// var HPOCOLOR = chroma.scale([cYellow, cPurple]).mode('lch');
//HPOCOLOR.mode('lch');
//HPOCOLOR.domain([0,5,10,15]);  // NOT WORKING
HPOCOLOR.domain([0,1], 5);  // NOT WORKING

// for (var i = 0; i <= 15; i+=0.5) {
//   console.log(HPOCOLOR(i).hex());
// }


      var searchList = [];
      var searchListLeafNodes = [];
      var searchListPatientNodes = [];
      var offsets = [0,0];

      // Search for all nodes in HPO (visible or collapsed)
      var searchListNodes = [];

      // Store dataset globally
      var _dataStore = null;

      var registeredVis = [];

      var _frequencyLabels = null;

      function initPhenoblocks(pbs) {
        for (var i = 0, n = pbs.length; i < n; i++) {
          var pb = d3.phenoblocks();
          pb.init('#summary-panel', pbs[i]);
          registeredVis.push(pb);
        }         
      }

      function drawPhenoblocks(density, cutoff) {
        _dataStore.struct.collapseTree( density, cutoff );
        for (var i = 0, n = registeredVis.length; i < n; i++) {
          registeredVis[i].draw(_dataStore.struct.getFilteredTree());
        }
      }


      function load() {
        var dataname = getParameterByName('data');

        var encoded = {
          "flhs": "Floating Harbor",
          "miccap": "Microcephaly-Capillary",
          "hjcys": "Hajdu-Cheney",
          "jbts17": "Joubert",
          // "cmcs": "Chudley-McCullough",
          // "mfdga": "Mandibulofacial Dysostosis",
          "cmcs-mfdga": "CMCS v. MFDGA",
          // "flhs-miccap": "FLHS v. MICCAP"
        }

        var filenames = {
          "flhs": "./data/cohort_flhs.json",
          "miccap": "./data/cohort_miccap.json",
          "hjcys": "./data/cohort_hjcys.json",
          "jbts17": "./data/cohort_jbts17.json",
          // "cmcs": "./data/cohort_cmcs.json",
          // "mfdga": "./data/cohort_mfdga.json",
          "cmcs-mfdga": "./data/cohort_cmcs-mfdga.json",
          // "flhs-miccap": "./data/cohort_flhs-miccap.json"
        }

        if (!(dataname in filenames)) {
          dataname = 'flhs';
          console.warn("Data parameter missing/invalid, loading default: "+ dataname);
        }

        var links = Object.keys(filenames).map(function (d) { return '<a href="./?data='+ d +'">'+ d.toUpperCase() +'</a>'});
        $('#dataset-links').append( links.join(', ') );
        $("#dataset-name").text( "Dataset: " + encoded[dataname].toUpperCase());

        var filename = filenames[dataname];

        d3.json(filename, function(error, cohortData) {

          if (error) return console.warn(error);

          var cohortMap = {};
          for (var i = 0, n = cohortData.cohorts.length; i < n; i++) {
            var p = cohortData.cohorts[i][0];
            cohortMap[p.cohort] = i;
          }

          // TODO:
          // Cohorts and Phenotypes should be dicts, not arrays, with an "order" array attribute to denote order
          // Additional attributes as well
          // Patient list and phenotype lists should be attributes of this Cohort object
          // Need nicer way to integrate mapping of which presentanc are inherited from what
          var treeFilter = new TreeFilter( cohortData.structure, {'childrenAttr': 'branchset'} );
          _dataStore = {
            'struct': treeFilter,
            'pats': cohortData.cohorts,
            'phenos': cohortData.phenotypes,
            'cohortMap': cohortMap,
            'hpMap': cohortData.allPhenotypes//treeFilter.nodes
          }

          PATA = _dataStore.pats[0];
          PATB = _dataStore.pats[1];
          PHENO = _dataStore.phenos[0];
          PHENO2 = _dataStore.phenos[1];

          //_dataStore.struct.calcFreq( [PHENO, PHENO2], [PATA.length, PATB.length] );
          _dataStore.struct.calcMaxIc();
          MAX_IC = _dataStore.struct.maxIC();
          MAX_DEPTH = _dataStore.struct.maxDepth();
          console.log("MAXIC:", MAX_IC, "MAXDEPTH", MAX_DEPTH);

          $("#sld-tree-compress").slider({'max': MAX_DEPTH});

          // Update interface options
          initSortPhenotypeOptions( (_dataStore.pats.length > 1) );
          var sortCohortOptions = [];
          var cohortFormatter = [];
          for (var i = 0, n = _dataStore.pats.length; i < n; i++) {
            var attr = Object.keys(_dataStore.pats[i][0].attr).filter(function(a) { return (a !== 'clusterorder' && a !== 'cluster' && a !== 'aCount' && a !== 'pCount' && a !== 'uCount'); });
            sortCohortOptions = sortCohortOptions.concat( attr.map(function(d) { return {'attr': d, 'name': d}; }) );
            cohortFormatter.push( (function(attr) {
              //return function(d) { return d.id +" ("+ attr.map(function(a) { return d.attr[a] +" "+ a; }).join(" / ") +")"; };
              return function(d) { return d.id; };
            })(attr));
          }
          //console.log( sortCohortOptions );
          initSortCohortsOptions( uniqueValuesObject(sortCohortOptions, 'attr') );

          // PhenoBlocks data
          var pbRad = 100;

          if (_dataStore.pats.length == 2) {
            initPhenoblocks([
              {'id': 'phenoblocks-simp', 'title': 'Similar Present', 'compare': true, 'type': 'simp', 'radius': pbRad, 'width': 335, 'height': 270}, 
              {'id': 'phenoblocks-diffp', 'title': 'Different Present', 'compare': true, 'type': 'diffp', 'radius': pbRad, 'width': 335, 'height': 270}, 
              {'id': 'phenoblocks-sima', 'title': 'Similar Absent', 'compare': true, 'type': 'sima', 'radius': pbRad, 'width': 335, 'height': 270},
              {'id': 'phenoblocks-diffa', 'title': 'Different Absent', 'compare': true, 'type': 'diffa', 'radius': pbRad, 'width': 335, 'height': 270},
              //{'id': 'phenoblocks-sim', 'title': 'Notable Similarities', 'compare': true, 'type': 'sim', 'radius': pbRad, 'width': 335, 'height': 270}, 
              //{'id': 'phenoblocks-diff', 'title': 'Notable Differences', 'compare': true, 'type': 'diff', 'radius': pbRad, 'width': 335, 'height': 270},
              {'id': 'phenoblocks-outliers', 'title': 'Potential Outliers', 'compare': true, 'type': 'outliers', 'radius': pbRad, 'width': 335, 'height': 270},
              {'id': 'phenoblocks-entropy', 'title': 'Present/Absent Disagreement', 'compare': true, 'type': 'entropy', 'radius': pbRad, 'width': 335, 'height': 270}
              ]);
          
          } else {
            initPhenoblocks([
              {'id': 'phenoblocks-freqp', 'title': 'Frequently Present', 'compare': false, 'type': 'freqp', 'radius': pbRad, 'width': 335, 'height': 270}, 
              {'id': 'phenoblocks-infreqp', 'title': 'Infrequently Present', 'compare': false, 'type': 'infreqp', 'radius': pbRad, 'width': 335, 'height': 270},
              {'id': 'phenoblocks-freqa', 'title': 'Frequently Absent', 'compare': false, 'type': 'freqa', 'radius': pbRad, 'width': 335, 'height': 270}, 
              {'id': 'phenoblocks-infreqa', 'title': 'Infrequently Absent', 'compare': false, 'type': 'infreqa', 'radius': pbRad, 'width': 335, 'height': 270},
              {'id': 'phenoblocks-outliers', 'title': 'Potential Outliers', 'compare': false, 'type': 'outliers', 'radius': pbRad, 'width': 335, 'height': 270},
              {'id': 'phenoblocks-entropy', 'title': 'Present/Absent Disagreement', 'compare': false, 'type': 'entropy', 'radius': pbRad, 'width': 335, 'height': 270}
              ]);
          }
          drawPhenoblocks( 10, 15 );

          //_dataStore.struct.collapseTree( DENSITY, CUTOFF );
          var data = getFilteredData(_dataStore);

          _frequencyLabels = d3.frequencyLabels();
          _frequencyLabels.init('#labels-panel', {
            'id': 'frequency-labels',
            'width': 2000,
            'height': 140,
            'offsetLayout': 305,
            'offsetPhenos': 260,
            'offsetFreq': 115,
            'offsetY': 135,
            'formatter': cohortFormatter
          });
          _frequencyLabels.draw(data, {
            //'sort': function(a, b) { return d3.ascending(a.id, b.id); }
          });

          // Add tooltips to attribute circles
          $("circle.attr").tooltipster({
            'animation': 'fade',
            'offsetX': -7,
            'offsetY': -7,
            'speed': 250,
            'delay': 250,
            'position': 'top-left'
          });

          options = {
            width: 2000,
            height: 1200,
            skipLabels: false,
            skipBranchLengthScaling: true
          };

          var ret = d3.phylogram.init('#phylogram', data, options);

          vis = ret['vis'];
          offsets = ret['offsets'];

          searchListLeafNodes = utils.getLeafNodes( data.struct, "children" );
          //console.log( searchListLeafNodes.length, searchListLeafNodes)
          // searchListNodes = utils.getUniqueNodes( data.struct, "children" );
          // console.log( searchListNodes.length, searchListNodes);

          searchListPatientNodes = {
            'C1': _dataStore.pats[0],
            'C2': _dataStore.pats[1]
          };
           
          $('#search-input').on("input", function() {
            uiHighlightHpoByName( $(this).val(), uiShowSearchResults );
          });

          //renderWordFrequencies();
          //renderWordCloud();

          //renderTrends();

          // $('use.icon').tooltipster({
          //   'animation': 'fade',
          //   'offsetX': -4,
          //   'offsetY': -7,
          //   'speed': 250,
          //   'delay': 250,
          //   'position': 'top-left'
          // });

          // $('circle.node').tooltipster({
          //   'animation': 'fade',
          //   'offsetX': -4,
          //   'offsetY': -7,
          //   'speed': 250,
          //   'delay': 250,
          //   'position': 'top-left'
          // });

          $("#btn-layout-cats").click();
          $("#btn-filter-empty").click();

        });
       
      }

function renderWordCloud() {
  var wordFreq = getWordFrequencies();
  var scalar = 50;

  var maxC1 = d3.max(wordFreq['c1'].map(function(d) { return d[1]; }))
  var wordsC1 = wordFreq['c1'].map(function(d) { return {'text':d[0], 'size':d[1]/maxC1*scalar}; });
  drawWordCloud( "#word-cloud-c1", wordsC1 );

  var maxC2 = d3.max(wordFreq['c2'].map(function(d) { return d[1]; }))
  var wordsC2 = wordFreq['c2'].map(function(d) { return {'text':d[0], 'size':d[1]/maxC2*scalar}; });
  drawWordCloud( "#word-cloud-c2", wordsC2 );

  var maxBoth = d3.max(wordFreq['both'].map(function(d) { return d[1]; }))
  var wordsBoth = wordFreq['both'].map(function(d) { return {'text':d[0], 'size':d[1]/maxBoth*scalar}; });
  drawWordCloud( "#word-cloud-both", wordsBoth );

  var maxDiff = d3.max(wordFreq['diff'].map(function(d) { return d[1]; }))
  var wordsDiff = wordFreq['diff'].map(function(d) { return {'text':d[0], 'size':d[1]/maxDiff*30}; });
  drawWordCloud( "#word-cloud-diff", wordsDiff );
}

function renderTrends() {
  var trends = calculateTrends();

  // for (var i in diffList) {
  //   if (diffList[i].present >= 0.35) {
  //     console.log( i, diffList[i].present );
  //   }
  // }

  // TODO: is 0.35 a good cut off?  this should be user controlled.  Can we say anything more about how much of an outlier this term is?

  var present = [];
  var absent = [];
  for (var i in trends) {
    //if (trends[i].presentscore >= 0.35) {
      present.push( {'hpo': i, 'name': trends[i].name, 'c1': trends[i].present.c1, 'c2': trends[i].present.c2, 'score': trends[i].presentscore} );
    //}
    //if (trends[i].absentscore >= 0.35) {
      absent.push( {'hpo': i, 'name': trends[i].name, 'c1': trends[i].absent.c1, 'c2': trends[i].absent.c2, 'score': trends[i].absentscore} );
    //}
  }

  console.log(present.length, absent.length);

  var sorter = function(a, b) {
    return d3.descending(a.score, b.score);
  }

  present.sort(sorter);
  absent.sort(sorter);

  presentFreq = d3.select("#freq-diff-present").selectAll("li")
    .data( present, function(d) { return d.hpo; } );
  presentFreq.enter()
    .append("li")
      .text(function(d) { return "[C1: "+ d.c1.toFixed(2) +" / C2: "+ d.c2.toFixed(2) +"] " + d.name; })
      .on("click", function(d) {
        uiSearchQuery( d.name );
      })
      ;

  absentFreq = d3.select("#freq-diff-absent").selectAll("li")
    .data( absent, function(d) { return d.hpo; } );
  absentFreq.enter()
    .append("li")
      .text(function(d) { return "[C1: "+ d.c1.toFixed(2) +" / C2: "+ d.c2.toFixed(2) +"] " + d.name; })
      .on("click", function(d) {
        uiSearchQuery( d.name );
      })
      ;


}

function renderWordFrequencies() {
  var wordFreq = getWordFrequencies();

  var wordsAll = d3.select("#word-freq-all").selectAll("span").data( wordFreq['all'].filter(function(d) { return d[1] > 1; } ) );
  wordsAll.enter().append("span")
    .style("font-size", "10px")
    .text(function(d) { return d[0] +"("+ d[1] +") "; })
    .on("click", function(d) {
      //console.log(d);
      uiHighlightHpoByName( d[0], uiShowSearchResults );
    })
    ;

  var wordsBoth = d3.select("#word-freq-both").selectAll("span").data( wordFreq['both'].filter(function(d) { return d[1] > 1; } ) );
  wordsBoth.enter().append("span")
    .style("font-size", "10px")
    .text(function(d) { return d[0] +"("+ d[1] +") "; })
    .on("click", function(d) {
      //console.log(d);
      uiHighlightHpoByName( d[0], uiShowSearchResults );
    })
    ;

  var wordsC1 = d3.select("#word-freq-c1").selectAll("span").data( wordFreq['c1'].filter(function(d) { return d[1] > 1; } ) );
  wordsC1.enter().append("span")
    .style("font-size", "10px")
    .text(function(d) { return d[0] +"("+ d[1] +") "; })
    ;

  var wordsC2 = d3.select("#word-freq-c2").selectAll("span").data( wordFreq['c2'].filter(function(d) { return d[1] > 1; } ) );
  wordsC2.enter().append("span")
    .style("font-size", "10px")
    .text(function(d) { return d[0] +"("+ d[1] +") "; })
    ;

  var wordsDiff = d3.select("#word-freq-diff").selectAll("span").data( wordFreq['diff'].filter(function(d) { return d[1] > 1; } ) );
  wordsDiff.enter().append("span")
    .style("font-size", "10px")
    .text(function(d) { return d[0] +"("+ d[1] +") "; })
    ;
}


function uiHighlightHpoLabel( highlightSet ) {
  vis.selectAll("text")   // TODO: use class, can find only highlighted
    .attr("font-weight", null);

  vis.selectAll("circle")   // TODO: use class, can find only highlighted
    .attr("stroke-width", 1);

  var hlSetUnique = uniqueValuesObject(highlightSet, "name");

  for (var i = hlSetUnique.length - 1; i >= 0; i--) {
    var selector = "text." + hpoClass(hlSetUnique[i]);
    vis.selectAll( selector )
      .attr("font-weight", "bold");

    selector = "circle." + hpoClass(hlSetUnique[i]);
    vis.selectAll( selector )
      .attr("stroke-width", 2.0);
  }

  //console.log( highlightSet.length );

  d3.phylogram.highlightSearchResults( highlightSet );
}

function uiShowSearchResults( highlightSet ) {
  // List unique results under search box
  var results = d3.select("#search-results").selectAll("a")
    .data(highlightSet, function(d) { return "searchResult"+hpoClass(d)+Math.random(); });

  results.enter()
    .append("a")
      .attr("class", "list-group-item small")
      .attr("href", "#")
      .html(function(d) { return d.highlight; })
      .on("click", function(d) {
        uiSearchQuery( d.name );
      })
      .on("mouseover", function(d) {
        uiHighlightHpoRow(d);
      })
      .on("mouseout", function() {
        uiHighlightHpoRow(null);
      })
      ;

  results.exit()
    .remove();
}

function uiHighlightHpoByName( name, callback ) {
  // Based on search term, find matches in data
  var hlSet = checkSearchMatches( name, searchListLeafNodes );

  // Autoscroll
  if (hlSet.length > 0) {
    // Scroll to top match
    var moveTo = Math.abs(offsets['min'] - hlSet[0].x) - 200;
    $("#chart-panel").stop().animate({ scrollTop: moveTo }, 500, "linear");  // TODO: better easing function
  }

  uiHighlightHpoLabel( hlSet );
  
  var hlSetUnique = uniqueValuesObject(hlSet, "name");
  callback( hlSetUnique );
}

function uiHighlightPhenoblocks( node ) {
  for (var i = registeredVis.length-1; i >= 0; i--) {
    registeredVis[i].setHighlight(node);
  }
}

function uiHighlightHpoRow( node ) {
  hlSet = [];

  if (node) {
  // Extract name from node, call search
    hlSet = filterByHpoId( node.attr.hpo, searchListLeafNodes );
  }

  d3.phylogram.highlightHpoRow( hlSet );
}

function uiHighlightPatientCol( patient, callback ) {
  hlSet = [];

  if (patient) {
  // Extract name from node, call search
    hlSet = filterByPatientId( patient.id, searchListPatientNodes[patient.cohort] );
  }
  
  d3.phylogram.highlightPatientCol( hlSet );
  _frequencyLabels.setHighlight( hlSet );
}

function filterByHpoId( needle, searchList ) {
  var matches = [];

  for (var i = searchList.length - 1; i >= 0; i--) {
    if (searchList[i].attr.hpo === needle) {
      matches.push( searchList[i] );
    }
  }

  return matches;
}

function filterByPatientId( needle, searchList ) {
  var matches = [];

  for (var i = searchList.length - 1; i >= 0; i--) {
    if (searchList[i].id === needle) {
      matches.push( searchList[i] );
    }
  }

  return matches;
}

function checkSearchMatches( search, searchList ) {
  var matches = [];

  var needles = search.split(/\s+/);  // tokenize search string
  //console.log(needles);

  if (needles[0].length < 1) {  // must be at least one valid needle
    return matches;
  }

  //var reTest = needles.map(function(d) { return '(?=.*' + d + ')'; });  // match all tokens in string
  //reTest = "^.*"+reTest.join('')+".*$";

  var reTest = needles.map(function(d) { return '(?=.*' + d + ')'; }).join('');  // match all tokens in string

  var re1 = new RegExp(reTest, "ig");

  var reRep = '('+needles.join('|')+')';
  var re2 = new RegExp(reRep, "ig");

  for (var i = searchList.length - 1; i >= 0; i--) {
    if (re1.test(searchList[i].name)) {
      searchList[i].highlight = searchList[i].name.replace(re2, '<span style="font-weight:bold;">$1</span>');
      matches.push( searchList[i] );
    }
  }

  return matches;
}


// var str   = 'asd-0.testing';
// var regex = /(asd-)\d(\.\w+)/;
// str = str.replace(regex, "$11$2");
// console.log(str);


function calculateTrends() {
  /* calculate most similar and most different HPOs */
  var hpoList = uniqueValuesObject(searchListLeafNodes, "id").map(function(d) { return {"hpo": d.attr.hpo, "name": d.attr.name}; });

  var diffList = {};
  for (var i = hpoList.length - 1; i >= 0; i--) {
    var hpo = hpoList[i].hpo;

    var comp1 = {'present':[], 'absent':[]};
    var comp2 = {'present':[], 'absent':[]};

    if (PHENO[hpo]) {
      comp1 = PHENO[hpo];
    }
    if (PHENO2[hpo]) {
      comp2 = PHENO2[hpo];
    }

    var c1pres = comp1['present'].length/PATA.length;
    var c2pres = comp2['present'].length/PATB.length;
    var c1abs = comp1['absent'].length/PATA.length;
    var c2abs = comp2['absent'].length/PATB.length;

    diffList[hpo] = {
      'name': hpoList[i].name,
      'present': {'c1': c1pres, 'c2': c2pres},
      'absent': {'c1': c1abs, 'c2': c2abs},
      'presentscore': Math.abs(c1pres - c2pres),
      'absentscore': Math.abs(c1abs - c2abs)
    };
  }

  return diffList;
}

function getWordFrequencies() {
  var hpoList = uniqueValuesObject(searchListLeafNodes, "id").map(function(d) { return {"hpo": d.attr.hpo, "name": d.attr.name, 'ic': d.attr.ic_base}; });

  // Scale by IC?  Scale by ratio of patients?  Or cut-off?
  // Input params: at least one/at least %
  // EG: amyotrophy C1, respiratory C2
  // Stemmer: https://github.com/jedp/porter-stemmer, https://github.com/kristopolous/Porter-Stemmer
  var wordFreqAll = {};
  var wordFreqBoth = {};
  var wordFreqC1 = {};
  var wordFreqC2 = {};
  var wordFreqDiff = {};
  var minOccur = 1;
  var weightIC = true;
  var weightFreq = false;  // Frequency weight blows out outliers, because they do not occur with high frequency; want to boost these?

  for (var i = hpoList.length - 1; i >= 0; i--) {
    var hpo = hpoList[i].hpo;
    var name = hpoList[i].name;
    var tokens = name.trim().split(' ').map(function(d) { return d.toLowerCase(); });
    tokens = filterStopWords(tokens);
    tokens = tokens.map(function(d) { return stemmer(d, false); });//{ return {'word': d, 'stem': stemmer(d, false)}; });

    var wIC = 1.0;
    if (weightIC) {
      wIC = hpoList[i].ic / 15.0;   // This needs to be a parameter...
    }
    var wC1 = 1.0;
    var wC2 = 1.0;
    var wAll = 1.0;
    if (weightFreq) {
      // wC1 = (hpo in PHENO) ? PHENO[hpo].present.length/PATA.length : 0;
      // wC2 = (hpo in PHENO2) ? PHENO2[hpo].present.length/PATB.length : 0;
      wC1 = (hpo in PHENO) ? PATA.length/PHENO[hpo].present.length : 0;  // Inverse, to boost outliers?
      wC2 = (hpo in PHENO2) ? PATB.length/PHENO2[hpo].present.length : 0;
    }

    for (var k = tokens.length - 1; k >= 0; k--) {
      var token = tokens[k];

      if (PHENO[hpo] && PHENO2[hpo] && PHENO[hpo].present.length >= minOccur && PHENO2[hpo].present.length >= minOccur) {
        if (!(token in wordFreqBoth)) {
          wordFreqBoth[token] = 0;
        }
        wordFreqBoth[token] += 1 * wIC;
      }

      if ((PHENO[hpo] && PHENO[hpo].present.length >= minOccur) || (PHENO2[hpo] && PHENO2[hpo].present.length >= minOccur)) {
        if (!(token in wordFreqAll)) {
          wordFreqAll[token] = 0;
        }
        wordFreqAll[token] += 1 * wIC;
      }

      if (PHENO[hpo] && PHENO[hpo].present.length >= minOccur) {
        if (!(token in wordFreqC1)) {
          wordFreqC1[token] = 0;
        }
        wordFreqC1[token] += 1 * wIC * wC1;
      }

      if (PHENO2[hpo] && PHENO2[hpo].present.length >= minOccur) {
        if (!(token in wordFreqC2)) {
          wordFreqC2[token] = 0;
        }
        wordFreqC2[token] += 1 * wIC * wC2;
      }
    }
  }

  // Calculate differences
  for (var token in wordFreqAll) {
    var c1Count = (token in wordFreqC1) ? wordFreqC1[token] : 0;
    var c2Count = (token in wordFreqC2) ? wordFreqC2[token] : 0;
    var diff = Math.abs(c1Count - c2Count);

    wordFreqDiff[token] = diff;
    //console.log(token, c1Count, c2Count, diff);
  }

  var wordsBoth = getSortedKeys(wordFreqBoth);//.slice(0,7);
  var wordsAll = getSortedKeys(wordFreqAll);
  var wordsC1 = getSortedKeys(wordFreqC1);
  var wordsC2 = getSortedKeys(wordFreqC2);
  var wordsDiff = getSortedKeys(wordFreqDiff);
  // for (var i in words) {
  //   console.log( words[i][0], words[i][1] );
  // }
  // for (var i in wordsC1) {
  //   console.log( wordsC1[i][0], wordsC1[i][1] );
  // }
  // for (var i in wordsC2) {
  //   console.log( wordsC2[i][0], wordsC2[i][1] );
  // }

  return {'all': wordsAll, 'both': wordsBoth, 'c1': wordsC1, 'c2': wordsC2, 'diff': wordsDiff};
}

function getSortedKeys(obj) {
    var keys = [];
    for (var key in obj) {
      keys.push([key, obj[key]]);
    }
    return keys.sort(function(a,b) { return d3.descending(obj[a[0]], obj[b[0]]) });
}

/*
function getSortedKeys(obj) {
    var keys = []; for(var key in obj) keys.push(key);
    return keys.sort(function(a,b){return obj[a]-obj[b]});
}
*/

// http://99webtools.com/blog/list-of-english-stop-words/
var stopWords = ["a","able","about","across","after","all","almost","also","am","among","an","and","any","are","as","at","be","because","been","but","by","can","cannot","could","dear","did","do","does","either","else","ever","every","for","from","get","got","had","has","have","he","her","hers","him","his","how","however","i","if","in","into","is","it","its","just","least","let","like","likely","may","me","might","most","must","my","neither","no","nor","not","of","off","often","on","only","or","other","our","own","rather","said","say","says","she","should","since","so","some","than","that","the","their","them","then","there","these","they","this","tis","to","too","twas","us","wants","was","we","were","what","when","where","which","while","who","whom","why","will","with","would","yet","you","your","ain't","aren't","can't","could've","couldn't","didn't","doesn't","don't","hasn't","he'd","he'll","he's","how'd","how'll","how's","i'd","i'll","i'm","i've","isn't","it's","might've","mightn't","must've","mustn't","shan't","she'd","she'll","she's","should've","shouldn't","that'll","that's","there's","they'd","they'll","they're","they've","wasn't","we'd","we'll","we're","weren't","what'd","what's","when'd","when'll","when's","where'd","where'll","where's","who'd","who'll","who's","why'd","why'll","why's","won't","would've","wouldn't","you'd","you'll","you're","you've"];

function filterStopWords( wordArr ) {
  var commonObj = {},
      uncommonArr = [],
      word, i;

  common = stopWords;
  for ( i = 0; i < common.length; i++ ) {
    commonObj[ common[i].trim() ] = true;
  }

  for ( i = 0; i < wordArr.length; i++ ) {
    word = wordArr[i]; //.trim().toLowerCase();
    if ( !commonObj[word] ) {
      uncommonArr.push(word);
    }
  }

  return uncommonArr;
}

// function stem(){
//   var   wordlist,
//     ix,
//     word,
//     stem,
//     overlap = [],
//     stemmed = [],
//     test = document.getElementById('test').value;
//   // dump non-words
//   test = test.replace(/[^\w]/g, ' ');
//   // dump multiple white-space
//   test = test.replace(/\s+/g, ' ');
//   // split
//   wordlist = test.split(' ');
//   for(ix in wordlist) {
//     stem = stemmer(wordlist[ix]);
//     overlap.push(wordlist[ix].replace(stem, stem + '<em>') + '</em>');
//     stemmed.push(stem);
//   }
//   document.getElementById('overlap').innerHTML = overlap.join(' ');
//   document.getElementById('stemmed').innerHTML = stemmed.join(' ');
// }