<template>
  <div class="rich-text-control visitor-rich-text">
    <div class="rich-text-toolbar" role="toolbar" :aria-label="label+'排版工具'">
      <button v-for="tool in tools" :key="tool.command+tool.value" type="button" :title="tool.label" :disabled="tool.command==='undo' ? !canUndo : tool.command==='redo' ? !canRedo : false" :aria-pressed="isToggle(tool) ? isActive(tool) : undefined" :class="{ 'is-active': isActive(tool) }" @mousedown.prevent="rememberSelection" @click="command(tool.command,tool.value)">{{ tool.label }}</button>
    </div>
    <div ref="editable" class="rich-text-editable" contenteditable="true" role="textbox" aria-multiline="true" :aria-label="label" @input="onInput" @focus="rememberSelection" @blur="rememberSelection" @keyup="rememberSelection" @mouseup="rememberSelection" @paste="onPaste" @drop.prevent @compositionstart="composing=true" @compositionend="finishComposition" @click="onLinkClick"/>
  </div>
</template>

<script>
export default {
  name: 'VisitorRichText',
  props: { value: { type: String, default: '' }, label: { type: String, required: true }, sanitize: { type: Function, required: true } },
  data() {
    return { lastEmitted: null, range: null, composing: false, canUndo: false, canRedo: false, activeCommands: {}, activeBlock: '', tools: [
      { command: 'undo', label: '撤销' }, { command: 'redo', label: '重做' },
      { command: 'formatBlock', value: 'p', label: '正文' },
      { command: 'formatBlock', value: 'h3', label: '小标题' },
      { command: 'bold', label: '粗体' }, { command: 'italic', label: '斜体' },
      { command: 'insertUnorderedList', label: '• 列表' }, { command: 'insertOrderedList', label: '1. 列表' },
      { command: 'createLink', label: '插入官网链接' }, { command: 'unlink', label: '取消链接' },
    ] }
  },
  mounted() {
    this.$refs.editable.innerHTML = this.editorHtml(this.value)
    document.addEventListener('selectionchange', this.rememberSelection)
  },
  beforeDestroy() { document.removeEventListener('selectionchange', this.rememberSelection) },
  watch: {
    value(value) {
      // Do not reassign innerHTML for our own input echo: doing so resets the caret/IME.
      if (value === this.lastEmitted) return
      const html = this.editorHtml(value)
      if (this.$refs.editable.innerHTML !== html) {
        this.$refs.editable.innerHTML = html
        this.range = null
        this.canUndo = false
        this.canRedo = false
        this.activeCommands = {}
        this.activeBlock = ''
      }
    },
  },
  methods: {
    editorHtml(value) {
      const clean = document.createElement('div')
      clean.innerHTML = this.sanitize(value)
      // Older flex-styled headings could trap paragraphs created by "正文".
      // Unwrap that invalid block nesting when opening; do not change valid headings.
      Array.from(clean.querySelectorAll('h2,h3')).reverse().forEach(heading => {
        if (!Array.from(heading.children).some(child => /^(P|DIV|H2|H3|UL|OL|BLOCKQUOTE)$/.test(child.tagName))) return
        // Empty blocks inside a flex heading vertically centred the visible text.
        // Repair only this malformed heading's leading edge, keeping normal spacing.
        const trimStart = parent => {
          while (parent.firstChild) {
            const first = parent.firstChild
            const hasText = first.textContent.replace(/[\u00a0\u200b]/g, '').trim()
            const hasImage = first.nodeType === 1 && (first.tagName === 'IMG' || first.querySelector('img'))
            if (!hasText && !hasImage) { first.remove(); continue }
            if (first.nodeType === 1 && /^(P|DIV|H2|H3|BLOCKQUOTE)$/.test(first.tagName)) trimStart(first)
            break
          }
        }
        trimStart(heading)
        heading.replaceWith(...heading.childNodes)
      })
      return clean.innerHTML
    },
    isToggle(tool) { return ['formatBlock', 'bold', 'italic', 'insertUnorderedList', 'insertOrderedList'].includes(tool.command) },
    isActive(tool) { return tool.command === 'formatBlock' ? this.activeBlock === tool.value : this.activeCommands[tool.command] === true },
    rememberSelection() {
      const selection = window.getSelection()
      if (!selection?.rangeCount || !this.$refs.editable.contains(selection.getRangeAt(0).commonAncestorContainer)) return
      this.range = selection.getRangeAt(0).cloneRange()
      this.activeBlock = String(document.queryCommandValue('formatBlock') || '').toLowerCase().replace(/[<>]/g, '')
      this.activeCommands = Object.fromEntries(['bold', 'italic', 'insertUnorderedList', 'insertOrderedList'].map(command => [command, document.queryCommandState(command)]))
      this.canUndo = document.queryCommandEnabled('undo')
      this.canRedo = document.queryCommandEnabled('redo')
    },
    onInput() {
      if (this.composing) return
      const element = this.$refs.editable
      let html = this.sanitize(element.innerHTML)
      const clean = document.createElement('div')
      clean.innerHTML = html
      if (!clean.textContent.trim() && !clean.querySelector('img')) html = ''
      // Emit a sanitized copy, but leave the live DOM/caret/native undo stack intact.
      // Incoming values and pasted HTML are sanitized before entering the editor.
      this.lastEmitted = html
      this.$emit('input', html)
      this.rememberSelection()
    },
    finishComposition() { this.composing = false; this.onInput() },
    command(command, value) {
      const element = this.$refs.editable
      element.focus()
      const selection = window.getSelection()
      if (this.range && element.contains(this.range.commonAncestorContainer)) {
        selection.removeAllRanges()
        selection.addRange(this.range)
      }
      // Store semantic b/i markup rather than disposable style-only spans.
      if (command !== 'undo' && command !== 'redo') document.execCommand('styleWithCSS', false, false)
      if (command === 'createLink') {
        value = window.prompt('请输入官网 HTTPS 链接；小程序点击后复制到浏览器打开')?.trim()
        if (!value) return
        try {
          const url = new URL(value)
          if (url.protocol !== 'https:' || url.username || url.password) throw new Error('unsafe')
        } catch { this.$message.warning('请填写有效的 HTTPS 官网链接'); return }
        if (selection.isCollapsed) {
          const anchor = document.createElement('a')
          anchor.href = value
          anchor.textContent = value
          document.execCommand('insertHTML', false, anchor.outerHTML)
          this.onInput()
          return
        }
      }
      document.execCommand(command, false, value || null)
      this.onInput()
    },
    onPaste(event) {
      event.preventDefault()
      const data = event.clipboardData
      const html = data.getData('text/html')
      if (html) document.execCommand('insertHTML', false, this.editorHtml(html))
      else document.execCommand('insertText', false, data.getData('text/plain'))
      this.onInput()
    },
    onLinkClick(event) {
      if (event.target.closest('a')) event.preventDefault()
    },
  },
}
</script>

<style>
.el-admin .visitor-rich-text .rich-text-editable { min-height: 240px; max-height: 560px; overflow-y: auto; }
.el-admin .visitor-rich-text .rich-text-editable h2,
.el-admin .visitor-rich-text .rich-text-editable h3 { display: block; margin: 0 0 10px; padding: 0; border: 0; color: inherit; font-family: inherit; font-size: 16px; font-weight: 500; line-height: 1.6; letter-spacing: normal; }
.el-admin .visitor-rich-text .rich-text-editable strong,
.el-admin .visitor-rich-text .rich-text-editable b { display: inline; font-weight: 700; }
.el-admin .visitor-rich-text .rich-text-editable em,
.el-admin .visitor-rich-text .rich-text-editable i { font-style: italic; }
.el-admin .visitor-rich-text .rich-text-toolbar button.is-active { border-color: #b9d8d5; background: #e9f5f3; color: #087f7a; }
.el-admin .visitor-rich-text .rich-text-toolbar button:disabled { opacity: .4; cursor: default; }
.el-admin .visitor-rich-text .rich-text-editable:empty:before { content: '直接输入内容，可使用段落、小标题、粗体、列表和官网链接'; }
</style>
