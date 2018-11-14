interface VGraph {
  nodes: Array<VNode>;
  edges: Array<VEdge>;
  addNode(id: string, label: string, values: Array<string>, probs: Array<number>): VNode;
  addEdge(parent: string, child: string): VEdge;
  node(id: string): VNode;
  edge(id1: string, id2: string): VEdge;
}
interface VNode {
  id: string;
  label: string;
  values: Array<string>;
  probs: Array<number>;
  width: number;
  height: number;
  x: number;
  y: number;
}
interface VEdge {
  parent: string;
  child: string;
}
interface DrawOptions {
  id: string;
  width: number | any;
  height: number | any;
  graph: VGraph;
  samples: number;
}
interface CsvOptions {
  rowDelimiter: string;
  fieldDelimiter: string;
}
interface JsBayesViz {
  fromGraph(graph: any): VGraph;
  draw(options: DrawOptions): void;
  redraw(options: DrawOptions): void;
  redrawProbs(options: DrawOptions): void;
  downloadSamples(graph: VGraph, asJson: boolean, options: CsvOptions | any): void;
}
declare module "jsbayes-viz" {
  let jsbayesviz: JsBayesViz;
  export = jsbayesviz;
}