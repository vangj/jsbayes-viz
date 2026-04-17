var fs = require('fs');
var expect = require('chai').expect;
var createInstrumenter = require('istanbul-lib-instrument').createInstrumenter;
var jsbayes = require('jsbayes');
var JSDOM = require('jsdom').JSDOM;
var vm = require('vm');

function normalizeWeights(weights) {
  var sum = weights.reduce(function (total, value) {
    return total + value;
  }, 0);

  return weights.map(function (value) {
    return value / sum;
  });
}

function makeSourceNode(name, values, weights, parents) {
  return {
    name: name,
    values: values.slice(),
    sampledLw: weights.slice(),
    parents: parents || [],
    currentProbs: normalizeWeights(weights),
    isObserved: false,
    value: 0,
    probs: function () {
      return this.currentProbs.slice();
    },
    valueIndex: function (value) {
      return this.values.indexOf(value);
    },
  };
}

function createSourceGraph() {
  var alpha = makeSourceNode(
    'AlphaNodeLongName1',
    ['x', 'five5', 'longer'],
    [1, 2, 3],
  );
  var beta = makeSourceNode('BetaNode', ['yes', 'no'], [2, 1], [alpha]);
  var gamma = makeSourceNode('GammaNode', ['left', 'right'], [1, 1], [beta]);
  var nodes = [alpha, beta, gamma];

  beta.isObserved = true;
  beta.value = 0;

  return {
    nodes: nodes,
    samples: [{ alpha: 'x', beta: 'yes' }],
    observeCalls: [],
    unobserveCalls: [],
    sampleCalls: [],
    csvCalls: [],
    node: function (id) {
      return this.nodes.filter(function (node) {
        return node.name === id;
      })[0];
    },
    observe: function (id, value) {
      var node = this.node(id);
      this.observeCalls.push({ id: id, value: value });
      node.isObserved = true;
      node.value = node.valueIndex(value);
      node.currentProbs = node.values.map(function (_entry, index) {
        return index === node.value ? 1 : 0;
      });
    },
    unobserve: function (id) {
      var node = this.node(id);
      this.unobserveCalls.push(id);
      node.isObserved = false;
      node.currentProbs = normalizeWeights(node.sampledLw);
    },
    sample: function (count) {
      this.sampleCalls.push(count);
      return Promise.resolve(count);
    },
    samplesAsCsv: function (options) {
      this.csvCalls.push(options);
      return 'node,value\nalpha,x';
    },
  };
}

function clearLibraryCache() {
  delete require.cache[require.resolve('d3')];
  delete require.cache[require.resolve('dagre')];
  delete require.cache[require.resolve('../jsbayes-viz')];
}

function createDomHarness() {
  var dom = new JSDOM(
    '<!DOCTYPE html><html><body><svg id="bbn"></svg></body></html>',
    { pretendToBeVisual: true },
  );
  var previousWindow = globalThis.window;
  var previousDocument = globalThis.document;
  var previousNavigator = globalThis.navigator;

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.navigator = dom.window.navigator;

  clearLibraryCache();

  return {
    dom: dom,
    d3: require('d3'),
    dagre: require('dagre'),
    jsbayesviz: require('../jsbayes-viz'),
    cleanup: function () {
      clearLibraryCache();
      dom.window.close();

      if (typeof previousWindow === 'undefined') {
        delete globalThis.window;
      } else {
        globalThis.window = previousWindow;
      }

      if (typeof previousDocument === 'undefined') {
        delete globalThis.document;
      } else {
        globalThis.document = previousDocument;
      }

      if (typeof previousNavigator === 'undefined') {
        delete globalThis.navigator;
      } else {
        globalThis.navigator = previousNavigator;
      }
    },
  };
}

function installDragStub(d3) {
  var lastDrag = null;
  var originalDrag = d3.behavior.drag;

  d3.behavior.drag = function () {
    function drag(selection) {
      drag.selection = selection;
    }

    drag.handlers = {};
    drag.origin = function (handler) {
      drag.originHandler = handler;
      return drag;
    };
    drag.on = function (eventName, handler) {
      drag.handlers[eventName] = handler;
      return drag;
    };
    lastDrag = drag;
    return drag;
  };

  return {
    getLastDrag: function () {
      return lastDrag;
    },
    restore: function () {
      d3.behavior.drag = originalDrag;
    },
  };
}

function flushAsyncWork() {
  return Promise.resolve().then(function () {
    return Promise.resolve();
  });
}

describe('#jsbayes', function () {
  it('verifies jsbayes interop', function () {
    clearLibraryCache();

    var jsbayesviz = require('../jsbayes-viz');
    var graph = jsbayes.newGraph();
    var n1 = graph.addNode('n1', ['t', 'f']);
    var n2 = graph.addNode('n2', ['t', 'f']);
    var n3 = graph.addNode('n3', ['t', 'f']);

    n2.addParent(n1);
    n3.addParent(n2);

    graph.reinit();
    graph.sample(1000);

    var g = jsbayesviz.fromGraph(graph);
    expect(g.nodes.length).to.equal(graph.nodes.length);
    expect(g.nodes[0].id).to.equal(graph.nodes[0].name);
    expect(g.nodes[1].id).to.equal(graph.nodes[1].name);
    expect(g.nodes[2].id).to.equal(graph.nodes[2].name);

    expect(g.edges.length).to.equal(2);
    expect(g.edges[0]).to.deep.equal({ parent: 'n1', child: 'n2' });
    expect(g.edges[1]).to.deep.equal({ parent: 'n2', child: 'n3' });
  });

  it('computes graph geometry and handles invalid node bounds', function () {
    var harness = createDomHarness();
    var originalError = console.error;
    var errors = [];

    console.error = function (message) {
      errors.push(message);
    };

    try {
      var graph = createSourceGraph();
      var jsbayesviz = harness.jsbayesviz;
      var vizGraph = jsbayesviz.fromGraph(graph);
      var alphaNode = vizGraph.nodes[0];
      var betaNode = vizGraph.nodes[1];

      alphaNode.x = 10;
      alphaNode.y = 100;
      betaNode.x = 10;
      betaNode.y = 0;

      expect(alphaNode.mid()).to.deep.equal({
        x: alphaNode.width / 2 + alphaNode.x,
        y: alphaNode.height / 2 + alphaNode.y,
      });
      expect(alphaNode.translate()).to.equal('translate(10,100)');
      expect(vizGraph.node(alphaNode.id)).to.equal(alphaNode);

      vizGraph.map = true;
      vizGraph.nodeMap = {
        AlphaNodeLongName1: alphaNode,
        BetaNode: betaNode,
        cachedNode: betaNode,
      };
      expect(vizGraph.node('cachedNode')).to.equal(betaNode);

      var verticalPath = vizGraph.edge(alphaNode.id, betaNode.id);
      expect(verticalPath.error).to.equal(undefined);
      expect(verticalPath.y1).to.be.greaterThan(verticalPath.y2);

      betaNode.x = 400;
      betaNode.y = 100;

      var horizontalPath = vizGraph.edge(alphaNode.id, betaNode.id);
      expect(horizontalPath.error).to.equal(undefined);
      expect(horizontalPath.x1).to.be.lessThan(horizontalPath.x2);

      alphaNode.width = 0;
      alphaNode.height = 0;

      var invalidPath = vizGraph.edge(alphaNode.id, betaNode.id);
      expect(invalidPath).to.deep.equal({
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0,
        error: true,
      });
      expect(errors[0]).to.contain('non-cardinal outcode');
    } finally {
      console.error = originalError;
      harness.cleanup();
    }
  });

  it('draws svg output and formats node content', function () {
    var harness = createDomHarness();
    var dragStub = installDragStub(harness.d3);

    try {
      var graph = createSourceGraph();
      var jsbayesviz = harness.jsbayesviz;
      var vizGraph = jsbayesviz.fromGraph(graph);
      var svg = harness.dom.window.document.querySelector('#bbn');

      jsbayesviz.draw({
        id: '#bbn',
        width: 640,
        height: 480,
        graph: vizGraph,
        samples: 17,
      });

      expect(svg.getAttribute('width')).to.equal('640');
      expect(svg.getAttribute('height')).to.equal('480');
      expect(
        svg.querySelector('defs marker#arrow path.edge-head'),
      ).to.not.equal(null);
      expect(svg.querySelectorAll('g.node-group').length).to.equal(3);
      expect(svg.querySelectorAll('line.edge-line').length).to.equal(2);
      expect(svg.querySelectorAll('line.node-iqline').length).to.equal(12);

      var nodeName = svg.querySelector('g#AlphaNodeLongName1 text.node-name');
      expect(nodeName.textContent).to.have.length(15);
      expect(nodeName.textContent.indexOf('AlphaNodeLong')).to.equal(0);

      var valueTexts = Array.from(
        svg.querySelectorAll('g#AlphaNodeLongName1 text.node-value'),
      ).map(function (node) {
        return node.textContent;
      });
      expect(valueTexts[0]).to.have.length(5);
      expect(valueTexts[1]).to.equal('five5');
      expect(valueTexts[2]).to.equal('longe');

      var pctTexts = Array.from(
        svg.querySelectorAll('g#AlphaNodeLongName1 text.node-pct'),
      ).map(function (node) {
        return node.textContent;
      });
      expect(pctTexts[0]).to.contain('16.67');
      expect(pctTexts[1]).to.contain('33.33');
      expect(pctTexts[2]).to.contain('50.00');

      var groups = Array.from(svg.querySelectorAll('g.node-group'));
      groups[1].dispatchEvent(
        new harness.dom.window.MouseEvent('mousedown', { bubbles: true }),
      );

      var reorderedGroups = Array.from(svg.querySelectorAll('g.node-group'));
      expect(reorderedGroups[reorderedGroups.length - 1].id).to.equal(
        groups[1].id,
      );

      jsbayesviz.redraw({ id: '#bbn', graph: vizGraph });
      expect(dragStub.getLastDrag().handlers.drag).to.be.a('function');
    } finally {
      dragStub.restore();
      harness.cleanup();
    }
  });

  it('updates probabilities through click and drag interactions', async function () {
    var harness = createDomHarness();
    var dragStub = installDragStub(harness.d3);

    try {
      var graph = createSourceGraph();
      var jsbayesviz = harness.jsbayesviz;
      var vizGraph = jsbayesviz.fromGraph(graph);
      var svg = harness.dom.window.document.querySelector('#bbn');

      jsbayesviz.draw({
        id: '#bbn',
        width: 640,
        height: 480,
        graph: vizGraph,
        samples: 17,
      });

      var alphaValues = svg.querySelectorAll(
        'g#AlphaNodeLongName1 text.node-value',
      );
      alphaValues[2].dispatchEvent(
        new harness.dom.window.MouseEvent('click', { bubbles: true }),
      );
      await flushAsyncWork();

      expect(graph.observeCalls[0]).to.deep.equal({
        id: 'AlphaNodeLongName1',
        value: 'longer',
      });
      expect(graph.sampleCalls[0]).to.equal(17);
      expect(
        svg.querySelector(
          'text[data-node="AlphaNodeLongName1"][data-pvalue="longer"]',
        ).textContent,
      ).to.equal('100.00');
      expect(
        svg
          .querySelector(
            'rect[data-node="AlphaNodeLongName1"][data-value="longer"]',
          )
          .getAttribute('width'),
      ).to.equal('100');

      var betaValues = svg.querySelectorAll('g#BetaNode text.node-value');
      betaValues[1].dispatchEvent(
        new harness.dom.window.MouseEvent('click', { bubbles: true }),
      );
      await flushAsyncWork();

      expect(graph.observeCalls[1]).to.deep.equal({
        id: 'BetaNode',
        value: 'no',
      });

      betaValues[1].dispatchEvent(
        new harness.dom.window.MouseEvent('click', { bubbles: true }),
      );
      await flushAsyncWork();

      expect(graph.unobserveCalls).to.deep.equal(['BetaNode']);

      graph.nodes[2].currentProbs = [0.25, 0.75];
      jsbayesviz.redrawProbs({ graph: vizGraph });

      expect(
        svg
          .querySelector('rect[data-node="GammaNode"][data-value="right"]')
          .getAttribute('width'),
      ).to.equal('75');
      expect(
        svg.querySelector('text[data-node="GammaNode"][data-pvalue="right"]')
          .textContent,
      ).to.contain('75.00');

      var drag = dragStub.getLastDrag();
      var stopPropagationCalled = false;
      var edgeLine = svg.querySelector('line.edge-line');
      var originalX1 = edgeLine.getAttribute('x1');

      expect(drag.originHandler(vizGraph.nodes[1])).to.equal(vizGraph.nodes[1]);

      harness.d3.event = {
        sourceEvent: {
          stopPropagation: function () {
            stopPropagationCalled = true;
          },
        },
      };
      drag.handlers.dragstart(vizGraph.nodes[1]);
      expect(stopPropagationCalled).to.equal(true);

      harness.d3.event = { x: 320, y: 140 };
      drag.handlers.drag(vizGraph.nodes[1]);
      expect(
        svg.querySelector('g#BetaNode').getAttribute('transform'),
      ).to.equal('translate(320,140)');
      expect(edgeLine.getAttribute('x1')).to.not.equal(originalX1);

      delete harness.d3.event;
    } finally {
      dragStub.restore();
      harness.cleanup();
    }
  });

  it('downloads sample exports as json and csv', function () {
    var harness = createDomHarness();
    var originalNow = Date.now;
    var originalClick = harness.dom.window.HTMLAnchorElement.prototype.click;
    var clickedLinks = [];

    harness.dom.window.HTMLAnchorElement.prototype.click = function () {
      clickedLinks.push({
        href: this.href,
        download: this.download,
      });
    };
    Date.now = function () {
      return 1700000000000;
    };

    try {
      var graph = createSourceGraph();
      var jsbayesviz = harness.jsbayesviz;
      var vizGraph = jsbayesviz.fromGraph(graph);

      jsbayesviz.downloadSamples(vizGraph, true, {});
      jsbayesviz.downloadSamples(vizGraph, false, {
        rowDelimiter: '\n',
        fieldDelimiter: ',',
      });

      expect(clickedLinks).to.have.length(2);
      expect(clickedLinks[0].download).to.equal('data-1700000000000.json');
      expect(clickedLinks[0].href).to.contain(
        encodeURIComponent(JSON.stringify(graph.samples)),
      );
      expect(clickedLinks[1].download).to.equal('data-1700000000000.csv');
      expect(clickedLinks[1].href).to.contain(
        encodeURIComponent('node,value\nalpha,x'),
      );
      expect(graph.csvCalls[0]).to.deep.equal({
        rowDelimiter: '\n',
        fieldDelimiter: ',',
      });
      expect(harness.dom.window.document.querySelectorAll('a').length).to.equal(
        0,
      );
    } finally {
      Date.now = originalNow;
      harness.dom.window.HTMLAnchorElement.prototype.click = originalClick;
      harness.cleanup();
    }
  });

  it('initializes the browser and amd bundle paths', function () {
    var bundlePath = require.resolve('../jsbayes-viz');
    var source = fs.readFileSync(bundlePath, 'utf8');
    var coverage = globalThis.__coverage__ || {};
    var instrumenter = createInstrumenter({
      coverageVariable: '__coverage__',
    });
    var instrumentedSource = instrumenter.instrumentSync(source, bundlePath);
    var amdCalls = [];
    var sandbox = {
      __coverage__: coverage,
      console: console,
      d3: require('d3'),
      dagre: require('dagre'),
      define: function (name, deps, exportedValue) {
        amdCalls.push({
          name: name,
          deps: deps,
          exportedValue: exportedValue,
        });
      },
    };

    sandbox.define.amd = true;
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.globalThis = sandbox;

    vm.runInNewContext(instrumentedSource, sandbox, { filename: bundlePath });

    if (globalThis.__coverage__) {
      globalThis.__coverage__ = coverage;
    }

    expect(sandbox.jsbayesviz).to.be.an('object');
    expect(sandbox.jsbayesviz.draw).to.be.a('function');
    expect(amdCalls).to.have.length(1);
    expect(amdCalls[0].name).to.equal('jsbayesviz');
    expect(amdCalls[0].deps).to.deep.equal([]);
    expect(amdCalls[0].exportedValue.redrawProbs).to.be.a('function');
  });
});
