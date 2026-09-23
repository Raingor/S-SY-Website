import Vue from 'vue'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import AdminApp from './AdminApp.vue'

Vue.use(ElementUI)

export function mountElementAdmin(element) {
  if (!element) return () => {}
  const app = new Vue({ render: (createElement) => createElement(AdminApp) })
  app.$mount()
  element.appendChild(app.$el)
  return () => {
    app.$destroy()
    if (app.$el.parentNode === element) element.removeChild(app.$el)
  }
}
