(function(window) {
  'use strict';
  var dagre;
  var d3;
  var jsbayes;
  var OUT_LEFT = 1,
      OUT_TOP = 2,
      OUT_RIGHT = 4,
      OUT_BOTTOM = 8;

  function getPath(n1, n2) {
    var c1 = center(n1),
        c2 = center(n2);
    var x1 = c1.x,
        y1 = c1.y,
        x2 = c2.x,
        y2 = c2.y,
        theta = Math.atan2(y2 - y1, x2 - x1);
    var p1 = getPoint(theta, n1),
        p2 = getPoint(theta + Math.PI, n2);
    if(p1.error || p2.error) {
      return {x1: 0, y1: 0, x2: 0, y2: 0, error: true };
    }
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }
  function getPoint(theta, n) {
    var c = center(n);
    var cx = c.x;
    var cy = c.y;
    var w = n.width / 2.0;
    var h = n.height / 2.0;
    var d = distance(cx, cy, cx+w, cy+h);
    var x = cx + d * Math.cos(theta);
    var y = cy + d * Math.sin(theta);
    var ocode = outcode(n, x, y);
    var p = { };
    switch(ocode) {
      case OUT_TOP:
        p.x = cx - h*((x-cx)/(y-cy));
        p.y = cy - h;
        break;
      case OUT_LEFT:
        p.x = cx - w;
        p.y = cy - w*((y-cy)/(x-cx));
        break;
      case OUT_BOTTOM:
        p.x = cx + h*((x-cx)/(y-cy));
        p.y = cy + h;
        break;
      case OUT_RIGHT:
        p.x = cx + w;
        p.y = cy + w*((y-cy)/(x-cx));
        break;
      default:
        console.error('non-cardinal outcode ' + ocode);
        p.error = true;
    }
    return p;
  }
  function center(node) {
    var x = node.width / 2.0 + node.x,
        y = node.height / 2.0 + node.y;
    return { x: x, y: y };
  }
  function distance(x1, y1, x2, y2) {
    var x = x1 - x2;
    var y = y1 - y2;
    var d = Math.sqrt(x*x + y*y);
    return d;
  }
  function outcode(n, x, y) {
    var out = 0;
    if(n.width <= 0) {
      out |= OUT_LEFT | OUT_RIGHT;
    } else if(x < n.x) {
      out |= OUT_LEFT;
    } else if(x > n.x + n.width) {
      out |= OUT_RIGHT;
    }

    if(n.height <= 0) {
      out |= OUT_TOP | OUT_BOTTOM;
    } else if(y < n.y) {
      out |= OUT_TOP;
    } else if(y > n.y + n.height) {
      out |= OUT_BOTTOM;
    }
    return out;
  }
  function newGraph() {
    return {
      nodes: [],
      edges: [],
      addEdge: function(parent, child) {
        var edge = {
          parent: parent,
          child: child
        };
        this.edges.push(edge);
        return edge;
      },
      addNode: function(id, label, values, probs) {
        var width = 150;
        var height = values.length * 15 + 20; 
        var node = {
          id: id,
          label: label,
          values: values,
          probs: probs,
          width: width,
          height: height,
          x: Math.random(),
          y: Math.random(),
          mid: function() {
            var dx = this.width / 2.0 + this.x,
                dy = this.height / 2.0 + this.y;
            return { x: dx, y: dy };
          },
          translate: function() { return 'translate(' + this.x + ',' + this.y + ')'; }
        };
        this.nodes.push(node);
        return node;
      },
      node: function(id) {
        if(!this.map) {
          this.nodeMap = {};
          for(var i=0; i < this.nodes.length; i++) {
            var node = this.nodes[i];
            this.nodeMap[node.id] = node;
          }
        }
        return this.nodeMap[id];
      },
      edge: function(id1, id2) {
        var n1 = this.node(id1),
            n2 = this.node(id2);
        var path = getPath(n1, n2);
        return path;
      }
    };
  }
  function getDagreGraph(graph) {
    var g = new dagre.graphlib.Graph();
    g.setGraph({});
    g.setDefaultEdgeLabel(function() { return {}; });

    for(var i=0; i < graph.nodes.length; i++) {
      var n = graph.nodes[i];
      g.setNode(n.id, {
        label: n.label,
        width: n.width,
        height: n.height
      });
    }

    for(var i=0; i < graph.edges.length; i++) {
      var e = graph.edges[i];
      g.setEdge(e.parent, e.child);
    }
    return g;
  }
  function layoutGraph(graph) {
    var g = getDagreGraph(graph);
    dagre.layout(g);

    for(var i=0; i < graph.nodes.length; i++) {
      var gout = graph.nodes[i];
      var id = gout.id;
      var gin = g.node(id);
      if(gin) {
        gout.x = gin.x;
        gout.y = gin.y;
      }
    }

    for(var i=0; i < graph.edges.length; i++) {
      var eout = graph.edges[i];
      var e = { v: eout.parent, w: eout.child };
      var ein = g.edge(e);
      if(ein) {
        eout.points = ein.points;
      }
    }
  }
  function initSvg(options) {
    d3.select(options.id)
      .attr({
        width: options.width,
        height: options.height
      })
      .append('defs')
        .append('marker')
        .attr({
          id: 'arrow',
          markerWidth: 10,
          markerHeight: 10,
          refX: 5,
          refY: 3,
          orient: 'auto',
          markerUnits: 'strokeWidth'
        })
          .append('path')
          .attr({
            d: 'M0,0 L0,6 L5,3 z',
            fill: '#f00',
            class: 'edge-head'
          });
  }
  function formatValue(v) {
    var MAX = 5;
    var subchar = '\u00A0';
    var value;
    if(v.length < MAX) {
      value = v;
      for(var i=v.length; i < MAX; i++) {
        value += subchar;
      }
    } else if(v.length > MAX) {
      value = v.substr(0, MAX);
    } else {
      value = v;
    }
    return value;
  }
  function formatPct(p) {
    var pct = (p * 100).toFixed(2);
    if(pct.length < 6) {
      while(pct.length < 6) {
        pct = '\u00A0' + pct;
      }
    }
    return pct;
  }
  function formatNodeName(name) {
    var MAX = 15;
    if(name.length < MAX) {
      return name;
    }
    return name.substr(0, MAX);
  }
  function drawNodes(options) {
    var graph = options.graph;
    var SAMPLES = options.samples || 10000;
    
    var nodes = d3.select(options.id)
      .selectAll('g')
      .data(graph.nodes)
      .enter()
        .append('g')
        .attr({
          id: function(d) { return d.id; },
          transform: function(d) { return d.translate(); },
          class: 'node-group'
        })
        .on('mousedown', function(d) { 
          d3.selectAll('g.node-group').sort(function(a, b) {
            if(a.id !== d.id) {
              return -1;
            } else {
              return 1;
            }
          });
        });
    nodes.append('rect')
      .attr({
        x: 0,
        y: 0,
        class: 'node-shape',
        style: 'stroke:#000000; fill:none;',
        width: function(d) { return d.width; },
        height: function(d) { return d.height; },
        'pointer-events': 'visible',
        'data-node': function(d) { return d.id; }
      });
    nodes.append('text')
      .attr({
        x: function(d) { return d.width / 2; },
        y: 15,
        fill: 'black',
        class: 'node-name',
        'font-family': 'monospace',
        'font-size': 15
      })
      .text(function(d) { return formatNodeName(d.id); })
      .style('text-anchor', 'middle');
    nodes.each(function(d) {
      var y = 30;
      for(var i=0; i < d.values.length; i++) {
        d3.select(this)
          .append('text')
          .attr({
            x: 2,
            y: y,
            class: 'node-value',
            'font-family': 'monospace',
            'data-node': function(d) { return d.id; },
            'data-value': function(d) { return d.values[i]; }
          })
          .on('click', function(e) {
            var h = this;
            var id = e.id;
            var v = h.attributes['data-value'].value;
            var g = graph.graph;
            var node = g.node(id);
          
            if(undefined === node.isObserved || false === node.isObserved) {
              g.observe(id, v);
              g.sample(SAMPLES);
            } else {
              var index1 = g.node(id).valueIndex(v);
              var index2 = g.node(id).value;
              if(index1 === index2) {
                g.unobserve(id);
                g.sample(SAMPLES);
              } else {
                g.observe(id, v);
                g.sample(SAMPLES);
              }
            }
          
            for(var i=0; i < g.nodes.length; i++) {
              var nOut = g.nodes[i];
              var nIn = graph.nodes[i];
              nIn.probs = nOut.probs();
            }
          
            for(var i=0; i < graph.nodes.length; i++) {
              var node = graph.nodes[i];
              for(var j=0; j < node.values.length; j++) {
                var value = node.values[j];
                var prob = node.probs[j] * 100;
                var selector = 'rect[data-node="' + node.id + '"][data-value="' + value + '"]';
                d3.select(selector)
                  .attr({
                    width: prob
                  });
                
                selector = 'text[data-node="' + node.id + '"][data-pvalue="' + value + '"]';
                d3.select(selector)
                  .text(formatPct(node.probs[j]));
              }
            }
          })
          .text(function(d) { return formatValue(d.values[i]); });
        y += 15;
      }
    });
    nodes.each(function(d) {
      var y = 30;
      for (var i = 0; i < d.probs.length; i++) {
        d3.select(this)
          .append('text')
          .attr({
            x: 2 + d.width,
            y: y,
            'font-family': 'monospace',
            class: 'node-pct',
            'data-node': function(d) { return d.id; },
            'data-pvalue': function(d) { return d.values[i]; }
          })
          .text(function(d) { return formatPct(d.probs[i]); });
        y += 15;
      }
    });
    nodes.each(function(d) {
      var y = 20;
      for (var i = 0; i < d.probs.length; i++) {
        d3.select(this)
          .append('rect')
          .attr({
            x: 50,
            y: y,
            width: d.probs[i] * 100,
            height: 10,
            class: 'node-bar',
            'data-node': function(d) { return d.id; },
            'data-value': function(d) { return d.values[i]; }
          });
        y += 15;
      }
    });
    nodes.each(function(d) {
      var y1 = 20;
      var y2 = d.height - 5;
      var width = d.width - 50;
      var xInc = width / 4.0;
      var x = 50 + xInc;
      
      for(var i=0; i < 3; i++) {
        d3.select(this)
          .append('line')
          .attr({
            x1: x,
            y1: y1,
            x2: x,
            y2: y2,
            class: 'node-iqline',
            'stroke-dasharray': '5, 1',
            style: 'stroke:black; stroke-width:1px',
          });
        x += xInc;
      }
    });

    var drag = d3.behavior.drag()
      .origin(function(d) {
        return d;
      })
      .on('dragstart', function(e) {
        d3.event.sourceEvent.stopPropagation();
      })
      .on('drag', function(e) {
        e.x = d3.event.x;
        e.y = d3.event.y;

        var id = 'g#' + e.id;
        d3.select(id).attr({ transform: e.translate() });

        var arcs = 'line[data-parent=' + e.id + ']';
        d3.selectAll(arcs)
          .each(function(d) {
            var points = graph.edge(d.parent, d.child);
            d3.select(this).attr({
              x1: points.x1,
              y1: points.y1,
              x2: points.x2,
              y2: points.y2
            });
          });

        arcs = 'line[data-child=' + e.id + ']';
        d3.selectAll(arcs)
          .each(function(d) {
            var points = graph.edge(d.parent, d.child);
            d3.select(this).attr({
              x1: points.x1,
              y1: points.y1,
              x2: points.x2,
              y2: points.y2
            });
          });
      });
    nodes.call(drag);
  }
  function drawEdges(options) {
    var graph = options.graph;
    var edges = d3.select(options.id)
      .selectAll('line')
      .data(graph.edges)
      .enter()
        .append('line')
        .each(function(d) {
          var points = graph.edge(d.parent, d.child);
          d3.select(this).attr({
            'data-parent': d.parent,
            'data-child': d.child,
            x1: points.x1,
            y1: points.y1,
            x2: points.x2,
            y2: points.y2,
            style: 'stroke:rgb(255,0,0);stroke-width:2',
            class: 'edge-line',
            'marker-end': 'url(#arrow)'
          });
        });
  }
  function drawGraph(options) {
    initSvg(options);
    layoutGraph(options.graph);
    drawEdges(options);
    drawNodes(options);
  }
  function normalize(sampledLw) {
    var sum = 0;
    var probs = [];
    for(var i=0; i < sampledLw.length; i++) {
      sum += sampledLw[i];
      probs.push(sampledLw[i]);
    }
    for(var i=0; i < sampledLw.length; i++) {
      probs[i] = probs[i] / sum;
    }
    return probs;
  }
  function downloadData(data, filename) {
    var link = document.createElement('a');
    link.href = data;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  function defineLib() {
    var lib = {};

    lib.fromGraph = function(graph) {
      var g = newGraph();

      for(var i=0; i < graph.nodes.length; i++) {
        var n = graph.nodes[i];
        g.addNode(n.name, n.name, n.values, normalize(n.sampledLw));
        for(var j=0; j < n.parents.length; j++) {
          var p = n.parents[j];
          g.addEdge(p.name, n.name);
        }
      }

      g.graph = graph;
      return g;
    }

    lib.draw = function(options) {
      drawGraph(options);
    }
    
    lib.downloadSamples = function(graph, asJson, options) {
      var data, filename;
      if(asJson) {
        var samples = graph.graph.samples;
        data = 'data:text/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(samples));
        filename = 'data-' + Date.now() + '.json';
      } else {
        var csv = graph.graph.samplesAsCsv(options);
        data = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        filename = 'data-' + Date.now() + '.csv';
      }
      downloadData(data, filename);
    }
    
    return lib;
  }

  if(typeof module === 'object' && module && typeof module.exports === 'object') {
    dagre = require('dagre');
    d3 = require('d3');
    jsbayes = require('jsbayes');
    module.exports = defineLib();
  } else {
    if(typeof(jsbayesviz) === 'undefined') {
      dagre = window.dagre;
      d3 = window.d3;
      jsbayes = window.jsbayes;
      window.jsbayesviz = defineLib();
    }

    if(typeof define === 'function' && define.amd) {
      define('jsbayesviz', [], defineLib());
    }
  }
})(this);