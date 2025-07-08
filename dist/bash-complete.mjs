#!/usr/bin/env node
import{a as s}from"./chunk-CG4A43HM.mjs";import{a as o}from"./chunk-EL7RYGLA.mjs";import"./chunk-DTZQPLGQ.mjs";import{proposeCompletions as r}from"@stricli/core";var t=process.argv.slice(3);process.env.COMP_LINE?.endsWith(" ")&&t.push("");await r(o,t,s(process));try{for(let{completion:p}of await r(o,t,s(process)))process.stdout.write(`${p}
`)}catch{}
