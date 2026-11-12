# Razbor for Claude Code

English | [Русский](README.ru.md)

After a review, an audit or an investigation Claude usually leaves a list in chat: "here is a bug, because of this and that". If you have not read that code, such a list says little. Razbor moves the findings to a page in your browser, where each finding is a card you can read on its own:

- **In plain words**: one or two sentences without class names or jargon.
- **How it breaks**: a live example of 3-6 steps with real values (an id, a time, an amount, a field and its value), the step where it goes wrong marked red.
- **Who notices, and how**: a guest, the owner, support, accounting, and when they see it.
- **Where**: the file and line, copied with a click.

Nothing changes in the code until you say so. **Fix** asks Claude for a solution first, and the solution appears in the same card: what will change in plain words, the same example replayed after the fix, the diff per file with syntax highlighting, and what the solution leaves open. The edit starts only when you press **Apply**.

The page is built on [Claude Hub (webhub)](https://github.com/jabenb/claude-webhub): the hub hosts it, keeps it live and hands your presses back to the session.

## What you can do with a finding

| Button | What happens |
|---|---|
| **Simpler, please** | Claude explains it again in simpler words. The answer comes on the side, without the chat; the older explanations stay, and you switch between them. |
| **Another example** | The same problem on a different scenario with other data. |
| **Fix** | Claude reads what it needs and shows a solution in the card. No code changes yet. |
| **Apply** | Claude edits the code, checks it, and marks the finding fixed with how it was checked. |
| **Another option** | One more solution, different from the ones already shown; all of them stay on the card. |
| **Discuss in chat** | Puts a quote of the finding (and of the solution) into the chat prompt box, for your own question. |
| **Set aside** | The finding moves to "Set aside", and every message of yours tells Claude not to touch it until you bring it back. |
| **Not a problem** | Closes the finding without a fix. |

Every action takes an optional note: type it in the field above the buttons and it goes along ("without migrations", "what is type here?").

The list has three groups: **Waiting for you**, **Set aside** and **Closed**; closed findings can be cleared at once (with undo). There are a search, a severity filter, a history per finding, and a side column with what Claude keeps in mind and what went to Claude from the page.

Keys: `J`/`K` next and previous, `⌘↵`/`Ctrl+↵` fix or apply, `S` simpler, `E` another example, `D` set aside, `X` not a problem.

## Requirements

- [Claude Hub (webhub)](https://github.com/jabenb/claude-webhub) installed in the same scope, and Docker for its server.
- A Claude Code build with mods (plugins with a hooks module).
- A browser with internet access for the code highlighting (see below). Without it the page works, the code is shown without colours.

## Install

At the prompt of a Claude Code session:

```
/plugin install webhub --marketplace jabenb/claude-webhub
/plugin install razbor --marketplace jabenb/claude-razbor
```

From a shell:

```bash
claude plugin install webhub --marketplace jabenb/claude-webhub
```

```bash
claude plugin install razbor --marketplace jabenb/claude-razbor
```

Add `--scope project` or `--scope local` to both for one repository only. If the mod is already loaded from a folder (`--plugin-dir`, `CLAUDE_CODE_PLUGIN_DIRS` or a session's mods folder), remove that first, or it loads twice.

## Use

1. Ask Claude for a review, an audit or an investigation. With two or more findings Claude calls the `report` tool instead of writing a list, and says in one line that the findings are on the page, with its address.
2. `/razbor` prints the page's address at any time. The hub lists the page under the session's name too, with the number of findings waiting for you.
3. Work through the cards. A press goes to Claude as a message from you; "Simpler" and "Another example" are answered on the side and never reach the chat, unless the quick answer fails.

The status line shows `Razbor: N` while N findings wait for you.

## Languages

The page follows the language chosen in the hub: English, Russian or Ukrainian. The messages a press sends to Claude are in the same language. Claude writes the findings in the language you talk to it.

## Code highlighting

Diffs in solutions are highlighted by [Shiki](https://shiki.style) 4.5.0, loaded by the page from `esm.sh` (pinned, the JavaScript regex engine, grammars loaded on demand by file extension: PHP, Blade, TypeScript, Python, SQL, YAML, Go and others). The colours are the [Islands Dark](https://github.com/bwya77/vscode-dark-islands) theme by bwya77 (MIT), carried inside the mod, in both page themes. Ligatures are off in code, so `->`, `===` and `=>` stay as typed.

## Nothing blinks

The page never rebuilds what is on screen. Each render is merged into the DOM node by node: switching groups, opening a card, paging explanations or solutions, or a new state from Claude changes only the elements that changed. A note you are typing keeps its text and cursor while the page updates, and a new diff is highlighted before it is shown, so code does not flash from plain to coloured.

## How data is kept

Everything lives in `~/.claude/mods-data/razbor/` (inside `$CLAUDE_CONFIG_DIR` when it is set); nothing appears in the project's repository:

- `sessions/<session id>.json`: the session's findings, explanations, solutions and history, so the page comes back after a restart or `--resume`. Files untouched for 30 days are deleted once a day.
- `projects/<project path>.json`: the findings still waiting for you, per git branch. Another session on the same branch shows them too, marked "From another session"; since that session has not read the code, its requests carry the finding itself.

Findings of a branch deleted locally are forgotten 30 days after anyone last touched them. The hub keeps its own copy of the page's state as well.

Files written by the earlier, pane-based version of the mod are read as they are.

## For Claude

The mod adds a rule to the system prompt and three tools:

- `mcp__razbor__report`: show findings, or a new explanation of one (`id`). Concrete values in the example are wrapped in `{{double braces}}` and set apart on the card.
- `mcp__razbor__propose_fix`: show a solution in the card, before any code changes.
- `mcp__razbor__mark_fixed`: mark a finding fixed after the edit, with `check`: how it was checked.

## Development

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

- `hooks/model.ts`: parsing, the state and its changes, the texts of the messages (pure functions).
- `hooks/register.ts`: the engine and the hub: tools, the listening loop, presses, files.
- `hooks/page/page.ts`: the whole page; `hooks/page/theme.ts`: Islands Dark.
- `tests/razbor.test.ts`: the model and the mod end to end, with the hub and the engine held in memory.

## Uninstall

```bash
claude plugin uninstall razbor
```

## License

MIT. Islands Dark © bwya77, MIT.
