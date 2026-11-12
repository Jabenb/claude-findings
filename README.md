# Findings for Claude Code

English | [Русский](README.ru.md)

After a review, an audit or an investigation Claude usually leaves a list in chat: "here is a bug, because of this and that". If you have not read that code, such a list says little. This mod moves the findings to a page in your browser, where each finding is a card you can read on its own:

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
| **Set aside** | The finding moves to "Set aside", and Claude is reminded not to touch it until you bring it back (once, and again after the conversation is compacted). |
| **Approve** | Marks the solution shown as approved, to apply it together with others. |
| **Not a problem** | Closes the finding without a fix. |

Every action takes an optional note: type it in the field above the buttons and it goes along ("without migrations", "what is type here?").

### Discussion

Under each finding there is a discussion: ask about the finding or its solution right there. The question goes to the session chat as a message from you: Claude reads the code it needs, answers in the card through the `reply` tool, and says one line in chat. **Ask** sends the question at once. **Queue** keeps it on the card, marked "not sent yet" (it can be removed there); above the list a line shows how many questions are queued, with a **Send questions** button that sends the questions of every card in one message, grouped by finding. One message instead of several is one turn for Claude: the conversation goes to the model once, and a file two questions need is read once.

### Several findings at once

Tick findings in the list (or **Select all**) and press **Prepare solutions**: one message asks Claude for a solution to each, and each lands in its own card. Approve the ones you like (**Approve** in the card), then **Apply approved** sends one message that applies them one by one; each finding closes as soon as Claude has checked its fix.

### Code: one column, two columns, whole file

The code of a solution has three views, switched in the code block's header and remembered by the browser: the diff in one column, the diff in two columns (before on the left, after on the right), and the whole file before and after, side by side. For the whole-file view the mod reads each changed file from disk when the solution is proposed and lays the diff over it; long unchanged stretches are folded and open with a click. If the diff does not fit the file (Claude copied a line wrong, or the file has changed), the card says so and shows the diff alone, and Claude is asked to propose it again with exact lines.

### What Claude is told

What you do on the page without sending a message (**Not a problem**, **Set aside**, reopening, cancelling a solution, clearing closed findings) is gathered and goes to Claude with your next message, whether you write in the chat or press a button that sends one. Changes go once. The lists of findings closed as "not a problem" and set aside go once too, and again with the first message after the conversation is compacted, as the summary may have lost them. After `/clear` the session has a new page, and its lists go again with the first message. On top of that the mod itself keeps Claude off a finding closed as "not a problem": `report`, `propose_fix` and `mark_fixed` for it are refused until you reopen it.

You do not have to write anything for it to arrive. Above the list a line says what Claude does not know yet, with a **Tell Claude** button that sends it at once. And when you close or set aside the last finding that was waiting for you, it goes by itself six seconds later: time enough for **Undo**. Say you close five findings as "not a problem": right after the fifth, Claude gets one message with all five and your notes. **Tools and rule for Claude** on the page shows exactly what will go.

The list has three groups: **Waiting for you**, **Set aside** and **Closed**; closed findings can be cleared at once (with undo). There are a search, a severity filter, a history per finding, and a side column with what Claude keeps in mind and what went to Claude from the page.

Keys: `J`/`K` next and previous, `⌘↵`/`Ctrl+↵` fix or apply, `S` simpler, `E` another example, `D` set aside, `X` not a problem.

## Requirements

- [Claude Hub (webhub)](https://github.com/jabenb/claude-webhub) installed in the same scope, and Docker for its server.
- For the whole-file view: the session runs where the project's files are (the mod reads them from disk).
- A Claude Code build with mods (plugins with a hooks module).
- A browser with internet access for the code highlighting (see below). Without it the page works, the code is shown without colours.

## Install

The mod needs [Claude Hub (webhub)](https://github.com/jabenb/claude-webhub): install both in the same scope. The scope decides where they run:

| Scope | Runs in | Written to |
|---|---|---|
| `user` (global, the default) | every project | `~/.claude/settings.json` |
| `project` | this repository, for everyone who clones it | `<project>/.claude/settings.json` |
| `local` | this repository, only for you | `<project>/.claude/settings.local.json` |

### Globally

```bash
claude plugin install webhub --marketplace jabenb/claude-webhub
```

```bash
claude plugin install findings --marketplace jabenb/claude-findings
```

At the prompt of a Claude Code session the same works as `/plugin install findings --marketplace jabenb/claude-findings`.

### For one project

Run from the project's folder, with `--scope project` (or `--scope local` to keep it out of the files others see):

```bash
cd ~/path/to/project
```

```bash
claude plugin install webhub --marketplace jabenb/claude-webhub --scope project
```

```bash
claude plugin install findings --marketplace jabenb/claude-findings --scope project
```

### From a local copy

To run a clone, or your own changes, without GitHub, add the folder as a marketplace and install from it (any scope above):

```bash
git clone git@github.com:jabenb/claude-findings.git ~/claude-findings
```

```bash
claude plugin marketplace add ~/claude-findings
```

```bash
claude plugin install findings@claude-findings --scope project
```

While working on the mod itself, load it straight from the folder for one session instead, next to the hub's folder; changes reload when a turn ends:

```bash
claude --plugin-dir ~/claude-webhub --plugin-dir ~/claude-findings
```

Or for every session: add the folder to `CLAUDE_CODE_PLUGIN_DIRS` (paths joined with `:`) in the `env` of `~/.claude/settings.json`. Do not keep a folder-loaded copy and an installed one at once, or the mod loads twice.

### Updating

```bash
claude plugin marketplace update claude-findings
```

Then start a new session. The installed version is in `/plugin` under **Installed**.

## Use

1. Ask Claude for a review, an audit or an investigation. With two or more findings Claude calls the `report` tool instead of writing a list, and says in one line that the findings are on the page, with its address.
2. `/findings` prints the page's address at any time. The hub lists the page under the session's name too, with the number of findings waiting for you.
3. Work through the cards. A press goes to Claude as a message from you; "Simpler" and "Another example" are answered on the side and never reach the chat, unless the quick answer fails. Questions in the discussion always go through the chat, one at a time or as a batch from the queue.

The status line shows `Findings: N` while N findings wait for you.

## Languages

The page follows the language chosen in the hub: English, Russian or Ukrainian. The messages a press sends to Claude are in the same language. Claude writes the findings in the language you talk to it.

## Code highlighting

Diffs in solutions are highlighted by [Shiki](https://shiki.style) 4.5.0, loaded by the page from `esm.sh` (pinned, the JavaScript regex engine, grammars loaded on demand by file extension: PHP, Blade, TypeScript, Python, SQL, YAML, Go and others). The colours are the [Islands Dark](https://github.com/bwya77/vscode-dark-islands) theme by bwya77 (MIT), carried inside the mod, in both page themes. Ligatures are off in code, so `->`, `===` and `=>` stay as typed.

## Nothing blinks

The page never rebuilds what is on screen. Each render is merged into the DOM node by node: switching groups, opening a card, paging explanations or solutions, or a new state from Claude changes only the elements that changed. A note you are typing keeps its text and cursor while the page updates, and a new diff is highlighted before it is shown, so code does not flash from plain to coloured.

## How data is kept

Each session has its own file, `~/.claude/mods-data/findings/sessions/<session id>.json` (inside `$CLAUDE_CONFIG_DIR` when it is set); nothing appears in the project's repository. It holds the session's findings, explanations, solutions and history, so the page comes back as you left it after a restart or `--resume`.

- **Own numbering.** Every session counts its findings from R1. One session's findings never show in another, even on the same branch.
- **Cleanup.** Once a day the mod deletes the files of sessions whose chat Claude Code has already removed (it keeps chats for `cleanupPeriodDays`, 30 by default) and that were not touched for 30 days. Nothing is deleted when the chats cannot be listed. The `projects/` folder, where earlier versions shared findings between sessions, goes in the same cleanup.

The hub keeps its own copy of the page's state as well.

The mod used to be called Razbor (`razbor`). On its first start it copies the data over from `~/.claude/mods-data/razbor/` when the new folder does not exist yet; files of the earlier pane-based version are read as they are. The tools are now named `mcp__findings__*`.

## For Claude

The mod adds a rule to the system prompt and four tools:

- `mcp__findings__report`: show findings, or a new explanation of one (`id`). Concrete values in the example are wrapped in `{{double braces}}` and set apart on the card.
- `mcp__findings__propose_fix`: show a solution in the card, before any code changes.
- `mcp__findings__mark_fixed`: mark a finding fixed after the edit, with `check`: how it was checked.
- `mcp__findings__reply`: answer a question asked from the page; the answer shows in the finding's discussion. For a batch of questions Claude calls it once per finding.

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
- `tests/findings.test.ts`: the model and the mod end to end, with the hub and the engine held in memory.

## Uninstall

```bash
claude plugin uninstall findings
```

## License

MIT. Islands Dark © bwya77, MIT.
