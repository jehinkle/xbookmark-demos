/**
 * Knowledge database — source of truth for the ERD.
 * Entities + fields + FK cross-refs; the diagram is generated from this store.
 */

export const CATEGORIES = {
  core: {
    id: 'core',
    label: 'Core',
    header: '#6b4423',
    body: '#3d2914',
    border: '#8b5a2b',
    accent: '#c4a882',
  },
  master: {
    id: 'master',
    label: 'Master',
    header: '#1e4d3a',
    body: '#143328',
    border: '#2d6b4f',
    accent: '#7dba9a',
  },
  detail: {
    id: 'detail',
    label: 'Detail',
    header: '#4a5530',
    body: '#2f361f',
    border: '#6b7a45',
    accent: '#b8c47a',
  },
}

/** @typedef {{ name: string, type: string, isPk?: boolean, isFk?: boolean, refEntity?: string }} Field */
/** @typedef {{ id: string, name: string, category: keyof typeof CATEGORIES, tag: string, fields: Field[] }} Entity */

/** @type {Entity[]} */
export const ENTITIES = [
  {
    id: 'protocol',
    name: 'protocol',
    category: 'core',
    tag: 'T-1',
    fields: [
      { name: 'protocolId', type: 'uuid', isPk: true },
      { name: 'protocolCode', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'phase', type: 'enum' },
      { name: 'version', type: 'int' },
      { name: 'status', type: 'enum' },
      { name: 'effectiveDate', type: 'date' },
    ],
  },
  {
    id: 'protocolAmendment',
    name: 'protocolAmendment',
    category: 'core',
    tag: 'T-2',
    fields: [
      { name: 'amendmentId', type: 'uuid', isPk: true },
      { name: 'protocolId', type: 'uuid', isFk: true, refEntity: 'protocol' },
      { name: 'amendmentNumber', type: 'int' },
      { name: 'summary', type: 'text' },
      { name: 'approvedDate', type: 'date' },
      { name: 'createdBy', type: 'uuid', isFk: true, refEntity: 'user' },
    ],
  },
  {
    id: 'study',
    name: 'study',
    category: 'core',
    tag: 'T-3',
    fields: [
      { name: 'studyId', type: 'uuid', isPk: true },
      { name: 'protocolId', type: 'uuid', isFk: true, refEntity: 'protocol' },
      { name: 'studyCode', type: 'string' },
      { name: 'sponsor', type: 'string' },
      { name: 'status', type: 'enum' },
      { name: 'startDate', type: 'date' },
      { name: 'endDate', type: 'date' },
    ],
  },
  {
    id: 'studyAudit',
    name: 'studyAudit',
    category: 'core',
    tag: 'T-4',
    fields: [
      { name: 'auditId', type: 'uuid', isPk: true },
      { name: 'studyId', type: 'uuid', isFk: true, refEntity: 'study' },
      { name: 'userId', type: 'uuid', isFk: true, refEntity: 'user' },
      { name: 'action', type: 'string' },
      { name: 'timestamp', type: 'datetime' },
      { name: 'details', type: 'json' },
    ],
  },
  {
    id: 'visit',
    name: 'visit',
    category: 'master',
    tag: 'M-1',
    fields: [
      { name: 'visitId', type: 'uuid', isPk: true },
      { name: 'studyId', type: 'uuid', isFk: true, refEntity: 'study' },
      { name: 'visitCode', type: 'string' },
      { name: 'visitName', type: 'string' },
      { name: 'sequence', type: 'int' },
      { name: 'windowDays', type: 'int' },
    ],
  },
  {
    id: 'studySubject',
    name: 'studySubject',
    category: 'master',
    tag: 'M-2',
    fields: [
      { name: 'subjectId', type: 'uuid', isPk: true },
      { name: 'studyId', type: 'uuid', isFk: true, refEntity: 'study' },
      { name: 'subjectNumber', type: 'string' },
      { name: 'siteId', type: 'string' },
      { name: 'status', type: 'enum' },
      { name: 'enrolledDate', type: 'date' },
    ],
  },
  {
    id: 'subjectEvent',
    name: 'subjectEvent',
    category: 'master',
    tag: 'M-3',
    fields: [
      { name: 'eventId', type: 'uuid', isPk: true },
      { name: 'subjectId', type: 'uuid', isFk: true, refEntity: 'studySubject' },
      { name: 'visitId', type: 'uuid', isFk: true, refEntity: 'visit' },
      { name: 'eventDate', type: 'date' },
      { name: 'status', type: 'enum' },
      { name: 'enteredBy', type: 'uuid', isFk: true, refEntity: 'user' },
    ],
  },
  {
    id: 'subjectEventStatus',
    name: 'subjectEventStatus',
    category: 'master',
    tag: 'M-4',
    fields: [
      { name: 'statusId', type: 'uuid', isPk: true },
      { name: 'eventId', type: 'uuid', isFk: true, refEntity: 'subjectEvent' },
      { name: 'statusCode', type: 'enum' },
      { name: 'changedAt', type: 'datetime' },
      { name: 'changedBy', type: 'uuid', isFk: true, refEntity: 'user' },
    ],
  },
  {
    id: 'dataElement',
    name: 'dataElement',
    category: 'detail',
    tag: 'D-1',
    fields: [
      { name: 'elementId', type: 'uuid', isPk: true },
      { name: 'studyId', type: 'uuid', isFk: true, refEntity: 'study' },
      { name: 'elementCode', type: 'string' },
      { name: 'label', type: 'string' },
      { name: 'dataType', type: 'enum' },
      { name: 'required', type: 'bool' },
    ],
  },
  {
    id: 'dataElementValue',
    name: 'dataElementValue',
    category: 'detail',
    tag: 'D-2',
    fields: [
      { name: 'valueId', type: 'uuid', isPk: true },
      { name: 'eventId', type: 'uuid', isFk: true, refEntity: 'subjectEvent' },
      { name: 'elementId', type: 'uuid', isFk: true, refEntity: 'dataElement' },
      { name: 'valueText', type: 'string' },
      { name: 'valueNum', type: 'decimal' },
      { name: 'capturedAt', type: 'datetime' },
    ],
  },
  {
    id: 'dataElementOption',
    name: 'dataElementOption',
    category: 'detail',
    tag: 'D-3',
    fields: [
      { name: 'optionId', type: 'uuid', isPk: true },
      { name: 'elementId', type: 'uuid', isFk: true, refEntity: 'dataElement' },
      { name: 'code', type: 'string' },
      { name: 'label', type: 'string' },
      { name: 'sequence', type: 'int' },
    ],
  },
  {
    id: 'dataElementRule',
    name: 'dataElementRule',
    category: 'detail',
    tag: 'D-4',
    fields: [
      { name: 'ruleId', type: 'uuid', isPk: true },
      { name: 'elementId', type: 'uuid', isFk: true, refEntity: 'dataElement' },
      { name: 'ruleType', type: 'enum' },
      { name: 'expression', type: 'text' },
      { name: 'severity', type: 'enum' },
    ],
  },
  {
    id: 'dataElementRange',
    name: 'dataElementRange',
    category: 'detail',
    tag: 'D-5',
    fields: [
      { name: 'rangeId', type: 'uuid', isPk: true },
      { name: 'elementId', type: 'uuid', isFk: true, refEntity: 'dataElement' },
      { name: 'lowValue', type: 'decimal' },
      { name: 'highValue', type: 'decimal' },
      { name: 'unit', type: 'string' },
    ],
  },
  {
    id: 'dataElementCalculation',
    name: 'dataElementCalculation',
    category: 'detail',
    tag: 'D-6',
    fields: [
      { name: 'calcId', type: 'uuid', isPk: true },
      { name: 'elementId', type: 'uuid', isFk: true, refEntity: 'dataElement' },
      { name: 'formula', type: 'text' },
      { name: 'dependsOn', type: 'uuid', isFk: true, refEntity: 'dataElement' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    id: 'user',
    name: 'user',
    category: 'master',
    tag: 'M-5',
    fields: [
      { name: 'userId', type: 'uuid', isPk: true },
      { name: 'username', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'role', type: 'enum' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    id: 'userSetting',
    name: 'userSetting',
    category: 'master',
    tag: 'M-6',
    fields: [
      { name: 'settingId', type: 'uuid', isPk: true },
      { name: 'userId', type: 'uuid', isFk: true, refEntity: 'user' },
      { name: 'prefKey', type: 'string' },
      { name: 'prefValue', type: 'json' },
      { name: 'updatedAt', type: 'datetime' },
    ],
  },
]

/** Sample optional FK used to prove live rebuild (toggled in UI). */
export const SAMPLE_OPTIONAL_LINK = {
  id: 'sample-study-owner',
  fromEntity: 'study',
  fieldName: 'ownerUserId',
  type: 'uuid',
  refEntity: 'user',
}

/**
 * Derive FK edges from entities (and optional sample link).
 * @param {Entity[]} entities
 * @param {boolean} includeSampleLink
 */
export function deriveEdges(entities, includeSampleLink = false) {
  const ids = new Set(entities.map((e) => e.id))
  /** @type {{ id: string, from: string, to: string, field: string }[]} */
  const edges = []
  for (const ent of entities) {
    for (const f of ent.fields) {
      if (f.isFk && f.refEntity && ids.has(f.refEntity) && ids.has(ent.id)) {
        edges.push({
          id: `${ent.id}.${f.name}->${f.refEntity}`,
          from: ent.id,
          to: f.refEntity,
          field: f.name,
        })
      }
    }
  }
  if (
    includeSampleLink &&
    ids.has(SAMPLE_OPTIONAL_LINK.fromEntity) &&
    ids.has(SAMPLE_OPTIONAL_LINK.refEntity)
  ) {
    edges.push({
      id: SAMPLE_OPTIONAL_LINK.id,
      from: SAMPLE_OPTIONAL_LINK.fromEntity,
      to: SAMPLE_OPTIONAL_LINK.refEntity,
      field: SAMPLE_OPTIONAL_LINK.fieldName,
    })
  }
  return edges
}

/**
 * Apply optional sample FK field onto a clone of entities for display.
 * @param {Entity[]} entities
 * @param {boolean} includeSampleLink
 */
export function withSampleLink(entities, includeSampleLink) {
  if (!includeSampleLink) return entities
  return entities.map((e) => {
    if (e.id !== SAMPLE_OPTIONAL_LINK.fromEntity) return e
    const already = e.fields.some((f) => f.name === SAMPLE_OPTIONAL_LINK.fieldName)
    if (already) return e
    return {
      ...e,
      fields: [
        ...e.fields,
        {
          name: SAMPLE_OPTIONAL_LINK.fieldName,
          type: SAMPLE_OPTIONAL_LINK.type,
          isFk: true,
          refEntity: SAMPLE_OPTIONAL_LINK.refEntity,
        },
      ],
    }
  })
}

export function getEntityMap(entities) {
  return Object.fromEntries(entities.map((e) => [e.id, e]))
}

export function inboundRefs(entityId, edges) {
  return edges.filter((e) => e.to === entityId)
}

export function outboundRefs(entityId, edges) {
  return edges.filter((e) => e.from === entityId)
}
