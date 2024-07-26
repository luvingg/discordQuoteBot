import SimpleMarkdown from "@khanacademy/simple-markdown";
import { JSDOM } from "jsdom";

export const stripper = (markdown: string) => {
  const mdParse = SimpleMarkdown.defaultBlockParse;
  const htmlOutput = SimpleMarkdown.defaultHtmlOutput;

  const syntaxTree = markdown.split("\n").map((line) => mdParse(line));

  const html = syntaxTree.map((tree) => htmlOutput(tree)).join("\n");
  const dom = new JSDOM(html);
  return dom.window.document.querySelector("*")!.textContent!;
};
