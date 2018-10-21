jsbayes-viz
===========

This JavaScript library is a Bayesian Belief Network (BBN) visualization and interaction tool. It is built on the following projects.

* [d3](https://github.com/mbostock/d3)
* [dagre](https://github.com/cpettitt/dagre)
* [jsbayes](https://github.com/vangj/jsbayes)

# How do I use jsbayes-viz?

You should only be using this library on the client-side (e.g. with a browser). You may install this library using npm.

`npm install jsbayes-viz --save`

Since there are third party dependencies, you need to reference them in your HTML in the following order. Assuming you have used bower to install the library (and its dependencies), you may reference the libaries as the following.

```
<script src="node_modules/d3/d3.js"></script>
<script src="node_modules/lodash/lodash.js"></script>
<script src="node_modules/graphlib/dist/graphlib.core.js"></script>
<script src="node_modules/dagre/dist/dagre.core.js"></script>
<script src="node_modules/jsbayes/jsbayes.js"></script>
<script src="node_modules/jsbayes-viz/jsbayes-viz.js"></script>
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

You may also download the samples in JSON or CSV format. To download in JSON format, call the following method. Note the first parameter is the graph (jsbayes-viz graph, *NOT* the jsbayes graph), the second parameter specifies the format (true means JSON and false means CSV), and the last parameter are options. Options are only available for CSV format, namely, to specify row and field delimiters.


```
jsbayesviz.downloadSamples(graph, true, {});
```

An example of downloading samples as CSV is shown below.

```
jsbayesviz.downloadSamples(graph, false, { rowDelimiter: '\n', fieldDelimiter: ',' });
```

# Styling
Each of the SVG components are now associated with a CSS class. You may apply a stylesheet to customize the look and feel of each of these SVG components/elements.

* .node-group : all the elements belonging to a node
* .node-name : the name of a node
* .node-shape : the rectangle that encloses all the elements belonging to a node
* .node-value : the node values
* .node-pct : the node marginal probabilities correspoding to the values
* .node-bar : the belief bars
* .node-iqline : the interquartile lines (e.g. 25%, 50%, 75%)
* .edge-line : the arc between two nodes
* .edge-head : the arrow head at the end of an arc

Here's an example.

```
svg g rect.node-shape { border-radius: 5px !important; fill:#ffecb3 !important; cursor: move; }
svg g text.node-name { font-weight: 800 !important }
svg g rect.node-bar { fill: green !important }
svg g text.node-value { fill:rgb(0,0,0) !important; font-size: 15px; cursor: pointer; }
svg line.edge-line { stroke:rgb(0,0,0) !important }
svg path.edge-head { fill:rgb(0,0,0) !important }
```
Note that some styles for the elements are inlined and so you must use `!important` to override them.

# Some gotcha's
If you have very long string literals as values for the node id/values, then these strings will be truncated to 5 characters at the current moment. Node names are also truncated to 15 characters.

# Lastly
A working example is shown [here on Plunker](https://run.plnkr.co/plunks/fjL6Yq/) and you may fork the demo code by clicking [here](https://plnkr.co/edit/fjL6Yq).

* [Asia](https://run.plnkr.co/plunks/CJe4LbYhx42TAPXjIUum/)
* [Gulf Coast](https://kelvinfkr.github.io/Gulf_Coast/)
* [Dummy BBN learned via Spark BBN](https://run.plnkr.co/plunks/GFcem156HC2EwRECmtyH/) Go to [Spark BBN](https://github.com/vangj/spark-bbn) to learn more on how to use [Apache Spark](https://spark.apache.org/) to learn BBNs.

Here are some repositories of BBNs that you may use.

* [bnlearn](http://www.bnlearn.com/bnrepository/)
* [netica](http://www.norsys.com/networklibrary.html)
* [Gal Elidan](http://www.cs.huji.ac.il/~galel/Repository/)
* [javabayes](https://www.cs.cmu.edu/~javabayes/Home/node7.html)

# Unit Testing

To run the unit tests, make sure you have NodeJS and npm installed and type in the following.

```bash
npm install
make
```

# Citation

```
@misc{vang_jsbayesviz_2016, 
title={jsbayes-viz}, 
url={https://github.com/vangj/jsbayes-viz/}, 
journal={GitHub},
author={Vang, Jee}, 
year={2016}, 
month={Jan}}
```

# Copyright Stuff

```
Copyright 2016 Jee Vang

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```