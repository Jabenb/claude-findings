import type { Entry, Explanation, FileChange, Finding, Fix, Lang, Moment, PageAction, ProjectFile, Sent, Severity, Standing, State, Status, Step, Tone, Witness } from '../types'

/** The mod's name in the hub and in the tool names; kept equal to `name` in plugin.json. */
export const MOD = 'findings'
export const REPORT_TOOL = 'report'
export const FIX_TOOL = 'propose_fix'
export const DONE_TOOL = 'mark_fixed'
export const REPORT = `mcp__${MOD}__${REPORT_TOOL}`
export const PROPOSE_FIX = `mcp__${MOD}__${FIX_TOOL}`
export const MARK_FIXED = `mcp__${MOD}__${DONE_TOOL}`

export const DAY = 24 * 60 * 60 * 1000
const EVENTS_KEPT = 10

export const EMPTY: State = { findings: [], branch: '', events: [], updatedAt: 0 }
export const EMPTY_PROJECT: ProjectFile = { lastNo: 0, standing: [] }

export const GUIDE = [
  '# Findings page',
  `When a review, an audit or an investigation leaves you with two or more findings (bugs, risks, regressions, design problems), do not describe them as a list in chat: call ${REPORT} with all of them, most severe first, then end with one short line saying the findings are on the Findings page. The user reads each finding alone in a card and has not read the code, so a finding is only useful with a live example:`,
  [
    '- `plain`: one or two sentences a person who never opened this code understands. No class, method or table names here, no jargon.',
    '- `steps`: one concrete scenario, step by step, 3 to 6 steps. Every step names real values: an id, a time, a field with its value, an amount, a count. Wrap each such value in double braces so the card sets it apart: "Hotel {{4471}} gets a webhook at {{14:03}} with {{price = 120 €}}". Take the values from the code and data you actually read; a value you made up for illustration is fine, but then say "for example". Mark the step where things go wrong with tone `bad`, and a step where things are right again with `good`.',
    '- `where`: the file and line the problem sits in, as `path/File.php:42`.',
    '- `noticedBy`: who sees the damage, how and when, one entry per kind of person: `{ who: "Guest", how: "sees the old price 95 €", when: "at once, on the listing page" }`.',
    "- Write every field in the user's language.",
  ].join('\n'),
  `A message from the page that asks you to explain a finding again names its id (like R4): answer through ${REPORT} with that \`id\` and a new \`plain\` (and new \`steps\` when the example changes), not in chat.`,
  `A message from the page that asks for a solution means: change no code yet. Read what you need, then call ${PROPOSE_FIX} with what will change in plain words, the same live example after the fix, the diff per file, and what the solution leaves open. The user reads it in the card and presses Apply; only the message that says to apply it starts the edit. When that edit is done and checked, call ${MARK_FIXED} with the finding's id and how you checked it.`,
].join('\n\n')

const STEPS_SCHEMA = {
  type: 'array',
  description: 'The live example, one moment per step, every concrete value wrapped in {{double braces}}',
  items: {
    type: 'object',
    properties: {
      at: { type: 'string', description: 'Optional short label of when: "14:03", "after the deploy"' },
      text: { type: 'string', description: 'What happens, with the real values involved, each in {{double braces}}' },
      tone: { type: 'string', enum: ['neutral', 'bad', 'good'], description: 'bad: where it goes wrong; good: where it is right again' },
    },
    required: ['text'],
  },
} as const

export const REPORT_DESCRIPTION =
  'Show findings on the Findings page in the user\'s browser, each explained on a live step-by-step example. Use instead of listing findings in chat whenever you have two or more. With `id` (like "R4") an entry adds a new explanation to that finding instead of creating one.'

export const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Only to re-explain an existing finding: its id, e.g. "R4". Then give plain, and steps when the example changes.' },
          title: { type: 'string', description: 'Short name of the problem, up to 8 words' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          plain: { type: 'string', description: 'One or two sentences without jargon or code names' },
          steps: STEPS_SCHEMA,
          where: { type: 'string', description: 'path/File.php:42' },
          noticedBy: {
            type: 'array',
            description: 'Who sees the damage, one entry per kind of person',
            items: {
              type: 'object',
              properties: {
                who: { type: 'string', description: 'Guest, hotel owner, support, accounting…' },
                how: { type: 'string', description: 'What they see' },
                when: { type: 'string', description: 'When they see it' },
              },
              required: ['who', 'how'],
            },
          },
        },
        required: ['plain'],
      },
    },
  },
  required: ['findings'],
} as const

export const FIX_DESCRIPTION = 'Show a proposed solution for one finding on the Findings page, before any code is changed. The user approves it there.'

export const FIX_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'The finding id, e.g. "R4"' },
    title: { type: 'string', description: 'The solution in up to 8 words' },
    summary: { type: 'string', description: 'What will change, in plain words, two or three sentences' },
    steps: { ...STEPS_SCHEMA, description: "The finding's own live example replayed after the fix, same values; mark the step that is right now with tone good" },
    changes: {
      type: 'array',
      description: 'Every file the solution touches, tests included',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          diff: { type: 'string', description: 'The intended change as unified diff lines (+/-), the essential hunk only' },
        },
        required: ['path', 'diff'],
      },
    },
    gaps: { type: 'array', items: { type: 'string' }, description: 'What this solution does not cover, one item each; [] when nothing' },
  },
  required: ['id', 'title', 'summary', 'steps', 'changes'],
} as const

export const DONE_DESCRIPTION = 'Mark a finding of the Findings page as fixed, after its approved solution is applied and checked.'

export const DONE_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'The finding id, e.g. "R4"' },
    check: { type: 'string', description: 'How it was checked, with the result: "php artisan test --filter=Webhook: 12 of 12 pass"' },
  },
  required: ['id', 'check'],
} as const

const SEVERITIES: readonly Severity[] = ['high', 'medium', 'low']
const TONES: readonly Tone[] = ['neutral', 'bad', 'good']
const STATUSES: readonly Status[] = ['open', 'deferred', 'fixing', 'proposed', 'applying', 'fixed', 'dismissed']
const LANGS: readonly Lang[] = ['en', 'ru', 'uk']
const ACTIONS: readonly PageAction['type'][] = ['simpler', 'example', 'fix', 'another', 'apply', 'discuss', 'cancel', 'defer', 'dismiss', 'restore', 'clear', 'unclear']

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const record = (value: unknown): Record<string, unknown> => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {})

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

export const langOf = (value: unknown): Lang => LANGS.find(lang => lang === value) ?? 'en'

export const parseSteps = (raw: unknown): Step[] =>
  list(raw).flatMap(value => {
    const one = record(value)
    const body = text(one.text)
    const tone = TONES.find(known => known === one.tone) ?? 'neutral'

    return body === '' ? [] : [{ at: text(one.at), text: body, tone }]
  })

/** The people who notice; a single sentence (the field's older form) becomes one entry with no name. */
export const parseWitnesses = (raw: unknown, legacy: unknown = ''): Witness[] => {
  const given = list(raw).flatMap(value => {
    const one = record(value)
    const how = text(one.how)

    return how === '' ? [] : [{ who: text(one.who), how, when: text(one.when) }]
  })

  return given.length > 0 || text(legacy) === '' ? given : [{ who: '', how: text(legacy), when: '' }]
}

const parseGaps = (raw: unknown): string[] => (typeof raw === 'string' ? [raw] : list(raw).map(text)).map(gap => gap.trim()).filter(gap => gap !== '')

const numberOf = (id: string): number => Number(/^R(\d+)$/.exec(id)?.[1] ?? 0)

export const lastNumber = (findings: readonly Finding[]): number => findings.reduce((max, finding) => Math.max(max, numberOf(finding.id)), 0)

export type Report = { errors: string[] } | { errors?: undefined; added: Finding[]; versions: { id: string; explanation: Explanation }[] }

/** A new finding needs the whole card; an entry with a known `id` is a new explanation of that finding. */
export const parseReport = (input: Record<string, unknown>, lastNo: number, known: readonly Finding[]): Report => {
  const errors: string[] = []
  const added: Finding[] = []
  const versions: { id: string; explanation: Explanation }[] = []

  list(input.findings).forEach((value, index) => {
    const one = record(value)
    const id = text(one.id)
    const label = id !== '' ? id : `findings[${index}]`
    const plain = text(one.plain)
    const steps = parseSteps(one.steps)
    const own: string[] = []

    if (plain === '') {
      own.push('plain is empty')
    }

    if (id !== '') {
      if (!known.some(finding => finding.id === id)) {
        own.push(`no finding with this id (known: ${known.map(finding => finding.id).join(', ') || 'none'})`)
      }

      if (own.length === 0) {
        versions.push({ id, explanation: { plain, steps, origin: 'claude', note: '' } })
      }

      errors.push(...own.map(error => `${label}: ${error}`))

      return
    }

    const title = text(one.title)
    const severity = SEVERITIES.find(level => level === one.severity)
    const where = text(one.where)

    if (title === '') {
      own.push('title is empty')
    }

    if (severity === undefined) {
      own.push('severity must be high, medium or low')
    }

    if (where === '') {
      own.push('where is empty: give path/File.php:line')
    }

    if (steps.length < 2) {
      own.push('steps needs at least 2 steps with concrete values')
    } else if (!steps.some(step => step.tone === 'bad')) {
      own.push('no step has tone "bad": mark the step where things go wrong')
    }

    if (own.length === 0 && severity !== undefined) {
      added.push({
        id: `R${lastNo + added.length + 1}`,
        title,
        severity,
        where,
        noticedBy: parseWitnesses(one.noticedBy, one.whoNotices),
        versions: [{ plain, steps, origin: 'claude', note: '' }],
        fixes: [],
        status: 'open',
        busy: null,
        isCarried: false,
        check: '',
        log: [],
      })
    }

    errors.push(...own.map(error => `${label}: ${error}`))
  })

  if (errors.length === 0 && added.length === 0 && versions.length === 0) {
    errors.push('no findings given: pass findings as [{ title, severity, plain, steps, where, noticedBy }]')
  }

  return errors.length > 0 ? { errors } : { added, versions }
}

/** A diff the page can draw: hunks need a header, and the model often gives the +/- lines alone. */
export const normalizeDiff = (raw: string): string => {
  const lines = raw
    .replace(/\r/g, '')
    .split('\n')
    .filter(line => !line.startsWith('```'))

  while (lines.length > 0 && lines[lines.length - 1]!.trim() === '') {
    lines.pop()
  }

  if (lines.some(line => line.startsWith('@@'))) {
    return lines.join('\n')
  }

  const body = lines.filter(line => !line.startsWith('--- ') && !line.startsWith('+++ ')).map(line => (/^[ +-]/.test(line) ? line : ` ${line}`))
  const added = body.filter(line => line.startsWith('+')).length
  const removed = body.filter(line => line.startsWith('-')).length
  const context = body.length - added - removed

  return body.length === 0 ? '' : [`@@ -1,${context + removed} +1,${context + added} @@`, ...body].join('\n')
}

const parseChanges = (raw: unknown): FileChange[] =>
  list(raw).flatMap(value => {
    const one = record(value)
    const path = text(one.path)
    const diff = typeof one.diff === 'string' ? normalizeDiff(one.diff) : ''

    return path === '' || diff === '' ? [] : [{ path, diff }]
  })

export type ProposedFix = { errors: string[] } | { errors?: undefined; id: string; fix: Fix }

export const parseFix = (input: Record<string, unknown>, known: readonly Finding[]): ProposedFix => {
  const id = text(input.id)
  const title = text(input.title)
  const summary = text(input.summary)
  const steps = parseSteps(input.steps)
  const changes = parseChanges(input.changes)
  const errors: string[] = []

  if (!known.some(finding => finding.id === id)) {
    errors.push(`no finding with id "${id}" (known: ${known.map(finding => finding.id).join(', ') || 'none'})`)
  }

  if (title === '') {
    errors.push('title is empty')
  }

  if (summary === '') {
    errors.push('summary is empty')
  }

  if (steps.length === 0) {
    errors.push("steps is empty: replay the finding's example after the fix")
  }

  if (changes.length === 0) {
    errors.push('changes is empty: give every file with its diff')
  }

  return errors.length > 0 ? { errors } : { id, fix: { title, summary, steps, changes, gaps: parseGaps(input.gaps) } }
}

/** A side answer of the model: the JSON object in it, whatever stands around. Another example needs its steps; a simpler wording may keep the ones shown. */
export const parseExplanation = (answer: string, origin: 'simpler' | 'example', note: string): Explanation | null => {
  const from = answer.indexOf('{')
  const to = answer.lastIndexOf('}')

  if (from === -1 || to <= from) {
    return null
  }

  try {
    const raw = record(JSON.parse(answer.slice(from, to + 1)))
    const plain = text(raw.plain)
    const steps = parseSteps(raw.steps)

    return plain === '' || (origin === 'example' && steps.length < 2) ? null : { plain, steps: steps.length < 2 ? [] : steps, origin, note }
  } catch {
    return null
  }
}

/** A press as the page sent it; null for anything this mod does not know. */
export const parseAction = (raw: unknown): PageAction | null => {
  const one = record(raw)
  const type = ACTIONS.find(known => known === one.type)

  return type === undefined
    ? null
    : { type, id: text(one.id), note: text(one.note), version: Math.max(0, Number(one.version) || 0), fix: Math.max(0, Number(one.fix) || 0), lang: langOf(one.lang) }
}

export type Change =
  | { op: 'report'; added: Finding[]; versions: { id: string; explanation: Explanation }[]; at: number }
  | { op: 'carry'; findings: Finding[]; branch: string }
  | { op: 'busy'; id: string; busy: Finding['busy']; entry?: Entry }
  | { op: 'version'; id: string; explanation: Explanation; at: number }
  | { op: 'status'; id: string; status: Status; entry?: Entry; check?: string }
  | { op: 'fix'; id: string; fix: Fix; at: number }
  | { op: 'cancel'; id: string; at: number }
  | { op: 'note'; id: string; entry: Entry }
  | { op: 'dropClosed' }
  | { op: 'putBack'; findings: Finding[] }
  | { op: 'sent'; event: Sent }

/** Changes only this session's page shows: the project's file is left alone. */
export const isLocal = (change: Change): boolean => change.op === 'busy' || change.op === 'sent' || change.op === 'note'

const edit = (state: State, id: string, change: (finding: Finding) => Finding): State => ({
  ...state,
  findings: state.findings.map(finding => (finding.id === id ? change(finding) : finding)),
})

const logged = (finding: Finding, entry: Entry | undefined): Finding => (entry === undefined ? finding : { ...finding, log: [...finding.log, entry] })

const said = (at: number, what: Moment, note = ''): Entry => ({ at, by: 'claude', what, note })

const withVersion = (finding: Finding, explanation: Explanation, at: number): Finding =>
  logged({ ...finding, versions: [...finding.versions, explanation], busy: null }, said(at, 'explained'))

export const isClosed = (status: Status): boolean => status === 'fixed' || status === 'dismissed'

/** Where a cancelled solution leaves the finding: a request in flight falls back, a solution on the card is dropped. */
const cancelled = (finding: Finding): Finding => {
  switch (finding.status) {
    case 'fixing':
      return { ...finding, status: finding.fixes.length > 0 ? 'proposed' : 'open' }
    case 'applying':
      return { ...finding, status: 'proposed' }
    case 'proposed':
      return { ...finding, status: 'open', fixes: [] }
    default:
      return finding
  }
}

export const applyChange = (state: State, change: Change): State => {
  switch (change.op) {
    case 'report': {
      const explained = change.versions.reduce((acc, version) => edit(acc, version.id, finding => withVersion(finding, version.explanation, change.at)), state)
      const added = change.added.map(finding => logged(finding, said(change.at, 'reported')))

      return { ...explained, findings: [...explained.findings, ...added], updatedAt: change.at }
    }
    case 'carry': {
      const fresh = change.findings.filter(finding => !state.findings.some(known => known.id === finding.id))

      return { ...state, branch: change.branch, findings: [...state.findings, ...fresh] }
    }
    case 'busy':
      return edit(state, change.id, finding => logged({ ...finding, busy: change.busy }, change.entry))
    case 'version':
      return edit(state, change.id, finding => withVersion(finding, change.explanation, change.at))
    case 'status':
      return edit(state, change.id, finding => logged({ ...finding, status: change.status, busy: null, check: change.check ?? finding.check }, change.entry))
    case 'fix':
      return edit(state, change.id, finding => logged({ ...finding, fixes: [...finding.fixes, change.fix], status: 'proposed' }, said(change.at, 'proposed', change.fix.title)))
    case 'cancel':
      return edit(state, change.id, finding => logged(cancelled(finding), { at: change.at, by: 'you', what: 'cancel', note: '' }))
    case 'note':
      return edit(state, change.id, finding => logged(finding, change.entry))
    case 'dropClosed':
      return { ...state, findings: state.findings.filter(finding => !isClosed(finding.status)) }
    case 'putBack':
      return { ...state, findings: [...state.findings, ...change.findings.filter(finding => !state.findings.some(known => known.id === finding.id))] }
    case 'sent':
      return { ...state, events: [change.event, ...state.events].slice(0, EVENTS_KEPT) }
  }
}

const parseExplanations = (raw: unknown): Explanation[] =>
  list(raw).flatMap(value => {
    const one = record(value)
    const plain = text(one.plain)
    const origin = one.origin === 'simpler' || one.origin === 'example' ? one.origin : 'claude'

    return plain === '' ? [] : [{ plain, steps: parseSteps(one.steps), origin, note: text(one.note) }]
  })

const parseFixes = (raw: unknown): Fix[] =>
  list(raw).flatMap(value => {
    const one = record(value)
    const title = text(one.title)

    return title === '' ? [] : [{ title, summary: text(one.summary), steps: parseSteps(one.steps), changes: parseChanges(one.changes), gaps: parseGaps(one.gaps) }]
  })

const MOMENTS: readonly Moment[] = ['reported', 'simpler', 'example', 'explained', 'fix', 'another', 'proposed', 'apply', 'fixed', 'defer', 'dismiss', 'restore', 'cancel', 'discuss']

const parseLog = (raw: unknown): Entry[] =>
  list(raw).flatMap(value => {
    const one = record(value)
    const what = MOMENTS.find(known => known === one.what)

    return what === undefined ? [] : [{ at: Number(one.at) || 0, by: one.by === 'claude' ? 'claude' : 'you', what, note: text(one.note) }]
  })

/** A finding as a file holds it, whatever version of the mod wrote the file. */
export const parseFinding = (raw: unknown): Finding | null => {
  const one = record(raw)
  const id = text(one.id)
  const versions = parseExplanations(one.versions)
  const fixes = parseFixes(one.fixes)
  const status = STATUSES.find(known => known === one.status) ?? 'open'

  return id === '' || versions.length === 0
    ? null
    : {
        id,
        title: text(one.title),
        severity: SEVERITIES.find(level => level === one.severity) ?? 'medium',
        where: text(one.where),
        noticedBy: parseWitnesses(one.noticedBy, one.whoNotices),
        versions,
        fixes,
        status: (status === 'proposed' || status === 'applying') && fixes.length === 0 ? 'open' : status,
        busy: null,
        isCarried: one.isCarried === true,
        check: text(one.check),
        log: parseLog(one.log),
      }
}

const parseEvents = (raw: unknown): Sent[] =>
  list(raw).flatMap(value => {
    const one = record(value)
    const what = MOMENTS.find(known => known === one.what)

    return what === undefined ? [] : [{ at: Number(one.at) || 0, what, id: text(one.id), note: text(one.note) }]
  })

export const parseState = (body: string): State | null => {
  try {
    const raw = record(JSON.parse(body))

    return Array.isArray(raw.findings)
      ? { findings: raw.findings.flatMap(one => parseFinding(one) ?? []), branch: text(raw.branch), events: parseEvents(raw.events), updatedAt: Number(raw.updatedAt) || 0 }
      : null
  } catch {
    return null
  }
}

export const parseProject = (body: string): ProjectFile => {
  try {
    const raw = record(JSON.parse(body))

    return Array.isArray(raw.standing)
      ? {
          lastNo: Number(raw.lastNo) || 0,
          standing: raw.standing.flatMap(value => {
            const one = record(value)
            const finding = parseFinding(one.finding)

            return finding === null ? [] : [{ branch: text(one.branch), sessionId: text(one.sessionId), updatedAt: Number(one.updatedAt) || 0, finding }]
          }),
        }
      : EMPTY_PROJECT
  } catch {
    return EMPTY_PROJECT
  }
}

export const projectSlug = (root: string): string => root.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'root'

/** What another session should meet: nothing mid-flight, since the turn that was working on it is not theirs. */
const settled = (finding: Finding): Finding => ({
  ...finding,
  busy: null,
  isCarried: false,
  status: finding.status === 'fixing' ? (finding.fixes.length > 0 ? 'proposed' : 'open') : finding.status === 'applying' ? 'proposed' : finding.status,
})

/** The project's file after this session's state: its waiting findings written, its closed ones gone. */
export const syncProject = (file: ProjectFile, state: State, sessionId: string, now: number): ProjectFile => {
  const mine = new Map(state.findings.map(finding => [finding.id, finding]))
  const kept: Standing[] = file.standing.flatMap(entry => {
    const finding = mine.get(entry.finding.id)

    if (finding === undefined) {
      return [entry]
    }

    mine.delete(entry.finding.id)

    if (isClosed(finding.status)) {
      return []
    }

    const next = settled(finding)

    return [JSON.stringify(next) === JSON.stringify(entry.finding) ? entry : { ...entry, updatedAt: now, finding: next }]
  })
  const fresh: Standing[] = [...mine.values()]
    .filter(finding => !isClosed(finding.status))
    .map(finding => ({ branch: state.branch, sessionId, updatedAt: now, finding: settled(finding) }))

  return { lastNo: Math.max(file.lastNo, lastNumber(state.findings)), standing: [...kept, ...fresh] }
}

/** The branch's waiting findings this session does not show yet. */
export const carriedFor = (file: ProjectFile, branch: string, sessionId: string, known: readonly Finding[]): Finding[] =>
  branch === ''
    ? []
    : file.standing
        .filter(entry => entry.branch === branch && !known.some(finding => finding.id === entry.finding.id))
        .map(entry => ({ ...entry.finding, isCarried: entry.sessionId !== sessionId }))

/** Drops the findings of branches that are gone locally, once nobody touched them for 30 days. */
export const sweepProject = (file: ProjectFile, branches: readonly string[], now: number): ProjectFile => ({
  ...file,
  standing: file.standing.filter(entry => branches.includes(entry.branch) || now - entry.updatedAt <= 30 * DAY),
})

export const explanationAt = (finding: Finding, index: number): Explanation =>
  finding.versions[Math.max(0, Math.min(index, finding.versions.length - 1))] ?? { plain: '', steps: [], origin: 'claude', note: '' }

/** The steps the card shows for an explanation: its own, else those of the nearest one before it. */
export const stepsAt = (finding: Finding, index: number): Step[] =>
  finding.versions
    .slice(0, Math.max(0, Math.min(index, finding.versions.length - 1)) + 1)
    .reverse()
    .find(version => version.steps.length > 0)?.steps ?? []

export const fixAt = (finding: Finding, index: number): Fix | null => finding.fixes[Math.max(0, Math.min(index, finding.fixes.length - 1))] ?? null

export const deferredIds = (findings: readonly Finding[]): string[] => findings.filter(finding => finding.status === 'deferred').map(finding => finding.id)

/** How many findings wait for the person: the number beside the page in the hub and in the status line. */
export const waitingCount = (findings: readonly Finding[]): number => findings.filter(finding => !isClosed(finding.status) && finding.status !== 'deferred').length

type Words = {
  head: (id: string, title: string) => string
  where: string
  plain: string
  example: string
  breaks: string
  notices: string
  simpler: string
  another: string
  lost: string
  unclear: string
  viaReport: (id: string) => string
  carried: string
  propose: string
  proposeOther: (tried: string) => string
  noEdit: string
  note: string
  apply: (title: string, id: string) => string
  solution: string
  leaves: string
  deferred: (ids: string) => string
  status: (waiting: number) => string
  page: (url: string) => string
  down: string
  fresh: (count: number, url: string) => string
  notSent: string
  viaChat: string
  noFill: string
}

const WORDS: Record<Lang, Words> = {
  en: {
    head: (id, title) => `Finding ${id} "${title}"`,
    where: 'Where',
    plain: 'In plain words',
    example: 'Example',
    breaks: 'breaks here',
    notices: 'Who notices',
    simpler: 'Explain it more simply: short words, one thought, an everyday analogy is fine.',
    another: 'Give another live example: a different scenario with other concrete data.',
    lost: 'I did not understand the explanation.',
    unclear: 'What exactly is unclear:',
    viaReport: id => `Answer through ${REPORT} with id ${id} (plain, and steps if the example changes), one line in chat.`,
    carried: 'This finding comes from an earlier session on this branch, you have not seen it yet. Here it is in full:',
    propose: 'propose a solution.',
    proposeOther: tried => `propose a different solution, not like ${tried}.`,
    noEdit: `Do not change the code yet. Call ${PROPOSE_FIX}: what will change in plain words, the same live example after the fix, the diff per file and what the solution leaves open.`,
    note: 'My note:',
    apply: (title, id) => `apply the solution "${title}". When it is done and checked, call ${MARK_FIXED} with id ${id} and say in check how you checked it.`,
    solution: 'Solution',
    leaves: 'Leaves open',
    deferred: ids => `Findings ${ids} are set aside by the user. Do not fix or raise them until the user brings them back.`,
    status: waiting => `Findings: ${waiting}`,
    page: url => `Findings page: ${url}`,
    down: 'Findings: the hub does not answer (is docker running?), the page is not updated.',
    fresh: (count, url) => `Findings: ${count} new findings. ${url}`,
    notSent: 'Findings: the request did not reach the chat, press again',
    viaChat: 'Findings: the quick answer failed, the request went to the chat',
    noFill: 'Findings: could not put the quote into the prompt box',
  },
  ru: {
    head: (id, title) => `Находка ${id} «${title}»`,
    where: 'Где',
    plain: 'По-простому',
    example: 'Пример',
    breaks: 'здесь ломается',
    notices: 'Кто заметит',
    simpler: 'Объясни проще: короткие слова, одна мысль, можно бытовую аналогию.',
    another: 'Дай другой живой пример: иной сценарий с другими конкретными данными.',
    lost: 'Я не понял объяснение.',
    unclear: 'Что именно непонятно:',
    viaReport: id => `Ответ сдай через ${REPORT} с id ${id} (plain, и steps, если пример меняется), в чат одной строкой.`,
    carried: 'Это находка из прошлой сессии на этой ветке, ты её ещё не видел. Вот она целиком:',
    propose: 'предложи решение.',
    proposeOther: tried => `предложи другое решение, не такое, как ${tried}.`,
    noEdit: `Код пока не меняй. Вызови ${PROPOSE_FIX}: что поменяется простыми словами, тот же живой пример после фикса, дифф по файлам и что решение не закрывает.`,
    note: 'Моё уточнение:',
    apply: (title, id) => `применяй решение «${title}». Когда закончишь и проверишь, вызови ${MARK_FIXED} с id ${id} и напиши в check, чем проверил.`,
    solution: 'Решение',
    leaves: 'Не закрывает',
    deferred: ids => `Находки ${ids} отложены пользователем. Не чини и не поднимай их, пока он сам их не вернёт.`,
    status: waiting => `Находки: ${waiting}`,
    page: url => `Страница «Находки»: ${url}`,
    down: 'Находки: хаб не отвечает (запущен ли docker?), страница не обновлена.',
    fresh: (count, url) => `Находки: новых — ${count}. ${url}`,
    notSent: 'Находки: запрос не ушёл в чат, нажми ещё раз',
    viaChat: 'Находки: быстрый ответ не получился, запрос ушёл в чат',
    noFill: 'Находки: не получилось вставить цитату в поле ввода',
  },
  uk: {
    head: (id, title) => `Знахідка ${id} «${title}»`,
    where: 'Де',
    plain: 'Простими словами',
    example: 'Приклад',
    breaks: 'тут ламається',
    notices: 'Хто помітить',
    simpler: 'Поясни простіше: короткі слова, одна думка, можна побутову аналогію.',
    another: 'Дай інший живий приклад: інший сценарій з іншими конкретними даними.',
    lost: 'Я не зрозумів пояснення.',
    unclear: 'Що саме незрозуміло:',
    viaReport: id => `Відповідь здай через ${REPORT} з id ${id} (plain, і steps, якщо приклад змінюється), у чат одним рядком.`,
    carried: 'Це знахідка з минулої сесії на цій гілці, ти її ще не бачив. Ось вона повністю:',
    propose: 'запропонуй рішення.',
    proposeOther: tried => `запропонуй інше рішення, не таке, як ${tried}.`,
    noEdit: `Код поки не змінюй. Виклич ${PROPOSE_FIX}: що зміниться простими словами, той самий живий приклад після фіксу, диф по файлах і що рішення не закриває.`,
    note: 'Моє уточнення:',
    apply: (title, id) => `застосовуй рішення «${title}». Коли закінчиш і перевіриш, виклич ${MARK_FIXED} з id ${id} і напиши в check, чим перевірив.`,
    solution: 'Рішення',
    leaves: 'Не закриває',
    deferred: ids => `Знахідки ${ids} відкладені користувачем. Не лагодь і не піднімай їх, доки він сам їх не поверне.`,
    status: waiting => `Знахідки: ${waiting}`,
    page: url => `Сторінка «Знахідки»: ${url}`,
    down: 'Знахідки: хаб не відповідає (чи запущено docker?), сторінку не оновлено.',
    fresh: (count, url) => `Знахідки: нових — ${count}. ${url}`,
    notSent: 'Знахідки: запит не пішов у чат, натисни ще раз',
    viaChat: 'Знахідки: швидка відповідь не вдалася, запит пішов у чат',
    noFill: 'Знахідки: не вдалося вставити цитату в поле вводу',
  },
}

export const words = (lang: Lang): Words => WORDS[lang]

/** A step as plain text: the braces that set a value apart on the card mean nothing in a message. */
const bare = (body: string): string => body.replace(/\{\{(.+?)\}\}/g, '$1')

const stepLine = (step: Step, lang: Lang): string => `- ${step.at === '' ? '' : `${step.at} `}${step.tone === 'bad' ? `(${WORDS[lang].breaks}) ` : ''}${bare(step.text)}`

const witnessLine = (witness: Witness): string => [witness.who, witness.how, witness.when].filter(part => part !== '').join(', ')

export const findingText = (finding: Finding, version: number, lang: Lang): string => {
  const said = WORDS[lang]

  return [
    `${finding.id} [${finding.severity}] ${finding.title}`,
    `${said.where}: ${finding.where}`,
    `${said.plain}: ${explanationAt(finding, version).plain}`,
    `${said.example}:`,
    ...stepsAt(finding, version).map(step => stepLine(step, lang)),
    ...(finding.noticedBy.length === 0 ? [] : [`${said.notices}: ${finding.noticedBy.map(witnessLine).join('; ')}`]),
  ].join('\n')
}

const carriedNote = (finding: Finding, lang: Lang): string => (finding.isCarried ? `\n\n${WORDS[lang].carried}\n${findingText(finding, finding.versions.length - 1, lang)}` : '')

const noteLine = (note: string, lang: Lang): string => (note === '' ? '' : ` ${WORDS[lang].note} ${note}`)

export const deferredNote = (ids: readonly string[], lang: Lang): string => (ids.length === 0 ? '' : WORDS[lang].deferred(ids.join(', ')))

const withDeferred = (body: string, deferred: readonly string[], lang: Lang): string => (deferred.length === 0 ? body : `${body}\n\n${deferredNote(deferred, lang)}`)

/** The side question: answered over the session's own transcript, never shown in chat. */
export const explainPrompt = (finding: Finding, mode: 'simpler' | 'example', note: string, version: number): string =>
  [
    `Side task for the Findings page, answer at once and without tools. The user did not understand finding ${finding.id} and asks to explain it again.`,
    mode === 'simpler'
      ? 'Explain it more simply: short words, one thought, an everyday analogy is fine. Give new steps only if simpler ones help; otherwise leave steps out and the card keeps the ones it shows.'
      : 'Give another live example: a different scenario with other concrete data.',
    note === '' ? '' : `What exactly is unclear, in the user's words: ${note}`,
    `The finding as the card shows it now:\n${findingText(finding, version, 'en')}`,
    'Keep every step concrete (ids, times, field values, amounts), each such value wrapped in {{double braces}}, and true to the code you read in this conversation. Mark the step where it goes wrong with tone "bad".',
    'Answer with ONLY one JSON object, in the language of the card: {"plain": "…", "steps": [{"text": "…", "tone": "neutral|bad|good"}]}',
  ]
    .filter(part => part !== '')
    .join('\n\n')

/** The same ask through chat: for a finding whose code this session has not read, or when the side question failed. */
export const explainAsk = (finding: Finding, mode: 'simpler' | 'example', note: string, lang: Lang): string => {
  const said = WORDS[lang]

  return `${said.head(finding.id, finding.title)}: ${said.lost} ${mode === 'simpler' ? said.simpler : said.another}${note === '' ? '' : ` ${said.unclear} ${note}`}\n\n${said.viaReport(finding.id)}${carriedNote(finding, lang)}`
}

export const fixAsk = (finding: Finding, note: string, deferred: readonly string[], lang: Lang): string => {
  const said = WORDS[lang]
  const tried = finding.fixes.map(fix => `«${fix.title}»`).join(', ')

  return withDeferred(
    `${said.head(finding.id, finding.title)}: ${tried === '' ? said.propose : said.proposeOther(tried)}${noteLine(note, lang)} ${said.noEdit}${carriedNote(finding, lang)}`,
    deferred,
    lang,
  )
}

const fixText = (fix: Fix, lang: Lang): string =>
  [
    `${WORDS[lang].solution} «${fix.title}»: ${fix.summary}`,
    ...fix.changes.map(change => `${change.path}\n${change.diff}`),
    ...(fix.gaps.length === 0 ? [] : [`${WORDS[lang].leaves}: ${fix.gaps.join('; ')}`]),
  ].join('\n\n')

export const applyAsk = (finding: Finding, fix: Fix, note: string, deferred: readonly string[], lang: Lang): string => {
  const said = WORDS[lang]

  return withDeferred(
    `${said.head(finding.id, finding.title)}: ${said.apply(fix.title, finding.id)}${noteLine(note, lang)}${finding.isCarried ? `${carriedNote(finding, lang)}\n\n${fixText(fix, lang)}` : ''}`,
    deferred,
    lang,
  )
}

/** The draft put in the prompt box: the person writes their own words under the quote. */
export const discussText = (finding: Finding, fix: Fix | null, note: string, lang: Lang): string =>
  `> ${finding.id} «${finding.title}»${fix === null ? '' : `\n> ${WORDS[lang].solution}: «${fix.title}». ${fix.summary}`}\n\n${note}`

export const statusLine = (findings: readonly Finding[], lang: Lang): string | undefined => {
  const waiting = waitingCount(findings)

  return waiting === 0 ? undefined : WORDS[lang].status(waiting)
}
