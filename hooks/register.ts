import type { EngineInterface, Register } from 'claude-code'

import type { Entry, Finding, Lang, Moment, PageAction, ProjectFile, State } from '../types'
import {
  applyAsk,
  applyChange,
  carriedFor,
  DAY,
  deferredIds,
  deferredNote,
  discussText,
  DONE_DESCRIPTION,
  DONE_SCHEMA,
  DONE_TOOL,
  EMPTY,
  explainAsk,
  explainPrompt,
  FIX_DESCRIPTION,
  FIX_SCHEMA,
  FIX_TOOL,
  fixAsk,
  fixAt,
  GUIDE,
  isClosed,
  isLocal,
  langOf,
  lastNumber,
  MARK_FIXED,
  MOD,
  parseAction,
  parseExplanation,
  parseFix,
  parseProject,
  parseReport,
  parseState,
  projectSlug,
  PROPOSE_FIX,
  REPORT,
  REPORT_DESCRIPTION,
  REPORT_SCHEMA,
  REPORT_TOOL,
  statusLine,
  sweepProject,
  syncProject,
  waitingCount,
  words,
} from './model'
import type { Change } from './model'
import { PAGE } from './page/page'

const TITLE = 'Находки'
const ICON = '🔎'
const COMMAND = 'findings'
const PULL_WAIT_MS = 5000
const PULL_STUCK_MS = PULL_WAIT_MS + 10_000

/** The tools as the engine names them; patterns, as a tool this mod registers is not in the types until the mod has loaded once. */
const REPORT_CALL = new RegExp(`^${REPORT}$`)
const FIX_CALL = new RegExp(`^${PROPOSE_FIX}$`)
const DONE_CALL = new RegExp(`^${MARK_FIXED}$`)

/** One load of this module: the hub hands the page's presses to the newest load only. */
const LISTENER = `${Date.now()}-${Math.random().toString(36).slice(2)}`

/** This load's own values; a reload runs `register` again and starts them over, and `session.start` fills them back. */
let current: State = EMPTY
let lang: Lang = 'en'
let url = ''
let session: { id: string; path: string } | null = null
let listening = { since: 0, isFirst: true, isStale: false }
/** What "Clear closed" took away, so its undo can put it back. */
let dropped: Finding[] = []
let queue: Promise<unknown> = Promise.resolve()

/** Changes run one at a time: each reads the state the one before it left. */
const serial = <T>(work: () => Promise<T>): Promise<T> => {
  const run = queue.then(work, work)
  queue = run.catch(() => undefined)

  return run
}

const readText = async ($: EngineInterface, path: string): Promise<string> => {
  try {
    return (await $.fs.exists(path)) ? String(await $.fs.read(path)) : ''
  } catch {
    return ''
  }
}

const modsData = async ($: EngineInterface): Promise<string> => `${(await $.env.get('CLAUDE_CONFIG_DIR')) ?? `${(await $.env.get('HOME')) ?? ''}/.claude`}/mods-data`

const dataDir = async ($: EngineInterface): Promise<string> => `${await modsData($)}/findings`

/** The mod was called razbor before: its data is copied over once, and the old folder is left to the old version. */
const copyOldData = async ($: EngineInterface): Promise<void> => {
  try {
    const base = await modsData($)

    if (!(await $.fs.exists(`${base}/findings`)) && (await $.fs.exists(`${base}/razbor`))) {
      await $.process.run(['cp', '-R', `${base}/razbor`, `${base}/findings`])
    }
  } catch {
    return
  }
}

const git = async ($: EngineInterface, args: string[]): Promise<string> => {
  try {
    const { exitCode, stdout } = await $.process.run(['git', ...args])

    return exitCode === 0 ? stdout.trim() : ''
  } catch {
    return ''
  }
}

/** This session's file, followed to the new id after a /clear: a page emptied by it keeps what it showed. */
const ensureSession = async ($: EngineInterface): Promise<{ id: string; path: string }> => {
  const id = await $.session.id()

  if (session === null || session.id !== id) {
    session = { id, path: `${await dataDir($)}/sessions/${id}.json` }
  }

  return session
}

const projectPath = async ($: EngineInterface): Promise<string> => `${await dataDir($)}/projects/${projectSlug(await $.session.root())}.json`

const readProject = async ($: EngineInterface): Promise<ProjectFile> => parseProject(await readText($, await projectPath($)))

/** Writes the session's file, and the project's when the change touches what other sessions of the branch see. */
const persist = async ($: EngineInterface, isShared: boolean): Promise<void> => {
  try {
    const own = await ensureSession($)
    await $.fs.write(own.path, `${JSON.stringify(current)}\n`)

    if (!isShared) {
      return
    }

    const path = await projectPath($)
    const before = await readText($, path)
    const after = `${JSON.stringify(syncProject(parseProject(before), current, own.id, await $.clock.now()))}\n`

    if (after !== before) {
      await $.fs.write(path, after)
    }
  } catch {
    return
  }
}

/** Puts the page in the hub (again after the hub lost it) with the latest state. */
const show = async ($: EngineInterface): Promise<boolean> => {
  try {
    const page = await $.webhub.page({ mod: MOD, title: TITLE, html: PAGE, icon: ICON })
    url = page.url
    await $.webhub.push({ mod: MOD, state: current, badge: waitingCount(current.findings) })

    return page.isUp
  } catch {
    return false
  }
}

const push = async ($: EngineInterface): Promise<void> => {
  try {
    await $.webhub.push({ mod: MOD, state: current, badge: waitingCount(current.findings) })
  } catch {
    return
  }
}

const dispatch = ($: EngineInterface, change: Change): Promise<State> =>
  serial(async () => {
    current = applyChange(current, change)
    await push($)
    await persist($, !isLocal(change))
    $.ui.status(statusLine(current.findings, lang))

    return current
  })

/** Brings in what the branch's other sessions left waiting. */
const carry = async ($: EngineInterface): Promise<State> => {
  const own = await ensureSession($)
  const branch = await git($, ['rev-parse', '--abbrev-ref', 'HEAD'])

  return dispatch($, { op: 'carry', branch, findings: carriedFor(await readProject($), branch, own.id, current.findings) })
}

/** Fills the state once per load: the session's file (a restart, a resume), else what the hub holds. */
const restore = async ($: EngineInterface): Promise<void> => {
  const own = await ensureSession($)
  let saved = parseState(await readText($, own.path))

  if (saved === null) {
    try {
      const held = await $.webhub.read({ mod: MOD })
      saved = held.state === null ? null : parseState(JSON.stringify(held.state))
    } catch {
      saved = null
    }
  }

  current = saved ?? EMPTY
  await carry($)
}

/** Once a day: session files untouched for 30 days go, and the findings of branches deleted that long ago. */
const sweep = async ($: EngineInterface): Promise<void> => {
  try {
    const now = await $.clock.now()

    if (now - Number((await $.store.get('lastSweep')) ?? 0) < DAY) {
      return
    }

    await $.store.set('lastSweep', now)
    const dir = `${await dataDir($)}/sessions`
    const stale = (await $.fs.exists(dir)) ? (await $.fs.list(dir)).filter(entry => entry.kind === 'file' && entry.name.endsWith('.json') && now - entry.mtimeMs > 30 * DAY) : []

    if (stale.length > 0) {
      await $.process.run(['rm', '-f', ...stale.map(entry => `${dir}/${entry.name}`)])
    }

    const branches = (await git($, ['branch', '--format=%(refname:short)'])).split('\n').filter(name => name !== '')

    if (branches.length === 0) {
      return
    }

    const path = await projectPath($)
    const file = parseProject(await readText($, path))
    const swept = sweepProject(file, branches, now)

    if (swept.standing.length !== file.standing.length) {
      await $.fs.write(path, `${JSON.stringify(swept)}\n`)
    }
  } catch {
    return
  }
}

/** Sends the page's ask as the person's own message; a dropped one (an interrupted turn) is said, not lost silently. */
const deliver = async ($: EngineInterface, text: string): Promise<boolean> => {
  try {
    const sent = await $.prompt.submit({ text, asUser: true })

    if (sent.drop === undefined) {
      return true
    }
  } catch {
    // said below
  }

  $.ui.toast(words(lang).notSent, { timeoutMs: 5000 })

  return false
}

const findingOf = (id: string): Finding | undefined => current.findings.find(finding => finding.id === id)

/** A quick side answer over this conversation; through chat when the session has not read the code, or the side answer failed. */
const explain = async ($: EngineInterface, finding: Finding, action: PageAction, entry: Entry): Promise<void> => {
  const mode = action.type === 'simpler' ? 'simpler' : 'example'

  if (finding.busy !== null) {
    return
  }

  if (finding.isCarried) {
    if (await deliver($, explainAsk(finding, mode, action.note, lang))) {
      await dispatch($, { op: 'note', id: finding.id, entry })
    }

    return
  }

  await dispatch($, { op: 'busy', id: finding.id, busy: mode, entry })
  let explanation = null

  try {
    const answer = await $.model.fork({ prompt: explainPrompt(finding, mode, action.note, action.version) })
    explanation = answer.isAnswered ? parseExplanation(answer.text, mode, action.note) : null
  } catch {
    explanation = null
  }

  if (explanation !== null) {
    await dispatch($, { op: 'version', id: finding.id, explanation, at: await $.clock.now() })

    return
  }

  await dispatch($, { op: 'busy', id: finding.id, busy: null })

  if (await deliver($, explainAsk(finding, mode, action.note, lang))) {
    $.ui.toast(words(lang).viaChat, { timeoutMs: 5000 })
  }
}

const askFix = async ($: EngineInterface, finding: Finding, action: PageAction, entry: Entry): Promise<void> => {
  const before = finding.status
  const state = await dispatch($, { op: 'status', id: finding.id, status: 'fixing', entry })

  if (!(await deliver($, fixAsk(finding, action.note, deferredIds(state.findings), lang)))) {
    await dispatch($, { op: 'status', id: finding.id, status: before })
  }
}

const applyFix = async ($: EngineInterface, finding: Finding, action: PageAction, entry: Entry): Promise<void> => {
  const fix = fixAt(finding, action.fix)

  if (fix === null) {
    return
  }

  const state = await dispatch($, { op: 'status', id: finding.id, status: 'applying', entry })

  if (!(await deliver($, applyAsk(finding, fix, action.note, deferredIds(state.findings), lang)))) {
    await dispatch($, { op: 'status', id: finding.id, status: 'proposed' })
  }
}

const discuss = async ($: EngineInterface, finding: Finding, action: PageAction, entry: Entry): Promise<void> => {
  try {
    const filled = await $.prompt.fill({ text: discussText(finding, finding.status === 'proposed' ? fixAt(finding, action.fix) : null, action.note, lang) })

    if (filled.isFilled) {
      await dispatch($, { op: 'note', id: finding.id, entry })

      return
    }
  } catch {
    // said below
  }

  $.ui.toast(words(lang).noFill, { timeoutMs: 4000 })
}

const SENT: readonly PageAction['type'][] = ['simpler', 'example', 'fix', 'another', 'apply', 'discuss', 'defer', 'dismiss', 'restore']

/** One press on the page. */
const handle = async ($: EngineInterface, raw: unknown): Promise<void> => {
  const action = parseAction(raw)

  if (action === null) {
    return
  }

  if (action.lang !== lang) {
    lang = action.lang
    await $.store.set('lang', lang)
  }

  if (action.type === 'clear') {
    dropped = current.findings.filter(finding => isClosed(finding.status))
    await dispatch($, { op: 'dropClosed' })

    return
  }

  if (action.type === 'unclear') {
    await dispatch($, { op: 'putBack', findings: dropped })
    dropped = []

    return
  }

  const finding = findingOf(action.id)

  if (finding === undefined) {
    return
  }

  const at = await $.clock.now()
  const what = action.type as Moment
  const entry: Entry = { at, by: 'you', what, note: action.note }

  if (SENT.includes(action.type)) {
    await dispatch($, { op: 'sent', event: { at, what, id: finding.id, note: action.note } })
  }

  switch (action.type) {
    case 'simpler':
    case 'example':
      return explain($, finding, action, entry)
    case 'fix':
    case 'another':
      return askFix($, finding, action, entry)
    case 'apply':
      return applyFix($, finding, action, entry)
    case 'discuss':
      return discuss($, finding, action, entry)
    case 'cancel':
      await dispatch($, { op: 'cancel', id: finding.id, at })

      return
    case 'defer':
      await dispatch($, { op: 'status', id: finding.id, status: 'deferred', entry })

      return
    case 'dismiss':
      await dispatch($, { op: 'status', id: finding.id, status: 'dismissed', entry })

      return
    case 'restore':
      await dispatch($, { op: 'status', id: finding.id, status: 'open', entry })
  }
}

/** One long-poll for the page's presses; a pull still running is not doubled, one the engine dropped is given up after a while. */
const listen = async ($: EngineInterface): Promise<void> => {
  const now = Date.now()

  if (listening.isStale || (listening.since !== 0 && now - listening.since < PULL_STUCK_MS)) {
    return
  }

  listening = { ...listening, since: now }

  try {
    const pulled = await $.webhub.pull({ mod: MOD, listener: LISTENER, isFirst: listening.isFirst, waitMs: PULL_WAIT_MS })
    listening = { ...listening, isStale: pulled.isStale, isFirst: listening.isFirst && !pulled.isUp }

    if (pulled.isUp && !pulled.isRegistered) {
      await show($)
    }

    for (const action of pulled.actions) {
      await handle($, action.data)
    }
  } finally {
    listening = { ...listening, since: 0 }
  }
}

export const register: Register = on => {
  current = EMPTY
  session = null
  dropped = []
  listening = { since: 0, isFirst: true, isStale: false }

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: COMMAND, description: 'Show the address of the Findings page with the review findings' })
    await $.tool.register({ name: REPORT_TOOL, description: REPORT_DESCRIPTION, isDeferred: false, inputSchema: REPORT_SCHEMA })
    await $.tool.register({ name: FIX_TOOL, description: FIX_DESCRIPTION, isDeferred: false, inputSchema: FIX_SCHEMA })
    await $.tool.register({ name: DONE_TOOL, description: DONE_DESCRIPTION, isDeferred: false, inputSchema: DONE_SCHEMA })

    lang = langOf(await $.store.get('lang'))
    await copyOldData($)
    await restore($)
    await sweep($)
    await show($)
    $.ui.status(statusLine(current.findings, lang))
    $.clock.every(1000, () => void listen($).catch(() => undefined))

    return result
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, { id: 'findings:guide', text: GUIDE, scope: 'session' }] }
  })

  /** What the person set aside rides on their own prompts, so a later "fix everything" skips it. */
  on('prompt.submit', async ($, e, next) => {
    const ids = e.command === undefined && e.origin?.kind !== 'plugin' ? deferredIds(current.findings) : []

    return next(ids.length === 0 ? e : { ...e, context: [...(e.context ?? []), deferredNote(ids, lang)] })
  })

  on('command.run', { command: COMMAND }, async $ => ({ text: (await show($)) ? words(lang).page(url) : words(lang).down }))

  on('tool.call', { tool: REPORT_CALL }, async ($, e) => {
    const state = await carry($)
    const lastNo = Math.max((await readProject($)).lastNo, lastNumber(state.findings))
    const parsed = parseReport(e as unknown as Record<string, unknown>, lastNo, state.findings)

    if (parsed.errors !== undefined) {
      return { deny: `${REPORT} refused, nothing was shown. Fix these and call it again:\n- ${parsed.errors.join('\n- ')}` }
    }

    await dispatch($, { op: 'report', added: parsed.added, versions: parsed.versions, at: await $.clock.now() })
    const isUp = await show($)

    if (parsed.added.length > 0) {
      $.ui.toast(words(lang).fresh(parsed.added.length, url), { timeoutMs: 6000 })
    }

    const shown = [
      ...(parsed.added.length > 0 ? [`${parsed.added.length} findings are on the Findings page (ids ${parsed.added.map(finding => finding.id).join(', ')})`] : []),
      ...(parsed.versions.length > 0 ? [`a new explanation is shown for ${parsed.versions.map(version => version.id).join(', ')}`] : []),
    ].join('; ')

    return {
      result: isUp
        ? `${shown}, at ${url}. Do not repeat them in chat: end with one short line saying they are on the Findings page, with that link.`
        : `${shown}, but the hub does not answer (is docker running?): the page shows them once the hub is up. Tell the user so in one line.`,
    }
  })

  on('tool.call', { tool: FIX_CALL }, async ($, e) => {
    const parsed = parseFix(e as unknown as Record<string, unknown>, current.findings)

    if (parsed.errors !== undefined) {
      return { deny: `${PROPOSE_FIX} refused, nothing was shown. Fix these and call it again:\n- ${parsed.errors.join('\n- ')}` }
    }

    await dispatch($, { op: 'fix', id: parsed.id, fix: parsed.fix, at: await $.clock.now() })

    return { result: `The solution for ${parsed.id} is shown on the Findings page (${url}). Change no code: end your turn with one short line and wait, the user applies it from the page.` }
  })

  on('tool.call', { tool: DONE_CALL }, async ($, e) => {
    const input = e as unknown as { id?: unknown; check?: unknown }
    const id = String(input.id ?? '').trim()
    const check = String(input.check ?? '').trim()

    if (findingOf(id) === undefined) {
      return { deny: `No finding with id "${id}" on the Findings page.` }
    }

    if (check === '') {
      return { deny: 'check is empty: say how the fix was checked and with what result.' }
    }

    const at = await $.clock.now()
    await dispatch($, { op: 'status', id, status: 'fixed', check, entry: { at, by: 'claude', what: 'fixed', note: check } })

    return { result: `${id} is marked as fixed on the Findings page.` }
  })
}
