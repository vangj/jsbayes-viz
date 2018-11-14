interface VGraph {

}
interface DrawOptions {
  id: string;
  width: number;
  height: number;
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
  downloadSamples(graph: VGraph, asJson: boolean, options: CsvOptions | any): void;
}
declare module "jsbayes-viz" {
  let jsbayesviz: JsBayesViz;
  export = jsbayesviz;
}