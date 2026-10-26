// Plugin JS do oxlint com as regras do projeto que não têm regra nativa (ADR-0015).
// API de plugin: https://oxc.rs/docs/guide/usage/linter/writing-js-plugins.html

// ADR-0015.R3: a engine é pura. Falha vira Result, tempo e aleatoriedade chegam por parâmetro.
const MESSAGES = {
  throw: "packages/domain não usa throw: retorne err(...) (ADR-0015.R3).",
  class: "packages/domain não usa class: funções puras sobre tipos Readonly (ADR-0015.R3).",
  clock: "packages/domain não lê o relógio: receba now: Timestamp por parâmetro (ADR-0015.R3).",
  random: "packages/domain não sorteia com Math.random: receba seed: string por parâmetro (ADR-0015.R3).",
};

const isMember = (node, object, property) =>
  node.type === "MemberExpression" &&
  !node.computed &&
  node.object.type === "Identifier" &&
  node.object.name === object &&
  node.property.type === "Identifier" &&
  node.property.name === property;

const domainPurity = {
  meta: { type: "problem", messages: MESSAGES },
  create(context) {
    const report = (node, messageId) => context.report({ node, messageId });
    return {
      ThrowStatement: (node) => report(node, "throw"),
      ClassDeclaration: (node) => report(node, "class"),
      ClassExpression: (node) => report(node, "class"),
      NewExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "Date") report(node, "clock");
      },
      CallExpression(node) {
        if (isMember(node.callee, "Date", "now")) report(node, "clock");
        if (isMember(node.callee, "Math", "random")) report(node, "random");
      },
    };
  },
};

export default {
  meta: { name: "merma" },
  rules: { "domain-purity": domainPurity },
};
