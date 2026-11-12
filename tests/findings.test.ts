import { expect, mock, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import type { Finding, ProjectFile, State } from '../types'
import {
  applyChange,
  carriedFor,
  DAY,
  EMPTY,
  contextNote,
  fixAsk,
  locateHunks,
  normalizeDiff,
  parseAction,
  parseExplanation,
  parseFix,
  parseProject,
  parseReport,
  parseState,
  stepsAt,
  sweepProject,
  syncProject,
} from '../hooks/model'
import { PAGE, SHIKI_VERSION } from '../hooks/page/page'

type On = Parameters<TestBody>[1]

const REPORT = 'mcp__findings__report'
const PROPOSE_FIX = 'mcp__findings__propose_fix'
const MARK_FIXED = 'mcp__findings__mark_fixed'
const HOME = '/home/u'
const DATA = `${HOME}/.claude/mods-data/findings`
const OWN = 'aaaaaaaa-1111-2222-3333-444444444444'
const OTHER = 'bbbbbbbb-1111-2222-3333-444444444444'
const PROJECT = `${DATA}/projects/w-shop.json`
const SESSION_FILE = `${DATA}/sessions/${OWN}.json`
const BRANCH = 'feature/RM-1-hotels'
const START = { cwd: '/w/shop', surface: 'desktop', isInteractive: true } as const
const NOW = 100 * DAY

const RENAME = {
  title: 'Окно между деплоем и rename',
  severity: 'high',
  plain: 'Новый код ищет данные отеля под новым именем, а в базе они лежат под старым.',
  steps: [
    { at: '14:00', text: 'Деплой. У отеля {{4471}} запись {{type = listing_details}}' },
    { at: '14:03', text: 'Вебхук: цена {{120 €}}. Код ищет {{type = property}} и отбрасывает его', tone: 'bad' },
    { at: '14:20', text: 'Запущена rename-команда', tone: 'good' },
  ],
  where: 'app/Webhook.php:58',
  noticedBy: [{ who: 'Гость', how: 'видит старую цену 95 €', when: 'сразу' }],
}

const REBUILD = {
  title: 'Двойная пересборка юнитов',
  severity: 'medium',
  plain: 'Одна и та же работа делается дважды.',
  steps: [{ text: 'Отель {{4471}} обновлён' }, { text: '{{3}} юнита пересобраны {{2}} раза', tone: 'bad' }],
  where: 'app/PropertyAdapter.php:12',
  whoNotices: 'никто, кроме очереди',
}

const FIX = {
  id: 'R1',
  title: 'Искать под обоими именами',
  summary: 'Если записи property нет, код берёт старую listing_details.',
  steps: [{ at: '14:03', text: 'Вебхук: property не найден, взят listing_details. На сайте {{120 €}}', tone: 'good' }],
  changes: [{ path: 'app/PmsDataRepository.php', diff: "- ->where('type', 'property')\n+ ->whereIn('type', ['property', 'listing_details'])" }],
  gaps: ['дубли, созданные до фикса'],
}

type Press = { type: string; id?: string; ids?: string[]; note?: string; isDeep?: boolean; version?: number; fix?: number; lang?: string }

type World = {
  files: Map<string, string>
  submitted: { text: string; context?: readonly string[] }[]
  filled: string[]
  forked: string[]
  toasts: string[]
  statuses: (string | undefined)[]
  pages: number
  pushed: State[]
  badges: number[]
  presses: Press[][]
  forkReply: { isAnswered: true; text: string } | { isAnswered: false; reason: string }
}

/** The engine and the hub beneath the mod, held in memory: files, git, session, model, prompt, and the hub's page, push and pull. */
const world = (on: On, files: Record<string, string> = {}): World => {
  const held: World = {
    files: new Map(Object.entries(files)),
    submitted: [],
    filled: [],
    forked: [],
    toasts: [],
    statuses: [],
    pages: 0,
    pushed: [],
    badges: [],
    presses: [],
    forkReply: { isAnswered: false, reason: 'nothing-to-fork' },
  }
  const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }

  on('engine.create', async (_, e, next) => ({
    ...(await next(e)),
    webhub: {
      page: async () => {
        held.pages += 1

        return { isUp: true, url: 'http://localhost:7777/#/s/findings' }
      },
      push: async ({ state, badge }: { state: unknown; badge?: number }) => {
        held.pushed.push(state as State)
        held.badges.push(badge ?? 0)

        return { isUp: true }
      },
      read: async () => ({ isUp: true, state: null }),
      pull: async () => {
        const data = held.presses.shift() ?? []

        return { isUp: true, isStale: false, isRegistered: true, actions: data.map((one, index) => ({ id: index + 1, at: 0, data: { id: 'R1', note: '', version: 0, fix: 0, lang: 'ru', ...one } })) }
      },
    },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: undefined }) as never)
  on('tool.register', () => ({ value: undefined }) as never)
  on('session.id', () => ({ value: OWN }))
  on('session.root', () => ({ value: '/w/shop' }))
  on('env.get', (_, e) => ({ value: e.name === 'HOME' ? HOME : undefined }))
  on('process.run', (_, e) => {
    if (e.argv[0] === 'cp') {
      const [from, to] = [e.argv[2]!, e.argv[3]!]
      ;[...held.files.entries()].filter(([path]) => path.startsWith(`${from}/`)).forEach(([path, body]) => held.files.set(`${to}${path.slice(from.length)}`, body))
      held.files.set(to, '')

      return { value: { exitCode: 0, stdout: '', stderr: '' } } as never
    }

    return { value: { exitCode: 0, stdout: e.argv.includes('rev-parse') ? `${BRANCH}\n` : `${BRANCH}\nmain\n`, stderr: '' } } as never
  })
  on('fs.exists', (_, e) => ({ value: held.files.has(e.path) }))
  on('fs.read', (_, e) => {
    if (!held.files.has(e.path)) {
      throw new Error(`ENOENT ${e.path}`)
    }

    return { value: held.files.get(e.path)! }
  })
  on('fs.write', (_, e) => {
    held.files.set(e.path, e.text)

    return { value: undefined }
  })
  on('fs.list', () => ({ value: [] }))
  on('store.get', (_, e) => ({ value: e.key === 'lang' ? 'ru' : NOW }))
  on('store.set', () => ({ value: undefined }))
  on('ui.toast', (_, e) => {
    held.toasts.push(e.text)

    return { value: undefined }
  })
  on('ui.status', (_, e) => {
    held.statuses.push(e.text)

    return { value: undefined }
  })
  on('prompt.submit', (_, e) => {
    held.submitted.push({ text: e.text, ...(e.context === undefined ? {} : { context: e.context }) })

    return { text: e.text }
  })
  on('prompt.fill', (_, e) => {
    held.filled.push(e.text)

    return { isFilled: true, text: e.text, cursor: e.text.length } as never
  })
  on('model.fork', (_, e) => {
    held.forked.push(e.prompt)

    return { value: { ...held.forkReply, usage } } as never
  })

  return held
}

/** A call of the mod's own tools, whose inputs the built-in tool table does not know. */
const call = ($: { tool: { call: (input: never) => Promise<{ result?: unknown; deny?: string }> } }, tool: string, input: Record<string, unknown>) =>
  $.tool.call({ tool, ...input } as never)

const shown = (held: World): State => held.pushed.at(-1) ?? EMPTY

const one = (held: World, id: string): Finding => shown(held).findings.find(finding => finding.id === id)!

const project = (held: World): ProjectFile => parseProject(held.files.get(PROJECT) ?? '')

const finding = (id: string, patch: Partial<Finding> = {}): Finding => ({
  id,
  title: `Находка ${id}`,
  severity: 'high',
  where: 'app/A.php:1',
  noticedBy: [],
  versions: [{ plain: 'Просто.', steps: [{ at: '', text: 'Шаг 1', tone: 'neutral' }, { at: '', text: 'Шаг 2', tone: 'bad' }], origin: 'claude', note: '' }],
  fixes: [],
  status: 'open',
  busy: null,
  isAsking: false,
  approved: null,
  isCarried: false,
  check: '',
  log: [],
  thread: [],
  ...patch,
})

/** Starts the session with the hub's listening loop on a clock the test moves. */
const started = async ($: Parameters<TestBody>[0], on: On, files: Record<string, string> = {}) => {
  const held = world(on, files)
  const clock = mock.clock(on, { now: NOW })
  await $.session.start(START)

  /** One press on the page, handed over by the next pull. */
  const press = async (...data: Press[]) => {
    held.presses.push(data)
    await clock.advance(1000)
  }

  return { held, press, clock }
}

test('a finding without a live example or a place in the code is refused, a full one is numbered on', async () => {
  const refused = parseReport({ findings: [{ title: 'Баг', severity: 'high', plain: 'Плохо.', steps: [{ text: 'Один шаг' }] }, { ...REBUILD, steps: [{ text: 'а' }, { text: 'б' }] }] }, 0, [])

  expect(refused.errors).toEqual([
    'findings[0]: where is empty: give path/File.php:line',
    'findings[0]: steps needs at least 2 steps with concrete values',
    'findings[1]: no step has tone "bad": mark the step where things go wrong',
  ])

  const parsed = parseReport({ findings: [RENAME, REBUILD] }, 7, [])

  expect(parsed.errors === undefined && parsed.added.map(added => added.id)).toEqual(['R8', 'R9'])
  expect(parsed.errors === undefined && parsed.added[0]?.noticedBy).toEqual([{ who: 'Гость', how: 'видит старую цену 95 €', when: 'сразу' }])
  expect(parsed.errors === undefined && parsed.added[1]?.noticedBy).toEqual([{ who: '', how: 'никто, кроме очереди', when: '' }])
})

test('a new explanation may keep the example: the card then shows the steps of the one before', async () => {
  const known = [finding('R4')]
  const again = parseReport({ findings: [{ id: 'R4', plain: 'Ещё проще.' }] }, 4, known)

  expect(again.errors === undefined && again.versions).toEqual([{ id: 'R4', explanation: { plain: 'Ещё проще.', steps: [], origin: 'claude', note: '' } }])

  const state = applyChange({ ...EMPTY, findings: known }, { op: 'report', added: [], versions: again.errors === undefined ? again.versions : [], at: 5 })
  const r4 = state.findings[0]!

  expect(r4.versions).toHaveLength(2)
  expect(stepsAt(r4, 1).map(step => step.text)).toEqual(['Шаг 1', 'Шаг 2'])
  expect(r4.log).toEqual([{ at: 5, by: 'claude', what: 'explained', note: '' }])
  expect(parseReport({ findings: [{ id: 'R9', plain: 'x' }] }, 4, known).errors).toEqual(['R9: no finding with this id (known: R4)'])
})

test('a diff given as bare +/- lines gets a hunk header, a real hunk is kept', async () => {
  expect(normalizeDiff('- old\n+ new\nsame')).toBe('@@ -1,2 +1,2 @@\n- old\n+ new\n same')
  expect(normalizeDiff('```diff\n@@ -3,1 +3,1 @@\n-a\n+b\n```\n')).toBe('@@ -3,1 +3,1 @@\n-a\n+b')
  expect(parseFix({ ...FIX, changes: [] }, [finding('R1')]).errors).toEqual(['changes is empty: give every file with its diff'])
  expect(parseFix({ ...FIX, gaps: 'одна строка' }, [finding('R1')])).toMatchObject({ fix: { gaps: ['одна строка'] } })
})

test('a side answer is read out of the text around its JSON; another example needs its own steps', async () => {
  expect(parseExplanation('Вот: {"plain": "Как письмо на старый адрес."} Готово', 'simpler', 'что такое type')).toEqual({ plain: 'Как письмо на старый адрес.', steps: [], origin: 'simpler', note: 'что такое type' })
  expect(parseExplanation('{"plain": "x", "steps": []}', 'example', '')).toBe(null)
  expect(parseExplanation('не JSON', 'example', '')).toBe(null)
})

test('a press from the page is read strictly; anything unknown is dropped', async () => {
  expect(parseAction({ type: 'fix', id: 'R1', note: ' быстро ', version: '2', fix: -1, lang: 'uk' })).toEqual({ type: 'fix', id: 'R1', ids: [], note: 'быстро', isDeep: false, version: 2, fix: 0, lang: 'uk' })
  expect(parseAction({ type: 'fixMany', ids: ['R1', ' ', 'R3'], isDeep: 'yes' })).toMatchObject({ ids: ['R1', 'R3'], isDeep: false })
  expect(parseAction({ type: 'rm -rf', id: 'R1' })).toBe(null)
  expect(parseAction({ type: 'defer', id: 'R1', lang: 'de' })?.lang).toBe('en')
})

test('cancel puts a request in flight back, and drops a solution on the card', async () => {
  const fix = { title: 'A', summary: 's', steps: [], changes: [], gaps: [] }
  const state = { ...EMPTY, findings: [finding('R1', { status: 'fixing' }), finding('R2', { status: 'fixing', fixes: [fix] }), finding('R3', { status: 'applying', fixes: [fix] }), finding('R4', { status: 'proposed', fixes: [fix] })] }
  const after = ['R1', 'R2', 'R3', 'R4'].reduce((acc, id) => applyChange(acc, { op: 'cancel', id, at: 1 }), state)

  expect(after.findings.map(one => [one.id, one.status, one.fixes.length])).toEqual([['R1', 'open', 0], ['R2', 'proposed', 1], ['R3', 'proposed', 1], ['R4', 'open', 0]])
})

test('a file written by the pane version of the mod is read into the new shape', async () => {
  const old = {
    findings: [{ id: 'R1', title: 'T', severity: 'high', where: 'a.php:1', whoNotices: 'гости', versions: [{ plain: 'p', steps: [{ at: '', text: 'x', tone: 'bad' }], origin: 'claude' }], shown: 0, fixes: [{ title: 'F', summary: 's', steps: [], changes: [{ path: 'a.php', diff: '+x' }], gaps: 'дубли' }], shownFix: 0, status: 'proposed', busy: 'simpler', isCarried: false }],
    selected: 'R1',
    branch: 'b',
  }
  const state = parseState(JSON.stringify(old))!

  expect(state.findings[0]).toMatchObject({ noticedBy: [{ who: '', how: 'гости', when: '' }], busy: null, status: 'proposed', log: [], check: '' })
  expect(state.findings[0]!.fixes[0]!.gaps).toEqual(['дубли'])
  expect(state.findings[0]!.fixes[0]!.changes[0]!.diff).toBe('@@ -1,0 +1,1 @@\n+x')
  expect(state.events).toEqual([])
})

test("the project's file keeps waiting findings per branch and forgets closed ones and dead branches", async () => {
  const state = { ...EMPTY, branch: BRANCH, findings: [finding('R1', { status: 'fixing' }), finding('R2', { status: 'deferred' }), finding('R3', { status: 'fixed' })] }
  const file = syncProject({ lastNo: 1, standing: [{ branch: BRANCH, sessionId: OTHER, updatedAt: 5, finding: finding('R3') }] }, state, OWN, 50)

  expect(file.lastNo).toBe(3)
  expect(file.standing.map(entry => [entry.finding.id, entry.finding.status, entry.sessionId])).toEqual([['R1', 'open', OWN], ['R2', 'deferred', OWN]])
  expect(carriedFor(file, BRANCH, OTHER, []).map(carried => [carried.id, carried.isCarried])).toEqual([['R1', true], ['R2', true]])
  expect(carriedFor(file, 'main', OTHER, [])).toEqual([])
  expect(sweepProject(file, ['main'], 50 + 31 * DAY).standing).toEqual([])
  expect(sweepProject(file, ['main'], 50 + 29 * DAY).standing).toHaveLength(2)
})

test('the page carries Islands Dark and a pinned Shiki, and has no template holes left', async () => {
  expect(PAGE).toContain('"name":"Islands Dark"')
  expect(PAGE).toContain(`https://esm.sh/shiki@${SHIKI_VERSION}`)
  expect(PAGE).not.toContain('__THEME__')
  expect(PAGE).not.toContain('__SHIKI__')
  expect(PAGE).toContain('<script src="/hub.js"></script>')
})

test('the page is put in the hub at the start, and reported findings reach it with their badge', async ($, on) => {
  const { held } = await started($, on)
  expect(held.pages).toBe(1)

  const reported = await call($, REPORT, { findings: [RENAME, REBUILD] })

  expect(String(reported.result)).toMatch(/2 findings are on the Findings page \(ids R1, R2\), at http:\/\/localhost:7777/)
  expect(shown(held).findings.map(found => [found.id, found.status, found.log[0]?.what])).toEqual([['R1', 'open', 'reported'], ['R2', 'open', 'reported']])
  expect(shown(held).branch).toBe(BRANCH)
  expect(held.badges.at(-1)).toBe(2)
  expect(held.statuses.at(-1)).toBe('Находки: 2')
  expect(held.toasts.at(-1)).toBe('Находки: новых — 2. http://localhost:7777/#/s/findings')
  expect(parseState(held.files.get(SESSION_FILE) ?? '')?.findings).toHaveLength(2)
  expect(project(held).standing.map(entry => [entry.finding.id, entry.branch])).toEqual([['R1', BRANCH], ['R2', BRANCH]])
})

test('a refused report shows nothing and says what to fix', async ($, on) => {
  const { held } = await started($, on)
  const refused = await call($, REPORT, { findings: [{ ...RENAME, where: '' }] })

  expect(refused.deny).toMatch(/findings\[0\]: where is empty/)
  expect(shown(held).findings).toEqual([])
})

test('"simpler" is answered beside the chat and kept as a new version with the note', async ($, on) => {
  const { held, press } = await started($, on)
  held.forkReply = { isAnswered: true, text: '{"plain": "Письмо ушло на старый адрес."}' }
  await call($, REPORT, { findings: [RENAME] })

  await press({ type: 'simpler', note: 'что такое type' })

  expect(held.submitted).toEqual([])
  expect(held.forked[0]).toContain("What exactly is unclear, in the user's words: что такое type")
  expect(one(held, 'R1').versions.map(version => [version.plain, version.origin, version.note])).toEqual([
    [RENAME.plain, 'claude', ''],
    ['Письмо ушло на старый адрес.', 'simpler', 'что такое type'],
  ])
  expect(one(held, 'R1').busy).toBe(null)
  expect(one(held, 'R1').log.map(entry => [entry.by, entry.what])).toEqual([['claude', 'reported'], ['you', 'simpler'], ['claude', 'explained']])
  expect(shown(held).events.map(event => [event.what, event.id, event.note])).toEqual([['simpler', 'R1', 'что такое type']])
})

test('when the side answer fails the ask goes to chat and comes back through the tool', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME] })

  await press({ type: 'example' })

  expect(held.submitted).toHaveLength(1)
  expect(held.submitted[0]!.text).toMatch(/^Находка R1 «Окно между деплоем и rename»: Я не понял объяснение\. Дай другой живой пример/)
  expect(held.submitted[0]!.text).toContain(`${REPORT} с id R1`)
  expect(held.toasts.at(-1)).toBe('Находки: быстрый ответ не получился, запрос ушёл в чат')

  await call($, REPORT, { findings: [{ id: 'R1', plain: 'Другой случай.', steps: [{ text: 'Отель {{9}} без цен' }, { text: 'Бронь по старой цене', tone: 'bad' }] }] })
  expect(one(held, 'R1').versions.at(-1)?.plain).toBe('Другой случай.')
})

test('a deferred finding leaves the badge, stays for the branch and rides on the next prompt', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME, REBUILD] })

  await press({ type: 'defer', note: 'после релиза' })

  expect(one(held, 'R1').status).toBe('deferred')
  expect(held.badges.at(-1)).toBe(1)
  expect(held.statuses.at(-1)).toBe('Находки: 1')
  expect(project(held).standing.map(entry => [entry.finding.id, entry.finding.status])).toEqual([['R1', 'deferred'], ['R2', 'open']])

  await $.prompt.submit({ text: 'почини всё', wait: false, origin: { kind: 'composer' } })
  expect(held.submitted.at(-1)).toEqual({
    text: 'почини всё',
    context: [
      'Страница «Находки», что пользователь сделал там с прошлого сообщения:\n- R1 «Окно между деплоем и rename»: отложена: после релиза\nОтложены пользователем, не чини и не поднимай их, пока он сам их не вернёт: R1.',
    ],
  })
  expect(shown(held).news).toEqual([])

  await $.prompt.submit({ text: 'и ещё', wait: false, origin: { kind: 'composer' } })
  expect(held.submitted.at(-1)?.context).toEqual(['Отложены пользователем, не чини и не поднимай их, пока он сам их не вернёт: R1.'])

  await press({ type: 'restore' })
  expect(one(held, 'R1').status).toBe('open')
})

test('"fix" asks for a solution first, shows it on the card, and edits only after "apply"', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME] })

  await press({ type: 'fix', note: 'без миграций' })

  expect(held.submitted[0]!.text).toBe(
    `Находка R1 «Окно между деплоем и rename»: предложи решение. Моё уточнение: без миграций Код пока не меняй. Вызови ${PROPOSE_FIX}: что поменяется простыми словами, тот же живой пример после фикса, дифф по файлам и что решение не закрывает.`,
  )
  expect(one(held, 'R1').status).toBe('fixing')

  const proposed = await call($, PROPOSE_FIX, FIX)
  expect(String(proposed.result)).toMatch(/Change no code/)
  expect(one(held, 'R1').status).toBe('proposed')
  expect(one(held, 'R1').fixes[0]?.changes[0]?.diff).toBe("@@ -1,1 +1,1 @@\n- ->where('type', 'property')\n+ ->whereIn('type', ['property', 'listing_details'])")

  await press({ type: 'discuss', note: 'а дубли?' })
  expect(held.filled).toEqual(['> R1 «Окно между деплоем и rename»\n> Решение: «Искать под обоими именами». Если записи property нет, код берёт старую listing_details.\n\nа дубли?'])

  await press({ type: 'apply' })
  expect(held.submitted[1]!.text).toBe(
    `Находка R1 «Окно между деплоем и rename»: применяй решение «Искать под обоими именами». Когда закончишь и проверишь, вызови ${MARK_FIXED} с id R1 и напиши в check, чем проверил.`,
  )
  expect(project(held).standing.map(entry => entry.finding.status)).toEqual(['proposed'])

  expect((await call($, MARK_FIXED, { id: 'R1' })).deny).toMatch(/check is empty/)
  await call($, MARK_FIXED, { id: 'R1', check: 'WebhookTest: 12 из 12' })
  expect(one(held, 'R1')).toMatchObject({ status: 'fixed', check: 'WebhookTest: 12 из 12' })
  expect(project(held).standing).toEqual([])
  expect(held.statuses.at(-1)).toBe(undefined)
})

test('"another option" names the solutions already seen, and the language of the page is the language of the message', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME] })
  await call($, PROPOSE_FIX, FIX)

  await press({ type: 'another', lang: 'en' })
  expect(held.submitted[0]!.text).toMatch(/^Finding R1 "Окно между деплоем и rename": propose a different solution, not like «Искать под обоими именами»\. Do not change the code yet/)

  await call($, PROPOSE_FIX, { ...FIX, title: 'Запускать rename в деплое' })
  expect(one(held, 'R1').fixes.map(fix => fix.title)).toEqual(['Искать под обоими именами', 'Запускать rename в деплое'])

  await press({ type: 'apply', fix: 0, lang: 'en' })
  expect(held.submitted[1]!.text).toMatch(/apply the solution "Искать под обоими именами"/)
})

test('"clear closed" can be undone from the page', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME, REBUILD] })
  await press({ type: 'dismiss' })

  await press({ type: 'clear', id: '' })
  expect(shown(held).findings.map(found => found.id)).toEqual(['R2'])

  await press({ type: 'unclear', id: '' })
  expect(shown(held).findings.map(found => [found.id, found.status])).toEqual([['R2', 'open'], ['R1', 'dismissed']])
})

test('a fix asked for a finding of another session carries the finding itself', async () => {
  const carried = finding('R5', { title: 'Сбой отеля', isCarried: true })

  const note = contextNote({ ...EMPTY, findings: [carried, finding('R2', { status: 'deferred' })] }, 'ru')

  expect(fixAsk(carried, '', 'ru', note)).toContain('Это находка из прошлой сессии на этой ветке, ты её ещё не видел. Вот она целиком:\nR5 [high] Сбой отеля')
  expect(fixAsk(carried, '', 'ru', note)).toMatch(/Отложены пользователем, не чини и не поднимай их, пока он сам их не вернёт: R2\.$/)
})

test('a new session of the branch shows what the last one left, and asks about it through chat', async ($, on) => {
  const left: ProjectFile = {
    lastNo: 6,
    standing: [
      { branch: BRANCH, sessionId: OTHER, updatedAt: 99 * DAY, finding: finding('R5', { title: 'Сбой отеля блокирует номера', status: 'deferred' }) },
      { branch: 'main', sessionId: OTHER, updatedAt: 99 * DAY, finding: finding('R6') },
    ],
  }
  const { held, press } = await started($, on, { [PROJECT]: JSON.stringify(left) })

  expect(shown(held).findings.map(found => [found.id, found.isCarried])).toEqual([['R5', true]])

  await press({ type: 'simpler', id: 'R5' })
  expect(held.forked).toEqual([])
  expect(held.submitted[0]!.text).toContain('Это находка из прошлой сессии на этой ветке, ты её ещё не видел. Вот она целиком:\nR5 [high] Сбой отеля блокирует номера')

  const reported = await call($, REPORT, { findings: [RENAME] })
  expect(String(reported.result)).toMatch(/ids R7\)/)
})

test('the data of the mod under its old name is copied over once, and its findings come back', async ($, on) => {
  const old = `${HOME}/.claude/mods-data/razbor`
  const saved = { ...EMPTY, branch: BRANCH, findings: [finding('R3', { title: 'Старая находка' })] }
  const { held } = await started($, on, { [old]: '', [`${old}/sessions/${OWN}.json`]: JSON.stringify(saved) })

  expect(held.files.has(SESSION_FILE)).toBe(true)
  expect(held.files.has(`${old}/sessions/${OWN}.json`)).toBe(true)
  expect(shown(held).findings.map(found => found.title)).toEqual(['Старая находка'])
})

const REPO_FILE = ['<?php', '', 'class PmsDataRepository', '{', '    public function find()', '    {', "        return PmsData::query()", "            ->where('type', 'property')", '            ->first();', '    }', '}'].join('\n')

test('a diff is laid over the file: found near its header, without caring for indentation; one that does not fit is refused', async () => {
  expect(locateHunks(REPO_FILE, "@@ -7,2 +7,2 @@\n         return PmsData::query()\n-            ->where('type', 'property')\n+            ->whereIn('type', ['property'])")).toEqual([6])
  expect(locateHunks(REPO_FILE, normalizeDiff("- ->where('type', 'property')\n+ ->whereIn('type', ['property'])"))).toEqual([7])
  expect(locateHunks(REPO_FILE, normalizeDiff("- ->where('type', 'listing')\n+ ->whereIn('type', ['x'])"))).toBe(null)
  expect(locateHunks('', '@@ -0,0 +1,2 @@\n+<?php\n+echo 1;')).toEqual([0])
  expect(locateHunks(REPO_FILE, "@@ -1,1 +1,1 @@\n-<?php\n+<?php\n@@ -9,1 +9,1 @@\n-            ->first();\n+            ->firstOrFail();")).toEqual([0, 8])
})

test('a proposed solution carries the file it changes for the whole-file view, but the project file does not', async ($, on) => {
  const { held } = await started($, on, { '/w/shop/app/PmsDataRepository.php': REPO_FILE })
  await call($, REPORT, { findings: [RENAME] })

  const proposed = await call($, PROPOSE_FIX, { ...FIX, changes: [...FIX.changes, { path: 'app/Missing.php', diff: '- gone\n+ here' }] })

  expect(one(held, 'R1').fixes[0]?.changes.map(change => change.full?.starts ?? null)).toEqual([[7], null])
  expect(one(held, 'R1').fixes[0]?.changes[0]?.full?.before).toBe(REPO_FILE)
  expect(String(proposed.result)).toMatch(/The diff of app\/Missing\.php could not be laid over the file on disk/)
  expect(project(held).standing[0]?.finding.fixes[0]?.changes.map(change => change.full)).toEqual([null, null])
})

test('"not a problem" reaches Claude: once as news with the note, and as a standing list on every message', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME, REBUILD] })

  await press({ type: 'dismiss', id: 'R2', note: 'очередь сама схлопывает дубли' })
  await press({ type: 'cancel', id: 'R1' })
  expect(shown(held).news.map(news => [news.what, news.id])).toEqual([['dismiss', 'R2'], ['cancel', 'R1']])

  await $.prompt.submit({ text: 'что дальше?', wait: false, origin: { kind: 'composer' } })
  expect(held.submitted.at(-1)?.context?.[0]).toBe(
    [
      'Страница «Находки», что пользователь сделал там с прошлого сообщения:',
      '- R2 «Двойная пересборка юнитов»: закрыта как «не проблема»: очередь сама схлопывает дубли',
      '- R1 «Окно между деплоем и rename»: предложенное решение отменено, по нему ничего не меняй',
      'Пользователь закрыл как «не проблема», не поднимай их как проблему снова: R2.',
    ].join('\n'),
  )
  expect(shown(held).news).toEqual([])
})

test('news a press of the page sends goes inside that message, and is not added twice', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME, REBUILD] })
  await press({ type: 'defer', id: 'R2', note: 'после релиза' })
  await press({ type: 'restore', id: 'R2' })
  await press({ type: 'dismiss', id: 'R2' })

  await press({ type: 'fix', id: 'R1' })

  expect(held.submitted).toHaveLength(1)
  expect(held.submitted[0]!.context).toBe(undefined)
  expect(held.submitted[0]!.text).toMatch(/решение не закрывает\.\n\nСтраница «Находки», что пользователь сделал там с прошлого сообщения:\n- R2 «Двойная пересборка юнитов»: закрыта как «не проблема»\nПользователь закрыл/)
  expect(shown(held).news).toEqual([])
})

test('a question is answered beside the chat by default, and its answer is told to Claude later', async ($, on) => {
  const { held, press } = await started($, on)
  held.forkReply = { isAnswered: true, text: 'Потому что `rename` идёт после деплоя.' }
  await call($, REPORT, { findings: [RENAME] })

  await press({ type: 'ask', note: 'почему окно вообще есть?' })

  expect(held.submitted).toEqual([])
  expect(held.forked[0]).toContain('The question: почему окно вообще есть?')
  expect(one(held, 'R1').thread.map(message => [message.by, message.text, message.via])).toEqual([
    ['you', 'почему окно вообще есть?', 'side'],
    ['claude', 'Потому что `rename` идёт после деплоя.', 'side'],
  ])
  expect(one(held, 'R1').busy).toBe(null)
  expect(shown(held).news[0]).toMatchObject({ what: 'ask', id: 'R1', note: 'почему окно вообще есть? → Потому что `rename` идёт после деплоя.' })
})

test('a question with access to the code goes through the session and comes back through reply', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME] })

  await press({ type: 'ask', note: 'а где ещё читают property?', isDeep: true })

  expect(held.forked).toEqual([])
  expect(held.submitted[0]!.text).toBe(
    'Находка R1 «Окно между деплоем и rename», вопрос: а где ещё читают property?\n\nЕсли нужно, прочитай код и ответь через mcp__findings__reply с id R1; в чат одной строкой.',
  )
  expect(one(held, 'R1').isAsking).toBe(true)

  expect((await call($, 'mcp__findings__reply', { id: 'R9', text: 'x' })).deny).toMatch(/No finding/)
  await call($, 'mcp__findings__reply', { id: 'R1', text: 'В трёх местах: импорт, календарь, вебхук.' })
  expect(one(held, 'R1').isAsking).toBe(false)
  expect(one(held, 'R1').thread.at(-1)).toMatchObject({ by: 'claude', via: 'session', text: 'В трёх местах: импорт, календарь, вебхук.' })
})

test('a side question that gets no answer goes through the session instead', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME] })

  await press({ type: 'ask', note: 'что сломается первым?' })

  expect(held.forked).toHaveLength(1)
  expect(held.submitted[0]!.text).toMatch(/^Находка R1 «Окно между деплоем и rename», вопрос: что сломается первым\?/)
  expect(one(held, 'R1')).toMatchObject({ busy: null, isAsking: true })
  expect(held.toasts.at(-1)).toBe('Находки: быстрый ответ не получился, запрос ушёл в чат')
})

test('solutions for several findings are asked in one message, approved one by one and applied together', async ($, on) => {
  const { held, press } = await started($, on)
  await call($, REPORT, { findings: [RENAME, REBUILD] })

  await press({ type: 'fixMany', id: '', ids: ['R1', 'R2'] })

  expect(held.submitted).toHaveLength(1)
  expect(held.submitted[0]!.text).toMatch(/^Находки R1, R2: предложи решение для каждой, отдельным вызовом mcp__findings__propose_fix на находку\./)
  expect(held.submitted[0]!.text).toContain('- R2 «Двойная пересборка юнитов» (app/PropertyAdapter.php:12)')
  expect(shown(held).findings.map(found => found.status)).toEqual(['fixing', 'fixing'])

  expect(String((await call($, PROPOSE_FIX, FIX)).result)).toMatch(/Still waiting for solutions: R2\./)
  await call($, PROPOSE_FIX, { ...FIX, id: 'R2', title: 'Одна пересборка' })

  await press({ type: 'approve', id: 'R1', fix: 0 }, { type: 'approve', id: 'R2', fix: 0 })
  await press({ type: 'unapprove', id: 'R2' })
  expect(shown(held).findings.map(found => found.approved)).toEqual([0, null])

  await press({ type: 'approve', id: 'R2', fix: 0 })
  await press({ type: 'applyMany', id: '', ids: ['R1', 'R2'] })

  expect(held.submitted[1]!.text).toBe(
    'Применяй одобренные мной решения, по очереди:\n- R1 «Окно между деплоем и rename»: решение «Искать под обоими именами»\n- R2 «Двойная пересборка юнитов»: решение «Одна пересборка»\n\nПосле каждого, когда закончишь и проверишь, вызови mcp__findings__mark_fixed с его id и напиши в check, чем проверил.',
  )
  expect(shown(held).findings.map(found => [found.status, found.approved])).toEqual([['applying', 0], ['applying', 0]])

  await call($, MARK_FIXED, { id: 'R1', check: 'тесты 12 из 12' })
  expect(one(held, 'R1')).toMatchObject({ status: 'fixed', approved: null })
})

test('once nothing waits, what was done on the page goes to Claude by itself, after time for Undo', async ($, on) => {
  const { held, press, clock } = await started($, on)
  await call($, REPORT, { findings: [RENAME, REBUILD] })

  await press({ type: 'dismiss', id: 'R1', note: 'так задумано' })
  await clock.advance(10_000)
  expect(held.submitted).toEqual([])

  await press({ type: 'dismiss', id: 'R2' })
  await clock.advance(3000)
  expect(held.submitted).toEqual([])

  await clock.advance(3000)
  expect(held.submitted).toHaveLength(1)
  expect(held.submitted[0]!.text).toBe(
    [
      'Находки: вот что я сделал на странице. Учти это; в ответ хватит одной строки.',
      '',
      'Страница «Находки», что пользователь сделал там с прошлого сообщения:',
      '- R1 «Окно между деплоем и rename»: закрыта как «не проблема»: так задумано',
      '- R2 «Двойная пересборка юнитов»: закрыта как «не проблема»',
      'Пользователь закрыл как «не проблема», не поднимай их как проблему снова: R1, R2.',
    ].join('\n'),
  )
  expect(shown(held).news).toEqual([])
  expect(shown(held).events[0]).toMatchObject({ what: 'tell', id: 'R1, R2' })

  await clock.advance(10_000)
  expect(held.submitted).toHaveLength(1)
})

test('an Undo within the wait keeps the news for later, and the button sends it at once', async ($, on) => {
  const { held, press, clock } = await started($, on)
  await call($, REPORT, { findings: [RENAME] })

  await press({ type: 'defer', id: 'R1' })
  await press({ type: 'restore', id: 'R1' })
  await clock.advance(10_000)
  expect(held.submitted).toEqual([])
  expect(shown(held).news.map(news => news.what)).toEqual(['restore'])

  await press({ type: 'tell', id: '' })
  expect(held.submitted).toHaveLength(1)
  expect(held.submitted[0]!.text).toMatch(/- R1 «Окно между деплоем и rename»: возвращена в работу$/)

  await press({ type: 'tell', id: '' })
  expect(held.submitted).toHaveLength(1)
})
