jsbayes-viz
===========

This JavaScript library is a Bayesian Belief Network (BBN) visualization tool. It is built on the following projects.

* (d3)[https://github.com/mbostock/d3]
* (dagre)[https://github.com/cpettitt/dagre]
* (jsbayes)[https://github.com/vangj/jsbayes]

How do I use jsbayes-viz?
=========================

You should only be using this library on the client-side (e.g. with a browser). You may install this library using (bower)[http://bower.io].

`bower install jsbayes-viz --save`

Since there are third party dependencies, you need to reference them in your HTML in the following order. Assuming you have used bower to install the library (and its dependencies), you may reference the libaries as the following.

```
<script src="bower_components/d3/d3.js"></script>
<script src="bower_components/lodash/lodash.js"></script>
<script src="bower_components/graphlib/dist/graphlib.core.js"></script>
<script src="bower_components/dagre/dist/dagre.core.js"></script>
<script src="bower_components/jsbayes/jsbayes.js"></script>
<script src="bower_components/jsbayes-viz/jsbayes-viz.js"></script>
```

jsbayes is the inference engine, so to use jsbayes-viz, first create a jsbayes graph.

```
var graph = jsbayes.newGraph();
var n1 = graph.addNode('n1', ['t', 'f']);
var n2 = graph.addNode('n2', ['t', 'f']);
var n3 = graph.addNode('n3', ['t', 'f']);
var n4 = graph.addNode('n4', ['t', 'f']);
var n5 = graph.addNode('n5', ['0', '1', '2']);

n2.addParent(n1);
n3.addParent(n2);
n3.addParent(n4);
n5.addParent(n4);

graph.reinit();
graph.sample(10000);
```

Then you create a corresponding jsbayes-viz graph from the jsbayes graph.

```
var g = jsbayesviz.fromGraph(graph);
```

Assuming on your HTML page, you have an SVG element like the following.

```
<svg id="bbn"></svg>
```

Then you can kick off the visualization as follows.

```
jsbayesviz.draw({
  id: '#bbn',
  width: 800,
  height: 800,
  graph: g,
  samples: 15000
});
```

Some gotcha's
=============
If you have very long string literals as values for the node id/values, then these strings will draw outside the rectangular nodes. Styling the nodes is work in progress, and will be added at a later date. Right now, you'll have to live with the black and white nodes with red arcs.
