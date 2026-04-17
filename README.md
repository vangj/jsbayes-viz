# jsbayes-viz

This JavaScript library is a Bayesian Belief Network (BBN) visualization and interaction tool. It is built on the following projects.

- [d3](https://github.com/mbostock/d3)
- [dagre](https://github.com/cpettitt/dagre)
- [jsbayes](https://github.com/vangj/jsbayes)

## Development

Use the local `Makefile` for development and verification.

```bash
make install
make format
make lint
make test
make coverage
make build
make clean
```

Target summary:

- `make install`: installs the Node toolchain with `npm ci` and installs browser example dependencies into `bower_components`
- `make format`: formats the repo sources with Prettier
- `make lint`: runs ESLint on the JavaScript sources and tests
- `make test`: runs the Mocha test suite
- `make coverage`: runs the test suite with NYC and writes LCOV output to `coverage/`
- `make build`: compiles `index.scss` and `jsbayes-viz.scss` into `index.css` and `jsbayes-viz.css`
- `make clean`: removes local dependencies and generated coverage artifacts

To open the checked-in examples locally:

```bash
make install
make build
python3 -m http.server 8000
```

Then open `http://localhost:8000/index.html` or `http://localhost:8000/asia.html`.

## How do I use jsbayes-viz?

You should only be using this library on the client side, typically from a browser page that loads the library and its dependencies in order.

For this repository's local examples, `make install` populates `bower_components`, and the scripts are referenced like this:

```html
<script src="bower_components/d3/d3.js"></script>
<script src="bower_components/lodash/lodash.js"></script>
<script src="bower_components/graphlib/dist/graphlib.core.js"></script>
<script src="bower_components/dagre/dist/dagre.core.js"></script>
<script src="bower_components/jsbayes/jsbayes.js"></script>
<script src="jsbayes-viz.js"></script>
```

jsbayes is the inference engine, so to use jsbayes-viz, first create a jsbayes graph.

```js
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

Then create a corresponding jsbayes-viz graph from the jsbayes graph.

```js
var g = jsbayesviz.fromGraph(graph);
```

Assuming your HTML page includes an SVG element like this:

```html
<svg id="bbn"></svg>
```

You can kick off the visualization as follows.

```js
jsbayesviz.draw({
  id: '#bbn',
  width: 800,
  height: 800,
  graph: g,
  samples: 15000,
});
```

You may also download samples in JSON or CSV format. The first parameter is the jsbayes-viz graph, not the original jsbayes graph. For CSV export, the last parameter accepts delimiter options.

```js
jsbayesviz.downloadSamples(graph, true, {});
jsbayesviz.downloadSamples(graph, false, {
  rowDelimiter: '\n',
  fieldDelimiter: ',',
});
```

## Styling

Each SVG component is associated with a CSS class that you can override.

- `.node-group`: all elements belonging to a node
- `.node-name`: the name of a node
- `.node-shape`: the rectangle enclosing the node
- `.node-value`: node values
- `.node-pct`: node marginal probabilities corresponding to the values
- `.node-bar`: belief bars
- `.node-iqline`: interquartile lines such as 25%, 50%, and 75%
- `.edge-line`: the arc between two nodes
- `.edge-head`: the arrow head at the end of an arc

Example overrides:

```css
svg g rect.node-shape {
  border-radius: 5px;
  fill: #ffecb3;
  cursor: move;
}
svg g text.node-name {
  font-weight: 800;
}
svg g rect.node-bar {
  fill: green;
}
svg g text.node-value {
  fill: rgb(0, 0, 0);
  font-size: 15px;
  cursor: pointer;
}
svg line.edge-line {
  stroke: rgb(0, 0, 0);
}
svg path.edge-head {
  fill: rgb(0, 0, 0);
}
```

The repository keeps the source styles in SCSS:

- `index.scss`
- `jsbayes-viz.scss`

Rebuild the generated CSS with:

```bash
make build
```

## Some gotchas

If you have very long string literals for node ids or values, those strings are currently truncated to 15 characters for node names and 5 characters for node values.

## Examples

- [Dummy BBN](https://plnkr.co/plunk/LPDpLFByooWzngMU)

Here are some repositories of BBNs that you may use.

- [bnlearn](http://www.bnlearn.com/bnrepository/)
- [netica](http://www.norsys.com/networklibrary.html)
- [Gal Elidan](http://www.cs.huji.ac.il/~galel/Repository/)
- [javabayes](https://www.cs.cmu.edu/~javabayes/Home/node7.html)

## Citation

```bibtex
@misc{vang_jsbayesviz_2016,
title={jsbayes-viz},
url={https://github.com/vangj/jsbayes-viz/},
journal={GitHub},
author={Vang, Jee},
year={2016},
month={Jan}}
```

## Copyright

```text
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
