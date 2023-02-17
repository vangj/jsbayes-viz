(function(window) {
  'use strict';
  var dagre;
  var d3;
  var jsbayes;
  const 
    OUT_LEFT = 1,
    OUT_TOP = 2,
    OUT_RIGHT = 4,
    OUT_BOTTOM = 8;
  const
    NODE_WIDTH = 220, // 220 is the result of css calc(205px + 1rem)
    XPAD = 8,
    YPAD = 8;

  function getPath(n1, n2) {
    const 
      c1 = center(n1),
      c2 = center(n2);
    const 
      x1 = c1.x,
      y1 = c1.y,
      x2 = c2.x,
      y2 = c2.y,
      theta = Math.atan2(y2 - y1, x2 - x1);
    const 
      p1 = getPoint(theta, n1),
      p2 = getPoint(theta + Math.PI, n2);
    if(p1.error || p2.error) {
      return {x1: 0, y1: 0, x2: 0, y2: 0, error: true };
    }
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
  }
  function getPoint(theta, n) {
    const c = center(n);
    const cx = c.x;
    const cy = c.y;
    const w = n.width / 2.0;
    const h = n.height / 2.0;
    const d = distance(cx, cy, cx+w, cy+h);
    const x = cx + d * Math.cos(theta);
    const y = cy + d * Math.sin(theta);
    const ocode = outcode(n, x, y);
    const p = { };
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
    const x = NODE_WIDTH / 2.0 + node.x,
        y = node.height / 2.0 + node.y;
    return { x: x, y: y };
  }
  function distance(x1, y1, x2, y2) {
    const x = x1 - x2;
    const y = y1 - y2;
    const d = Math.sqrt(x*x + y*y);
    return d;
  }
  function outcode(n, x, y) {
    let out = 0;
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
        const edge = {
          parent: parent,
          child: child
        };
        this.edges.push(edge);
        return edge;
      },
      addNode: function(id, label, values, probs) {
        const width = 150;
        const height = values.length * 15 + 20 + 16; 
        const node = {
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
          for(let i=0; i < this.nodes.length; i++) {
            const node = this.nodes[i];
            this.nodeMap[node.id] = node;
          }
        }
        return this.nodeMap[id];
      },
      edge: function(id1, id2) {
        const n1 = this.node(id1),
            n2 = this.node(id2);
        const path = getPath(n1, n2);
        return path;
      }
    };
  }
  function getDagreGraph(graph) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({});
    g.setDefaultEdgeLabel(function() { return {}; });

    for(let i=0; i < graph.nodes.length; i++) {
      const n = graph.nodes[i];
      g.setNode(n.id, {
        label: n.label,
        width: NODE_WIDTH,
        height: n.height
      });
    }

    for(let i=0; i < graph.edges.length; i++) {
      const e = graph.edges[i];
      g.setEdge(e.parent, e.child);
    }
    return g;
  }
  function layoutGraph(graph) {
    const g = getDagreGraph(graph);
    dagre.layout(g);

    for(let i=0; i < graph.nodes.length; i++) {
      const gout = graph.nodes[i];
      const id = gout.id;
      const gin = g.node(id);
      if(gin) {
        gout.x = gin.x;
        gout.y = gin.y;
      }
    }

    for(let i=0; i < graph.edges.length; i++) {
      const eout = graph.edges[i];
      const e = { v: eout.parent, w: eout.child };
      const ein = g.edge(e);
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
    const MAX = 5;
    const subchar = '\u00A0';
    let value = undefined;

    if(v.length < MAX) {
      value = v;
      for(let i=v.length; i < MAX; i++) {
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
    let pct = (p * 100).toFixed(2);
    if(pct.length < 6) {
      while(pct.length < 6) {
        pct = '\u00A0' + pct;
      }
    }
    return pct;
  }
  function formatNodeName(name) {
    const MAX = 15;
    if(name.length < MAX) {
      return name;
    }
    return name.substr(0, MAX);
  }

  function drawNodeBars(graph) {
    const g = graph.graph;

    for(let i=0; i < g.nodes.length; i++) {
      const nOut = g.nodes[i];
      const nIn = graph.nodes[i];
      nIn.probs = nOut.probs();
    }

    for(let i=0; i < graph.nodes.length; i++) {
      const node = graph.nodes[i];
      for(let j=0; j < node.values.length; j++) {
        const value = node.values[j];
        const prob = node.probs[j] * 100;
        d3.select(`rect[data-node="${node.id}"][data-value="${value}"]`)
            .attr({
                width: prob
            });

        d3.select(`text[data-node="${node.id}"][data-pvalue="${value}"]`)
            .text(formatPct(node.probs[j]));
      }
    }
  }

  function drawNodes(options) {
    const graph = options.graph;
    const SAMPLES = options.samples || 10000;
    
    const nodes = d3.select(options.id)
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
        width: NODE_WIDTH,
        height: function(d) { return d.height; },
        'pointer-events': 'visible',
        'data-node': function(d) { return d.id; }
      });
    nodes.append('text')
      .attr({
        x: NODE_WIDTH / 2,
        y: 15,
        fill: 'black',
        class: 'node-name',
        'font-family': 'monospace',
        'font-size': 15
      })
      .text(function(d) { return formatNodeName(d.id); })
      .style('text-anchor', 'middle');
    nodes.each(function(d) {
      let y = 30;
      for(let i=0; i < d.values.length; i++) {
        d3.select(this)
          .append('text')
          .attr({
            x: 2 + XPAD,
            y: y + YPAD,
            class: 'node-value',
            'font-family': 'monospace',
            'data-node': function(d) { return d.id; },
            'data-value': function(d) { return d.values[i]; }
          })
          .on('click', function(e) {
            const h = this;
            const id = e.id;
            const v = h.attributes['data-value'].value;
            const g = graph.graph;
            const node = g.node(id);
          
            if(undefined === node.isObserved || false === node.isObserved) {
              g.observe(id, v);
            } else {
              const index1 = g.node(id).valueIndex(v);
              const index2 = g.node(id).value;
              if(index1 === index2) {
                g.unobserve(id);
              } else {
                g.observe(id, v);
              }
            }

            g.sample(SAMPLES)
              .then(function (r) {
                drawNodeBars(graph);
              });
          })
          .text(function(d) { return formatValue(d.values[i]); });
        y += 15;
      }
    });
    nodes.each(function(d) {
      let y = 30;
      for (let i = 0; i < d.probs.length; i++) {
        d3.select(this)
          .append('text')
          .attr({
            x: 2 + d.width + XPAD * 2,
            y: y + YPAD,
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
      let y = 20;
      for (let i = 0; i < d.probs.length; i++) {
        d3.select(this)
          .append('rect')
          .attr({
            x: 50 + XPAD,
            y: y + YPAD,
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
      const y1 = 20;
      const y2 = d.height - 5;
      const width = d.width - 50;
      const xInc = width / 4.0;
      let x = 50 + xInc;
      
      for(let i=0; i < 4; i++) {
        d3.select(this)
          .append('line')
          .attr({
            x1: x + XPAD,
            y1: y1,
            x2: x + XPAD,
            y2: y2,
            class: 'node-iqline',
            'stroke-dasharray': '5, 1'
          });
        x += xInc;
      }
    });

    const drag = d3.behavior.drag()
      .origin(function(d) {
        return d;
      })
      .on('dragstart', function(e) {
        d3.event.sourceEvent.stopPropagation();
      })
      .on('drag', function(e) {
        e.x = d3.event.x;
        e.y = d3.event.y;

        d3.select(`g#${e.id}`).attr({ transform: e.translate() });

        d3.selectAll(`line[data-parent=${e.id}]`)
          .each(function(d) {
            const points = graph.edge(d.parent, d.child);
            d3.select(this).attr({
              x1: points.x1,
              y1: points.y1,
              x2: points.x2,
              y2: points.y2
            });
          });

        d3.selectAll(`line[data-child=${e.id}]`)
          .each(function(d) {
            const points = graph.edge(d.parent, d.child);
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
    const graph = options.graph;
    d3.select(options.id)
      .selectAll('line')
      .data(graph.edges)
      .enter()
        .append('line')
        .each(function(d) {
          const points = graph.edge(d.parent, d.child);
          d3.select(this).attr({
            'data-parent': d.parent,
            'data-child': d.child,
            x1: points.x1,
            y1: points.y1,
            x2: points.x2,
            y2: points.y2,
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
  function redrawGraph(options) {
    drawEdges(options);
    drawNodes(options);
  }
  function normalize(sampledLw) {
    let sum = 0;
    const probs = [];
    for(let i=0; i < sampledLw.length; i++) {
      sum += sampledLw[i];
      probs.push(sampledLw[i]);
    }
    for(let i=0; i < sampledLw.length; i++) {
      probs[i] = probs[i] / sum;
    }
    return probs;
  }
  function downloadData(data, filename) {
    const link = document.createElement('a');
    link.href = data;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  function defineLib() {
    const lib = {};

    lib.fromGraph = function(graph) {
      const g = newGraph();

      for(let i=0; i < graph.nodes.length; i++) {
        const n = graph.nodes[i];
        g.addNode(n.name, n.name, n.values, normalize(n.sampledLw));
        for(let j=0; j < n.parents.length; j++) {
          const p = n.parents[j];
          g.addEdge(p.name, n.name);
        }
      }

      g.graph = graph;
      return g;
    }

    lib.draw = function(options) {
      drawGraph(options);
    }

    lib.redraw = function(options) {
      redrawGraph(options);
    }

    lib.redrawProbs = function(options) {
      drawNodeBars(options.graph);
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