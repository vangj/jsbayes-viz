var should = require('chai').should()
    expect = require('chai').expect;
var jsbayes = require('jsbayes');
var dagre = require('dagre');
var jsbayesviz = require('../jsbayes-viz');

describe('#jsbayes', function() {
  it('verifies jsbayes interop', function() {
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
});
