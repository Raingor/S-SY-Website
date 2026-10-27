<template>
  <div class="rich-text-control visitor-rich-text">
    <div class="rich-text-toolbar" role="toolbar" :aria-label="label+'排版工具'">
      <button v-for="tool in tools" :key="tool.command+tool.value" type="button" :title="tool.label" @mousedown.prevent @click="command(tool.command,tool.value)">{{ tool.label }}</button>
    </div>
    <div ref="editable" class="rich-text-editable" contenteditable="true" role="textbox" aria-multiline="true" :aria-label="label" @input="onInput" @blur="rememberSelection" @keyup="rememberSelection" @mouseup="rememberSelection" @paste="onPaste" @click="onLinkClick"/>
  </div>
</template>

<script>
export default {
  name: 'VisitorRichText',
  props: { value: { type: String, default: '' }, label: { type: String, required: true }, sanitize: { type: Function, required: true } },
  data() {
    return { lastEmitted: null, range: null, tools: [
      { command: 'formatBlock', value: 'p', label: '正文' },
      { command: 'formatBlock', value: 'h3', label: '小标题' },
      { command: 'bold', label: '粗体' }, { command: 'italic', label: '斜体' },
      { command: 'insertUnorderedList', label: '• 列表' }, { command: 'insertOrderedList', label: '1. 列表' },
      { command: 'createLink', label: '插入官网链接' }, { command: 'unlink', label: '取消链接' },
    ] }
  },
  mounted() { this.$refs.editable.innerHTML = this.sanitize(this.value) },
  watch: {
    value(value) {
      // Do not reassign innerHTML for our own input echo: doing so resets the caret/IME.
      if (value === this.lastEmitted) return
      const html = this.sanitize(value)
      if (this.$refs.editable.innerHTML !== html) {
        this.$refs.editable.innerHTML = html
        this.range = null
      }
    },
  },
  methods: {
    rememberSelection() {
      const selection = window.getSelection()
      if (selection?.rangeCount && this.$refs.editable.contains(selection.getRangeAt(0).commonAncestorContainer)) this.range = selection.getRangeAt(0).cloneRange()
    },
    onInput() {
      const element = this.$refs.editable
      let html = this.sanitize(element.innerHTML)
      const clean = document.createElement('div')
      clean.innerHTML = html
      if (!clean.textContent.trim() && !clean.querySelector('img')) html = ''
      if (html !== element.innerHTML) element.innerHTML = html
      this.lastEmitted = html
      this.$emit('input', html)
      this.rememberSelection()
    },
    command(command, value) {
      const element = this.$refs.editable
      element.focus()
      const selection = window.getSelection()
      if (this.range && element.contains(this.range.commonAncestorContainer)) {
        selection.removeAllRanges()
        selection.addRange(this.range)
      }
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
      if (html) document.execCommand('insertHTML', false, this.sanitize(html))
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
.el-admin .visitor-rich-text .rich-text-editable:empty:before { content: '直接输入内容，可使用段落、小标题、粗体、列表和官网链接'; }
</style>
