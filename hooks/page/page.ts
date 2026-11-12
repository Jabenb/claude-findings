import { ISLANDS_DARK } from './theme'

/** Shiki, loaded by the page from esm.sh; pinned, so a page never changes under the person. */
export const SHIKI_VERSION = '4.5.0'

/**
 * The mod's page, whole. The hub serves it inside its shell; /hub.js gives it `window.hub`, /hub.css the hub's colours.
 * A raw template: backslashes stay as written, and there is no `${` in here.
 * The page never rebuilds what is on screen: every render is morphed into the DOM that is there, so switching tabs,
 * opening a card or a new state from the mod changes only what changed and nothing blinks.
 */
const SOURCE = String.raw`<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Находки</title>
<link rel="stylesheet" href="/hub.css">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap">
<style>
:root{
  --bg:#F6F5F1;--surface:#FFFFFF;--surface2:#F0EEE9;--border:#E4E1DA;--border2:#D3CFC6;
  --text:#1E1D1A;--muted:#64625C;--faint:#85837C;
  --claude:#B9552F;--claude-soft:rgba(185,85,47,.08);--claude-line:rgba(185,85,47,.42);
  --sugg:#4351C7;--sugg-soft:rgba(67,81,199,.07);--sugg-line:rgba(67,81,199,.42);--ring:rgba(67,81,199,.28);
  --hi:#BE3427;--hi-soft:rgba(190,52,39,.075);--hi-line:rgba(190,52,39,.38);
  --warn:#8F5B00;--warn-soft:rgba(214,152,20,.09);--warn-dot:#D69814;--warn-line:rgba(214,152,20,.55);
  --lo:#5A6276;--lo-soft:rgba(90,98,118,.09);
  --ok:#2A7A3D;--ok-soft:rgba(42,122,61,.07);--ok-line:rgba(42,122,61,.32);
  --track:#E7E4DD;--on-accent:#FFFFFF;--shadow:0 1px 2px rgba(30,25,10,.04),0 6px 20px rgba(30,25,10,.05);
  --toast:#1E1D1A;--toast-fg:#F4F3EF;
  --f-ui:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --f-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  color-scheme:light;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#121211;--surface:#1A1A19;--surface2:#242422;--border:#2B2B29;--border2:#3A3A37;
  --text:#EDECE8;--muted:#A6A59F;--faint:#85847E;
  --claude:#E3845F;--claude-soft:rgba(227,132,95,.10);--claude-line:rgba(227,132,95,.45);
  --sugg:#AEB6FA;--sugg-soft:rgba(174,182,250,.09);--sugg-line:rgba(174,182,250,.5);--ring:rgba(174,182,250,.35);
  --hi:#F2826F;--hi-soft:rgba(242,130,111,.085);--hi-line:rgba(242,130,111,.42);
  --warn:#F2B735;--warn-soft:rgba(242,183,53,.07);--warn-dot:#F2B735;--warn-line:rgba(242,183,53,.42);
  --lo:#A9B0C2;--lo-soft:rgba(169,176,194,.09);
  --ok:#66C47A;--ok-soft:rgba(102,196,122,.07);--ok-line:rgba(102,196,122,.32);
  --track:#2B2B29;--on-accent:#17120F;--shadow:0 1px 2px rgba(0,0,0,.35);--toast:#EDECE8;--toast-fg:#141413;color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#121211;--surface:#1A1A19;--surface2:#242422;--border:#2B2B29;--border2:#3A3A37;
  --text:#EDECE8;--muted:#A6A59F;--faint:#85847E;
  --claude:#E3845F;--claude-soft:rgba(227,132,95,.10);--claude-line:rgba(227,132,95,.45);
  --sugg:#AEB6FA;--sugg-soft:rgba(174,182,250,.09);--sugg-line:rgba(174,182,250,.5);--ring:rgba(174,182,250,.35);
  --hi:#F2826F;--hi-soft:rgba(242,130,111,.085);--hi-line:rgba(242,130,111,.42);
  --warn:#F2B735;--warn-soft:rgba(242,183,53,.07);--warn-dot:#F2B735;--warn-line:rgba(242,183,53,.42);
  --lo:#A9B0C2;--lo-soft:rgba(169,176,194,.09);
  --ok:#66C47A;--ok-soft:rgba(102,196,122,.07);--ok-line:rgba(102,196,122,.32);
  --track:#2B2B29;--on-accent:#17120F;--shadow:0 1px 2px rgba(0,0,0,.35);--toast:#EDECE8;--toast-fg:#141413;color-scheme:dark}

*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--text);font:14px/1.5 var(--f-ui)}
button{font:inherit;color:inherit;cursor:pointer;border:0;background:none;padding:0}
button:disabled{cursor:default}
:focus-visible{outline:2px solid var(--sugg);outline-offset:2px}
.mono,code{font-family:var(--f-mono)}
.wrap{max-width:1440px;margin:0 auto;padding-left:24px;padding-right:24px}

.hdr{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--border)}
.hdr .wrap{padding-block:14px;display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px}
.brand{display:flex;align-items:center;gap:12px;flex:1 1 auto;min-width:200px}
.logo{width:36px;height:36px;border-radius:10px;background:var(--claude-soft);display:grid;place-items:center;flex:none;color:var(--claude)}
.brand h1{margin:0;font-size:17px;font-weight:650;letter-spacing:-.015em;line-height:1.25}
.brand .sub{font-size:12px;color:var(--muted)}
.live{display:inline-flex;align-items:center;gap:6px}
.live::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--ok)}
.live.off::before{background:var(--hi)}
.search{position:relative;flex:0 1 320px;min-width:180px}
.search svg{position:absolute;left:12px;top:11px;color:var(--faint)}
.field{width:100%;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:10px;font:inherit;transition:border-color .15s,box-shadow .15s}
.field:focus{border-color:var(--sugg);box-shadow:0 0 0 3px var(--ring);outline:none}
.field::placeholder{color:var(--faint)}
.search .field{height:38px;padding:0 12px 0 36px;font-size:13.5px}
.iconbtn{width:38px;height:38px;border:1px solid var(--border);background:var(--surface);border-radius:10px;display:grid;place-items:center;color:var(--muted)}
.ghost:hover:not(:disabled){background:var(--surface2);color:var(--text)}

.layout{display:grid;grid-template-columns:minmax(250px,290px) minmax(0,1fr);gap:28px;align-items:start;padding-block:24px 64px}
.side{position:sticky;top:91px;max-height:calc(100vh - 115px);overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--border2) transparent;min-width:0;display:flex;flex-direction:column;gap:18px;padding:2px}
.navc,.asidec{display:flex;flex-direction:column;gap:18px;min-width:0}
.asidec{padding-top:6px;border-top:1px solid var(--border)}
.mainc{min-width:0;display:flex;flex-direction:column;gap:18px}
.lbl{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}

.navgrp{display:flex;flex-direction:column;gap:4px}
.navgrp .lbl{padding:0 10px 6px}
.nav{border:1px solid transparent;border-radius:12px;padding:11px 12px;display:flex;flex-direction:column;gap:8px;text-align:left;transition:background .15s,border-color .15s,box-shadow .15s}
.nav:hover{background:var(--surface2)}
.nav[aria-current="true"]{background:var(--surface);border-color:var(--border);box-shadow:var(--shadow)}
.nav .r{display:flex;align-items:center;gap:8px;width:100%}
.nav .r b{flex:1;font-weight:600}
.nav .r .n{font-family:var(--f-mono);font-size:12px;color:var(--muted)}
.segs{display:flex;gap:2px;height:4px;width:100%}
.segs i{border-radius:2px;transition:flex-grow .5s cubic-bezier(.2,.7,.3,1);min-width:0}
.nav .sub{font-size:12px;color:var(--muted);display:flex;flex-wrap:wrap;gap:2px 10px}
.nav .sub span{display:inline-flex;gap:4px;align-items:center}
.dashed{margin-top:6px;height:34px;border:1px dashed var(--border2);border-radius:10px;font-size:12.5px;color:var(--muted);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.dashed:disabled{color:var(--faint);opacity:.7}
.box{border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:9px;background:var(--surface)}
details.keys summary{cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between}
details.keys summary::-webkit-details-marker{display:none}
details.keys summary::after{content:"";width:7px;height:7px;border-right:1.5px solid var(--faint);border-bottom:1.5px solid var(--faint);transform:rotate(45deg) translateY(-2px);transition:transform .2s}
details.keys[open] summary::after{transform:rotate(225deg) translateY(-2px)}
.keyrow{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--muted)}
kbd{font-family:var(--f-mono);font-size:11px;min-width:20px;height:20px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border2);border-bottom-width:2px;border-radius:5px;color:var(--muted);background:var(--surface)}

.mhead{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:4px 2px}
.mhead .t{flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:4px}
.mhead h2{margin:0;font-size:19px;font-weight:650;letter-spacing:-.015em;line-height:1.3}
.mhead .t span{font-size:12.5px;color:var(--muted)}
.filters{display:flex;flex-wrap:wrap;gap:6px}
.filter{height:32px;border:1px solid var(--border);border-radius:999px;padding:0 12px;font-size:13px;font-weight:500;display:inline-flex;align-items:center;gap:7px;color:var(--muted);transition:background .15s,color .15s,border-color .15s,box-shadow .15s}
.filter:hover{color:var(--text)}
.filter[aria-selected="true"]{background:var(--surface);color:var(--text);border-color:var(--border2);box-shadow:var(--shadow)}
.filter .g{font-family:var(--f-mono);font-size:12px}
.filter .c{font-family:var(--f-mono);font-size:11.5px;color:var(--faint)}
.g-high{color:var(--hi)} .g-medium{color:var(--warn-dot)} .g-low{color:var(--lo)}
.ghostbtn{height:34px;border-radius:9px;padding:0 10px;font-size:13px;color:var(--muted);display:inline-flex;align-items:center;gap:6px}

.stack{display:flex;flex-direction:column;gap:10px}
.row{width:100%;text-align:left;border:1px solid var(--border);border-radius:12px;padding:11px 16px;display:flex;align-items:center;gap:12px;transition:background .15s}
.row:hover{background:var(--surface)}
.row .g{font-family:var(--f-mono);font-size:12px;flex:none;width:14px;text-align:center}
.row .id{font-family:var(--f-mono);font-size:12px;color:var(--faint);flex:none}
.row .tt{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.row .lc{flex:0 1 auto;max-width:36%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--f-mono);font-size:12px;color:var(--faint)}
.row .ok{width:22px;height:22px;border-radius:50%;background:var(--ok-soft);display:grid;place-items:center;flex:none;color:var(--ok)}
.row.closed .tt{color:var(--muted)}
.chip{display:inline-flex;align-items:center;gap:6px;height:22px;border-radius:999px;padding:0 9px;font-size:12px;font-weight:550;white-space:nowrap;flex:none}

.card{border:1px solid var(--sugg-line);background:var(--surface);border-radius:16px;box-shadow:0 0 0 4px var(--ring),var(--shadow);display:flex;flex-direction:column}
.card.closed{box-shadow:var(--shadow);border-color:var(--border)}
.cbody{padding:18px 20px 20px;display:flex;flex-direction:column;gap:22px}
.chead{display:flex;flex-direction:column;gap:10px}
.chead .r{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.idtag{font-family:var(--f-mono);font-size:12px;font-weight:600;background:var(--surface2);border-radius:7px;padding:2px 8px}
.loc{font-family:var(--f-mono);font-size:12px;color:var(--muted);border-radius:7px;padding:2px 8px;border:1px solid var(--border);display:inline-flex;align-items:center;gap:6px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.loc:hover{color:var(--text);border-color:var(--border2)}
.chead h3{margin:0;font-size:19px;line-height:1.35;font-weight:650;letter-spacing:-.015em;text-wrap:balance}
.sp{flex:1 1 auto}

.sec{display:flex;flex-direction:column;gap:10px}
.sech{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.plain{margin:0;font-size:16px;line-height:1.55;max-width:64ch;text-wrap:pretty}
.vers{display:flex;gap:6px;flex-wrap:wrap}
.ver{height:26px;border:1px solid var(--border);border-radius:8px;padding:0 8px 0 4px;display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);transition:background .15s,border-color .15s,color .15s}
.ver .k{width:18px;height:18px;border-radius:5px;display:grid;place-items:center;font-family:var(--f-mono);font-size:11px;font-weight:600;background:var(--surface2);transition:background .15s,color .15s}
.ver:hover{border-color:var(--border2)}
.ver[aria-pressed="true"]{border-color:var(--sugg);background:var(--sugg-soft);color:var(--sugg)}
.ver[aria-pressed="true"] .k{background:var(--sugg);color:var(--surface)}
.vnote{font-size:12.5px;color:var(--muted)}
.vnote q{color:var(--text)}

.steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.step{display:flex;gap:12px;align-items:flex-start;padding:8px 12px 8px 10px;border-radius:12px;border:1px solid transparent}
.step .k{width:22px;height:22px;border-radius:7px;flex:none;display:grid;place-items:center;font-family:var(--f-mono);font-size:11.5px;font-weight:600;background:var(--surface2);color:var(--muted);margin-top:1px}
.step .tx{min-width:0;flex:1}
.step .at{font-family:var(--f-mono);font-size:12px;color:var(--faint);margin-right:6px}
.step.broken{background:var(--hi-soft);border-color:var(--hi-line)}
.step.broken .k{background:var(--hi);color:var(--surface)}
.step.fixed{background:var(--ok-soft);border-color:var(--ok-line)}
.step.fixed .k{background:var(--ok);color:var(--surface)}
.flag{display:block;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin-bottom:1px}
.broken .flag{color:var(--hi)} .fixed .flag{color:var(--ok)}
code.v{font-size:12.5px;padding:1px 6px;border-radius:6px;background:var(--surface2);white-space:nowrap}
.broken code.v,.fixed code.v{background:var(--surface)}

.who{display:grid;grid-template-columns:minmax(110px,max-content) 1fr;border-top:1px solid var(--border)}
.who>div{padding:9px 0;border-bottom:1px solid var(--border)}
.who .w{font-weight:600;padding-right:18px}
.who .wide{grid-column:1 / -1}
.who small{display:block;color:var(--muted);font-size:12.5px}

.typing{display:flex;gap:10px;align-items:center}
.av{width:28px;height:28px;border-radius:50%;flex:none;display:grid;place-items:center;font-size:12px;font-weight:650}
.av.c{background:var(--claude-soft);color:var(--claude)} .av.y{background:var(--surface2);color:var(--muted)}
.bub{display:inline-flex;align-items:center;gap:10px;background:var(--surface2);border-radius:4px 12px 12px 12px;padding:9px 12px;font-size:13px;color:var(--muted)}
.dots{display:inline-flex}
.dots i{display:inline-block;width:5px;height:5px;margin:0 2px;border-radius:50%;background:var(--warn-dot);animation:dot 1.2s infinite ease-in-out}
.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}
@keyframes dot{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}

.sol{border:1px solid var(--claude-line);border-radius:14px;overflow:hidden}
.solh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:var(--claude-soft);border-bottom:1px solid var(--claude-line)}
.solh .who2{display:flex;flex-direction:column;flex:1;min-width:0}
.solh .who2 span{font-size:12px;color:var(--claude);font-weight:600}
.solh .who2 b{font-size:14.5px;font-weight:650}
.solb{padding:16px;display:flex;flex-direction:column;gap:20px}
.change{margin:0;font-size:15px;line-height:1.55;max-width:64ch}
.gaps{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}
.gaps li{display:flex;gap:10px;font-size:14px}
.gaps li::before{content:"";flex:none;width:7px;height:7px;margin-top:7px;border-radius:50%;background:var(--warn-dot)}
.files{display:flex;gap:6px;flex-wrap:wrap}
.fbtn{font-family:var(--f-mono);font-size:12px;height:28px;padding:0 10px;border-radius:8px;border:1px solid var(--border);color:var(--muted);display:inline-flex;gap:8px;align-items:center;transition:background .15s,border-color .15s,color .15s}
.fbtn[aria-pressed="true"]{color:var(--text);border-color:var(--sugg);background:var(--sugg-soft)}
.fbtn .a{color:var(--ok)} .fbtn .d{color:var(--hi)}

/* The code block wears Islands Dark in both page themes: the theme's own editor colours and Shiki's tokens. */
.code{--ed-bg:#181a1d;--ed-fg:#bcbec4;--ed-dim:#4e5157;--ed-line:#25262a;--ed-add:#73b00a;--ed-del:#f75464;
  border:1px solid var(--ed-line);border-radius:12px;background:var(--ed-bg);color:var(--ed-fg);overflow:hidden}
.code .bar{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--ed-line);font:12px var(--f-mono);color:#7a7e85}
.code .bar .lang{margin-left:auto;text-transform:uppercase;font-size:10.5px;letter-spacing:.06em}
.code .lines{overflow-x:auto;font:12.5px/1.7 var(--f-mono);font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;padding:6px 0;scrollbar-width:thin;scrollbar-color:#3a3d42 transparent}
.code .ln{display:grid;grid-template-columns:30px 1fr;min-width:max-content;padding-right:16px;white-space:pre}
.code .ln .m{text-align:center;color:var(--ed-dim);user-select:none}
.code .ln.add{background:rgba(115,176,10,.12)} .code .ln.add .m{color:var(--ed-add)}
.code .ln.del{background:rgba(247,84,100,.12)} .code .ln.del .m{color:var(--ed-del)}
.code .ln.hunk{color:#6f737a;background:rgba(86,168,245,.07);font-style:italic}
.code .ln .c{color:var(--ed-fg)}

.banner{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border-radius:12px;font-size:13.5px;border:1px solid}
.banner b{display:block;font-size:14px;font-weight:600}
.banner.ok{background:var(--ok-soft);border-color:var(--ok-line)} .banner.ok .ic{color:var(--ok)}
.banner.wait{background:var(--warn-soft);border-color:var(--warn-line)} .banner.wait .ic{color:var(--warn)}
.banner.neutral{background:var(--surface2);border-color:var(--border)} .banner.neutral .ic{color:var(--muted)}
.banner.info{background:var(--sugg-soft);border-color:var(--sugg-line)} .banner.info .ic{color:var(--sugg)}
.banner .ic{flex:none;margin-top:1px}

.thread{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.thread li{display:flex;gap:10px;align-items:flex-start}
.thread .m{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.thread .nm{font-size:12px;color:var(--muted)} .thread .nm b{font-weight:600;color:var(--text)} .thread .nm b.c{color:var(--claude)}
.thread .tx{align-self:flex-start;max-width:100%;background:var(--surface2);border-radius:4px 12px 12px 12px;padding:7px 12px;font-size:13.5px;border:1px solid transparent}
.thread .tx.c{background:var(--claude-soft);border-color:var(--claude-line)}
.thread .tx q{color:var(--muted)}

.foot{position:sticky;bottom:0;z-index:2;border-top:1px solid var(--border);background:var(--surface);border-radius:0 0 16px 16px;padding:12px 20px 14px;display:flex;flex-direction:column;gap:10px}
.note textarea{display:block;min-height:42px;max-height:120px;resize:none;padding:10px 14px;font-size:14px;line-height:1.5;border-radius:12px}
.notemeta{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:var(--faint);margin-top:6px;min-height:18px}
.notemeta .pv{color:var(--sugg);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.notemeta .kb{display:inline-flex;gap:4px;align-items:center;flex:none}
.acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.btn{height:36px;border-radius:9px;padding:0 13px;font-size:13px;font-weight:550;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;border:1px solid var(--border);background:var(--surface);transition:background .15s,border-color .15s,filter .15s,opacity .15s}
.btn:hover:not(:disabled){background:var(--surface2);border-color:var(--border2)}
.btn:active:not(:disabled){transform:translateY(1px)}
.btn.primary{background:var(--claude);border-color:var(--claude);color:var(--on-accent);font-weight:600}
.btn.primary:hover:not(:disabled){filter:brightness(1.07);background:var(--claude);border-color:var(--claude)}
.btn.quiet{border-color:transparent;background:transparent;color:var(--muted)}
.btn.quiet:hover:not(:disabled){color:var(--text)}
.btn:disabled{opacity:.45}
.btn svg{flex:none}
.btn .kk{font-family:var(--f-mono);font-size:11px;opacity:.6;font-weight:500}

.panel{border:1px solid var(--border);background:var(--surface);border-radius:14px;box-shadow:var(--shadow);display:flex;flex-direction:column}
.panel ul{list-style:none;margin:0;padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px}
.panel li{display:flex;flex-direction:column;gap:2px;font-size:13px;min-width:0}
.panel li .q{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.panel li .a{font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.side{overflow-x:hidden}
code.v,.loc,.idtag,.step .at{font-variant-ligatures:none}
.pill{font-family:var(--f-mono);font-size:12px;color:var(--sugg);background:var(--sugg-soft);border-radius:999px;padding:1px 8px}
.phead{display:flex;align-items:center;justify-content:space-between;padding:0 4px}
.emptyp{margin:0;border:1px dashed var(--border2);border-radius:14px;padding:16px;font-size:13px;color:var(--muted)}
.hint{font-size:12.5px;color:var(--muted);padding:0 4px;margin:0}

.empty{border:1px dashed var(--border2);border-radius:16px;padding:56px 24px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px}
.empty .ic{width:64px;height:64px;border-radius:20px;background:var(--ok-soft);display:grid;place-items:center;color:var(--ok)}
.empty h2{margin:4px 0 0;font-size:19px;font-weight:650}
.empty p{margin:0;color:var(--muted);max-width:420px}

.toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,10px);opacity:0;pointer-events:none;z-index:30;background:var(--toast);color:var(--toast-fg);border-radius:12px;padding:10px 10px 10px 16px;display:flex;align-items:center;gap:14px;font-size:13.5px;font-weight:500;box-shadow:0 10px 30px rgba(0,0,0,.25);max-width:calc(100vw - 32px);transition:opacity .25s,transform .3s cubic-bezier(.2,.7,.3,1)}
.toast.show{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.toast button{color:var(--toast-fg);font-weight:650;text-decoration:underline;text-underline-offset:3px;padding:4px 8px;border-radius:7px}

.scrim{position:fixed;inset:0;background:rgba(10,10,8,.35);opacity:0;pointer-events:none;transition:opacity .2s;z-index:40}
.scrim.show{opacity:1;pointer-events:auto}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(560px,100%);background:var(--bg);border-left:1px solid var(--border);z-index:41;transform:translateX(100%);transition:transform .3s cubic-bezier(.2,.7,.3,1);display:flex;flex-direction:column}
.drawer.show{transform:none}
.drawer header{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid var(--border)}
.drawer header h2{margin:0;font-size:17px;font-weight:650;flex:1;letter-spacing:-.015em}
.drawer .body{overflow-y:auto;padding:20px 20px 40px;display:flex;flex-direction:column;gap:22px}
.rule{border:1px solid var(--claude-line);background:var(--claude-soft);border-radius:4px 14px 14px 14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-size:13.5px}
.rule p{margin:0}
.rule code{font-size:12px;background:var(--surface);border-radius:5px;padding:0 5px}
.tool{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface)}
.tool .th{padding:12px 14px;display:flex;flex-direction:column;gap:3px}
.tool .th code{font-size:13px;font-weight:600;color:var(--claude)}
.tool .th span{font-size:13px;color:var(--muted)}
pre.pre{margin:0;padding:12px 14px;font:12px/1.6 var(--f-mono);overflow-x:auto;white-space:pre-wrap;color:var(--text);border-top:1px solid var(--border)}

.rowwrap{display:flex;align-items:center;gap:10px}
.rowwrap .row{flex:1;min-width:0}
.pick{width:18px;height:18px;border-radius:5px;border:1.5px solid var(--border2);display:grid;place-items:center;flex:none;cursor:pointer;color:var(--on-accent);background:var(--surface);transition:background .15s,border-color .15s}
.pick:hover{border-color:var(--sugg)}
.pick[aria-checked="true"]{background:var(--sugg);border-color:var(--sugg)}
.bulk{border:1px solid var(--sugg-line);background:var(--sugg-soft);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}
.brow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.bcount{font-weight:600}
.bcount .mono{font-weight:500;font-size:12px;color:var(--muted)}
.bhint{font-size:12.5px;color:var(--muted)}
.btn.on{border-color:var(--ok-line);background:var(--ok-soft);color:var(--ok)}
.ask textarea{display:block;min-height:42px;max-height:160px;resize:none;padding:10px 14px;font-size:14px;line-height:1.5;border-radius:12px}
.askbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px}

.thread .qd{font-size:11.5px;color:var(--sugg)}
.thread .unq{border:0;background:none;color:var(--muted);cursor:pointer;font-size:12px;padding:0 2px}
.thread .unq:hover{color:var(--text)}
.thread .tx.q{border-style:dashed;border-color:var(--sugg-line)}
.askhint{font-size:12px;color:var(--faint)}
.chat .tx p{margin:0 0 6px}
.chat .tx p:last-child{margin:0}
.code .bar{flex-wrap:wrap}
.code .bar .path{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.code .modes{display:inline-flex;gap:2px;background:#1f2124;border-radius:7px;padding:2px}
.code .cm{font:11px var(--f-ui);color:#7a7e85;padding:3px 8px;border-radius:5px;transition:background .15s,color .15s}
.code .cm:hover:not(:disabled){color:#dfe1e5}
.code .cm[aria-pressed="true"]{background:#2b2d30;color:#dfe1e5}
.code .cm:disabled{opacity:.4}
.code .cnote{padding:6px 12px;font:12px var(--f-ui);color:#7a7e85;border-bottom:1px solid var(--ed-line)}
.code .lines.two{overflow-x:hidden;padding:0}
.srow{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);width:100%}
.srow .half{display:grid;grid-template-columns:40px 16px minmax(0,1fr);min-width:0;white-space:pre-wrap;word-break:break-all}
.srow .half+.half{border-left:1px solid var(--ed-line)}
.srow .no{color:var(--ed-dim);text-align:right;padding-right:6px;user-select:none}
.srow .m{text-align:center;color:var(--ed-dim);user-select:none}
.srow .half.del{background:rgba(247,84,100,.12)} .srow .half.del .m{color:var(--ed-del)}
.srow .half.add{background:rgba(115,176,10,.12)} .srow .half.add .m{color:var(--ed-add)}
.srow .half.none{background:repeating-linear-gradient(135deg,transparent 0 6px,rgba(255,255,255,.025) 6px 12px)}
.srow.hunk{display:block;color:#6f737a;background:rgba(86,168,245,.07);font-style:italic;padding:0 12px}
.srow.head{font:600 10.5px var(--f-ui);letter-spacing:.06em;text-transform:uppercase;color:#7a7e85;border-bottom:1px solid var(--ed-line)}
.srow.head .half{display:block;padding:5px 12px}
.srow.fold{display:flex;align-items:center;justify-content:center;gap:6px;color:#7a7e85;background:rgba(255,255,255,.03);font:12px var(--f-ui);padding:4px;border-block:1px solid var(--ed-line)}
.srow.fold:hover{color:#dfe1e5}
@media (max-width:980px){.layout{grid-template-columns:minmax(220px,250px) minmax(0,1fr);gap:20px}}
@media (max-width:760px){
  .wrap{padding-left:16px;padding-right:16px}
  .layout{grid-template-columns:minmax(0,1fr);gap:18px}
  .side{display:contents}
  .navc{grid-row:1} .mainc{grid-row:2} .asidec{grid-row:3}
  .navgrp{flex-direction:row;overflow-x:auto;gap:6px}
  .navgrp .lbl,.keys{display:none}
  .nav{flex:1 0 140px;padding:9px 10px}
  .nav .sub{display:none}
  .row .lc{display:none}
  .cbody{padding:16px}
  .foot{padding:10px 14px 12px;position:static}
  .notemeta .kb,.btn .kk{display:none}
  .hdr{position:static}
  .brand{flex-basis:100%}
  .search{flex:1 1 0;min-width:0}
}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;transition-duration:.001ms!important}}
</style>
</head>
<body>
<header class="hdr"><div class="wrap">
  <div class="brand">
    <div class="logo"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h8M3 10h6M3 15h5"/><circle cx="14.5" cy="11.5" r="3.2"/><path d="M16.8 13.8L18.5 15.5"/></svg></div>
    <div><h1 id="brandTitle"></h1><span class="sub" id="brandSub"></span></div>
  </div>
  <div class="search">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.6"/><path d="M10.5 10.5L14 14"/></svg>
    <input class="field" id="q" type="search">
  </div>
</div></header>

<div class="wrap layout">
  <div class="side">
    <nav class="navc" id="nav"></nav>
    <aside class="asidec" id="aside"></aside>
  </div>
  <main class="mainc" id="main"></main>
</div>

<div class="toast" id="toast" role="status"><span id="toastMsg"></span><button type="button" id="toastUndo"></button></div>
<div class="scrim" id="scrim"></div>
<aside class="drawer" id="drawer"></aside>

<script>window.FINDINGS_THEME = __THEME__;</script>
<script type="module">
  try {
    const base = 'https://esm.sh/shiki@__SHIKI__'
    const [core, engine, langs] = await Promise.all([import(base + '/core'), import(base + '/engine/javascript'), import(base + '/langs')])
    const highlighter = await core.createHighlighterCore({ themes: [window.FINDINGS_THEME], langs: [], engine: engine.createJavaScriptRegexEngine({ forgiving: true }) })
    window.findingsShiki = { highlighter, languages: langs.bundledLanguages }
  } catch (error) {
    window.findingsShiki = null
    window.findingsShikiError = String(error)
  }
  window.dispatchEvent(new Event('findings:shiki'))
</script>
<script src="/hub.js"></script>
<script>
(function () {
'use strict'

var TEXTS = {
  ru: {
    title: 'Находки', branch: 'Ветка', found: function (n) { return 'находок: ' + n }, updated: 'обновлено', offline: 'сессия не слушает', hubDown: 'хаб недоступен',
    search: 'Поиск по находкам и файлам…', findings: 'Находки', clear: 'Убрать закрытые',
    groups: { open: 'Ждут тебя', deferred: 'Отложенные', closed: 'Закрытые' },
    groupSub: { open: 'Сначала самые серьёзные', deferred: 'Claude помнит о них в следующих сообщениях', closed: 'Исправленные и снятые' },
    sev: { high: 'Высокая', medium: 'Средняя', low: 'Низкая' }, all: 'Все', empty: 'пусто',
    fixedN: 'исправлено', dismissedN: 'не проблема', copyList: 'Копировать список', copied: 'Скопировано', copyFail: 'Не удалось скопировать', listCopied: 'Список скопирован',
    emptyTitle: { open: 'Всё разобрано', deferred: 'Отложенных нет', closed: 'Закрытых нет', filter: 'Здесь пусто' },
    emptyText: { open: 'Новые находки появятся здесь, когда Claude закончит ревью, аудит или расследование.', deferred: 'Нажми «Отложить» на находке, чтобы вернуться к ней позже. Claude будет о ней помнить.', closed: 'Сюда попадают исправленные находки и те, что отмечены «Не проблема».', filter: 'Нет находок под этот фильтр или поиск.' },
    hasFix: 'Есть решение', open: 'Открыть',
    plain: 'По-простому', how: 'Как это ломается', who: 'Кто и как заметит', solution: 'Решение', history: 'История',
    origin: { first: 'Первое', claude: 'Claude', simpler: 'Проще', example: 'Другой пример' }, byNote: 'По твоему уточнению:',
    breaks: 'Здесь ломается', nowSo: 'Теперь так',
    typingSimpler: 'Claude объясняет проще…', typingExample: 'Claude подбирает другой пример…', typingFix: 'Claude готовит решение. Код пока не меняется…', applying: 'Claude применяет решение',
    applyingText: 'Правит код и проверяет. Находка закроется, когда он отметит её исправленной.',
    proposes: 'Claude предлагает', variant: function (i, n) { return 'вариант ' + i + ' из ' + n }, untouched: 'Код не изменён',
    change: 'Что изменится', after: 'Тот же пример после исправления', diffs: 'Изменения в коде', gaps: 'Что это решение не закрывает', noGaps: 'Claude не назвал, чего это решение не закрывает.',
    deferredTitle: 'Отложено', deferredText: 'Claude держит её в памяти и не тронет, пока ты её не вернёшь.',
    fixedTitle: 'Исправлено и проверено', dismissedTitle: 'Не проблема', dismissedText: 'Закрыто без исправления',
    notePh: 'Уточнение к действию (необязательно)…', noteGoes: 'Уйдёт с действием:', escHint: 'выйти из поля',
    act: { fix: 'Чинить', simpler: 'Не понял, проще', example: 'Другой пример', defer: 'Отложить', restoreDeferred: 'Вернуть', dismiss: 'Не проблема', apply: 'Применить', another: 'Другой вариант', discuss: 'Обсудить в чате', cancel: 'Отмена', reopen: 'Вернуть в работу' },
    memory: 'Claude помнит', memoryEmpty: 'Отложенных находок нет. Отложенные появятся здесь, и Claude будет учитывать их в следующих сообщениях.',
    sent: 'Ушло Claude', sentEmpty: 'Пока ничего. Нажатия на карточках уходят Claude сообщениями от твоего имени.', sentHint: 'Кнопки на карточках отправляют Claude короткие сообщения; «Не понял, проще» и «Другой пример» отвечаются сбоку, без чата.',
    toolsBtn: 'Инструменты и правило для Claude', keys: 'Клавиши',
    keyRows: [['След. / пред.', ['J', 'K']], ['Чинить / применить', ['⌘', '↵']], ['Проще', ['S']], ['Другой пример', ['E']], ['Отложить', ['D']], ['Не проблема', ['X']]],
    moment: { reported: 'Нашёл', simpler: 'Не понял, проще', example: 'Другой пример', explained: 'Новое объяснение', fix: 'Чинить', another: 'Другой вариант', proposed: 'Решение', apply: 'Применить', fixed: 'Исправлено и проверено', defer: 'Отложил', dismiss: 'Не проблема', restore: 'Вернул в работу', cancel: 'Отменил', discuss: 'Обсудить в чате' },
    you: 'Ты', deferredToast: 'Отложено. Claude будет помнить', dismissedToast: 'Закрыто как «не проблема»', undo: 'Отменить', cleared: function (n) { return 'Убрано закрытых: ' + n },
    sendFail: 'Хаб не ответил, нажми ещё раз', discussToast: 'Цитата в поле ввода чата', waitingSession: 'Сессия не слушает: нажатие уйдёт, когда она вернётся',
    drawerTitle: 'Инструменты и правило', ruleLbl: 'Правило в системном промпте',
    rule: ['Две и больше находок (ревью, аудит, расследование) Claude показывает здесь через <code>report</code>, а не списком в чате.', 'Каждую объясняет для человека, не читавшего код: без имён классов, с примером из 3–6 шагов с конкретными значениями и шагом, где ломается.', 'Не меняет код, пока ты не нажал «Применить». После правки проверяет и только тогда вызывает <code>mark_fixed</code>.', 'Отложенные находки уходят с каждым твоим сообщением, чтобы Claude их не трогал.'],
    toolsLbl: 'Три инструмента', tools: [['report', 'Показать находки или новое объяснение существующей.'], ['propose_fix', 'Показать решение в карточке. Код не меняется, пока ты не нажмёшь «Применить».'], ['mark_fixed', 'Отметить находку исправленной: только после «Применить», правки и проверки.']],
    seesLbl: 'Что Claude видит сейчас', seesHint: 'Эта строка добавляется к каждому твоему сообщению, пока есть отложенные находки.', seesNone: '(отложенных нет, ничего не добавляется)',
    deferredLine: function (ids) { return 'Находки ' + ids + ' отложены пользователем. Не чини и не поднимай их, пока он сам их не вернёт.' },
    close: 'Закрыть', copyPath: 'Скопировать путь'
  },
  en: {
    title: 'Findings', branch: 'Branch', found: function (n) { return n + ' findings' }, updated: 'updated', offline: 'session is not listening', hubDown: 'hub is not reachable',
    search: 'Search findings and files…', findings: 'Findings', clear: 'Clear closed',
    groups: { open: 'Waiting for you', deferred: 'Set aside', closed: 'Closed' },
    groupSub: { open: 'Most severe first', deferred: 'Claude keeps them in mind in your next messages', closed: 'Fixed and dismissed' },
    sev: { high: 'High', medium: 'Medium', low: 'Low' }, all: 'All', empty: 'empty',
    fixedN: 'fixed', dismissedN: 'not a problem', copyList: 'Copy list', copied: 'Copied', copyFail: 'Could not copy', listCopied: 'List copied',
    emptyTitle: { open: 'All sorted out', deferred: 'Nothing set aside', closed: 'Nothing closed', filter: 'Nothing here' },
    emptyText: { open: 'New findings show up here when Claude finishes a review, an audit or an investigation.', deferred: 'Press "Set aside" on a finding to come back to it later. Claude keeps it in mind.', closed: 'Fixed findings and the ones marked "Not a problem" land here.', filter: 'No findings match this filter or search.' },
    hasFix: 'Has a solution', open: 'Open',
    plain: 'In plain words', how: 'How it breaks', who: 'Who notices, and how', solution: 'Solution', history: 'History',
    origin: { first: 'First', claude: 'Claude', simpler: 'Simpler', example: 'Another example' }, byNote: 'After your note:',
    breaks: 'Breaks here', nowSo: 'Now it goes like this',
    typingSimpler: 'Claude is putting it more simply…', typingExample: 'Claude is picking another example…', typingFix: 'Claude is preparing a solution. No code changes yet…', applying: 'Claude is applying the solution',
    applyingText: 'Editing the code and checking it. The finding closes once Claude marks it fixed.',
    proposes: 'Claude proposes', variant: function (i, n) { return 'option ' + i + ' of ' + n }, untouched: 'Code unchanged',
    change: 'What changes', after: 'The same example after the fix', diffs: 'Code changes', gaps: 'What this solution leaves open', noGaps: 'Claude named nothing this solution leaves open.',
    deferredTitle: 'Set aside', deferredText: 'Claude keeps it in mind and will not touch it until you bring it back.',
    fixedTitle: 'Fixed and checked', dismissedTitle: 'Not a problem', dismissedText: 'Closed without a fix',
    notePh: 'A note for the action (optional)…', noteGoes: 'Goes with the action:', escHint: 'leave the field',
    act: { fix: 'Fix', simpler: 'Simpler, please', example: 'Another example', defer: 'Set aside', restoreDeferred: 'Bring back', dismiss: 'Not a problem', apply: 'Apply', another: 'Another option', discuss: 'Discuss in chat', cancel: 'Cancel', reopen: 'Reopen' },
    memory: 'Claude remembers', memoryEmpty: 'Nothing set aside. Findings you set aside show up here, and Claude keeps them in mind in your next messages.',
    sent: 'Sent to Claude', sentEmpty: 'Nothing yet. Presses on the cards reach Claude as messages from you.', sentHint: 'Buttons on the cards send Claude short messages; "Simpler" and "Another example" are answered on the side, without the chat.',
    toolsBtn: 'Tools and rule for Claude', keys: 'Keys',
    keyRows: [['Next / previous', ['J', 'K']], ['Fix / apply', ['⌘', '↵']], ['Simpler', ['S']], ['Another example', ['E']], ['Set aside', ['D']], ['Not a problem', ['X']]],
    moment: { reported: 'Found it', simpler: 'Simpler, please', example: 'Another example', explained: 'New explanation', fix: 'Fix', another: 'Another option', proposed: 'Solution', apply: 'Apply', fixed: 'Fixed and checked', defer: 'Set aside', dismiss: 'Not a problem', restore: 'Reopened', cancel: 'Cancelled', discuss: 'Discuss in chat' },
    you: 'You', deferredToast: 'Set aside. Claude will keep it in mind', dismissedToast: 'Closed as "not a problem"', undo: 'Undo', cleared: function (n) { return 'Cleared closed: ' + n },
    sendFail: 'The hub did not answer, press again', discussToast: 'The quote is in the chat prompt box', waitingSession: 'The session is not listening: the press goes out once it is back',
    drawerTitle: 'Tools and rule', ruleLbl: 'Rule in the system prompt',
    rule: ['Two or more findings (a review, an audit, an investigation) go here through <code>report</code>, not as a list in chat.', 'Each one is explained for a person who has not read the code: no class names, an example of 3–6 steps with concrete values, and the step where it breaks.', 'No code changes until you press "Apply". After the edit Claude checks it, and only then calls <code>mark_fixed</code>.', 'Findings you set aside ride along with every message of yours, so Claude leaves them alone.'],
    toolsLbl: 'Three tools', tools: [['report', 'Show findings, or a new explanation of one.'], ['propose_fix', 'Show a solution in the card. No code changes until you press "Apply".'], ['mark_fixed', 'Mark a finding fixed: only after "Apply", the edit and a check.']],
    seesLbl: 'What Claude sees now', seesHint: 'This line rides along with every message of yours while something is set aside.', seesNone: '(nothing set aside, nothing is added)',
    deferredLine: function (ids) { return 'Findings ' + ids + ' are set aside by the user. Do not fix or raise them until the user brings them back.' },
    close: 'Close', copyPath: 'Copy the path'
  },
  uk: {
    title: 'Знахідки', branch: 'Гілка', found: function (n) { return 'знахідок: ' + n }, updated: 'оновлено', offline: 'сесія не слухає', hubDown: 'хаб недоступний',
    search: 'Пошук по знахідках і файлах…', findings: 'Знахідки', clear: 'Прибрати закриті',
    groups: { open: 'Чекають на тебе', deferred: 'Відкладені', closed: 'Закриті' },
    groupSub: { open: 'Спершу найсерйозніші', deferred: 'Claude памʼятає про них у наступних повідомленнях', closed: 'Виправлені й зняті' },
    sev: { high: 'Висока', medium: 'Середня', low: 'Низька' }, all: 'Усі', empty: 'порожньо',
    fixedN: 'виправлено', dismissedN: 'не проблема', copyList: 'Копіювати список', copied: 'Скопійовано', copyFail: 'Не вдалося скопіювати', listCopied: 'Список скопійовано',
    emptyTitle: { open: 'Усе розібрано', deferred: 'Відкладених немає', closed: 'Закритих немає', filter: 'Тут порожньо' },
    emptyText: { open: 'Нові знахідки зʼявляться тут, коли Claude закінчить рев’ю, аудит чи розслідування.', deferred: 'Натисни «Відкласти» на знахідці, щоб повернутися до неї пізніше. Claude памʼятатиме про неї.', closed: 'Сюди потрапляють виправлені знахідки й ті, що позначені «Не проблема».', filter: 'Немає знахідок під цей фільтр чи пошук.' },
    hasFix: 'Є рішення', open: 'Відкрити',
    plain: 'Простими словами', how: 'Як це ламається', who: 'Хто і як помітить', solution: 'Рішення', history: 'Історія',
    origin: { first: 'Перше', claude: 'Claude', simpler: 'Простіше', example: 'Інший приклад' }, byNote: 'За твоїм уточненням:',
    breaks: 'Тут ламається', nowSo: 'Тепер так',
    typingSimpler: 'Claude пояснює простіше…', typingExample: 'Claude підбирає інший приклад…', typingFix: 'Claude готує рішення. Код поки не змінюється…', applying: 'Claude застосовує рішення',
    applyingText: 'Править код і перевіряє. Знахідка закриється, коли він позначить її виправленою.',
    proposes: 'Claude пропонує', variant: function (i, n) { return 'варіант ' + i + ' з ' + n }, untouched: 'Код не змінено',
    change: 'Що зміниться', after: 'Той самий приклад після виправлення', diffs: 'Зміни в коді', gaps: 'Чого це рішення не закриває', noGaps: 'Claude не назвав, чого це рішення не закриває.',
    deferredTitle: 'Відкладено', deferredText: 'Claude тримає її в памʼяті й не чіпатиме, доки ти її не повернеш.',
    fixedTitle: 'Виправлено й перевірено', dismissedTitle: 'Не проблема', dismissedText: 'Закрито без виправлення',
    notePh: 'Уточнення до дії (необовʼязково)…', noteGoes: 'Піде з дією:', escHint: 'вийти з поля',
    act: { fix: 'Лагодити', simpler: 'Не зрозумів, простіше', example: 'Інший приклад', defer: 'Відкласти', restoreDeferred: 'Повернути', dismiss: 'Не проблема', apply: 'Застосувати', another: 'Інший варіант', discuss: 'Обговорити в чаті', cancel: 'Скасувати', reopen: 'Повернути в роботу' },
    memory: 'Claude памʼятає', memoryEmpty: 'Відкладених знахідок немає. Відкладені зʼявляться тут, і Claude враховуватиме їх у наступних повідомленнях.',
    sent: 'Пішло Claude', sentEmpty: 'Поки нічого. Натискання на картках ідуть Claude повідомленнями від твого імені.', sentHint: 'Кнопки на картках надсилають Claude короткі повідомлення; «Простіше» та «Інший приклад» відповідаються збоку, без чату.',
    toolsBtn: 'Інструменти й правило для Claude', keys: 'Клавіші',
    keyRows: [['Наст. / попер.', ['J', 'K']], ['Лагодити / застосувати', ['⌘', '↵']], ['Простіше', ['S']], ['Інший приклад', ['E']], ['Відкласти', ['D']], ['Не проблема', ['X']]],
    moment: { reported: 'Знайшов', simpler: 'Не зрозумів, простіше', example: 'Інший приклад', explained: 'Нове пояснення', fix: 'Лагодити', another: 'Інший варіант', proposed: 'Рішення', apply: 'Застосувати', fixed: 'Виправлено й перевірено', defer: 'Відклав', dismiss: 'Не проблема', restore: 'Повернув у роботу', cancel: 'Скасував', discuss: 'Обговорити в чаті' },
    you: 'Ти', deferredToast: 'Відкладено. Claude памʼятатиме', dismissedToast: 'Закрито як «не проблема»', undo: 'Скасувати', cleared: function (n) { return 'Прибрано закритих: ' + n },
    sendFail: 'Хаб не відповів, натисни ще раз', discussToast: 'Цитата в полі вводу чату', waitingSession: 'Сесія не слухає: натискання піде, коли вона повернеться',
    drawerTitle: 'Інструменти й правило', ruleLbl: 'Правило в системному промпті',
    rule: ['Дві й більше знахідок (рев’ю, аудит, розслідування) Claude показує тут через <code>report</code>, а не списком у чаті.', 'Кожну пояснює для людини, яка не читала код: без імен класів, з прикладом із 3–6 кроків з конкретними значеннями й кроком, де ламається.', 'Не змінює код, доки ти не натиснув «Застосувати». Після правки перевіряє й лише тоді викликає <code>mark_fixed</code>.', 'Відкладені знахідки йдуть із кожним твоїм повідомленням, щоб Claude їх не чіпав.'],
    toolsLbl: 'Три інструменти', tools: [['report', 'Показати знахідки або нове пояснення існуючої.'], ['propose_fix', 'Показати рішення в картці. Код не змінюється, доки ти не натиснеш «Застосувати».'], ['mark_fixed', 'Позначити знахідку виправленою: лише після «Застосувати», правки й перевірки.']],
    seesLbl: 'Що Claude бачить зараз', seesHint: 'Цей рядок додається до кожного твого повідомлення, доки є відкладені знахідки.', seesNone: '(відкладених немає, нічого не додається)',
    deferredLine: function (ids) { return 'Знахідки ' + ids + ' відкладені користувачем. Не лагодь і не піднімай їх, доки він сам їх не поверне.' },
    close: 'Закрити', copyPath: 'Скопіювати шлях'
  }
}

var MORE = {
  ru: {
    discussion: 'Обсуждение', askPh: 'Спроси про находку или решение…', askSend: 'Спросить', queueBtn: 'В очередь',
    askHint: 'Вопрос уходит в чат сессии: Claude прочитает код и ответит сюда. «В очередь» копит вопросы, чтобы отправить их одним сообщением.',
    askingDeep: 'Вопрос ушёл в сессию, Claude читает код…', queuedTag: 'ждёт отправки', unqueue: 'Убрать',
    questionsN: function (n) { return 'Вопросов в очереди: ' + n }, questionsHint: 'Уйдут одним сообщением, Claude ответит в каждую карточку.', sendQuestions: 'Отправить вопросы',
    mode: { unified: 'Одна колонка', split: 'Две колонки', full: 'Файл целиком' }, noFull: 'Дифф не ложится на файл на диске (или файл не прочитан), поэтому файл целиком не показан.',
    fold: function (n) { return 'Ещё ' + n + ' строк без изменений' }, beforeLbl: 'Было', afterLbl: 'Стало', fileAt: 'файл на момент, когда решение было предложено',
    pickAll: 'Выбрать все', picked: function (n) { return 'Выбрано: ' + n }, prepareN: 'Подготовить решения', unpick: 'Снять выбор',
    approve: 'Одобрить', unapprove: 'Снять одобрение', approvedChip: 'Одобрено', approvedN: function (n) { return 'Одобрено решений: ' + n }, applyApproved: 'Применить одобренные',
    bulkHint: 'Claude предложит решение для каждой отмеченной, отдельно в её карточке. Код не меняется.',
    approveHint: 'Одобренные применяются одним сообщением, по очереди.',
    seesLbl: 'Что уйдёт Claude с твоим следующим сообщением', seesHint: 'Изменения уходят один раз. Списки «не проблема» и «отложены» тоже уходят один раз и ещё раз после сжатия разговора; закрытые инструменты Claude не трогают.', seesNone: '(ничего: изменений нет, списки Claude уже знает)',
    newsHead: 'Страница «Находки», что пользователь сделал там с прошлого сообщения:',
    newsWhat: { dismiss: 'закрыта как «не проблема»', defer: 'отложена', restore: 'возвращена в работу', cancel: 'предложенное решение отменено, по нему ничего не меняй', clear: 'убрана со страницы (была закрыта)', ask: 'вопрос сбоку от чата' },
    standingDismissed: function (ids) { return 'Пользователь закрыл как «не проблема», не поднимай их как проблему снова: ' + ids + '.' },
    standingDeferred: function (ids) { return 'Отложены пользователем, не чини и не поднимай их, пока он сам их не вернёт: ' + ids + '.' },
    rule: ['Две и больше находок (ревью, аудит, расследование) Claude показывает здесь через <code>report</code>, а не списком в чате.', 'Каждую объясняет для человека, не читавшего код: без имён классов, с примером из 3–6 шагов с конкретными значениями и шагом, где ломается.', 'Не меняет код, пока ты не нажал «Применить» или «Применить одобренные». После правки проверяет и только тогда вызывает <code>mark_fixed</code>.', 'Вопросы уходят в сессию (по одному или пачкой из очереди), Claude читает код и отвечает сюда через <code>reply</code>.', 'Что ты сделал на странице без сообщения (не проблема, отложить, вернуть, отмена решения), уходит Claude с твоим следующим сообщением.'],
    tools: [['report', 'Показать находки или новое объяснение существующей.'], ['propose_fix', 'Показать решение в карточке. Код не меняется, пока ты не нажмёшь «Применить».'], ['mark_fixed', 'Отметить находку исправленной: только после «Применить», правки и проверки.'], ['reply', 'Ответить на вопрос в обсуждении карточки.']],
    toolsLbl: 'Четыре инструмента',
    newsN: function (n) { return 'Claude ещё не знает: изменений — ' + n }, tellBtn: 'Сообщить Claude', tellHint: 'Уйдёт с твоим следующим сообщением, а когда разобрано всё — само.',
    moment: { reported: 'Нашёл', simpler: 'Не понял, проще', example: 'Другой пример', explained: 'Новое объяснение', fix: 'Чинить', another: 'Другой вариант', proposed: 'Решение', approve: 'Одобрил', unapprove: 'Снял одобрение', apply: 'Применить', fixed: 'Исправлено и проверено', defer: 'Отложил', dismiss: 'Не проблема', restore: 'Вернул в работу', cancel: 'Отменил', discuss: 'Обсудить в чате', ask: 'Вопрос', answered: 'Ответ', clear: 'Убрал со страницы', tell: 'Сообщил о странице' }
  },
  en: {
    discussion: 'Discussion', askPh: 'Ask about the finding or the solution…', askSend: 'Ask', queueBtn: 'Queue',
    askHint: 'The question goes to the session chat: Claude reads the code and answers here. "Queue" collects questions to send them in one message.',
    askingDeep: 'The question went to the session, Claude is reading the code…', queuedTag: 'not sent yet', unqueue: 'Remove',
    questionsN: function (n) { return 'Questions queued: ' + n }, questionsHint: 'They go in one message, Claude answers in each card.', sendQuestions: 'Send questions',
    mode: { unified: 'One column', split: 'Two columns', full: 'Whole file' }, noFull: 'The diff does not fit the file on disk (or the file was not read), so the whole file is not shown.',
    fold: function (n) { return n + ' more unchanged lines' }, beforeLbl: 'Before', afterLbl: 'After', fileAt: 'the file as it was when the solution was proposed',
    pickAll: 'Select all', picked: function (n) { return n + ' selected' }, prepareN: 'Prepare solutions', unpick: 'Clear selection',
    approve: 'Approve', unapprove: 'Withdraw approval', approvedChip: 'Approved', approvedN: function (n) { return n + ' approved' }, applyApproved: 'Apply approved',
    bulkHint: 'Claude proposes a solution for each selected finding, in its own card. No code changes.',
    approveHint: 'Approved solutions are applied in one message, one by one.',
    seesLbl: 'What goes to Claude with your next message', seesHint: 'Changes go once. The "not a problem" and "set aside" lists go once too, and again after the conversation is compacted; Claude\'s tools refuse closed findings.', seesNone: '(nothing: no changes, Claude already knows the lists)',
    newsHead: 'Findings page, what the user did there since their last message:',
    newsWhat: { dismiss: 'closed as "not a problem"', defer: 'set aside', restore: 'reopened', cancel: 'the proposed solution is cancelled, change nothing for it', clear: 'removed from the page (it was closed)', ask: 'asked beside the chat' },
    standingDismissed: function (ids) { return 'Closed by the user as "not a problem", do not raise them as problems again: ' + ids + '.' },
    standingDeferred: function (ids) { return 'Set aside by the user, do not fix or raise them until the user brings them back: ' + ids + '.' },
    rule: ['Two or more findings (a review, an audit, an investigation) go here through <code>report</code>, not as a list in chat.', 'Each one is explained for a person who has not read the code: no class names, an example of 3–6 steps with concrete values, and the step where it breaks.', 'No code changes until you press "Apply" or "Apply approved". After the edit Claude checks it, and only then calls <code>mark_fixed</code>.', 'Questions go to the session (one at a time or a batch from the queue), Claude reads the code and answers here through <code>reply</code>.', 'What you do on the page without a message (not a problem, set aside, reopen, cancel a solution) goes to Claude with your next message.'],
    tools: [['report', 'Show findings, or a new explanation of one.'], ['propose_fix', 'Show a solution in the card. No code changes until you press "Apply".'], ['mark_fixed', 'Mark a finding fixed: only after "Apply", the edit and a check.'], ['reply', 'Answer a question in the card\'s discussion.']],
    toolsLbl: 'Four tools',
    newsN: function (n) { return 'Claude does not know yet: ' + n + (n === 1 ? ' change' : ' changes') }, tellBtn: 'Tell Claude', tellHint: 'Goes with your next message, and by itself once everything is sorted out.',
    moment: { reported: 'Found it', simpler: 'Simpler, please', example: 'Another example', explained: 'New explanation', fix: 'Fix', another: 'Another option', proposed: 'Solution', approve: 'Approved', unapprove: 'Withdrew approval', apply: 'Apply', fixed: 'Fixed and checked', defer: 'Set aside', dismiss: 'Not a problem', restore: 'Reopened', cancel: 'Cancelled', discuss: 'Discuss in chat', ask: 'Question', answered: 'Answer', clear: 'Removed from the page', tell: 'Told about the page' }
  },
  uk: {
    discussion: 'Обговорення', askPh: 'Запитай про знахідку чи рішення…', askSend: 'Запитати', queueBtn: 'У чергу',
    askHint: 'Питання йде в чат сесії: Claude прочитає код і відповість сюди. «У чергу» збирає питання, щоб надіслати їх одним повідомленням.',
    askingDeep: 'Питання пішло в сесію, Claude читає код…', queuedTag: 'чекає надсилання', unqueue: 'Прибрати',
    questionsN: function (n) { return 'Питань у черзі: ' + n }, questionsHint: 'Підуть одним повідомленням, Claude відповість у кожну картку.', sendQuestions: 'Надіслати питання',
    mode: { unified: 'Одна колонка', split: 'Дві колонки', full: 'Файл повністю' }, noFull: 'Диф не лягає на файл на диску (або файл не прочитано), тому файл повністю не показано.',
    fold: function (n) { return 'Ще ' + n + ' рядків без змін' }, beforeLbl: 'Було', afterLbl: 'Стало', fileAt: 'файл на момент, коли рішення запропоновано',
    pickAll: 'Вибрати всі', picked: function (n) { return 'Вибрано: ' + n }, prepareN: 'Підготувати рішення', unpick: 'Зняти вибір',
    approve: 'Схвалити', unapprove: 'Зняти схвалення', approvedChip: 'Схвалено', approvedN: function (n) { return 'Схвалено рішень: ' + n }, applyApproved: 'Застосувати схвалені',
    bulkHint: 'Claude запропонує рішення для кожної позначеної, окремо в її картці. Код не змінюється.',
    approveHint: 'Схвалені застосовуються одним повідомленням, по черзі.',
    seesLbl: 'Що піде Claude з твоїм наступним повідомленням', seesHint: 'Зміни йдуть один раз. Списки «не проблема» і «відкладені» теж ідуть один раз і ще раз після стиснення розмови; закриті інструменти Claude не чіпають.', seesNone: '(нічого: змін немає, списки Claude вже знає)',
    newsHead: 'Сторінка «Знахідки», що користувач зробив там з минулого повідомлення:',
    newsWhat: { dismiss: 'закрита як «не проблема»', defer: 'відкладена', restore: 'повернута в роботу', cancel: 'запропоноване рішення скасовано, нічого за ним не змінюй', clear: 'прибрана зі сторінки (була закрита)', ask: 'питання збоку від чату' },
    standingDismissed: function (ids) { return 'Користувач закрив як «не проблема», не піднімай їх як проблему знову: ' + ids + '.' },
    standingDeferred: function (ids) { return 'Відкладені користувачем, не лагодь і не піднімай їх, доки він сам їх не поверне: ' + ids + '.' },
    rule: ['Дві й більше знахідок (рев’ю, аудит, розслідування) Claude показує тут через <code>report</code>, а не списком у чаті.', 'Кожну пояснює для людини, яка не читала код: без імен класів, з прикладом із 3–6 кроків з конкретними значеннями й кроком, де ламається.', 'Не змінює код, доки ти не натиснув «Застосувати» чи «Застосувати схвалені». Після правки перевіряє й лише тоді викликає <code>mark_fixed</code>.', 'Питання йдуть у сесію (по одному чи пачкою з черги), Claude читає код і відповідає сюди через <code>reply</code>.', 'Що ти зробив на сторінці без повідомлення (не проблема, відкласти, повернути, скасування рішення), іде Claude з твоїм наступним повідомленням.'],
    tools: [['report', 'Показати знахідки або нове пояснення існуючої.'], ['propose_fix', 'Показати рішення в картці. Код не змінюється, доки ти не натиснеш «Застосувати».'], ['mark_fixed', 'Позначити знахідку виправленою: лише після «Застосувати», правки й перевірки.'], ['reply', 'Відповісти на питання в обговоренні картки.']],
    toolsLbl: 'Чотири інструменти',
    newsN: function (n) { return 'Claude ще не знає: змін — ' + n }, tellBtn: 'Повідомити Claude', tellHint: 'Піде з твоїм наступним повідомленням, а коли розібрано все — саме.',
    moment: { reported: 'Знайшов', simpler: 'Не зрозумів, простіше', example: 'Інший приклад', explained: 'Нове пояснення', fix: 'Лагодити', another: 'Інший варіант', proposed: 'Рішення', approve: 'Схвалив', unapprove: 'Зняв схвалення', apply: 'Застосувати', fixed: 'Виправлено й перевірено', defer: 'Відклав', dismiss: 'Не проблема', restore: 'Повернув у роботу', cancel: 'Скасував', discuss: 'Обговорити в чаті', ask: 'Питання', answered: 'Відповідь', clear: 'Прибрав зі сторінки', tell: 'Повідомив про сторінку' }
  }
}
Object.keys(MORE).forEach(function (lang) { Object.assign(TEXTS[lang], MORE[lang]) })

var SEVG = { high: '▲', medium: '◆', low: '●' }
var SEVO = { high: 0, medium: 1, low: 2 }
var SEVC = { high: ['var(--hi)', 'var(--hi-soft)'], medium: ['var(--warn)', 'var(--warn-soft)'], low: ['var(--lo)', 'var(--lo-soft)'] }
var GROUP = { open: 'open', fixing: 'open', proposed: 'open', applying: 'open', deferred: 'deferred', fixed: 'closed', dismissed: 'closed' }

var I = {
  wrench: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.6a3.2 3.2 0 0 0-3.9 4.2L2.4 10.5a1.2 1.2 0 0 0 0 1.7l1.4 1.4a1.2 1.2 0 0 0 1.7 0l3.7-3.7A3.2 3.2 0 0 0 13.4 6l-2 2-2-.4-.4-2z"/></svg>',
  simpler: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M6.2 6.3a1.9 1.9 0 0 1 3.6.8c0 1.3-1.8 1.4-1.8 2.5"/><circle cx="8" cy="11.6" r=".4" fill="currentColor"/></svg>',
  example: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 8a5.5 5.5 0 0 1-9.7 3.5M2.5 8a5.5 5.5 0 0 1 9.7-3.5"/><path d="M12.4 1.8v2.8H9.6M3.6 14.2v-2.8h2.8"/></svg>',
  clock: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.8V8l2.2 1.4"/></svg>',
  x: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  check: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>',
  chat: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M14 7.8a5.8 5.8 0 0 1-8.4 5.2L2.5 14l.9-3A5.8 5.8 0 1 1 14 7.8z"/></svg>',
  reopen: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5V5H5"/></svg>',
  chev: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
  copy: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="5" width="8.5" height="8.5" rx="2"/><path d="M11 3.2V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6.5A1.5 1.5 0 0 0 3 11h.2"/></svg>',
  trash: '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>',
  claude: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6"/></svg>',
  code: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5"/></svg>',
  link: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1"/></svg>'
}
function icon(name, size) { var s = String(size || 15); return I[name].replace(/width="\d+" height="\d+"/, 'width="' + s + '" height="' + s + '"') }

var state = { findings: [], branch: '', events: [], news: [], updatedAt: 0 }
function storedMode() { try { var m = localStorage.getItem('findings.codeMode'); return m === 'split' || m === 'full' ? m : 'unified' } catch (e) { return 'unified' } }
var S = { tab: 'open', sel: { open: null, deferred: null, closed: null }, sev: 'all', q: '', drawer: false, keysOpen: false, picked: {}, unfolded: {}, codeMode: storedMode() }
/** Questions being typed, per finding, with the "with access to the code" switch. */
var asks = {}
/** Per finding: the explanation and solution shown, and how many of each the person has already seen (a new one is shown at once). */
var view = {}
var notes = {}
/** Presses on their way: action id -> finding id; the card's buttons wait until the mod has the press. */
var pending = {}
var online = { hub: true, session: true }
var meta = { sessionTitle: '' }

function $(id) { return document.getElementById(id) }
function T() { return TEXTS[hub.lang] || TEXTS.en }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
function vals(s) { return esc(s).replace(/\{\{(.+?)\}\}/g, '<code class="v">$1</code>') }
function bare(s) { return String(s).replace(/\{\{(.+?)\}\}/g, '$1') }
function hhmm(ms) { if (!ms) return ''; var d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }
function byId(id) { return state.findings.find(function (f) { return f.id === id }) }
function groupOf(f) { return GROUP[f.status] || 'open' }
function inTab(tab) { return state.findings.filter(function (f) { return groupOf(f) === tab }).sort(function (a, b) { return SEVO[a.severity] - SEVO[b.severity] || Number(a.id.slice(1)) - Number(b.id.slice(1)) }) }
function viewOf(f) {
  var v = view[f.id]
  if (!v) { v = view[f.id] = { vi: f.versions.length - 1, seenV: f.versions.length, fi: Math.max(0, f.fixes.length - 1), seenF: f.fixes.length, file: 0 } }
  if (f.versions.length > v.seenV) { v.vi = f.versions.length - 1; v.seenV = f.versions.length }
  if (f.fixes.length > v.seenF) { v.fi = f.fixes.length - 1; v.seenF = f.fixes.length; v.file = 0 }
  if (f.fixes.length < v.seenF) { v.seenF = f.fixes.length; v.fi = Math.max(0, f.fixes.length - 1); v.file = 0 }
  v.vi = Math.max(0, Math.min(v.vi, f.versions.length - 1))
  return v
}
function stepsAt(f, vi) { for (var i = vi; i >= 0; i--) { if (f.versions[i] && f.versions[i].steps.length) return f.versions[i].steps } return [] }
function matches(f) {
  if (S.sev !== 'all' && f.severity !== S.sev) return false
  if (!S.q) return true
  var v = f.versions[viewOf(f).vi] || { plain: '' }
  return (f.id + ' ' + f.title + ' ' + f.where + ' ' + v.plain).toLowerCase().indexOf(S.q) >= 0
}
function visible() { return inTab(S.tab).filter(matches) }
function isPending(id) { for (var k in pending) { if (pending[k] === id) return true } return false }
function selected() {
  var vis = visible()
  var id = S.sel[S.tab]
  if (!vis.some(function (f) { return f.id === id })) { id = vis[0] ? vis[0].id : null; S.sel[S.tab] = id }
  return id
}

/* ---------- morph: the render goes into the DOM that is there, node by node ---------- */
function keyOf(node) { return node.nodeType === 1 ? node.getAttribute('data-key') : null }
function morphNode(from, to) {
  var i, a
  for (i = from.attributes.length - 1; i >= 0; i--) { a = from.attributes[i]; if (!to.hasAttribute(a.name)) from.removeAttribute(a.name) }
  for (i = 0; i < to.attributes.length; i++) { a = to.attributes[i]; if (from.getAttribute(a.name) !== a.value) from.setAttribute(a.name, a.value) }
  if (from.tagName === 'TEXTAREA' || from.tagName === 'INPUT') return
  if (from.tagName === 'DETAILS') { from.open = to.hasAttribute('open') }
  morphChildren(from, to)
}
function morphChildren(from, to) {
  var next = Array.prototype.slice.call(to.childNodes)
  var wanted = {}
  next.forEach(function (n) { var k = keyOf(n); if (k) wanted[k] = true })
  var keyed = {}
  Array.prototype.slice.call(from.childNodes).forEach(function (n) {
    var k = keyOf(n)
    if (k && !wanted[k]) from.removeChild(n)
    else if (k) keyed[k] = n
  })
  for (var i = 0; i < next.length; i++) {
    var n = next[i], k = keyOf(n), here = from.childNodes[i] || null, match = null
    if (k) { match = keyed[k] || null; if (match && match.nodeName !== n.nodeName) match = null }
    else if (here && !keyOf(here) && here.nodeName === n.nodeName) { match = here }
    if (match) {
      if (match !== here) from.insertBefore(match, here)
      if (match.nodeType === 1) morphNode(match, n)
      else if (match.nodeValue !== n.nodeValue) match.nodeValue = n.nodeValue
    } else {
      from.insertBefore(n, here)
    }
  }
  while (from.childNodes.length > next.length) from.removeChild(from.lastChild)
}
function paint(el, html) { var t = document.createElement(el.tagName); t.innerHTML = html; morphChildren(el, t) }

/* ---------- code: Shiki with Islands Dark ---------- */
var EXT = { php: 'php', ts: 'typescript', tsx: 'tsx', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx', py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', kts: 'kotlin', swift: 'swift', cs: 'csharp', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', sql: 'sql', yml: 'yaml', yaml: 'yaml', json: 'json', toml: 'toml', ini: 'ini', xml: 'xml', html: 'html', css: 'css', scss: 'scss', vue: 'vue', svelte: 'svelte', md: 'markdown', sh: 'bash', bash: 'bash', zsh: 'bash', graphql: 'graphql', twig: 'twig', dockerfile: 'dockerfile', env: 'dotenv' }
function langOf(path) {
  var name = String(path).toLowerCase().split('/').pop()
  if (/\.blade\.php$/.test(name)) return 'blade'
  if (name === 'dockerfile') return 'dockerfile'
  var ext = name.indexOf('.') >= 0 ? name.split('.').pop() : ''
  return EXT[ext] || 'text'
}
var shiki = { state: 'loading', hl: null, langs: null, loaded: {} }
/** Highlighted lines: for a diff, one entry per non-header line; for a whole file, { left, right } per side. */
var painted = {}
function codeKey(change) { return change.path + '\n' + change.diff }
function bodyOf(diff) { return diff.split('\n').filter(function (l) { return l.slice(0, 2) !== '@@' }).map(function (l) { return l.slice(1) }).join('\n') }
function tokenHTML(t) {
  var st = 'color:' + t.color
  if (t.fontStyle & 1) st += ';font-style:italic'
  if (t.fontStyle & 2) st += ';font-weight:600'
  if (t.fontStyle & 4) st += ';text-decoration:underline'
  return '<span style="' + st + '">' + esc(t.content) + '</span>'
}
function tokenize(text, lang) { return shiki.hl.codeToTokensBase(text, { lang: lang, theme: window.FINDINGS_THEME.name }).map(function (line) { return line.map(tokenHTML).join('') }) }
function highlight(change) {
  var key = codeKey(change), lang = langOf(change.path)
  var needFull = !!change.full && painted['F' + key] === undefined
  if (painted[key] !== undefined && !needFull) return Promise.resolve()
  if (shiki.state !== 'ready' || lang === 'text' || !shiki.langs[lang]) return Promise.resolve()
  var load = shiki.loaded[lang] || (shiki.loaded[lang] = shiki.hl.loadLanguage(shiki.langs[lang]))
  return load.then(function () {
    if (painted[key] === undefined) painted[key] = tokenize(bodyOf(change.diff), lang)
    if (needFull) { var m = fullModel(change); painted['F' + key] = { left: tokenize(m.left.join('\n'), lang), right: tokenize(m.right.join('\n'), lang) } }
  }).catch(function () { painted[key] = null; painted['F' + key] = null })
}
function allChanges() { var out = []; state.findings.forEach(function (f) { f.fixes.forEach(function (x) { x.changes.forEach(function (c) { out.push(c) }) }) }); return out }
function highlightAll() { return Promise.all(allChanges().map(highlight)) }

/** The hunks of a diff: each with its old and new starting line numbers, as the header gives them. */
function hunksOf(diff) {
  var hunks = []
  diff.split('\n').forEach(function (l) {
    if (l.slice(0, 2) === '@@') { var m = /^@@ -(\d+)(?:,\d+)? \+(\d+)/.exec(l); hunks.push({ head: l, old: m ? Number(m[1]) : 1, now: m ? Number(m[2]) : 1, lines: [] }); return }
    if (!hunks.length) hunks.push({ head: '', old: 1, now: 1, lines: [] })
    hunks[hunks.length - 1].lines.push(l)
  })
  return hunks
}
/** A run of removed lines then a run of added ones, paired row by row; context lines stand on both sides. */
function pairRows(lines, onContext, onChange) {
  var j = 0
  while (j < lines.length) {
    var c = lines[j].charAt(0)
    if (c !== '-' && c !== '+') { onContext(lines[j], j); j++; continue }
    var dels = [], adds = []
    while (j < lines.length && lines[j].charAt(0) === '-') { dels.push(j); j++ }
    while (j < lines.length && lines[j].charAt(0) === '+') { adds.push(j); j++ }
    for (var k = 0; k < Math.max(dels.length, adds.length); k++) onChange(k < dels.length ? dels[k] : null, k < adds.length ? adds[k] : null)
  }
}
/** The whole file before and after the solution, row by row: unchanged lines on both sides, changed ones paired. */
function fullModel(change) {
  var left = change.full.before === '' ? [] : change.full.before.replace(/\r/g, '').split('\n')
  var right = [], rows = [], bi = 0
  function same(n) { for (var k = 0; k < n && bi < left.length; k++) { rows.push({ l: bi, r: right.length }); right.push(left[bi]); bi++ } }
  hunksOf(change.diff).forEach(function (h, i) {
    same((change.full.starts[i] || 0) - bi)
    pairRows(h.lines, function () { rows.push({ l: bi, r: right.length }); right.push(left[bi]); bi++ }, function (d, a) {
      var row = { l: null, r: null, ch: true }
      if (d !== null) { row.l = bi; bi++ }
      if (a !== null) { row.r = right.length; right.push(h.lines[a].slice(1)) }
      rows.push(row)
    })
  })
  same(left.length - bi)
  return { left: left, right: right, rows: rows }
}
function cell(num, mark, cls, html) {
  return '<div class="half ' + cls + '"><span class="no">' + (num === null ? '' : num) + '</span><span class="m">' + mark + '</span><span class="c">' + html + '</span></div>'
}
function unifiedHTML(change, colored) {
  var row = 0
  return change.diff.split('\n').map(function (l) {
    if (l.slice(0, 2) === '@@') return '<div class="ln hunk"><span class="m"></span><span>' + esc(l) + '</span></div>'
    var m = l.charAt(0), cls = m === '+' ? 'add' : m === '-' ? 'del' : ''
    var body = colored && colored[row] != null ? colored[row] : '<span class="c">' + esc(l.slice(1)) + '</span>'
    row++
    return '<div class="ln ' + cls + '"><span class="m">' + (m === '+' ? '+' : m === '-' ? '−' : '') + '</span><span>' + (body || ' ') + '</span></div>'
  }).join('')
}
function splitHTML(change, colored) {
  var out = '', base = 0
  hunksOf(change.diff).forEach(function (h) {
    var ln = h.old, rn = h.now, offset = base
    if (h.head) out += '<div class="srow hunk"><span>' + esc(h.head) + '</span></div>'
    var html = function (j) { return colored && colored[offset + j] != null ? colored[offset + j] || ' ' : esc(h.lines[j].slice(1)) || ' ' }
    pairRows(h.lines, function (l, j) {
      out += '<div class="srow">' + cell(ln++, '', '', html(j)) + cell(rn++, '', '', html(j)) + '</div>'
    }, function (d, a) {
      out += '<div class="srow">' + (d === null ? cell(null, '', 'none', '') : cell(ln++, '−', 'del', html(d))) + (a === null ? cell(null, '', 'none', '') : cell(rn++, '+', 'add', html(a))) + '</div>'
    })
    base += h.lines.length
  })
  return out
}
var CONTEXT = 3
function fullHTML(change, key) {
  var t = T(), m = fullModel(change), colored = painted['F' + codeKey(change)] || null
  var side = function (which, i) { return i === null ? '' : colored && colored[which][i] != null ? colored[which][i] || ' ' : esc(m[which][i]) || ' ' }
  var out = '<div class="srow head"><div class="half">' + esc(t.beforeLbl) + '</div><div class="half">' + esc(t.afterLbl) + '</div></div>'
  var rows = m.rows, i = 0
  while (i < rows.length) {
    if (!rows[i].ch) {
      var j = i
      while (j < rows.length && !rows[j].ch) j++
      var hidden = j - i - (i === 0 ? 0 : CONTEXT) - (j === rows.length ? 0 : CONTEXT)
      var foldKey = key + ':' + i
      if (hidden > 3 && !S.unfolded[foldKey]) {
        var showTop = i === 0 ? 0 : CONTEXT, showBottom = j === rows.length ? 0 : CONTEXT
        for (var a = i; a < i + showTop; a++) out += plainRow(rows[a], side)
        out += '<button class="srow fold" type="button" data-unfold="' + esc(foldKey) + '" data-key="fold-' + esc(foldKey) + '">' + icon('chev', 13) + esc(t.fold(hidden)) + '</button>'
        for (var b = j - showBottom; b < j; b++) out += plainRow(rows[b], side)
      } else {
        for (var c = i; c < j; c++) out += plainRow(rows[c], side)
      }
      i = j
      continue
    }
    var r = rows[i]
    out += '<div class="srow">' + (r.l === null ? cell(null, '', 'none', '') : cell(r.l + 1, '−', 'del', side('left', r.l))) + (r.r === null ? cell(null, '', 'none', '') : cell(r.r + 1, '+', 'add', side('right', r.r))) + '</div>'
    i++
  }
  return out
}
function plainRow(r, side) { return '<div class="srow">' + cell(r.l + 1, '', '', side('left', r.l)) + cell(r.r + 1, '', '', side('right', r.r)) + '</div>' }
function codeHTML(change, findingId) {
  var t = T(), lang = langOf(change.path), key = findingId + ':' + change.path
  var mode = S.codeMode === 'full' && !change.full ? 'split' : S.codeMode
  var colored = painted[codeKey(change)] || null
  var modes = ['unified', 'split', 'full'].map(function (m) {
    return '<button class="cm" type="button" data-mode="' + m + '" aria-pressed="' + (S.codeMode === m) + '"' + (m === 'full' && !change.full ? ' disabled title="' + esc(t.noFull) + '"' : '') + '>' + esc(t.mode[m]) + '</button>'
  }).join('')
  var body = mode === 'unified' ? '<div class="lines">' + unifiedHTML(change, colored) + '</div>' : mode === 'split' ? '<div class="lines two">' + splitHTML(change, colored) + '</div>' : '<div class="lines two">' + fullHTML(change, key) + '</div>'
  var note = S.codeMode === 'full' && !change.full ? '<div class="cnote">' + esc(t.noFull) + '</div>' : mode === 'full' ? '<div class="cnote">' + esc(t.fileAt) + '</div>' : ''
  return '<div class="code" data-key="code-' + esc(key) + '-' + mode + '"><div class="bar">' + icon('code', 13) + '<span class="path">' + esc(change.path) + '</span><span class="lang">' + esc(lang) + '</span><span class="modes">' + modes + '</span></div>' + note + body + '</div>'
}
window.addEventListener('findings:shiki', function () {
  var s = window.findingsShiki
  if (!s) { shiki.state = 'failed'; return }
  shiki.hl = s.highlighter; shiki.langs = s.languages; shiki.state = 'ready'
  highlightAll().then(renderAll)
})
if (window.findingsShiki !== undefined) window.dispatchEvent(new Event('findings:shiki'))

/* ---------- drawing ---------- */
function sevChip(s) { return '<span class="chip" style="color:' + SEVC[s][0] + ';background:' + SEVC[s][1] + '"><span class="mono g-' + s + '">' + SEVG[s] + '</span>' + esc(T().sev[s]) + '</span>' }
/** Text Claude wrote: blank lines split paragraphs, backticks and double braces set code and values apart. */
function rich(s) {
  return String(s).split(/\n\s*\n/).map(function (p) { return '<p>' + vals(p).replace(/\x60([^\x60]+)\x60/g, '<code class="v">$1</code>').replace(/\n/g, '<br>') + '</p>' }).join('')
}
function canPick(f) { return groupOf(f) !== 'closed' }
function pickedIds() { return Object.keys(S.picked).filter(function (id) { var f = byId(id); return S.picked[id] && f && canPick(f) }) }
function approvedIds() { return state.findings.filter(function (f) { return f.status === 'proposed' && f.approved !== null }).map(function (f) { return f.id }) }
function pickBox(f) { return canPick(f) ? '<span class="pick" role="checkbox" tabindex="0" data-pick="' + f.id + '" aria-checked="' + !!S.picked[f.id] + '">' + (S.picked[f.id] ? icon('check', 11) : '') + '</span>' : '' }

function renderHeader() {
  var t = T()
  document.documentElement.lang = hub.lang
  document.title = t.title
  $('brandTitle').textContent = t.title
  $('q').placeholder = t.search
  var parts = []
  if (state.branch) parts.push(t.branch + ' <span class="mono">' + esc(state.branch) + '</span>')
  parts.push(esc(t.found(state.findings.length)))
  if (state.updatedAt) parts.push(esc(t.updated) + ' ' + hhmm(state.updatedAt))
  var live = !online.hub ? '<span class="live off">' + esc(t.hubDown) + '</span>' : !online.session ? '<span class="live off">' + esc(t.offline) + '</span>' : ''
  paint($('brandSub'), parts.join(' · ') + (live ? ' · ' + live : ''))
}

function renderNav() {
  var t = T()
  var h = '<div class="navgrp"><span class="lbl">' + esc(t.findings) + '</span>'
  ;['open', 'deferred', 'closed'].forEach(function (g) {
    var l = inTab(g), c = { high: 0, medium: 0, low: 0 }
    l.forEach(function (f) { c[f.severity]++ })
    var segs, sub
    if (g === 'closed') {
      var fx = l.filter(function (f) { return f.status === 'fixed' }).length, dm = l.length - fx
      segs = [['fx', fx, 'var(--ok)'], ['dm', dm, 'var(--track)']]
      sub = '<span><span class="mono" style="color:var(--ok)">✓</span>' + fx + ' ' + esc(t.fixedN) + '</span><span><span class="mono" style="color:var(--faint)">×</span>' + dm + ' ' + esc(t.dismissedN) + '</span>'
    } else {
      segs = [['high', c.high, 'var(--hi)'], ['medium', c.medium, 'var(--warn-dot)'], ['low', c.low, 'var(--lo)']]
      sub = ['high', 'medium', 'low'].filter(function (s) { return c[s] }).map(function (s) { return '<span><span class="mono g-' + s + '">' + SEVG[s] + '</span>' + c[s] + ' ' + esc(t.sev[s].toLowerCase()) + '</span>' }).join('') || '<span>' + esc(t.empty) + '</span>'
    }
    var segHTML = segs.map(function (s) { return '<i style="flex:' + (l.length ? s[1] : (s === segs[0] ? 1 : 0)) + ' 1 0px;background:' + (l.length ? s[2] : 'var(--track)') + '"></i>' }).join('')
    h += '<button class="nav" type="button" data-key="nav-' + g + '" data-tab="' + g + '" aria-current="' + (S.tab === g) + '"><span class="r"><b>' + esc(t.groups[g]) + '</b><span class="n">' + l.length + '</span></span><span class="segs" aria-hidden="true">' + segHTML + '</span><span class="sub">' + sub + '</span></button>'
  })
  var nc = inTab('closed').length
  h += '<button class="dashed ghost" type="button" data-key="clear" data-clear' + (nc ? '' : ' disabled') + '>' + icon('trash', 13) + esc(t.clear) + ' · ' + nc + '</button></div>'
  paint($('nav'), h)
}

function stepsHTML(steps, mode) {
  var t = T()
  return '<ol class="steps">' + steps.map(function (s, i) {
    var cls = s.tone === 'bad' && mode !== 'after' ? 'broken' : s.tone === 'good' ? 'fixed' : ''
    var flag = cls === 'broken' ? '<span class="flag">' + esc(t.breaks) + '</span>' : cls === 'fixed' ? '<span class="flag">' + esc(t.nowSo) + '</span>' : ''
    return '<li class="step ' + cls + '"><span class="k">' + (i + 1) + '</span><div class="tx">' + flag + (s.at ? '<span class="at">' + esc(s.at) + '</span>' : '') + vals(s.text) + '</div></li>'
  }).join('') + '</ol>'
}
function typing(text) { return '<div class="typing" data-key="typing"><span class="av c">' + I.claude + '</span><span class="bub"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>' + esc(text) + '</span></div>' }
function originLabel(f, i) { var t = T(), o = f.versions[i].origin; return i === 0 ? t.origin.first : t.origin[o] || t.origin.claude }

function rowHTML(f) {
  var t = T(), closed = groupOf(f) === 'closed'
  var lead = closed ? '<span class="ok">' + (f.status === 'fixed' ? icon('check', 12) : icon('x', 11)) + '</span>' : '<span class="g g-' + f.severity + '" title="' + esc(t.sev[f.severity]) + '">' + SEVG[f.severity] + '</span>'
  var tag = !closed && f.status === 'proposed' && f.approved !== null ? '<span class="chip" style="color:var(--ok);background:var(--ok-soft)">' + icon('check', 11) + esc(t.approvedChip) + '</span>'
    : !closed && f.status === 'proposed' ? '<span class="chip" style="color:var(--claude);background:var(--claude-soft)">' + esc(t.hasFix) + '</span>' : ''
  return '<div class="rowwrap" data-key="row-' + f.id + '">' + pickBox(f) + '<button class="row' + (closed ? ' closed' : '') + '" type="button" data-sel="' + f.id + '" aria-label="' + esc(t.open + ' ' + f.id) + '">' + lead + '<span class="id">' + f.id + '</span><span class="tt">' + esc(f.title) + '</span>' + tag + '<span class="lc">' + esc(f.where) + '</span><span style="color:var(--faint);display:flex">' + I.chev + '</span></button></div>'
}

function fixHTML(f, v) {
  var t = T()
  if (f.status === 'fixing' && !f.fixes.length) return typing(t.typingFix)
  var x = f.fixes[v.fi]
  if (!x) return ''
  var head = '<div class="solh"><span class="av c">' + I.claude + '</span><div class="who2"><span>' + esc(t.proposes) + ' · ' + esc(t.variant(v.fi + 1, f.fixes.length)) + '</span><b>' + esc(x.title) + '</b></div>'
  if (f.fixes.length > 1) head += '<div class="vers">' + f.fixes.map(function (y, i) { return '<button class="ver" type="button" data-fix="' + i + '" aria-pressed="' + (i === v.fi) + '" title="' + esc(y.title) + '"><span class="k">' + (i + 1) + '</span></button>' }).join('') + '</div>'
  if (f.status === 'proposed' && f.approved === v.fi) head += '<span class="chip" style="color:var(--ok);background:var(--ok-soft)">' + icon('check', 11) + esc(t.approvedChip) + '</span>'
  else if (f.status === 'proposed') head += '<span class="chip" style="background:var(--surface);color:var(--muted);border:1px solid var(--border)">' + esc(t.untouched) + '</span>'
  head += '</div>'
  var body = '<div class="solb">'
  if (f.status === 'applying') body += '<div class="banner wait"><span class="ic">' + icon('wrench') + '</span><div><b>' + esc(t.applying) + '</b>' + esc(t.applyingText) + '</div></div>'
  if (f.status === 'fixing') body += typing(t.typingFix)
  body += '<div class="sec"><span class="lbl">' + esc(t.change) + '</span><p class="change">' + vals(x.summary) + '</p></div>'
  body += '<div class="sec"><span class="lbl">' + esc(t.after) + '</span>' + stepsHTML(x.steps, 'after') + '</div>'
  var file = Math.min(v.file, x.changes.length - 1)
  body += '<div class="sec"><span class="lbl">' + esc(t.diffs) + '</span>'
  if (x.changes.length > 1) {
    body += '<div class="files">' + x.changes.map(function (c, i) {
      var lines = c.diff.split('\n'), a = lines.filter(function (l) { return l.charAt(0) === '+' }).length, d = lines.filter(function (l) { return l.charAt(0) === '-' }).length
      return '<button class="fbtn" type="button" data-file="' + i + '" aria-pressed="' + (file === i) + '">' + esc(c.path.split('/').pop()) + '<span class="a">+' + a + '</span><span class="d">−' + d + '</span></button>'
    }).join('') + '</div>'
  }
  body += codeHTML(x.changes[file], f.id) + '</div>'
  body += '<div class="sec"><span class="lbl">' + esc(t.gaps) + '</span>' + (x.gaps.length ? '<ul class="gaps">' + x.gaps.map(function (g) { return '<li>' + vals(g) + '</li>' }).join('') + '</ul>' : '<p class="hint" style="padding:0">' + esc(t.noGaps) + '</p>') + '</div>'
  return '<div class="sol">' + head + body + '</div></div>'
}

function threadHTML(f) {
  var t = T()
  var h = '<section class="sec" data-key="discussion"><span class="lbl">' + esc(t.discussion) + '</span>'
  if (f.thread.length) {
    h += '<ol class="thread chat">' + f.thread.map(function (m, i) {
      var c = m.by === 'claude', q = !c && m.isQueued
      return '<li data-key="msg-' + i + '"><span class="av ' + (c ? 'c' : 'y') + '">' + (c ? I.claude : esc(t.you.charAt(0))) + '</span><div class="m"><span class="nm"><b class="' + (c ? 'c' : '') + '">' + (c ? 'Claude' : esc(t.you)) + '</b> · <span class="mono">' + hhmm(m.at) + '</span>' +
        (q ? ' · <span class="qd">' + esc(t.queuedTag) + '</span> <button class="unq" type="button" data-unqueue="' + f.id + '" data-at="' + m.at + '">' + esc(t.unqueue) + '</button>' : '') +
        '</span><div class="tx' + (c ? ' c' : '') + (q ? ' q' : '') + '">' + (c ? rich(m.text) : esc(m.text)) + '</div></div></li>'
    }).join('') + '</ol>'
  }
  if (f.isAsking) h += typing(t.askingDeep)
  var draft = asks[f.id] || { text: '' }
  var locked = f.isAsking || isPending(f.id), empty = !draft.text.trim(), queued = f.thread.some(function (m) { return m.isQueued })
  h += '<div class="ask" data-key="ask-' + f.id + '"><textarea class="field" rows="1" data-ask="' + f.id + '" placeholder="' + esc(t.askPh) + '">' + esc(draft.text) + '</textarea>' +
    '<div class="askbar"><span class="askhint">' + esc(t.askHint) + '</span><span class="sp"></span>' +
    '<button class="btn quiet" type="button" data-queuebtn="' + f.id + '"' + (isPending(f.id) || empty ? ' disabled' : '') + '>' + esc(t.queueBtn) + '</button>' +
    '<button class="btn" type="button" data-askbtn="' + f.id + '"' + (locked || (empty && !queued) ? ' disabled' : '') + '>' + icon('chat') + esc(t.askSend) + '<span class="kk">⌘↵</span></button></div></div>'
  return h + '</section>'
}

function cardHTML(f) {
  var t = T(), v = viewOf(f), ver = f.versions[v.vi], g = groupOf(f)
  var h = '<article class="card' + (g === 'closed' ? ' closed' : '') + '" data-key="card-' + f.id + '"><div class="cbody">'
  h += '<div class="chead"><div class="r">' + pickBox(f) + '<span class="idtag">' + f.id + '</span>' + sevChip(f.severity) + '<span class="sp"></span><button class="loc" type="button" data-copy="' + esc(f.where) + '" title="' + esc(t.copyPath) + '">' + esc(f.where) + I.copy + '</button></div><h3>' + esc(f.title) + '</h3></div>'
  if (f.status === 'deferred') h += '<div class="banner wait"><span class="ic">' + icon('clock') + '</span><div><b>' + esc(t.deferredTitle) + '</b>' + esc(t.deferredText) + '</div></div>'
  if (f.status === 'fixed') h += '<div class="banner ok"><span class="ic">' + icon('check') + '</span><div><b>' + esc(t.fixedTitle) + '</b>' + vals(f.check) + '</div></div>'
  if (f.status === 'dismissed') h += '<div class="banner neutral"><span class="ic">' + icon('x') + '</span><div><b>' + esc(t.dismissedTitle) + '</b>' + esc(t.dismissedText) + '</div></div>'

  h += '<section class="sec"><div class="sech"><span class="lbl">' + esc(t.plain) + '</span>'
  if (f.versions.length > 1) h += '<div class="vers" role="group">' + f.versions.map(function (x, i) { return '<button class="ver" type="button" data-ver="' + i + '" aria-pressed="' + (i === v.vi) + '"><span class="k">' + (i + 1) + '</span>' + esc(originLabel(f, i)) + '</button>' }).join('') + '</div>'
  h += '</div>'
  if (f.busy === 'simpler' || f.busy === 'example') h += typing(f.busy === 'simpler' ? t.typingSimpler : t.typingExample)
  else h += '<div style="display:flex;flex-direction:column;gap:6px"><p class="plain">' + vals(ver.plain) + '</p>' + (ver.note ? '<span class="vnote">' + esc(t.byNote) + ' <q>' + esc(ver.note) + '</q></span>' : '') + '</div>'
  h += '</section>'

  h += '<section class="sec"><span class="lbl">' + esc(t.how) + '</span>' + stepsHTML(stepsAt(f, v.vi)) + '</section>'
  if (f.noticedBy.length) {
    h += '<section class="sec"><span class="lbl">' + esc(t.who) + '</span><div class="who">' + f.noticedBy.map(function (w) {
      var rest = esc(w.how) + (w.when ? '<small>' + esc(w.when) + '</small>' : '')
      return w.who ? '<div class="w">' + esc(w.who) + '</div><div>' + rest + '</div>' : '<div class="wide">' + rest + '</div>'
    }).join('') + '</div></section>'
  }
  if (f.status === 'fixing' || f.status === 'proposed' || f.status === 'applying') h += '<section class="sec" data-key="solution"><span class="lbl">' + esc(t.solution) + '</span>' + fixHTML(f, v) + '</section>'
  h += threadHTML(f)

  if (f.log.length) {
    h += '<section class="sec" data-key="history"><span class="lbl">' + esc(t.history) + '</span><ol class="thread">' + f.log.map(function (l, i) {
      var c = l.by === 'claude'
      return '<li data-key="log-' + i + '"><span class="av ' + (c ? 'c' : 'y') + '">' + (c ? I.claude : esc(t.you.charAt(0))) + '</span><div class="m"><span class="nm"><b class="' + (c ? 'c' : '') + '">' + (c ? 'Claude' : esc(t.you)) + '</b> · <span class="mono">' + hhmm(l.at) + '</span></span><div class="tx' + (c ? ' c' : '') + '">' + esc(t.moment[l.what] || l.what) + (l.note ? ' · <q>«' + esc(bare(l.note)) + '»</q>' : '') + '</div></div></li>'
    }).join('') + '</ol></section>'
  }
  h += '</div>'

  var waiting = isPending(f.id), busy = f.busy === 'simpler' || f.busy === 'example' || f.status === 'fixing' || f.status === 'applying'
  var dis = waiting || busy ? ' disabled' : ''
  h += '<div class="foot">'
  if (g !== 'closed') {
    var n = notes[f.id] || ''
    h += '<div class="note"><textarea class="field" data-key="note-' + f.id + '" data-note="' + f.id + '" rows="1" placeholder="' + esc(t.notePh) + '">' + esc(n) + '</textarea><div class="notemeta"><span class="pv">' + (n.trim() ? esc(t.noteGoes) + ' «' + esc(n.trim()) + '»' : '') + '</span><span class="kb"><kbd>Esc</kbd>' + esc(t.escHint) + '</span></div></div>'
  }
  h += '<div class="acts">'
  if (g === 'closed') {
    h += '<button class="btn" type="button" data-key="a-reopen" data-act="restore"' + (waiting ? ' disabled' : '') + '>' + icon('reopen') + esc(t.act.reopen) + '</button>'
  } else if (f.status === 'proposed' || f.status === 'applying' || (f.status === 'fixing' && f.fixes.length)) {
    var isApproved = f.approved === v.fi
    h += '<button class="btn primary" type="button" data-key="a-apply" data-act="apply"' + dis + '>' + icon('check') + esc(t.act.apply) + '<span class="kk">⌘↵</span></button>' +
      '<button class="btn' + (isApproved ? ' on' : '') + '" type="button" data-key="a-approve" data-act="' + (isApproved ? 'unapprove' : 'approve') + '"' + dis + '>' + icon('check') + esc(isApproved ? t.unapprove : t.approve) + '</button>' +
      '<button class="btn" type="button" data-key="a-another" data-act="another"' + dis + '>' + icon('example') + esc(t.act.another) + '</button>' +
      '<button class="btn" type="button" data-key="a-discuss" data-act="discuss"' + (waiting ? ' disabled' : '') + '>' + icon('chat') + esc(t.act.discuss) + '</button><span class="sp"></span>' +
      '<button class="btn quiet" type="button" data-key="a-cancel" data-act="cancel"' + (waiting ? ' disabled' : '') + '>' + esc(t.act.cancel) + '</button>'
  } else if (f.status === 'fixing') {
    h += '<button class="btn primary" type="button" data-key="a-fix" data-act="fix" disabled>' + icon('wrench') + esc(t.act.fix) + '<span class="kk">⌘↵</span></button><span class="sp"></span>' +
      '<button class="btn quiet" type="button" data-key="a-cancel" data-act="cancel"' + (waiting ? ' disabled' : '') + '>' + esc(t.act.cancel) + '</button>'
  } else {
    h += '<button class="btn primary" type="button" data-key="a-fix" data-act="fix"' + dis + '>' + icon('wrench') + esc(t.act.fix) + '<span class="kk">⌘↵</span></button>' +
      '<button class="btn" type="button" data-key="a-simpler" data-act="simpler"' + dis + '>' + icon('simpler') + esc(t.act.simpler) + '</button>' +
      '<button class="btn" type="button" data-key="a-example" data-act="example"' + dis + '>' + icon('example') + esc(t.act.example) + '</button><span class="sp"></span>' +
      (f.status === 'deferred'
        ? '<button class="btn quiet" type="button" data-key="a-restore" data-act="restore"' + dis + '>' + icon('reopen') + esc(t.act.restoreDeferred) + '</button>'
        : '<button class="btn quiet" type="button" data-key="a-defer" data-act="defer"' + dis + '>' + icon('clock') + esc(t.act.defer) + '</button>') +
      '<button class="btn quiet" type="button" data-key="a-dismiss" data-act="dismiss"' + dis + '>' + icon('x') + esc(t.act.dismiss) + '</button>'
  }
  h += '</div></div></article>'
  return h
}

function queuedIds() {
  return (state.findings || []).filter(function (f) { return !f.isAsking && f.thread.some(function (m) { return m.isQueued }) }).map(function (f) { return f.id })
}
function queuedCount() {
  return (state.findings || []).reduce(function (n, f) { return f.isAsking ? n : n + f.thread.filter(function (m) { return m.isQueued }).length }, 0)
}
function bulkHTML() {
  var t = T(), picked = pickedIds(), approved = approvedIds(), busy = isPending('*'), news = state.news || []
  var questions = queuedIds()
  if (!picked.length && !approved.length && !news.length && !questions.length) return ''
  var h = '<div class="bulk" data-key="bulk">'
  if (news.length) {
    var ids = news.map(function (n) { return n.id }).filter(function (id, i, all) { return all.indexOf(id) === i })
    h += '<div class="brow" data-key="b-news"><span class="bcount">' + esc(t.newsN(news.length)) + ' <span class="mono">' + esc(ids.join(', ')) + '</span></span><span class="bhint">' + esc(t.tellHint) + '</span><span class="sp"></span>' +
      '<button class="btn" type="button" data-tell' + (busy ? ' disabled' : '') + '>' + icon('chat') + esc(t.tellBtn) + '</button></div>'
  }
  if (questions.length) {
    h += '<div class="brow" data-key="b-questions"><span class="bcount">' + esc(t.questionsN(queuedCount())) + ' <span class="mono">' + esc(questions.join(', ')) + '</span></span><span class="bhint">' + esc(t.questionsHint) + '</span><span class="sp"></span>' +
      '<button class="btn primary" type="button" data-askall' + (busy ? ' disabled' : '') + '>' + icon('chat') + esc(t.sendQuestions) + '</button></div>'
  }
  if (picked.length) {
    h += '<div class="brow" data-key="b-picked"><span class="bcount">' + esc(t.picked(picked.length)) + ' <span class="mono">' + esc(picked.join(', ')) + '</span></span><span class="bhint">' + esc(t.bulkHint) + '</span><span class="sp"></span>' +
      '<button class="btn quiet" type="button" data-unpick>' + esc(t.unpick) + '</button><button class="btn primary" type="button" data-fixmany' + (busy ? ' disabled' : '') + '>' + icon('wrench') + esc(t.prepareN) + '</button></div>'
  }
  if (approved.length) {
    h += '<div class="brow" data-key="b-approved"><span class="bcount">' + esc(t.approvedN(approved.length)) + ' <span class="mono">' + esc(approved.join(', ')) + '</span></span><span class="bhint">' + esc(t.approveHint) + '</span><span class="sp"></span>' +
      '<button class="btn primary" type="button" data-applymany' + (busy ? ' disabled' : '') + '>' + icon('check') + esc(t.applyApproved) + '</button></div>'
  }
  return h + '</div>'
}

function renderMain() {
  var t = T(), all = inTab(S.tab), vis = visible(), sel = selected()
  var h = '<div class="mhead" data-key="mhead"><div class="t"><h2>' + esc(t.groups[S.tab]) + '</h2><span>' + esc(t.groupSub[S.tab]) + ' · <span class="mono">' + all.length + '</span></span></div>'
  if (S.tab !== 'closed' && vis.length) h += '<button class="ghostbtn ghost" type="button" data-pickall>' + icon('check', 15) + esc(t.pickAll) + '</button>'
  h += '<button class="ghostbtn ghost" type="button" data-copylist>' + icon('copy', 15) + esc(t.copyList) + '</button></div>'
  var cnt = { all: all.length, high: 0, medium: 0, low: 0 }
  all.forEach(function (f) { cnt[f.severity]++ })
  h += '<div class="filters" role="tablist" data-key="filters">' + [['all', ''], ['high', SEVG.high], ['medium', SEVG.medium], ['low', SEVG.low]].map(function (x) {
    return '<button class="filter" role="tab" type="button" data-sev="' + x[0] + '" aria-selected="' + (S.sev === x[0]) + '">' + (x[1] ? '<span class="g g-' + x[0] + '">' + x[1] + '</span>' : '') + esc(x[0] === 'all' ? t.all : t.sev[x[0]]) + '<span class="c">' + cnt[x[0]] + '</span></button>'
  }).join('') + '</div>'
  h += bulkHTML()
  if (!vis.length) {
    var k = S.q || S.sev !== 'all' ? 'filter' : S.tab
    h += '<div class="empty" data-key="empty-' + k + '"><div class="ic">' + icon('check', 30) + '</div><h2>' + esc(t.emptyTitle[k]) + '</h2><p>' + esc(t.emptyText[k]) + '</p></div>'
  } else {
    h += '<div class="stack" data-key="stack">' + vis.map(function (f) { return f.id === sel ? cardHTML(f) : rowHTML(f) }).join('') + '</div>'
  }
  paint($('main'), h)
  Array.prototype.forEach.call(document.querySelectorAll('textarea[data-note],textarea[data-ask]'), autosize)
}
function autosize(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 160) + 'px' }

function renderAside() {
  var t = T(), def = inTab('deferred')
  var h = '<div class="phead" data-key="mem-h"><span class="lbl">' + esc(t.memory) + '</span><span class="pill">' + def.length + '</span></div>'
  h += def.length
    ? '<section class="panel" data-key="mem"><ul>' + def.map(function (f) { return '<li data-key="m-' + f.id + '"><span class="q"><span class="mono" style="color:var(--faint)">[' + f.id + ']</span> ' + esc(f.title) + '</span><span class="a mono" style="font-size:12px;color:var(--muted)">→ ' + esc(f.where) + '</span></li>' }).join('') + '</ul></section>'
    : '<p class="emptyp" data-key="mem-empty">' + esc(t.memoryEmpty) + '</p>'
  h += '<div class="phead" data-key="sent-h" style="padding-top:6px"><span class="lbl">' + esc(t.sent) + '</span><span class="pill">' + state.events.length + '</span></div>'
  h += state.events.length
    ? '<section class="panel" data-key="sent"><ul>' + state.events.map(function (e) { return '<li data-key="e-' + e.at + '-' + e.id + '-' + e.what + '"><span class="q"><span class="mono" style="color:var(--faint)">' + hhmm(e.at) + '</span> ' + esc(e.id) + ' · ' + esc(t.moment[e.what] || e.what) + '</span>' + (e.note ? '<span class="a">→ «' + esc(e.note) + '»</span>' : '') + '</li>' }).join('') + '</ul></section>'
    : '<p class="emptyp" data-key="sent-empty">' + esc(t.sentEmpty) + '</p>'
  h += '<p class="hint" data-key="hint">' + esc(t.sentHint) + '</p>'
  h += '<button class="dashed ghost" type="button" data-key="how" data-drawer style="margin-top:0">' + I.code + esc(t.toolsBtn) + '</button>'
  h += '<details class="box keys" data-key="keys"' + (S.keysOpen ? ' open' : '') + '><summary class="lbl">' + esc(t.keys) + '</summary>' + t.keyRows.map(function (k) { return '<div class="keyrow"><span>' + esc(k[0]) + '</span><span style="display:inline-flex;gap:3px">' + k[1].map(function (x) { return '<kbd>' + x + '</kbd>' }).join('') + '</span></div>' }).join('') + '</details>'
  paint($('aside'), h)
}

/** The same note the mod puts beside the next message, as far as the page can tell it. */
function contextPreview() {
  var t = T(), lines = []
  if (state.news && state.news.length) lines.push(t.newsHead + '\n' + state.news.map(function (n) { return '- ' + n.id + ' «' + n.title + '»: ' + (t.newsWhat[n.what] || n.what) + (n.note ? ': ' + n.note : '') }).join('\n'))
  var dismissed = state.findings.filter(function (f) { return f.status === 'dismissed' }).map(function (f) { return f.id })
  var deferred = state.findings.filter(function (f) { return f.status === 'deferred' }).map(function (f) { return f.id })
  if (dismissed.length && !state.isStandingTold) lines.push(t.standingDismissed(dismissed.join(', ')))
  if (deferred.length && !state.isStandingTold) lines.push(t.standingDeferred(deferred.join(', ')))
  return lines.join('\n')
}

function renderDrawer() {
  $('drawer').classList.toggle('show', S.drawer)
  $('scrim').classList.toggle('show', S.drawer)
  if (!S.drawer) return
  var t = T(), preview = contextPreview()
  var h = '<header><span class="logo" style="width:32px;height:32px">' + I.code + '</span><h2>' + esc(t.drawerTitle) + '</h2><button class="iconbtn ghost" type="button" data-close aria-label="' + esc(t.close) + '">' + I.x + '</button></header><div class="body">'
  h += '<section class="sec"><span class="lbl">' + esc(t.seesLbl) + '</span><div class="tool"><pre class="pre">' + esc(preview || t.seesNone) + '</pre></div><p class="hint" style="padding:0">' + esc(t.seesHint) + '</p></section>'
  h += '<section class="sec"><span class="lbl">' + esc(t.ruleLbl) + '</span><div class="rule">' + t.rule.map(function (p) { return '<p>' + p + '</p>' }).join('') + '</div></section>'
  h += '<section class="sec"><span class="lbl">' + esc(t.toolsLbl) + '</span>' + t.tools.map(function (x) { return '<div class="tool"><div class="th"><code>mcp__findings__' + x[0] + '</code><span>' + esc(x[1]) + '</span></div></div>' }).join('') + '</section>'
  h += '</div>'
  paint($('drawer'), h)
}

function renderAll() { renderHeader(); renderNav(); renderMain(); renderAside(); renderDrawer() }

/* ---------- toast ---------- */
var toastTimer = null, undoFn = null
function toast(msg, undo) {
  $('toastMsg').textContent = msg
  undoFn = undo || null
  $('toastUndo').textContent = T().undo
  $('toastUndo').hidden = !undo
  $('toast').classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(function () { $('toast').classList.remove('show'); undoFn = null }, undo ? 5000 : 2600)
}
$('toastUndo').onclick = function () { if (undoFn) undoFn(); undoFn = null; $('toast').classList.remove('show') }

/* ---------- presses ---------- */
function press(type, extra) {
  var data = { type: type, id: '', ids: [], note: '', at: 0, version: 0, fix: 0, lang: hub.lang }
  for (var k in extra) data[k] = extra[k]
  return data
}
function send(data, waitOn) {
  return hub.send(data).then(function (sent) {
    if (waitOn) { pending[sent.id] = waitOn; renderMain() }
    if (!sent.online) toast(T().waitingSession)
    return sent
  }, function () { toast(T().sendFail) })
}
function act(kind) {
  var id = S.sel[S.tab], f = byId(id)
  if (!f || isPending(f.id)) return
  var v = viewOf(f), t = T()
  var note = kind === 'cancel' || kind === 'restore' || kind === 'approve' || kind === 'unapprove' ? '' : (notes[f.id] || '').trim()
  send(press(kind, { id: f.id, note: note, version: v.vi, fix: v.fi }), f.id).then(function (sent) {
    if (!sent) return
    if (note) { notes[f.id] = '' }
    if (kind === 'defer' || kind === 'dismiss') {
      toast(kind === 'defer' ? t.deferredToast : t.dismissedToast, function () { send(press('restore', { id: f.id }), f.id) })
    }
    if (kind === 'discuss') toast(t.discussToast)
    renderMain()
  })
}
function ask(id, kind) {
  var f = byId(id), draft = asks[id] || { text: '' }, note = draft.text.trim()
  if (!f || isPending(id)) return
  if (kind === 'queue' ? !note : (f.isAsking || (!note && !f.thread.some(function (m) { return m.isQueued })))) return
  send(press(kind, { id: id, note: note }), id).then(function (sent) {
    if (!sent) return
    asks[id] = { text: '' }
    var ta = document.querySelector('textarea[data-ask="' + id + '"]')
    if (ta) { ta.value = ''; autosize(ta) }
    renderMain()
  })
}
function copy(text, msg) {
  try { navigator.clipboard.writeText(text).then(function () { toast(msg) }, function () { toast(T().copyFail) }) } catch (e) { toast(T().copyFail) }
}
function scrollToCard() {
  requestAnimationFrame(function () {
    var c = document.querySelector('.card')
    if (!c) return
    var r = c.getBoundingClientRect()
    if (r.top < 90 || r.top > innerHeight * 0.6) window.scrollTo({ top: scrollY + r.top - 110, behavior: 'smooth' })
  })
}
function setMode(mode) {
  S.codeMode = mode
  try { localStorage.setItem('findings.codeMode', mode) } catch (e) {}
  renderMain()
}

document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-pick],[data-tab],[data-sel],[data-act],[data-ver],[data-fix],[data-file],[data-copy],[data-sev],[data-copylist],[data-clear],[data-drawer],[data-close],[data-mode],[data-unfold],[data-askbtn],[data-queuebtn],[data-unqueue],[data-askall],[data-pickall],[data-unpick],[data-fixmany],[data-applymany],[data-tell],#scrim')
  if (!el || el.disabled) return
  var d = el.dataset, f = byId(S.sel[S.tab])
  if (d.pick) { S.picked[d.pick] = !S.picked[d.pick]; renderMain(); return }
  if (d.tab) { S.tab = d.tab; S.sev = 'all'; renderAll(); return }
  if (d.sev) { S.sev = d.sev; renderMain(); return }
  if (d.sel) { S.sel[S.tab] = d.sel; renderMain(); scrollToCard(); return }
  if (d.act) { act(d.act); return }
  if (d.askbtn) { ask(d.askbtn, 'ask'); return }
  if (d.queuebtn) { ask(d.queuebtn, 'queue'); return }
  if (d.unqueue) { send(press('unqueue', { id: d.unqueue, at: Number(d.at) || 0 }), d.unqueue); return }
  if (d.askall !== undefined) { if (queuedIds().length) send(press('askAll', {}), '*'); return }
  if (d.mode) { setMode(d.mode); return }
  if (d.unfold) { S.unfolded[d.unfold] = true; renderMain(); return }
  if (d.ver && f) { viewOf(f).vi = Number(d.ver); renderMain(); return }
  if (d.fix && f) { var v = viewOf(f); v.fi = Number(d.fix); v.file = 0; renderMain(); return }
  if (d.file && f) { viewOf(f).file = Number(d.file); renderMain(); return }
  if (d.copy !== undefined) { copy(d.copy, T().copied + ': ' + d.copy); return }
  if (el.hasAttribute('data-pickall')) { var all = visible().filter(canPick), on = !all.every(function (x) { return S.picked[x.id] }); all.forEach(function (x) { S.picked[x.id] = on }); renderMain(); return }
  if (el.hasAttribute('data-unpick')) { S.picked = {}; renderMain(); return }
  if (el.hasAttribute('data-fixmany')) {
    var ids = pickedIds()
    if (ids.length) send(press('fixMany', { ids: ids }), '*').then(function (sent) { if (sent) { S.picked = {}; renderMain() } })
    return
  }
  if (el.hasAttribute('data-tell')) { send(press('tell'), '*'); return }
  if (el.hasAttribute('data-applymany')) { var ok = approvedIds(); if (ok.length) send(press('applyMany', { ids: ok }), '*'); return }
  if (el.hasAttribute('data-copylist')) {
    copy(inTab(S.tab).map(function (x) { return '[' + x.id + '] ' + T().sev[x.severity] + ' — ' + x.title + '\n  ' + x.where + '\n  ' + bare(x.versions[viewOf(x).vi].plain) }).join('\n\n'), T().listCopied)
    return
  }
  if (el.hasAttribute('data-clear')) {
    var n = inTab('closed').length
    if (!n) return
    send(press('clear')).then(function (sent) {
      if (sent) toast(T().cleared(n), function () { send(press('unclear')) })
    })
    return
  }
  if (el.hasAttribute('data-drawer')) { S.drawer = true; renderDrawer(); return }
  if (el.hasAttribute('data-close') || el.id === 'scrim') { S.drawer = false; renderDrawer() }
})
document.addEventListener('toggle', function (e) { if (e.target.matches && e.target.matches('details.keys')) S.keysOpen = e.target.open }, true)
document.addEventListener('input', function (e) {
  var el = e.target
  if (el.id === 'q') { S.q = el.value.trim().toLowerCase(); renderMain(); return }
  if (el.dataset && el.dataset.note) {
    notes[el.dataset.note] = el.value
    autosize(el)
    var pv = el.parentNode.querySelector('.pv')
    if (pv) pv.textContent = el.value.trim() ? T().noteGoes + ' «' + el.value.trim() + '»' : ''
    return
  }
  if (el.dataset && el.dataset.ask) {
    var a = asks[el.dataset.ask] || (asks[el.dataset.ask] = { text: '' })
    var wasEmpty = !a.text.trim()
    a.text = el.value
    autosize(el)
    if (wasEmpty !== !a.text.trim()) renderMain()
  }
})
document.addEventListener('keydown', function (e) {
  var tag = e.target.tagName, isTyping = tag === 'TEXTAREA' || tag === 'INPUT'
  if (e.key === 'Escape') { if (S.drawer) { S.drawer = false; renderDrawer(); return } if (isTyping) e.target.blur(); return }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target.dataset && e.target.dataset.ask) { e.preventDefault(); ask(e.target.dataset.ask, 'ask'); return }
  if (e.key === ' ' && e.target.dataset && e.target.dataset.pick) { e.preventDefault(); e.target.click(); return }
  var f = byId(S.sel[S.tab])
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && f && groupOf(f) !== 'closed') {
    e.preventDefault()
    if (f.status === 'proposed') act('apply'); else if ((f.status === 'open' || f.status === 'deferred') && !f.busy) act('fix')
    return
  }
  if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return
  var k = e.key.toLowerCase()
  if (k === 'j' || k === 'k') {
    var l = visible(), i = l.findIndex(function (x) { return x.id === S.sel[S.tab] })
    var n = l[Math.max(0, Math.min(l.length - 1, i + (k === 'j' ? 1 : -1)))]
    if (n) { S.sel[S.tab] = n.id; renderMain(); scrollToCard() }
    return
  }
  if (!f || f.busy || (f.status !== 'open' && f.status !== 'deferred')) return
  var map = { s: 'simpler', e: 'example', d: f.status === 'deferred' ? null : 'defer', x: 'dismiss' }
  if (map[k]) { e.preventDefault(); act(map[k]) }
})

/* ---------- the hub ---------- */
function prepare() {
  if (shiki.state !== 'ready') return Promise.resolve()
  var missing = allChanges().filter(function (c) { return painted[codeKey(c)] === undefined || (c.full && painted['F' + codeKey(c)] === undefined) })
  if (!missing.length) return Promise.resolve()
  return Promise.race([Promise.all(missing.map(highlight)), new Promise(function (ok) { setTimeout(ok, 400) })])
}
var arrivals = Promise.resolve()
hub.onState(function (next) {
  var incoming = next && Array.isArray(next.findings) ? next : { findings: [], branch: '', events: [], news: [], updatedAt: 0 }
  if (!Array.isArray(incoming.news)) incoming.news = []
  arrivals = arrivals.then(function () {
    var before = state
    state = incoming
    var fresh = state.findings.filter(function (f) { return !before.findings.some(function (b) { return b.id === f.id }) })
    if (fresh.length && before.findings.length) { S.tab = 'open'; S.sel.open = fresh[0].id }
    return prepare().then(function () { renderAll(); highlightAll().then(renderMain) })
  })
})
hub.onDelivered(function (ids) {
  var changed = false
  ids.forEach(function (id) { if (pending[id] !== undefined) { delete pending[id]; changed = true } })
  if (changed) renderMain()
})
hub.onOnline(function (next) { online = next; renderHeader() })
hub.onMeta(function (next) { meta = next || meta })
hub.onLang(renderAll)
$('q').value = ''
renderAll()
})()
</script>
</body>
</html>
`

export const PAGE = SOURCE.replace('__SHIKI__', SHIKI_VERSION).replace('__THEME__', () => JSON.stringify(ISLANDS_DARK))
