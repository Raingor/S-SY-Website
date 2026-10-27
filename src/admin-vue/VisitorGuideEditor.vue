<template>
  <div class="visitor-guide-editor">
    <div class="visitor-guide-intro">
      <span>只维护前台使用的四项信息，其他历史内容已隐藏并保留。</span>
      <el-select v-model="suffix" size="small" aria-label="参观指南编辑语种">
        <el-option label="简体中文" value=""/><el-option label="繁體中文" value="Tw"/><el-option label="English" value="En"/>
      </el-select>
    </div>
    <el-alert title="支持正文、小标题、粗体、列表与官网链接；排版操作可撤销或重做，也可使用 Ctrl/Cmd+Z。小程序点击官网链接后提示：已复制，请在浏览器打开。修改或上传后须保存景点。" type="info" :closable="false" show-icon/>
    <section v-for="(section,index) in sections" :key="section.key" class="visitor-guide-section" :data-visitor-kind="section.key">
      <h3><small>0{{ index+1 }}</small>{{ section.title }}</h3>
      <slot v-if="section.key==='map'" name="map"/>
      <el-form-item :label="section.key==='map' ? '地图文字说明' : section.title+'正文'">
        <VisitorRichText :key="section.key+suffix" :label="section.title" :value="html(section.key)" :sanitize="sanitize" @input="update(section.key,$event)"/>
      </el-form-item>
      <template v-if="section.key==='map'">
        <el-form-item label="地图 HTTPS 链接（可选）"><el-input :value="guide.mapUrl" @input="setField('mapUrl',$event)" placeholder="https://…"/></el-form-item>
        <el-form-item label="官网来源名称（可选）"><el-input :value="guide['sourceTitle'+suffix]" @input="setField('sourceTitle'+suffix,$event)"/></el-form-item>
        <el-form-item label="官网来源 HTTPS 链接（可选）"><el-input :value="guide.sourceUrl" @input="setField('sourceUrl',$event)" placeholder="https://…"/></el-form-item>
        <el-form-item label="最后核对日期（可选）"><el-date-picker :value="guide.verifiedAt" value-format="yyyy-MM-dd" @input="setField('verifiedAt',$event || '')"/></el-form-item>
      </template>
    </section>
  </div>
</template>

<script>
import VisitorRichText from './VisitorRichText.vue'
import { visitorGuideSections, visitorGuideHtml, updateVisitorGuide } from './visitor-guide-editor.mjs'

export default {
  name: 'VisitorGuideEditor',
  components: { VisitorRichText },
  props: { guide: { type: Object, required: true }, sanitize: { type: Function, required: true } },
  data() { return { suffix: '', sections: visitorGuideSections } },
  methods: {
    html(kind) { return visitorGuideHtml(this.guide, kind, this.suffix) },
    setField(key, value) { this.$emit('input', { ...this.guide, [key]: value }) },
    update(kind, html) {
      const element = document.createElement('div')
      element.innerHTML = html
      element.querySelectorAll('br').forEach(node => node.replaceWith(document.createTextNode('\n')))
      element.querySelectorAll('p,div,h2,h3,li,blockquote').forEach(node => node.appendChild(document.createTextNode('\n')))
      const plainText = element.textContent.replace(/\n{3,}/g, '\n\n').trim()
      this.$emit('input', updateVisitorGuide(this.guide, kind, this.suffix, html, plainText))
    },
  },
}
</script>

<style>
.el-admin .visitor-guide-editor { width: 100%; }
.el-admin .visitor-guide-intro { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; color: #65777c; font-size: 13px; }
.el-admin .visitor-guide-intro .el-select { width: 150px; }
.el-admin .visitor-guide-section { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e3ecec; }
.el-admin .visitor-guide-section > h3 { display: flex; align-items: center; gap: 12px; margin: 0 0 18px; color: #25464d; font-size: 18px; }
.el-admin .visitor-guide-section > h3 small { color: #168c88; font-size: 12px; letter-spacing: 1px; }
.el-admin .visitor-guide-section .el-form-item { margin-bottom: 18px; }
</style>
