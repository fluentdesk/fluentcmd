/**
External API surface for HackMyResume.
@license MIT. Copyright (c) 2015 James M. Devlin / FluentDesk.
@module hackmyapi.js
*/

module.exports = {
  Sheet: require('./core/fresh-resume'),
  FRESHResume: require('./core/fresh-resume'),
  JRSResume: require('./core/jrs-resume'),
  FRESHTheme: require('./core/fresh-theme'),
  JRSTheme: require('./core/jrs-theme'),
  FluentDate: require('./core/fluent-date'),
  HtmlGenerator: require('./gen/html-generator'),
  TextGenerator: require('./gen/text-generator'),
  HtmlPdfGenerator: require('./gen/html-pdf-generator'),
  WordGenerator: require('./gen/word-generator'),
  MarkdownGenerator: require('./gen/markdown-generator'),
  JsonGenerator: require('./gen/json-generator'),
  YamlGenerator: require('./gen/yaml-generator'),
  JsonYamlGenerator: require('./gen/json-yaml-generator'),
  LaTeXGenerator: require('./gen/latex-generator'),
  HtmlPngGenerator: require('./gen/html-png-generator')
};
