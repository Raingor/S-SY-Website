// Only these content groups are shown. Legacy fields remain in the record/payload.
export const attractionEditorFieldGroups = [
  { key: 'basic', label: '基础资料', eyebrow: '基础资料', description: '名称、城市、主图、简介、发布状态与关联目的地。', fields: ['name', 'en', 'originalName', 'city', 'cityName', 'type', 'category', 'tags', 'image', 'summary', 'status', 'linkedDestinationIds'] },
  { key: 'visitor', label: '游览服务', eyebrow: '四项参观指南', description: '开放时间、门票信息、交通信息、景点地图；直接排版，不再用分号分行。', fields: ['guide'] },
  { key: 'highlights', label: '景点亮点', eyebrow: '景点亮点', description: '维护亮点名称、说明和图片。', fields: ['highlights'] },
  { key: 'exhibits', label: '景点讲解', eyebrow: '讲解点与语音使用指南', description: '维护景点讲解点；语音导览使用指南在全局页面配置中保留。', fields: ['exhibits'] },
  { key: 'media', label: '专业介绍与攻略', eyebrow: '音视频资料', description: '保留音视频管理；游览攻略仅后台维护，暂不在小程序前台显示。', fields: ['onlineCoverImage', 'expertCoverImage', 'expertVideoUrl', 'expertVideoCover', 'expertVideoDuration', 'expertVideoTrialSeconds'] },
]

export const visitorGuideSections = [
  { key: 'hours', title: '开放时间' },
  { key: 'tickets', title: '门票信息' },
  { key: 'transport', title: '交通信息' },
  { key: 'map', title: '景点地图' },
]

export function attractionFieldGroup(key) {
  return attractionEditorFieldGroups.find(group => group.fields.includes(key))?.key || 'hidden'
}

// Empty/absent filter keeps every track; a set filter requires an exact attraction match.
export function matchesAttractionAudio(track, attractionId) {
  if (!attractionId) return true
  return String(track?.attractionId || '') === String(attractionId)
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
const linkedText = value => value.split(/(https:\/\/[^\s<>"'；;]+)/gi).map(part => {
  if (!/^https:\/\//i.test(part)) return escapeHtml(part)
  try {
    const url = new URL(part)
    if (url.username || url.password) return escapeHtml(part)
    return `<a href="${escapeHtml(part)}">${escapeHtml(part)}</a>`
  } catch { return escapeHtml(part) }
}).join('')

// Legacy content is displayed without migrating data on open or on cancel.
export function visitorGuideHtml(guide, kind, suffix = '') {
  const rich = guide?.[`${kind}Html${suffix}`]
  if (rich) return rich
  const lines = String(guide?.[`${kind}${suffix}`] || '').split(/\r\n?|\n|[；;]/).map(line => line.trim()).filter(Boolean)
  return lines.map(line => `<p>${linkedText(line)}</p>`).join('')
}

export function updateVisitorGuide(guide, kind, suffix, html, plainText) {
  // Synchronise only the edited language's legacy fallback, including an explicit clear.
  // Keeping the rest of guide is essential: hidden fields and translations must survive.
  return { ...guide, [`${kind}Html${suffix}`]: html, [`${kind}${suffix}`]: plainText }
}
