/* utils */

function key(d) {
  var k = [], p = d;
  while (p) {
    k.push( hpoClass(p) );
    p = p.parent;
  }
  return k.reverse().join("-");
}

function hpoClass(d) {
  return d.id.split(":").join("");
}

// Extended from:
// http://stackoverflow.com/questions/9229645/remove-duplicates-from-javascript-array
function uniqueValuesObject( arr, attr ) {
  // Check for valid arr
  if (!arr || arr.constructor !== Array || arr.length == 0) {
    return arr;
  }

  // Define sort function based on attr; then order by depth
  var sorter = function(a,b) {
    return d3.ascending(a[attr], b[attr]) || d3.descending(a._depth, b._depth);
  }

  // Sort and reduce to find unique items
  var uniq = arr.slice() // slice makes copy of array before sorting it
    .sort(sorter)
    .reduce(function(a,b){
      if (a.length < 1) a.push(b);
      if (a.slice(-1)[0][attr] !== b[attr]) a.push(b); // slice(-1)[0] means last item in array without removing it (like .pop())
      return a;
    },[]); // this empty array becomes the starting value for a

  return uniq;
}


function countArrayElements( arr, attr ) {
	var counts = {};

  for (var i = arr.length-1; i >=0; i--) {
    var val = arr[i][attr];

    if (!(val in counts)) {
      counts[val] = 0;
    }
    counts[val] += 1;
  }

  return counts;
}

function dictValToArray( dict ) {
  var arr = [];

  for (var d in dict) {
    arr.push( dict[d] );
  }

  return arr;
}

function averageArray( arr ) {
  // Check for valid arr
  if (!arr || arr.constructor !== Array || arr.length == 0) {
    return NaN;
  }

  var sum = sumArray(arr);
  var avg = sum / arr.length;
  return avg;
}

function sumArray( arr ) {
  // Check for valid arr
  if (!arr || arr.constructor !== Array || arr.length == 0) {
    return NaN;
  }

  var sum = arr.reduce(function(a, b) { return a + b; });
  return sum;
}

var calculateEntropy = function( arr ) {
  var entropy = 0.0;

  if (arr && arr.length > 0) {
    entropy = -1.0 * sumArray( arr.map(function(d) { return (d > 0.0) ? (d * Math.log2(d)) : 0; }) );
  }

  return entropy;
}

// mg sort function
function nodeSortAlpha(a, b) {
  return d3.ascending(a.name, b.name);
}
function nodeSortFreq1(a, b) {
  return d3.descending(d3.phylogram.getFreqPresent('all', a), d3.phylogram.getFreqPresent('all', b)) || d3.descending(d3.phylogram.getFreqUnknown('all', a), d3.phylogram.getFreqUnknown('all', b)) || d3.descending(d3.phylogram.getFreqAbsent('all', a), d3.phylogram.getFreqAbsent('all', b)) || nodeSortIC(a, b);
  //return d3.descending(a.attr.freqP, b.attr.freqP) || d3.descending(a.attr.freqU, b.attr.freqU) || d3.descending(a.attr.freqA, b.attr.freqA) || nodeSortAlpha(a, b);
}
// function nodeSortFreq2(a, b) {
//   // Not sure if this is working---
//   return d3.descending(5*a.attr.freqP + a.attr.freqA, 5*b.attr.freqP + b.attr.freqA) || nodeSortAlpha(a, b);
// }
function nodeSortFreq1C1(a, b) {
  return d3.descending(d3.phylogram.getFreqPresent('C1', a), d3.phylogram.getFreqPresent('C1', b)) || d3.descending(d3.phylogram.getFreqUnknown('C1', a), d3.phylogram.getFreqUnknown('C1', b)) || d3.descending(d3.phylogram.getFreqAbsent('C1', a), d3.phylogram.getFreqAbsent('C1', b)) || nodeSortIC(a, b);
  //return d3.descending(a.attr.freqC1P, b.attr.freqC1P) || d3.descending(a.attr.freqC1U, b.attr.freqC1U) || d3.descending(a.attr.freqC1A, b.attr.freqC1A) || nodeSortAlpha(a, b);
}
function nodeSortFreq1C2(a, b) {
  return d3.descending(d3.phylogram.getFreqPresent('C2', a), d3.phylogram.getFreqPresent('C2', b)) || d3.descending(d3.phylogram.getFreqUnknown('C2', a), d3.phylogram.getFreqUnknown('C2', b)) || d3.descending(d3.phylogram.getFreqAbsent('C2', a), d3.phylogram.getFreqAbsent('C2', b)) || nodeSortIC(a, b);
  //return d3.descending(a.attr.freqC2P, b.attr.freqC2P) || d3.descending(a.attr.freqC2U, b.attr.freqC2U) || d3.descending(a.attr.freqC2A, b.attr.freqC2A) || nodeSortAlpha(a, b);
}
function nodeSortIC(a, b) {
  return d3.descending(a.attr.ic_max, b.attr.ic_max) || nodeSortAlpha(a, b);
  //return d3.descending(a.attr.ic_base, b.attr.ic_base) || nodeSortAlpha(a, b);
  //return d3.descending(a.attr.ic_max, b.attr.ic_max) || nodeSortFreq1(a, b);
}
function nodeSortClusterOrder(a, b) {
  return d3.ascending(a.attr.trend.order, b.attr.trend.order) || nodeSortIC(a, b);
}
function nodeSortCluster(a, b) {
  return d3.ascending(a.attr.trend.cluster, b.attr.trend.cluster) || nodeSortIC(a, b);
}

function patientSortAlpha(a, b) {
  if ( isNaN(parseFloat(a.id)) ) {
    return d3.ascending(a.id, b.id);
  }
  return d3.ascending(parseFloat(a.id), parseFloat(b.id));
}
function patientSortFreq(a, b) {
  return d3.descending(a.attr.pCount, b.attr.pCount) || d3.descending(a.attr.uCount, b.attr.uCount) || d3.descending(a.attr.aCount, b.attr.aCount) || patientSortAlpha(a, b);
}
function patientSortClusterOrder(a, b) {
  return d3.ascending(a.attr.clusterorder, b.attr.clusterorder) || patientSortAlpha(a, b);
}
function patientSortCluster(a, b) {
  return d3.ascending(a.attr.cluster, b.attr.cluster) || patientSortAlpha(a, b);
}
function patientSortAttr(attr) {
  // HACK
  // Check if both values are numbers, if one is a number assume other is -1 (for unk, na, etc)
  return function(a, b) {
    if ( isNaN(parseFloat(a.attr[attr])) && isNaN(parseFloat(a.attr[attr])) ) {
      return d3.ascending(a.attr[attr], b.attr[attr]) || patientSortAlpha(a, b);

    }
    return d3.ascending(a.attr[attr], b.attr[attr]) || patientSortAlpha(a, b);
    // // One is number, evaluate both as numbers
    // var valA = isNaN(parseFloat(a.attr[attr])) ? patientAttrMap(a.attr[attr]) : parseFloat(a.attr[attr]);
    // var valB = isNaN(parseFloat(b.attr[attr])) ? patientAttrMap(b.attr[attr]) : parseFloat(b.attr[attr]);
    // return d3.ascending(valA, valB) || patientSortAlpha(a, b);
  }
}

function patientAttrMap(val) {
  //if (!val || val.length == 0) { return null; }

  // String data
  val = val.toLowerCase();
  switch(val) {
    case "y":
    case "yes":
    case "severe":
    case "cd":
    case "cd-atyp":
      return 2;
    case "n":
    case "no":
    case "mild":
    case "uc":
      return 1;
    case "ibd-u":
      return 0;
    case "na":
    case "u":
    case "unk":
    case "":
      return -1;
    default:
      return val;
  }
}

function mapUnknownValues(val) {
  switch(val) {
    case -1:
    case '':
      return "Unk";
    default:
      return val;
  }
}

function cssclass(val, prefix) {
  return prefix + val.replace(" ", "_");
}


function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    url = url.toLowerCase(); // This is just to avoid case sensitiveness  
    name = name.replace(/[\[\]]/g, "\\$&").toLowerCase();// This is just to avoid case sensitiveness for query parameter name
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function argmax(arr, callback) {
  var maxes = arr.map(function(d) { return callback(d); });
  var max = d3.max(maxes);

  var argmax = [];
  for(var i=0, l=arr.length; i<l; ++i) {
    if (maxes[i] >= max) {
      argmax.push( i );
    }
  }
  return argmax;
}

function arggt(arr, gt, callback) {
  var maxes = arr.map(function(d) { return callback(d); });

  var argmax = [];
  for(var i=0, l=arr.length; i<l; ++i) {
    if (maxes[i] >= gt) {
      argmax.push( i );
    }
  }
  return argmax;
}

function condenseName(name) {
  return name
    .replace(/(bnormality|bnormal)/gi, "bn.")
    .replace(/of (the)*/gi, "");
}

function wordWrapString(string, length) {
  var tokens = string.split(" ");
  var lines = [];
  var line = "";
  tokens.forEach(function(t, i) {
    line += t +" ";
    if (line.length > length || i === tokens.length-1) {
      lines.push( line );
      line = "";
    }
  });
  return lines;
}