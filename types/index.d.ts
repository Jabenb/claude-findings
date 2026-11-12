export type Severity = 'high' | 'medium' | 'low'

export type Tone = 'neutral' | 'bad' | 'good'

/** The languages the hub offers; the page and the messages to Claude follow the one chosen there. */
export type Lang = 'en' | 'ru' | 'uk'

/** One moment of a live example: when, what happened, and whether it is where things go wrong. `{{…}}` in the text marks a concrete value. */
export type Step = { at: string; text: string; tone: Tone }

/** Who sees the damage, how, and when. */
export type Witness = { who: string; how: string; when: string }

/** One way the finding was explained. A simpler one may bring no steps of its own: the page then shows the steps of the one before. */
export type Explanation = { plain: string; steps: Step[]; origin: 'claude' | 'simpler' | 'example'; note: string }

/**
 * The file a change touches, as it was on disk when the solution was proposed, and where each hunk of the diff sits in it
 * (0-based line of the hunk's first old line). Null when the file could not be read or the diff does not fit it.
 */
export type FullFile = { before: string; starts: number[] }

export type FileChange = { path: string; diff: string; full: FullFile | null }

export type Fix = { title: string; summary: string; steps: Step[]; changes: FileChange[]; gaps: string[] }

export type Status = 'open' | 'deferred' | 'fixing' | 'proposed' | 'applying' | 'fixed' | 'dismissed'

/** What a line of a finding's history, or of the list of what went to Claude, is about. */
export type Moment =
  | 'reported'
  | 'simpler'
  | 'example'
  | 'explained'
  | 'fix'
  | 'another'
  | 'proposed'
  | 'approve'
  | 'unapprove'
  | 'apply'
  | 'fixed'
  | 'defer'
  | 'dismiss'
  | 'restore'
  | 'cancel'
  | 'discuss'
  | 'ask'
  | 'answered'
  | 'clear'
  | 'tell'

export type Entry = { at: number; by: 'you' | 'claude'; what: Moment; note: string }

/** One message of the discussion under a finding. A queued question waits on the page until it is sent together with the others. */
export type Message = { at: number; by: 'you' | 'claude'; text: string; isQueued: boolean }

export type Finding = {
  id: string
  title: string
  severity: Severity
  where: string
  noticedBy: Witness[]
  versions: Explanation[]
  fixes: Fix[]
  status: Status
  /** A side explanation is being written: the page shows Claude typing. */
  busy: 'simpler' | 'example' | null
  /** Questions sent through the session wait for the answer. */
  isAsking: boolean
  /** The solution the person approved for a batch apply (its index), or null. */
  approved: number | null
  /** Reported by another session of the same branch: this session's model has not read its code. */
  isCarried: boolean
  /** How the applied solution was checked, as Claude said it when marking the finding fixed. */
  check: string
  log: Entry[]
  thread: Message[]
}

/** One press on the page that reached Claude. */
export type Sent = { at: number; what: Moment; id: string; note: string }

/** What the person did on the page that Claude has not been told yet: it goes with the next message to Claude. */
export type News = { at: number; what: Moment; id: string; title: string; note: string }

/** What the page draws; the same value is this session's file. */
/**
 * `isStandingTold`: Claude was told which findings stand closed as "not a problem" or set aside, and the transcript still holds it.
 * Cleared by a compaction and by findings carried in from another session.
 */
export type State = { findings: Finding[]; branch: string; events: Sent[]; news: News[]; updatedAt: number; isStandingTold: boolean }

/** A finding still waiting on the person, as the project's file keeps it for the branch's other sessions. */
export type Standing = { branch: string; sessionId: string; updatedAt: number; finding: Finding }

export type ProjectFile = { lastNo: number; standing: Standing[] }

/** What the page passes to `hub.send`. */
export type PageAction = {
  type:
    | 'simpler'
    | 'example'
    | 'fix'
    | 'another'
    | 'apply'
    | 'discuss'
    | 'cancel'
    | 'defer'
    | 'dismiss'
    | 'restore'
    | 'clear'
    | 'unclear'
    | 'ask'
    | 'queue'
    | 'unqueue'
    | 'askAll'
    | 'approve'
    | 'unapprove'
    | 'fixMany'
    | 'applyMany'
    | 'tell'
  id: string
  /** fixMany / applyMany: the findings pressed together. */
  ids: string[]
  note: string
  /** unqueue: the time of the queued question to take back. */
  at: number
  /** The explanation the person was reading. */
  version: number
  /** The solution the person was reading. */
  fix: number
  lang: Lang
}
