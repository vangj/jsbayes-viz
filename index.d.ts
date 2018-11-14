interface Graph {

}
interface DrawOptions {
  id: string;
  width: number;
  height: number;
  graph: Graph;
  samples: number;
}
interface CsvOptions {
  rowDelimiter: string;
  fieldDelimiter: string;
}
interface JsBayesViz {
  fromGraph(graph: any): Graph;
  draw(options: DrawOptions): void;
  downloadSamples(graph: Graph, asJson: boolean, options: CsvOptions | any): void;
}
declare module "jsbayes-viz" {
  let jsbayesviz: JsBayesViz;
  export = jsbayesviz;
}