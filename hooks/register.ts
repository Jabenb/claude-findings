import type { EngineInterface, Register } from 'claude-code'

import type { Entry, FileChange, Finding, Fix, Lang, Moment, PageAction, ProjectFile, State } from '../types'
import {
  applyAsk,
  applyChange,
  applyManyAsk,
  carriedFor,
  contextNote,
  DAY,
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
  fixManyAsk,
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
  questionsAsk,
  PROPOSE_FIX,
  REPLY,
  REPLY_DESCRIPTION,
  REPLY_SCHEMA,
  REPLY_TOOL,
  REPORT,
  REPORT_DESCRIPTION,
  REPORT_SCHEMA,
  REPORT_TOOL,
  statusLine,
  sweepProject,
  syncProject,
  tellAsk,
  waitingCount,
  withFile,
  words,
} from './model'
import type { Change } from './model'
import { PAGE } from './page/page'

const TITLE = 'Находки'
const ICON = '🔎'
const COMMAND = 'findings'
const PULL_WAIT_MS = 5000
const PULL_STUCK_MS = PULL_WAIT_MS + 10_000
/** How long after the last waiting finding is closed or set aside the page's news goes to Claude by itself: time enough for Undo. */
const AUTO_TELL_MS = 6000

/** The tools as the engine names them; patterns, as a tool this mod registers is not in the types until the mod has loaded once. */
const REPORT_CALL = new RegExp(`^${REPORT}$`)
const FIX_CALL = new RegExp(`^${PROPOSE_FIX}$`)
const DONE_CALL = new RegExp(`^${MARK_FIXED}$`)
const REPLY_CALL = new RegExp(`^${REPLY}$`)

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
/** While the mod sends a message of its own: that message already carries the page's news, the prompt hook adds nothing. */
let isDelivering = false
/** When the page's news goes to Claude by itself (clock time), or 0. */
let autoTellAt = 0
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

/** What goes beside the next message to Claude; built at the moment of sending, so the latest presses are in. */
const context = (): string => contextNote(current, lang)

/**
 * Sends the page's ask as the person's own message, built with the page's news in it; the news is then told and cleared.
 * A dropped message (an interrupted turn) is said, not lost silently, and the news waits for the next one.
 */
const deliver = async ($: EngineInterface, build: (note: string) => string): Promise<boolean> => {
  isDelivering = true

  try {
    const sent = await $.prompt.submit({ text: build(context()), asUser: true })

    if (sent.drop === undefined) {
      await dispatch($, { op: 'told' })

      return true
    }
  } catch {
    // said below
  } finally {
    isDelivering = false
  }

  $.ui.toast(words(lang).notSent, { timeoutMs: 5000 })

  return false
}

const findingOf = (id: string): Finding | undefined => current.findings.find(finding => finding.id === id)

/** Something the person did on the page that sends no message: Claude hears of it with the next one. */
const tell = ($: EngineInterface, finding: Finding, what: Moment, note: string, at: number): Promise<State> =>
  dispatch($, { op: 'news', news: { at, what, id: finding.id, title: finding.title, note } })

/** A quick side answer over this conversation; through chat when the session has not read the code, or the side answer failed. */
const explain = async ($: EngineInterface, finding: Finding, action: PageAction, entry: Entry): Promise<void> => {
  const mode = action.type === 'simpler' ? 'simpler' : 'example'

  if (finding.busy !== null) {
    return
  }

  if (finding.isCarried) {
    if (await deliver($, note => explainAsk(finding, mode, action.note, lang, note))) {
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

  if (await deliver($, note => explainAsk(finding, mode, action.note, lang, note))) {
    $.ui.toast(words(lang).viaChat, { timeoutMs: 5000 })
  }
}

/** A question typed on a card waits there until it is sent with the others; its time is its key on the card, so no two share one. */
const queueQuestion = ($: EngineInterface, finding: Finding, question: string, at: number): Promise<State> =>
  dispatch($, { op: 'queue', id: finding.id, message: { at: Math.max(at, (finding.thread.at(-1)?.at ?? 0) + 1), by: 'you', text: question, isQueued: true } })

/** The queued questions of the findings named (all of them when none are), in one message through the session; Claude answers each through reply. */
const sendQuestions = async ($: EngineInterface, ids: readonly string[], at: number): Promise<void> => {
  const asked = current.findings.filter(finding => (ids.length === 0 || ids.includes(finding.id)) && !finding.isAsking && finding.thread.some(message => message.isQueued))

  if (asked.length === 0) {
    return
  }

  if (await deliver($, note => questionsAsk(asked, lang, note))) {
    await dispatch($, { op: 'sending', ids: asked.map(finding => finding.id) })
    await dispatch($, { op: 'sent', event: { at, what: 'ask', id: asked.map(finding => finding.id).join(', '), note: '' } })
  }
}

const askFix = async ($: EngineInterface, finding: Finding, action: PageAction, entry: Entry): Promise<void> => {
  const before = finding.status
  await dispatch($, { op: 'status', id: finding.id, status: 'fixing', entry })

  if (!(await deliver($, note => fixAsk(finding, action.note, lang, note)))) {
    await dispatch($, { op: 'status', id: finding.id, status: before })
  }
}

/** One message asking a solution for each of the findings pressed together. */
const askFixMany = async ($: EngineInterface, action: PageAction, at: number): Promise<void> => {
  const chosen = action.ids.flatMap(id => findingOf(id) ?? []).filter(finding => finding.status === 'open' || finding.status === 'deferred' || finding.status === 'proposed')

  if (chosen.length === 0) {
    return
  }

  for (const finding of chosen) {
    await dispatch($, { op: 'status', id: finding.id, status: 'fixing', entry: { at, by: 'you', what: finding.fixes.length > 0 ? 'another' : 'fix', note: action.note } })
  }

  if (!(await deliver($, note => fixManyAsk(chosen, action.note, lang, note)))) {
    for (const finding of chosen) {
      await dispatch($, { op: 'status', id: finding.id, status: finding.status })
    }
  }
}

const applyFix = async ($: EngineInterface, finding: Finding, action: PageAction, entry: Entry): Promise<void> => {
  const fix = fixAt(finding, action.fix)

  if (fix === null) {
    return
  }

  await dispatch($, { op: 'status', id: finding.id, status: 'applying', entry })

  if (!(await deliver($, note => applyAsk(finding, fix, action.note, lang, note)))) {
    await dispatch($, { op: 'status', id: finding.id, status: 'proposed' })
  }
}

/** One message applying every approved solution among the findings pressed together (all approved ones when none are named). */
const applyMany = async ($: EngineInterface, action: PageAction, at: number): Promise<void> => {
  const named = action.ids.length === 0 ? current.findings : action.ids.flatMap(id => findingOf(id) ?? [])
  const approved = named.flatMap(finding => {
    const fix = finding.status === 'proposed' && finding.approved !== null ? (finding.fixes[finding.approved] ?? null) : null

    return fix === null ? [] : [{ finding, fix }]
  })

  if (approved.length === 0) {
    return
  }

  for (const { finding, fix } of approved) {
    await dispatch($, { op: 'status', id: finding.id, status: 'applying', entry: { at, by: 'you', what: 'apply', note: fix.title } })
  }

  if (!(await deliver($, note => applyManyAsk(approved, action.note, lang, note)))) {
    for (const { finding } of approved) {
      await dispatch($, { op: 'status', id: finding.id, status: 'proposed' })
    }
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

/** Each changed file as it is on disk now, for the whole-file view; a file that is not there is a new one. */
const withFiles = async ($: EngineInterface, changes: FileChange[]): Promise<FileChange[]> => {
  const root = await $.session.root()

  return Promise.all(changes.map(async change => withFile(change, await readText($, change.path.startsWith('/') ? change.path : `${root}/${change.path}`))))
}

/** Sends what the person did on the page as a message of its own; nothing when there is no news. */
const tellNow = async ($: EngineInterface): Promise<void> => {
  autoTellAt = 0

  if (current.news.length === 0) {
    return
  }

  const at = await $.clock.now()
  const ids = [...new Set(current.news.map(news => news.id))].join(', ')

  if (await deliver($, note => tellAsk(lang, note))) {
    await dispatch($, { op: 'sent', event: { at, what: 'tell', id: ids, note: '' } })
  }
}

/** Once nothing waits for the person, the news goes by itself: they may well never write to Claude again here. */
const autoTell = async ($: EngineInterface): Promise<void> => {
  if (autoTellAt === 0 || (await $.clock.now()) < autoTellAt) {
    return
  }

  autoTellAt = 0

  if (waitingCount(current.findings) === 0) {
    await tellNow($)
  }
}

/** Presses that reach Claude as a message, or change what Claude is told: listed on the page under "Sent to Claude". */
const SENT: readonly PageAction['type'][] = ['simpler', 'example', 'fix', 'another', 'apply', 'discuss', 'defer', 'dismiss', 'restore', 'cancel']

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

  const at = await $.clock.now()
  const waitingBefore = waitingCount(current.findings)

  switch (action.type) {
    case 'tell':
      return tellNow($)
    case 'clear': {
      dropped = current.findings.filter(finding => isClosed(finding.status))
      await dispatch($, { op: 'dropClosed' })

      for (const finding of dropped) {
        await tell($, finding, 'clear', '', at)
      }

      return
    }
    case 'unclear':
      await dispatch($, { op: 'putBack', findings: dropped })
      dropped = []

      return
    case 'fixMany':
      await dispatch($, { op: 'sent', event: { at, what: 'fix', id: action.ids.join(', '), note: action.note } })

      return askFixMany($, action, at)
    case 'applyMany':
      await dispatch($, { op: 'sent', event: { at, what: 'apply', id: action.ids.join(', '), note: action.note } })

      return applyMany($, action, at)
    case 'askAll':
      return sendQuestions($, [], at)
  }

  const finding = findingOf(action.id)

  if (finding === undefined) {
    return
  }

  const what = action.type as Moment
  const entry: Entry = { at, by: 'you', what, note: action.note }

  if (SENT.includes(action.type)) {
    await dispatch($, { op: 'sent', event: { at, what, id: finding.id, note: action.note } })
  }

  switch (action.type) {
    case 'simpler':
    case 'example':
      return explain($, finding, action, entry)
    case 'queue':
      if (action.note !== '') {
        await queueQuestion($, finding, action.note, at)
      }

      return
    case 'unqueue':
      await dispatch($, { op: 'unqueue', id: finding.id, at: action.at })

      return
    case 'ask':
      if (action.note !== '' && !finding.isAsking) {
        await queueQuestion($, finding, action.note, at)
      }

      return sendQuestions($, [finding.id], at)
    case 'fix':
    case 'another':
      return askFix($, finding, action, entry)
    case 'apply':
      return applyFix($, finding, action, entry)
    case 'discuss':
      return discuss($, finding, action, entry)
    case 'approve':
      await dispatch($, { op: 'approve', id: finding.id, fix: action.fix, at })

      return
    case 'unapprove':
      await dispatch($, { op: 'approve', id: finding.id, fix: null, at })

      return
    case 'cancel': {
      const title = fixAt(finding, action.fix)?.title ?? ''
      await dispatch($, { op: 'cancel', id: finding.id, at })
      await tell($, finding, 'cancel', title, at)

      return
    }
    case 'defer':
    case 'dismiss':
    case 'restore':
      await dispatch($, { op: 'status', id: finding.id, status: action.type === 'defer' ? 'deferred' : action.type === 'dismiss' ? 'dismissed' : 'open', entry })
      await tell($, finding, what, action.note, at)
      autoTellAt = waitingBefore > 0 && waitingCount(current.findings) === 0 ? at + AUTO_TELL_MS : autoTellAt
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
  isDelivering = false
  autoTellAt = 0
  listening = { since: 0, isFirst: true, isStale: false }

  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await $.command.register({ name: COMMAND, description: 'Show the address of the Findings page with the review findings' })
    await $.tool.register({ name: REPORT_TOOL, description: REPORT_DESCRIPTION, isDeferred: false, inputSchema: REPORT_SCHEMA })
    await $.tool.register({ name: FIX_TOOL, description: FIX_DESCRIPTION, isDeferred: false, inputSchema: FIX_SCHEMA })
    await $.tool.register({ name: DONE_TOOL, description: DONE_DESCRIPTION, isDeferred: false, inputSchema: DONE_SCHEMA })
    await $.tool.register({ name: REPLY_TOOL, description: REPLY_DESCRIPTION, isDeferred: false, inputSchema: REPLY_SCHEMA })

    lang = langOf(await $.store.get('lang'))
    await copyOldData($)
    await restore($)
    await sweep($)
    await show($)
    $.ui.status(statusLine(current.findings, lang))
    $.clock.every(1000, () => {
      void listen($).catch(() => undefined)
      void autoTell($).catch(() => undefined)
    })

    return result
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)

    return { sections: [...composed.sections, { id: 'findings:guide', text: GUIDE, scope: 'session' }] }
  })

  /** The person's own message carries what they did on the page since the last one, and which findings stand closed or set aside. */
  on('prompt.submit', async ($, e, next) => {
    const note = e.command === undefined && e.origin?.kind !== 'plugin' && !isDelivering ? context() : ''

    if (note === '') {
      return next(e)
    }

    const result = await next({ ...e, context: [...(e.context ?? []), note] })

    if (result.drop === undefined && current.news.length > 0) {
      await dispatch($, { op: 'told' })
    }

    return result
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

    const fix = { ...parsed.fix, changes: await withFiles($, parsed.fix.changes) }
    await dispatch($, { op: 'fix', id: parsed.id, fix, at: await $.clock.now() })
    const unplaced = fix.changes.filter(change => change.full === null).map(change => change.path)
    const waiting = current.findings.filter(finding => finding.status === 'fixing').map(finding => finding.id)

    return {
      result: [
        `The solution for ${parsed.id} is shown on the Findings page (${url}).`,
        unplaced.length === 0
          ? ''
          : `The diff of ${unplaced.join(', ')} could not be laid over the file on disk (context or removed lines differ from the file), so the page shows only the diff there. Call ${PROPOSE_FIX} again for ${parsed.id} with lines copied exactly from the file if you can.`,
        waiting.length > 0 ? `Still waiting for solutions: ${waiting.join(', ')}.` : 'Change no code: end your turn with one short line and wait, the user applies it from the page.',
      ]
        .filter(part => part !== '')
        .join(' '),
    }
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

  on('tool.call', { tool: REPLY_CALL }, async ($, e) => {
    const input = e as unknown as { id?: unknown; text?: unknown }
    const id = String(input.id ?? '').trim()
    const answer = String(input.text ?? '').trim()

    if (findingOf(id) === undefined) {
      return { deny: `No finding with id "${id}" on the Findings page.` }
    }

    if (answer === '') {
      return { deny: 'text is empty: give the answer.' }
    }

    await dispatch($, { op: 'answer', id, message: { at: await $.clock.now(), by: 'claude', text: answer, isQueued: false } })

    return { result: `The answer is shown under ${id} on the Findings page. In chat, one short line.` }
  })
}
