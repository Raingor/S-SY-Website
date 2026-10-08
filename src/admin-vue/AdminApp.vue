<template>
  <div class="el-admin">
    <div v-if="!token" class="login-screen">
      <el-card class="login-card">
        <div class="brand-mark">SY</div><span class="eyebrow">GREECE TRAVEL BUTLER</span>
        <h1>网站管理后台</h1><p>管理路线、目的地、预约与小程序资料</p>
        <el-form @submit.native.prevent="login">
          <el-form-item label="管理员密码"><el-input v-model="password" type="password" show-password @keyup.enter.native="login" /></el-form-item>
          <el-button type="primary" class="login-submit" :loading="busy" @click="login">进入后台</el-button>
          <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
        </el-form>
      </el-card>
    </div>
    <el-container v-else class="admin-layout">
      <el-aside width="232px" class="admin-aside">
        <div class="brand-lockup"><span class="brand-mark">SY</span><span><b>希腊旅行管家</b><small>CONTENT ADMIN</small></span></div>
        <el-menu ref="sideMenu" :default-active="active" :default-openeds="activeGroupLabel?[activeGroupLabel]:[]" unique-opened class="side-menu" background-color="#20222a" text-color="#aeb3bd" active-text-color="#fff" @select="selectMenu">
          <template v-for="group in menuGroups">
            <el-menu-item-group v-if="group.label === '共同数据'" :key="group.label" :title="group.label">
              <el-menu-item v-for="item in group.items" :key="item[0]" :index="item[0]"><i :class="item[2]"></i><span slot="title">{{ item[1] }}</span></el-menu-item>
            </el-menu-item-group>
            <el-submenu v-else :key="group.label" :index="group.label">
              <template slot="title"><span>{{ group.label }}</span></template>
              <el-menu-item v-for="item in group.items" :key="item[0]" :index="item[0]"><i :class="item[2]"></i><span slot="title">{{ item[1] }}</span></el-menu-item>
            </el-submenu>
          </template>
        </el-menu>
        <div class="aside-foot"><el-tag size="mini" type="success">API 已连接</el-tag><el-button type="text" icon="el-icon-switch-button" @click="logout">退出</el-button></div>
      </el-aside>
      <el-container class="admin-main">
        <el-header class="admin-header" height="72px">
          <div><span class="eyebrow">GREECE TRAVEL BUTLER / ADMIN</span><h1>{{ currentMenu.label }}</h1></div>
          <div class="header-actions"><el-button icon="el-icon-notebook-2" @click="guideVisible=true">后台入口指南</el-button><el-button icon="el-icon-refresh" @click="reloadAll">重新加载</el-button><el-button icon="el-icon-view" @click="openWebsite">查看前台</el-button></div>
        </el-header>
        <main class="admin-content" v-loading="batchBusy" element-loading-text="正在处理勾选景点，请勿重复操作">
          <el-card v-if="active==='attractions'&&publicationResults.length" shadow="never" class="publication-panel" aria-live="polite">
            <div class="publication-heading"><div><strong>公开展示状态核验</strong><p>{{ apiOrigin }} · {{ publicationCheckedAt || '核验中…' }}</p><small>仅核对同环境 Website 公开 API，不代表小程序缓存已刷新；不会重启服务。</small></div><el-button size="small" icon="el-icon-refresh" :disabled="busy||batchBusy||publicationChecking" @click="verifyAttractions(publicationResults.filter(row=>!row.saveError),publicationResults.filter(row=>row.saveError))">重新核验</el-button></div>
            <el-table :data="publicationResults" size="small" max-height="240" class="publication-table">
              <el-table-column label="景点" min-width="200"><template slot-scope="{row}">{{ row.name || row.id }}<small class="publication-id">{{ row.id }}</small></template></el-table-column>
              <el-table-column label="预期" width="90"><template slot-scope="{row}">{{ row.status==='published'?'已公开':'已下架' }}</template></el-table-column>
              <el-table-column label="保存结果" min-width="140"><template slot-scope="{row}"><span :class="{'danger-text':row.saveError}">{{ row.saveError || '后台已保存' }}</span></template></el-table-column>
              <el-table-column label="公开 API" min-width="220"><template slot-scope="{row}"><el-tag size="mini" :type="row.state==='matched'?'success':row.state==='mismatch'?'danger':'warning'">{{ publicationLabel(row) }}</el-tag><small class="publication-id">{{ row.message }}</small></template></el-table-column>
            </el-table>
          </el-card>
          <template v-if="!editor">
            <section v-if="active === 'overview'">
              <el-row :gutter="16" class="stat-grid"><el-col v-for="card in statCards" :key="card.label" :xs="12" :sm="8" :lg="6"><el-card shadow="hover" class="stat-card"><span>{{ card.label }}</span><strong>{{ card.value }}</strong></el-card></el-col></el-row>
              <el-card shadow="never" class="section-card"><div slot="header" class="card-heading"><div><span class="eyebrow">PAYMENT / MEMBERSHIP</span><h2>支付经营概览</h2></div><el-button icon="el-icon-refresh" @click="loadAll">重新加载</el-button></div>
                <el-row :gutter="12" class="commerce-windows"><el-col v-for="window in commerceRows" :key="window.label" :xs="24" :sm="8"><el-card shadow="never" class="commerce-window"><span>{{ window.label }}</span><el-row :gutter="8"><el-col :span="12"><small>订单量</small><b>{{ window.orderCount || 0 }}</b></el-col><el-col :span="12"><small>已支付</small><b>{{ window.paidOrderCount || 0 }}</b></el-col><el-col :span="12"><small>终身会员</small><b>{{ window.memberCount || 0 }}</b></el-col><el-col :span="12"><small>支付金额</small><b>{{ money(window.amount) }}</b></el-col></el-row></el-card></el-col></el-row>
              </el-card>
              <el-card shadow="never" class="section-card"><div slot="header" class="card-heading"><div><span class="eyebrow">LATEST LEADS</span><h2>最近线索</h2></div><el-button type="primary" @click="active='leads'">查看全部</el-button></div>
                <el-table v-if="data.leads.length" :data="data.leads.slice(-5).reverse()" border stripe size="small" class="admin-data-table overview-leads-table"><el-table-column prop="destination" label="目的地 / 主题" min-width="180"><template slot-scope="{row}">{{ row.destination || '未填写主题' }}</template></el-table-column><el-table-column prop="contact" label="联系方式" min-width="160"><template slot-scope="{row}">{{ row.contact || '—' }}</template></el-table-column><el-table-column prop="createdAt" label="提交时间" min-width="170"><template slot-scope="{row}">{{ dateTime(row.createdAt) }}</template></el-table-column><el-table-column prop="status" label="状态" width="125"><template slot-scope="{row}"><el-tag size="mini" :type="statusTone(row.status)">{{ statusLabel(row.status) }}</el-tag></template></el-table-column></el-table><el-empty v-else description="暂无咨询线索"/>
              </el-card>
            </section>
            <section v-else-if="active === 'settings'">
              <el-card shadow="never" class="section-card"><div slot="header" class="card-heading"><div><span class="eyebrow">SITE SETTINGS / SEO</span><h2>站点与 SEO 配置</h2></div></div>
                <el-alert title="配置保存后会同步用于网站页面元信息与分享预览。" type="info" :closable="false" show-icon />
                <el-form label-position="top" class="settings-form">
                  <el-tabs v-model="settingsTab" type="border-card" class="settings-tabs">
                    <el-tab-pane v-for="tab in settingTabs" :key="tab.name" :name="tab.name" :label="tab.label">
                      <p class="settings-tab-note">{{ tab.description }}</p>
                      <div v-if="tab.fields.length" class="form-grid">
                        <el-form-item v-for="field in tab.fields" :key="field.key" :label="field.label" :class="{ 'full-field': field.full }">
                          <el-input v-if="field.type==='textarea'" v-model="settings[field.key]" type="textarea" :rows="3"/>
                          <el-select v-else-if="field.type==='select'" v-model="settings[field.key]"><el-option label="允许收录" value="index,follow"/><el-option label="暂不收录" value="noindex,nofollow"/></el-select>
                          <el-switch v-else-if="field.type==='switch'" v-model="settings[field.key]" active-text="正常访问" inactive-text="维护中"/>
                              <div v-else-if="field.type==='image'" class="image-editor"><div v-if="settings.ogImage" class="image-preview"><img :src="assetUrl(settings.ogImage)" alt="OG 分享图预览"/></div><div class="image-actions"><el-upload action="#" :show-file-list="false" :http-request="(req)=>uploadImage(req,'og')"><el-button icon="el-icon-upload">{{ settings.ogImage ? '重新上传图片' : '上传分享图片' }}</el-button></el-upload><el-button v-if="settings.ogImage" type="danger" plain size="small" icon="el-icon-delete" @click="removeSettingsImage">删除图片</el-button></div><small class="image-guidance">{{ imageGuidance('settings',field.key) }}</small></div>
                          <el-input v-else v-model="settings[field.key]"/>
                        </el-form-item>
                      </div>
                      <div v-else-if="tab.name==='knowledge'" class="form-grid">
                        <el-form-item label="讲解试听时长（秒）"><el-input-number v-model="settings.miniprogramKnowledge.trialSeconds" :min="0" :max="3600"/></el-form-item>
                        <el-form-item label="单景点永久讲解商品名称"><el-input v-model="settings.miniprogramKnowledge.products.attraction.name"/></el-form-item>
                        <el-form-item label="单景点讲解价格（元）"><el-input-number v-model="settings.miniprogramKnowledge.products.attraction.price" :min="0" :step="0.01" :precision="2"/></el-form-item>
                        <el-form-item label="单景点讲解商品状态"><el-switch v-model="settings.miniprogramKnowledge.products.attraction.enabled" active-text="启用" inactive-text="停用"/></el-form-item>
                        <el-form-item label="单景点讲解币种"><el-input v-model="settings.miniprogramKnowledge.products.attraction.currency"/></el-form-item>
                      </div>
                      <div v-else-if="tab.name==='membership'" class="form-grid">
                        <el-form-item label="终身会员商品名称"><el-input v-model="settings.miniprogramKnowledge.products.membership.name"/></el-form-item>
                        <el-form-item label="终身会员价格（元）"><el-input-number v-model="settings.miniprogramKnowledge.products.membership.price" :min="0" :step="0.01" :precision="2"/></el-form-item>
                        <el-form-item label="终身会员商品状态"><el-switch v-model="settings.miniprogramKnowledge.products.membership.enabled" active-text="启用" inactive-text="停用"/></el-form-item>
                        <el-form-item label="终身会员币种"><el-input v-model="settings.miniprogramKnowledge.products.membership.currency"/></el-form-item>
                      </div>
                      <template v-if="tab.name==='site'">
                        <section class="settings-structured">
                          <div class="settings-structured-head"><div><h3>奢享体验内容</h3><p>每条体验使用固定 ID；服务要点可逐条添加。</p></div><el-button plain size="small" icon="el-icon-plus" @click="settings.experiences.push(newExperience())">新增体验</el-button></div>
                          <div v-for="(experience,index) in settings.experiences" :key="index" class="array-entry">
                            <div class="array-entry-head"><b>体验 {{ index+1 }}</b><el-button type="text" class="danger-text" @click="settings.experiences.splice(index,1)">移除</el-button></div>
                            <div class="array-fields">
                              <el-form-item label="体验 ID"><el-input v-model="experience.id" placeholder="如 private-yacht"/></el-form-item>
                              <el-form-item label="标题"><el-input v-model="experience.title"/></el-form-item>
                              <el-form-item label="分类标签"><el-input v-model="experience.label"/></el-form-item>
                              <el-form-item label="英文名称"><el-input v-model="experience.nameEn"/></el-form-item>
                              <el-form-item label="副标题"><el-input v-model="experience.subtitle"/></el-form-item>
                              <el-form-item label="分享类型"><el-input v-model="experience.shareType" placeholder="可选，如 yacht"/></el-form-item>
                              <el-form-item label="介绍" class="full-field"><el-input v-model="experience.desc"/></el-form-item>
                              <el-form-item label="图片路径" class="full-field"><el-input v-model="experience.image" placeholder="如 images/yacht.webp"/><small class="field-help">建议引用 1200×900 px（4:3）横图；服务卡片使用 cover 裁切，主体居中。此处填写已有图片路径，不上传文件。</small></el-form-item>
                              <el-form-item label="预订说明" class="full-field"><el-input v-model="experience.notice"/></el-form-item>
                              <el-form-item label="发布状态"><el-select v-model="experience.status"><el-option label="发布" value="published"/><el-option label="下架" value="unpublished"/></el-select></el-form-item>
                              <el-form-item label="启用"><el-switch :value="experience.enabled!==false" @change="value=>$set(experience,'enabled',value)"/></el-form-item>
                            </div>
                            <div class="settings-list-head"><b>服务要点</b><el-button plain size="mini" icon="el-icon-plus" @click="experience.points.push('')">添加要点</el-button></div>
                            <div v-for="(point,pointIndex) in experience.points" :key="pointIndex" class="settings-list-row"><el-input :value="settingListText(point)" @input="value=>updateSettingListText(experience.points,pointIndex,value)"/><el-button type="text" class="danger-text" @click="experience.points.splice(pointIndex,1)">移除</el-button></div>
                          </div>
                        </section>
                        <section class="settings-structured">
                          <div class="settings-structured-head"><div><h3>出行工具公开资料</h3><p>汇率与天气为人工维护的参考数据，不会自动更新。</p></div></div>
                          <h4>签证参考</h4>
                          <div class="array-fields">
                            <el-form-item label="标题"><el-input v-model="settings.travelTools.visa.title"/></el-form-item>
                            <el-form-item label="参考来源链接"><el-input v-model="settings.travelTools.visa.url" placeholder="https://"/></el-form-item>
                            <el-form-item label="摘要" class="full-field"><el-input v-model="settings.travelTools.visa.summary"/></el-form-item>
                          </div>
                          <div class="settings-list-head"><b>签证材料清单</b><el-button plain size="mini" icon="el-icon-plus" @click="settings.travelTools.visa.checklist.push('')">添加项目</el-button></div>
                          <div v-for="(item,index) in settings.travelTools.visa.checklist" :key="index" class="settings-list-row"><el-input :value="settingListText(item)" @input="value=>updateSettingListText(settings.travelTools.visa.checklist,index,value)"/><el-button type="text" class="danger-text" @click="settings.travelTools.visa.checklist.splice(index,1)">移除</el-button></div>
                          <h4>汇率参考</h4>
                          <div class="array-fields">
                            <el-form-item label="1 EUR 约合人民币"><el-input-number v-model="settings.travelTools.eurCny" :min="0" :step="0.01" :precision="2"/></el-form-item>
                            <el-form-item label="汇率更新时间"><el-input v-model="settings.travelTools.rateUpdatedAt" placeholder="YYYY-MM-DD"/></el-form-item>
                            <el-form-item label="汇率来源" class="full-field"><el-input v-model="settings.travelTools.rateSource"/></el-form-item>
                          </div>
                          <div class="settings-list-head"><b>天气参考城市</b><el-button plain size="mini" icon="el-icon-plus" @click="settings.travelTools.weatherCities.push({name:'',temperature:'',condition:''})">添加城市</el-button></div>
                          <div v-for="(city,index) in settings.travelTools.weatherCities" :key="index" class="array-entry">
                            <div class="array-entry-head"><b>城市 {{ index+1 }}</b><el-button type="text" class="danger-text" @click="settings.travelTools.weatherCities.splice(index,1)">移除</el-button></div>
                            <div class="array-fields">
                              <el-form-item label="城市 ID（可选）"><el-input v-model="city.id"/></el-form-item>
                              <el-form-item label="城市名称"><el-input v-model="city.name"/></el-form-item>
                              <el-form-item label="参考温度"><el-input :value="weatherTemperature(city)" placeholder="如 22°C" @input="value=>updateWeatherTemperature(city,value)"/></el-form-item>
                              <el-form-item label="天气状况"><el-input v-model="city.condition"/></el-form-item>
                            </div>
                          </div>
                          <div class="array-fields"><el-form-item label="天气更新时间" class="full-field"><el-input v-model="settings.travelTools.weatherUpdatedAt" placeholder="YYYY-MM-DD"/></el-form-item></div>
                        </section>
                      </template>
                    </el-tab-pane>
                  </el-tabs>
                  <div class="form-actions"><el-button type="primary" icon="el-icon-check" :loading="busy" @click="saveSettings">保存配置</el-button></div>
                </el-form>
              </el-card>
            </section>
            <section v-else-if="active === 'attractionDetailPage'">
              <el-card shadow="never" class="section-card" v-if="detailPage">
                <div slot="header" class="card-heading"><div><span class="eyebrow">ATTRACTION DETAIL / SHARED CONTENT</span><h2>景点详情页配置</h2></div><el-button type="primary" icon="el-icon-check" :loading="busy" @click="saveDetailPage">保存配置</el-button></div>
                <el-alert title="仅补足缺失的景点内容；真实已发布资料、FAQ 与音频始终优先。演示路线及讲解条目不可播放、购买或解锁。" type="info" :closable="false" show-icon class="banner-note"/>
                <el-tabs v-model="detailTab" type="border-card" class="settings-tabs">
                  <el-tab-pane label="板块标题与副标题" name="sections">
                    <el-form label-position="top">
                      <div v-for="section in detailSectionKeys" :key="section.key" class="settings-structured">
                        <h3>{{ section.label }}</h3>
                        <div class="detail-locale-grid" v-for="locale in detailLocales" :key="locale.key">
                          <el-form-item :label="locale.label + '标题'"><el-input v-model="detailPage.sections[section.key].label[locale.key]"/></el-form-item>
                          <el-form-item :label="locale.label + '副标题'"><el-input v-model="detailPage.sections[section.key].subtitle[locale.key]"/></el-form-item>
                        </div>
                        <div v-if="section.key==='visitor'" class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label + '参观提示'"><el-input v-model="detailPage.sections.visitor.notice[locale.key]" type="textarea" :rows="2"/></el-form-item></div>
                      </div>
                      <div class="settings-structured"><h3>参观指南内页标题</h3><div v-for="section in detailVisitorKeys" :key="section.key" class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="section.label + ' · ' + locale.label"><el-input v-model="detailPage.visitorSections[section.key][locale.key]"/></el-form-item></div></div>
                    </el-form>
                  </el-tab-pane>
                  <el-tab-pane label="语音使用说明" name="audioHow">
                    <el-form label-position="top">
                      <div v-for="(step,index) in detailPage.audioHow.steps" :key="index" class="settings-structured"><h3>步骤 {{ index+1 }}</h3><div class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label"><el-input v-model="step[locale.key]" type="textarea" :rows="2"/></el-form-item></div></div>
                      <div class="settings-structured"><h3>使用提醒</h3><div class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label"><el-input v-model="detailPage.audioHow.note[locale.key]" type="textarea" :rows="3"/></el-form-item></div></div>
                    </el-form>
                  </el-tab-pane>
                  <el-tab-pane label="缺项演示模板" name="demo">
                    <el-alert title="请只填写安全的通用提示，不写具体票价、时间或地图事实；演示 FAQ 用“问题？答案”格式。" type="warning" :closable="false" show-icon class="banner-note"/>
                    <el-form label-position="top">
                      <div class="settings-structured"><h3>概览摘要</h3><div class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label"><el-input v-model="detailPage.demo.summary[locale.key]" type="textarea" :rows="2"/></el-form-item></div></div>
                      <div v-for="field in detailExhibitFields" :key="field.key" class="settings-structured"><h3>讲解点 · {{ field.label }}</h3><div class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label"><el-input v-model="detailPage.demo.exhibit[field.keys[locale.key]]" type="textarea" :rows="2"/></el-form-item></div></div>
                      <div v-for="field in detailHighlightFields" :key="field.key" class="settings-structured"><h3>亮点 · {{ field.label }}</h3><div class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label"><el-input v-model="detailPage.demo.highlight[field.keys[locale.key]]" type="textarea" :rows="2"/></el-form-item></div></div>
                      <div v-for="field in detailVisitorKeys" :key="field.key" class="settings-structured"><h3>参观指南 · {{ field.label }}</h3><div class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label"><el-input v-model="detailPage.demo.visitorInfo[field.key][locale.key]" type="textarea" :rows="2"/></el-form-item></div></div>
                      <div v-for="field in detailRouteFields" :key="field.key" class="settings-structured"><h3>路线 · {{ field.label }}</h3><div class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label"><el-input v-model="detailPage.demo.route[field.keys[locale.key]]" type="textarea" :rows="2"/></el-form-item></div></div>
                      <div v-for="(audio,index) in detailPage.demo.audioGuides" :key="audio.category" class="settings-structured"><h3>{{ detailAudioCategoryLabels[audio.category] }}</h3><div v-for="field in detailAudioFields" :key="field.key" class="detail-locale-grid"><el-form-item v-for="locale in detailLocales" :key="locale.key" :label="locale.label + field.label"><el-input v-model="detailPage.demo.audioGuides[index][field.keys[locale.key]]" type="textarea" :rows="2"/></el-form-item></div></div>
                    </el-form>
                  </el-tab-pane>
                </el-tabs>
                <div class="form-actions"><el-button type="primary" icon="el-icon-check" :loading="busy" @click="saveDetailPage">保存配置</el-button></div>
              </el-card>
              <el-empty v-else description="正在加载景点详情配置"/>
            </section>
            <section v-else-if="active === 'vehicleService'">
              <el-card shadow="never" class="section-card" v-if="vehicleView === 'config' && vehicleService">
                <div slot="header" class="card-heading"><div><span class="eyebrow">VEHICLE SERVICE / CONFIG</span><h2>在地用车配置</h2><p class="admin-muted">配置页面文案与车型 / 时长 / 人数选项；保存后返回询盘列表。</p></div><div class="header-actions"><el-button icon="el-icon-arrow-left" @click="vehicleView='list'">返回询盘列表</el-button><el-button type="primary" icon="el-icon-check" :loading="busy" @click="saveVehicleService">保存配置</el-button></div></div>
                <el-alert title="只维护简体：繁体 / 英文缺失时服务端自动回退简体，公开接口仍返回三语字段。保存校验：页面标题 / 副标题 / 页面说明（简体）必填，选项非空且组内排序唯一。小程序界面固定文案不在此维护。" type="info" :closable="false" show-icon class="banner-note"/>
              <el-form label-position="top">
                  <el-tabs v-model="vehicleConfigTab" class="vehicle-config-tabs">
                    <el-tab-pane label="页面内容" name="page">
                  <div class="settings-structured"><h3>基础</h3>
                    <el-form-item label="启用状态"><el-switch v-model="vehicleService.enabled" active-text="启用" inactive-text="停用"/></el-form-item>
                    <el-form-item label="排序"><el-input-number v-model="vehicleService.sort" :min="1"/></el-form-item>
                  </div>
                  <div v-for="field in [{key:'title',label:'页面标题',area:false},{key:'subtitle',label:'副标题',area:false},{key:'description',label:'页面说明',area:true},{key:'note',label:'注意事项',area:true},{key:'disclaimer',label:'免责说明（可选）',area:true}]" :key="field.key" class="settings-structured">
                    <h3>{{ field.label }}</h3>
                    <el-form-item label="简体"><el-input v-if="field.area" v-model="vehicleService[field.key]" type="textarea" :rows="2"/><el-input v-else v-model="vehicleService[field.key]"/></el-form-item>
                  </div>
                  <div class="settings-structured"><h3>服务标签</h3>
                    <el-form-item label="简体（每行一条）"><el-input v-for="(tag,index) in (vehicleService.tags||[])" :key="index" :value="vehicleService.tags[index]" class="vehicle-tag-input" placeholder="标签内容" @input="value=>$set(vehicleService.tags,index,value)"/><small v-if="!(vehicleService.tags||[]).length" class="field-help">暂无标签</small></el-form-item>
                    <div class="form-actions"><el-button plain size="small" icon="el-icon-plus" @click="addVehicleTag">添加一条标签</el-button><el-button v-if="(vehicleService.tags||[]).length" plain size="small" type="danger" icon="el-icon-delete" @click="removeVehicleTag((vehicleService.tags||[]).length-1)">删除最后一条</el-button></div>
                  </div>
                  <div class="settings-structured"><h3>页面图片（可多张）</h3>
                    <div v-for="(image,index) in (vehicleService.images||[])" :key="image+index" class="image-editor"><div class="image-preview"><img :src="assetUrl(image)" :alt="'图片 '+(index+1)"/></div><div class="image-actions"><el-button type="danger" plain size="small" icon="el-icon-delete" @click="vehicleService.images.splice(index,1)">删除图片</el-button></div></div>
                    <el-upload action="#" :show-file-list="false" :http-request="uploadVehicleImage"><el-button icon="el-icon-upload">选择图片上传</el-button></el-upload>
                    <small class="image-guidance">选填 · 建议 1200×900 px（4:3 通用横图）；当前小程序用车预约页尚未展示这组配图，暂不按前台容器裁切。若后续增加展示，请再按实际图片框比例调整。支持 PNG / JPG / WebP，单张最大 6MB。</small>
                  </div>
                    </el-tab-pane>
                    <el-tab-pane label="预约表单" name="form">
                  <div class="settings-structured"><h3>表单文案（简体；留空则由小程序使用本地文案）</h3>
                    <div v-for="field in [{key:'title',label:'表单标题'},{key:'tip',label:'表单提示'},{key:'dateLabel',label:'日期标签'},{key:'durationLabel',label:'时长标签'},{key:'vehicleLabel',label:'车型标签'},{key:'peopleLabel',label:'人数标签'},{key:'routeLabel',label:'路线标签'},{key:'contactLabel',label:'联系方式标签'},{key:'submitLabel',label:'提交按钮文案'},{key:'routePlaceholder',label:'路线输入提示'},{key:'phonePlaceholder',label:'手机输入提示'},{key:'wechatPlaceholder',label:'微信输入提示'}]" :key="field.key" class="vehicle-form-field">
                      <el-form-item :label="field.label"><el-input v-model="vehicleService.form[field.key]"/></el-form-item>
                    </div>
                  </div>
                  <div class="settings-structured"><h3>表单开关与日期范围</h3>
                    <div class="vehicle-option-meta">
                      <el-form-item label="显示手机"><el-switch v-model="vehicleService.form.contactPhone"/></el-form-item>
                      <el-form-item label="显示微信"><el-switch v-model="vehicleService.form.contactWechat"/></el-form-item>
                      <el-form-item label="路线必填"><el-switch v-model="vehicleService.form.routeRequired"/></el-form-item>
                    </div>
                    <div class="vehicle-option-meta">
                      <el-form-item label="开始日期（today 或 YYYY-MM-DD）"><el-input v-model="vehicleService.form.dateStart" placeholder="today"/></el-form-item>
                      <el-form-item label="结束日期（可留空）"><el-input v-model="vehicleService.form.dateEnd" placeholder="YYYY-MM-DD"/></el-form-item>
                    </div>
                  </div>
                    </el-tab-pane>
                    <el-tab-pane label="车型与服务选项" name="options">
                  <div v-for="group in vehicleOptionGroups" :key="group.key" class="settings-structured">
                    <h3>{{ group.label }}选项</h3>
                    <div v-for="(option,index) in vehicleOption(group.key)" :key="index" class="array-entry">
                      <div class="array-entry-head"><b>{{ group.label }} {{ index+1 }}</b><span><el-button type="text" :disabled="index===0" @click="moveVehicleOption(group.key,index,-1)">上移</el-button><el-button type="text" :disabled="index===vehicleOption(group.key).length-1" @click="moveVehicleOption(group.key,index,1)">下移</el-button><el-button type="text" class="danger-text" @click="removeVehicleOption(group.key,index)">移除</el-button></span></div>
                      <el-form-item label="名称（简体）"><el-input v-model="option.label"/></el-form-item>
                      <div class="vehicle-option-meta"><el-form-item label="排序"><el-input-number v-model="option.sort" :min="1"/></el-form-item><el-form-item label="启用"><el-switch v-model="option.enabled"/></el-form-item><el-form-item label="稳定 ID（仅用于回传，不建议修改）"><el-input v-model="option.id"/></el-form-item></div>
                    </div>
                    <el-button plain icon="el-icon-plus" @click="addVehicleOption(group.key)">添加{{ group.label }}选项</el-button>
                  </div>
                    </el-tab-pane>
                  </el-tabs>
                </el-form>
                <div class="form-actions"><el-button icon="el-icon-arrow-left" @click="vehicleView='list'">返回询盘列表</el-button><el-button type="primary" icon="el-icon-check" :loading="busy" @click="saveVehicleService">保存配置</el-button></div>
              </el-card>
              <el-card shadow="never" class="section-card" v-if="vehicleView !== 'config'">
                <div slot="header" class="card-heading"><div><span class="eyebrow">VEHICLE SERVICE / INQUIRIES</span><h2>用车询盘</h2><p class="admin-muted">小程序与官网提交的用车咨询（leadType=vehicle-consultation）。</p></div><div class="header-actions"><el-button type="primary" icon="el-icon-setting" @click="vehicleConfigTab='page';vehicleView='config'">配置在地用车</el-button><el-button icon="el-icon-refresh" @click="loadAll">重新加载</el-button><span class="admin-muted">共 {{ vehicleInquiries.length }} 条</span></div></div>
                <el-table :data="vehicleInquiries" size="small" border stripe style="width:100%">
                  <el-table-column label="提交时间" width="170"><template slot-scope="{row}">{{ dateTime(row.createdAt) }}</template></el-table-column>
                  <el-table-column prop="vehicleDate" label="用车日期" width="120"/>
                  <el-table-column prop="vehicleNeed" label="用车场景" min-width="200"/>
                  <el-table-column prop="travelers" label="随行人数" width="120"/>
                  <el-table-column prop="contact" label="联系方式" min-width="150"/>
                  <el-table-column label="状态" width="140"><template slot-scope="{row}"><el-select :value="row.status||'new'" size="mini" class="status-inline" @change="value=>updateVehicleInquiryStatus(row,value)"><el-option label="待处理" value="new"/><el-option label="已联系" value="contacted"/><el-option label="已报价" value="quoted"/><el-option label="已完成" value="closed"/></el-select></template></el-table-column>
                  <el-table-column label="操作" width="90" align="right"><template slot-scope="{row}"><el-button size="mini" type="danger" plain @click="deleteVehicleInquiry(row)">删除</el-button></template></el-table-column>
                </el-table>
                <div v-if="!vehicleInquiries.length" class="admin-muted" style="padding:12px 0">暂无用车询盘。</div>
              </el-card>
              <el-empty v-if="vehicleView === 'config' && !vehicleService" description="正在加载在地用车配置"/>
            </section>
            <section v-else class="list-page">
              <el-card shadow="never" class="section-card">
                <div slot="header" class="card-heading"><div><span class="eyebrow">{{ currentMenu.eyebrow || 'CONTENT MANAGEMENT' }}</span><h2>{{ currentMenu.label }}</h2></div><div class="card-actions"><el-input v-model="filterText" clearable prefix-icon="el-icon-search" placeholder="筛选当前列表" class="list-search"/><el-button icon="el-icon-refresh" @click="loadAll">重新加载</el-button><el-button v-if="currentMenu.addLabel" type="primary" icon="el-icon-plus" @click="startCreate">{{ currentMenu.addLabel }}</el-button></div></div>
                <el-alert v-if="active==='destinations'" title="新增目的地没显示？点击每行名称下的「关联景点」：先选城市，再勾选至少一个已发布景点，最后保存。仅填写名称、图片并发布还不够。" type="info" :closable="false" show-icon class="banner-note"/>
                <el-alert v-if="active==='cities'" title="这里维护城市主数据，不会根据目的地自动新增城市或价格。缺少城市时请核对城市 ID、名称、国家、发布状态和真实讲解价格；未确认价格可暂存草稿。" type="info" :closable="false" show-icon class="banner-note"/>
                <el-alert v-if="active==='miniprogramBanners'" title="网站与小程序首页共用同一组 Banner；在任一入口新增、编辑或下架，都会同步影响两端。" type="info" :closable="false" show-icon class="banner-note"/>
                <el-alert v-if="active==='miniprogramServiceEntries'" title="与首页 Banner 完全独立。服务入口有独立列表、图标与三语文案；仅支持六个固定入口，点击跳转仍由小程序端控制。" type="info" :closable="false" show-icon class="banner-note"/>
                <el-alert v-if="active==='heritageGuideBanners'" title="仅用于小程序古迹讲解页轮播；与 Website 首页 Banner、小程序首页 Banner 完全独立。发布后由公开内容 API 的 heritageGuideBanners 字段提供。" type="info" :closable="false" show-icon class="banner-note"/>
                <el-alert v-if="currentMenu.miniProgramDisplay" :title="'小程序展示位置：'+currentMenu.miniProgramDisplay" type="info" :closable="false" show-icon class="banner-note module-display-note"/>
                <div v-if="availableFilters.length" class="list-filter-toolbar">
                  <div class="list-filter-controls"><template v-for="filter in availableFilters">
                    <el-date-picker v-if="filter.type==='daterange'" :key="filter.key" v-model="filters[filter.key]" type="daterange" class="list-filter-date" size="small" value-format="yyyy-MM-dd" range-separator="至" :start-placeholder="filter.label+'开始'" :end-placeholder="filter.label+'结束'" clearable/>
                    <div v-else-if="filter.type==='numberrange'" :key="filter.key" class="list-filter-number"><el-input :value="filters[filter.key][0] == null ? '' : filters[filter.key][0]" type="number" min="0" step="0.01" size="small" :placeholder="filter.label+'最低'" @input="value=>setNumberBound(filter.key,0,value)"/><span>至</span><el-input :value="filters[filter.key][1] == null ? '' : filters[filter.key][1]" type="number" min="0" step="0.01" size="small" :placeholder="filter.label+'最高'" @input="value=>setNumberBound(filter.key,1,value)"/></div>
                    <el-select v-else :key="filter.key" v-model="filters[filter.key]" class="list-filter-select" size="small" clearable :placeholder="'按'+filter.label+'筛选'"><el-option v-for="option in filter.options" :key="String(option.value)" :label="option.label" :value="option.value"/></el-select>
                  </template></div>
                  <div class="list-filter-summary"><span>筛选结果 <b>{{ filteredItems.length }}</b> / {{ items.length }}</span><el-button v-if="hasActiveFilters" type="text" icon="el-icon-refresh-left" @click="resetFilters">清空条件</el-button></div>
                </div>
                <div v-if="active==='attractions'" class="attraction-view-toolbar">
                  <span class="filter-toolbar-label">景点视图</span>
                  <el-radio-group v-model="attractionView" size="small"><el-radio-button label="list">现有列表</el-radio-button><el-radio-button label="destination">按目的地分组</el-radio-button></el-radio-group>
                  <el-select v-if="attractionView==='destination'" v-model="attractionDestinationFilter" clearable filterable size="small" class="attraction-destination-select" placeholder="筛选目的地（含未关联）">
                    <el-option v-for="option in attractionDestinationOptions" :key="option.value" :label="option.label" :value="option.value"/>
                  </el-select>
                  <div v-if="attractionView==='destination'" class="group-page-size"><span>每页</span><el-select :value="pageSize" size="mini" @change="changePageSize"><el-option v-for="size in pageSizes" :key="size" :label="size+' 条'" :value="size"/></el-select></div>
                </div>
                <div v-if="active==='attractions'&&attractionView==='list'" class="bulk-attraction-toolbar">
                  <span>已选当前页 <b>{{ selectedAttractionIds.length }}</b> 项</span>
                  <el-button size="small" type="primary" plain :disabled="!selectedAttractionIds.length||busy||batchBusy||publicationChecking" @click="batchAttractionStatus('published')">批量发布</el-button>
                  <el-button size="small" type="warning" plain :disabled="!selectedAttractionIds.length||busy||batchBusy||publicationChecking" @click="batchAttractionStatus('unpublished')">批量下架</el-button>
                  <el-button size="small" type="text" :disabled="batchBusy" @click="selectedAttractionIds=[]">清空勾选</el-button>
                  <small>仅处理勾选项；切页、筛选或重新加载后清空，不包含隐藏记录。</small>
                </div>
                <div v-if="active==='attractions'&&attractionView==='destination'" class="attraction-destination-groups">
                  <el-card v-for="group in visibleAttractionGroups" :key="group.key" shadow="never" class="attraction-destination-card">
                    <div slot="header" class="attraction-destination-heading"><div><strong>{{ group.title }}</strong><el-tag v-if="group.cityId" size="mini" effect="plain">cityId: {{ group.cityId }}</el-tag><el-tag v-if="group.destinationId" size="mini" type="info" effect="plain">destinationId: {{ group.destinationId }}</el-tag><span class="attraction-group-count">{{ group.items.length }} 个景点</span></div><div class="attraction-destination-actions"><el-button v-if="group.destinationId" size="mini" icon="el-icon-edit" @click="editDestinationGroup(group.destinationId)">维护关联</el-button><el-button size="mini" type="primary" icon="el-icon-plus" @click="startCreateAttractionForGroup(group.destinationId)">新增景点</el-button></div></div>
                    <el-table v-if="group.items.length" :data="groupPageItems(group)" :row-key="rowKey" border stripe size="small" class="admin-data-table">
                      <el-table-column label="景点" min-width="220"><template slot-scope="{row}"><div class="table-image-cell"><img v-if="row.image" :src="assetUrl(row.image)" :alt="row.name || row.id"/><span>{{ row.name || row.id }}</span></div></template></el-table-column>
                      <el-table-column prop="city" label="cityId" min-width="130" show-overflow-tooltip/>
                      <el-table-column label="关联目的地" min-width="250"><template slot-scope="{row}"><el-select :value="linkedDestinationIdsForAttraction(row.id)" multiple filterable :data-tag-cap="linkedDestinationIdsForAttraction(row.id).length" data-tag-max="5" size="mini" class="attraction-link-select" :disabled="!!destinationLinkSaving[row.id]" placeholder="选择关联目的地" @change="ids=>changeAttractionDestinationLinks(row,ids)"><el-option v-for="option in associationDestinationOptions" :key="option.value" :label="option.label" :value="option.value"/></el-select></template></el-table-column>
                      <el-table-column prop="type" label="类型" min-width="120"><template slot-scope="{row}">{{ displayValue(row.type) }}</template></el-table-column>
                      <el-table-column label="状态" width="130"><template slot-scope="{row}"><el-select :value="rowStatus(row)" size="mini" class="status-inline" @change="value=>changeStatus(row,value)"><el-option v-for="option in statusOptionsForCurrent" :key="option.value" :label="option.label" :value="option.value"/></el-select></template></el-table-column>
                      <el-table-column label="操作" width="145" align="right"><template slot-scope="{row}"><el-button size="mini" @click="editRow(row)">编辑</el-button><el-button size="mini" type="danger" plain @click="deleteRow(row)">删除</el-button></template></el-table-column>
                    </el-table>
                    <div v-if="group.items.length>pageSize" class="list-pagination"><el-pagination small :current-page="groupPage(group)" :page-size="pageSize" :total="group.items.length" layout="total, prev, pager, next" @current-change="page=>$set(groupPages,group.key,page)"/></div>
                    <el-empty v-if="!group.items.length" description="该目的地暂未关联景点" :image-size="54"/>
                  </el-card>
                  <el-empty v-if="!visibleAttractionGroups.length" description="没有符合当前筛选条件的目的地景点"/>
                </div>
                <div v-else class="admin-table-scroll"><el-table v-if="filteredItems.length" :data="paginatedItems" :row-key="rowKey" border stripe size="small" class="admin-data-table">
                  <el-table-column v-if="active==='attractions'" width="48" align="center"><template slot="header"><el-checkbox :value="allPageAttractionsSelected" :indeterminate="selectedAttractionIds.length>0&&!allPageAttractionsSelected" :disabled="busy||batchBusy||publicationChecking" aria-label="勾选当前页景点" @change="selectAttractionPage"/></template><template slot-scope="{row}"><el-checkbox :value="selectedAttractionIds.includes(row.id)" :disabled="busy||batchBusy||publicationChecking" :aria-label="'勾选景点 '+(row.name||row.id)" @change="checked=>selectAttraction(row.id,checked)"/></template></el-table-column>
                  <el-table-column v-for="column in currentMenu.columns" :key="column.key" :prop="column.key" :label="column.label" :width="column.width" :min-width="column.width ? undefined : column.type==='image' ? 190 : column.type==='status' ? 125 : column.type==='association' ? 250 : 135" :show-overflow-tooltip="column.type!=='image' && column.type!=='status' && column.type!=='tags' && column.type!=='association' && column.type!=='destinationLinks'"><template slot-scope="{row}">
                    <div v-if="column.type==='image'" class="table-image-cell"><img v-if="row[column.key]" :src="assetUrl(row[column.key])" :alt="imageCellTitle(row,column)"/><span>{{ imageCellTitle(row,column) }}</span></div>
                    <div v-else-if="column.type==='destinationLinks'" class="destination-link-cell"><strong>{{ row.name || row.id }}</strong><small>已关联 {{ destinationLinkState(row).linkedCount }} 个 · 其中已发布 {{ destinationLinkState(row).publicCount }} 个</small><el-tag size="mini" :type="destinationLinkState(row).ready?'success':'warning'">{{ destinationLinkState(row).label }}</el-tag><el-button class="destination-link-entry" size="mini" type="primary" plain icon="el-icon-connection" @click="editDestinationLinks(row)">关联景点</el-button></div>
                    <span v-else-if="column.type==='date'">{{ dateTime(row[column.key]) }}</span>
                    <el-tag v-else-if="column.type==='badge'" size="small" :type="statusTone(row[column.key])">{{ statusLabel(row[column.key]) }}</el-tag>
                    <el-select v-else-if="column.type==='status'" :value="rowStatus(row)" size="mini" class="status-inline" @change="value=>changeStatus(row,value)"><el-option v-for="option in statusOptionsForCurrent" :key="option.value" :label="option.label" :value="option.value"/></el-select>
                    <el-select v-else-if="column.type==='association'" :value="linkedDestinationIdsForAttraction(row.id)" multiple filterable :data-tag-cap="linkedDestinationIdsForAttraction(row.id).length" data-tag-max="5" size="mini" class="attraction-link-select" :disabled="!!destinationLinkSaving[row.id]" placeholder="选择关联目的地" @change="ids=>changeAttractionDestinationLinks(row,ids)"><el-option v-for="option in associationDestinationOptions" :key="option.value" :label="option.label" :value="option.value"/></el-select>
                    <span v-else-if="column.type==='tags'" class="table-tags"><el-tag v-for="tag in tagValues(row[column.key]).slice(0,3)" :key="tag" size="mini" effect="plain">{{ tag }}</el-tag><span v-if="!tagValues(row[column.key]).length">—</span></span>
                    <span v-else>{{ column.key==='title'||column.key==='subtitle' ? localizedText(row[column.key]) : displayValue(row[column.key]) }}</span>
                  </template></el-table-column>
                  <el-table-column v-if="currentMenu.editable" label="操作" :width="active==='guides'?210:145" align="right"><template slot-scope="{row}"><el-button size="mini" @click="editRow(row)">编辑</el-button><el-button v-if="active==='guides'" size="mini" @click="copyGuide(row)">复制</el-button><el-button v-if="active!=='miniprogramUsers'" size="mini" type="danger" plain @click="deleteRow(row)">删除</el-button></template></el-table-column>
                </el-table><el-empty v-else description="暂无记录"/></div>
                <div v-if="filteredItems.length&&!(active==='attractions'&&attractionView==='destination')" class="list-pagination"><el-pagination :current-page="currentPage" :page-size="pageSize" :page-sizes="pageSizes" :total="filteredItems.length" layout="total, sizes, prev, pager, next, jumper" @current-change="page=$event" @size-change="changePageSize"/></div>
                <div v-if="active==='cities'" class="pricing-hint"><i class="el-icon-info"></i>点击城市行上的编辑，使用独立编辑页调整小程序讲解定价。</div>
              </el-card>
            </section>
          </template>
          <section v-else class="editor-page">
            <div class="editor-heading"><el-button plain icon="el-icon-arrow-left" @click="closeEditor">返回列表</el-button><div><span class="eyebrow">EDIT CONTENT / 独立编辑</span><h1>{{ editor.title }}</h1><p>可保存后返回列表，或继续编辑。<el-tag v-if="editorDirty" size="mini" type="warning" class="editor-dirty-tag">有未保存修改</el-tag></p></div></div>
            <el-alert v-if="currentMenu.miniProgramDisplay" :title="'小程序展示位置：'+currentMenu.miniProgramDisplay" type="info" :closable="false" show-icon class="banner-note module-display-note"/>
            <el-alert v-if="active==='audioTracks'" title="只需填写简体标题与简介；点击表单底部「自动翻译」生成繁体和英文标题、简介。修改简体内容后需重新翻译，再保存。" type="info" :closable="false" show-icon class="banner-note"/>
            <el-dialog :title="'智能填写'+aiEntityLabel+'资料'" :visible.sync="aiFillDialogVisible" width="520px" :close-on-click-modal="false" :close-on-press-escape="!aiFilling" :show-close="!aiFilling" @closed="aiAttractionName='';aiProgressMessage='正在准备…'">
              <el-form @submit.native.prevent="submitAiFill">
                <el-form-item :label="aiNameLabel" required><el-input ref="aiAttractionNameInput" v-model.trim="aiAttractionName" maxlength="120" show-word-limit :placeholder="aiNamePlaceholder" :disabled="aiFilling" @keyup.enter.native="submitAiFill"/></el-form-item>
                <el-alert v-if="aiFilling" :title="aiProgressMessage" description="实时显示资料整理阶段；不展示模型原始思维内容。" type="info" :closable="false" show-icon class="ai-live-progress"><i slot="icon" class="el-icon-loading"/></el-alert>
                <p v-else class="ai-fill-note">{{ aiFillDescription }} AI 内容可能不准确或非实时，请核对后再保存。</p>
              </el-form>
              <span slot="footer"><el-button :disabled="aiFilling" @click="aiFillDialogVisible=false">取消</el-button><el-button type="primary" :loading="aiFilling" :disabled="!aiAttractionName" @click="submitAiFill">确认并填写</el-button></span>
            </el-dialog>
            <el-card shadow="never" class="editor-card" v-loading="busy" element-loading-text="正在保存并核验，请稍候">
              <div v-if="editor.template" class="template-guide"><div><span class="eyebrow">FILLING TEMPLATE / 填写引导</span><h3>{{ editor.template.title }}</h3><p>{{ editor.template.tip }}</p></div><div class="template-guide-actions"><el-button v-if="['routes','destinations','attractions'].includes(active)&&localAiEnabled" type="primary" icon="el-icon-magic-stick" @click="openAiFillDialog">智能填写</el-button><el-button type="warning" plain @click="fillTemplate">一键填写拟真示例</el-button></div></div>
              <el-form ref="editForm" :disabled="busy" :model="form" :rules="formRules" :label-position="currentMenu.singleColumn ? 'left' : 'top'" :label-width="currentMenu.singleColumn ? '200px' : undefined" :class="{ 'edit-form-horizontal': currentMenu.singleColumn }" class="edit-form" @submit.native.prevent="saveEditor">
                <div v-if="recordEditorGroups.length" class="attraction-editor-tabs record-editor-tabs" role="tablist" :aria-label="editor.title+'内容板块'">
                  <button v-for="(group,index) in recordEditorGroups" :id="'record-editor-tab-'+group.key" :key="group.key" type="button" role="tab" :aria-selected="recordEditorTab===group.key"  :aria-controls="active==='destinations'&&group.key==='links'?'destination-links-panel':'record-editor-panel'" :tabindex="recordEditorTab===group.key?0:-1" :class="{ 'is-active':recordEditorTab===group.key }" @click="recordEditorTab=group.key" @keydown.left.prevent="focusRecordEditorTab(index-1)" @keydown.right.prevent="focusRecordEditorTab(index+1)" @keydown.home.prevent="focusRecordEditorTab(0)" @keydown.end.prevent="focusRecordEditorTab(recordEditorGroups.length-1)">
                    <span>{{ group.label }}</span><small>{{ group.count||group.fields.length }}</small>
                  </button>
                </div>
                <div v-if="activeRecordEditorGroup" class="attraction-editor-tab-note"><strong>{{ activeRecordEditorGroup.label }}</strong><span>{{ activeRecordEditorGroup.description }}</span></div>
                <section v-if="active==='destinations' && recordEditorTab==='links'" id="destination-links-panel" role="tabpanel" :aria-labelledby="'record-editor-tab-'+recordEditorTab" ref="destinationLinks" tabindex="-1" class="destination-link-editor">
                  <div class="destination-link-heading"><div><span class="eyebrow">让目的地出现在小程序</span><h2>在这里关联城市和景点</h2><p>目的地是展示入口，景点才是点击后能浏览的内容。勾选后还需要点击底部「保存」。</p></div><el-tag :type="destinationFormLinks.ready?'success':'warning'">{{ destinationFormLinks.label }}</el-tag></div>
                  <div class="destination-link-steps">
                    <el-form-item label="第 1 步 · 选择这个目的地对应的城市"><el-select v-model="form.cityId" filterable clearable class="destination-city-select" placeholder="搜索城市名称，无需记城市 ID"><el-option v-for="option in resolveOptions('cities')" :key="option.value" :label="option.label" :value="option.value"/><el-option v-if="form.cityId&&!resolveOptions('cities').some(option=>option.value===form.cityId)" :label="'城市主数据缺失 · '+form.cityId" :value="form.cityId" disabled/></el-select><small class="field-help">没有这座城市？先保存资料，再到「城市与价格」新增。换城市不会自动清除已选景点。</small><el-button type="text" @click="selectMenu('cities')">打开城市与价格 <i class="el-icon-arrow-right"/></el-button></el-form-item>
                    <el-form-item label="第 2 步 · 勾选关联景点（至少一个已发布）">
                      <div class="destination-link-search"><el-input v-model="destinationAttractionSearch" clearable prefix-icon="el-icon-search" placeholder="搜索景点名称 / 英文名"/><el-checkbox v-model="destinationShowAllCities">显示其他城市景点</el-checkbox></div>
                      <el-checkbox-group v-model="form.attractionIds" class="destination-attraction-options"><el-checkbox v-for="item in destinationAttractionOptions" :key="item.id" :label="item.id"><span>{{ item.name || item.id }}</span><small>{{ destinationAttractionNote(item) }}</small></el-checkbox></el-checkbox-group>
                      <div v-if="!destinationAttractionOptions.length" class="destination-link-empty">{{ destinationAttractionSearch ? '没有匹配的景点，试试其他名称或清空搜索。' : '当前城市暂无可选景点。可显示其他城市，或先到景点管理新增并发布。' }}</div>
                      <div class="destination-selected"><span>已选 {{ asArray(form.attractionIds).length }} 个</span><el-tag v-for="id in asArray(form.attractionIds)" :key="id" size="small" closable :disable-transitions="true" @close="removeDestinationAttraction(id)">{{ destinationAttractionName(id) }}</el-tag></div>
                      <small class="field-help">勾选只建立关联，不会自动发布景点。没有所需景点？先保存资料，再去新增并发布，回来勾选即可。</small><el-button type="text" @click="selectMenu('attractions')">打开景点管理 <i class="el-icon-arrow-right"/></el-button>
                    </el-form-item>
                  </div>
                  <div class="destination-link-check" aria-live="polite"><strong>第 3 步 · 保存前检查</strong><ul v-if="destinationFormLinks.issues.length"><li v-for="issue in destinationFormLinks.issues" :key="issue">{{ issue }}</li></ul><p v-else>城市和已发布景点已关联，目的地也是发布状态；点击底部「保存」生效。</p><small>按当前后台数据预检查，实际展示仍以公开 API 和小程序分类为准。只勾选下架景点，目的地仍不会展示。</small></div>
                </section>
                <div v-if="active==='attractions'" class="attraction-editor-tabs" role="tablist" aria-label="景点编辑内容板块">
                  <button v-for="(group,index) in attractionEditorFieldGroups" :id="'attraction-editor-tab-'+group.key" :key="group.key" type="button" role="tab" :aria-selected="attractionEditorTab===group.key" :aria-controls="'attraction-editor-panel'" :tabindex="attractionEditorTab===group.key?0:-1" :class="{ 'is-active':attractionEditorTab===group.key }" @click="attractionEditorTab=group.key" @keydown.left.prevent="focusAttractionTab(index-1)" @keydown.right.prevent="focusAttractionTab(index+1)" @keydown.home.prevent="focusAttractionTab(0)" @keydown.end.prevent="focusAttractionTab(attractionEditorFieldGroups.length-1)">
                    <span>{{ group.label }}</span><small>{{ group.fields.length }}</small>
                  </button>
                </div>
                <div v-if="active==='attractions'" class="attraction-editor-tab-note"><strong>{{ activeAttractionEditorGroup.eyebrow }}</strong><span>{{ activeAttractionEditorGroup.description }}</span></div>
                <div :id="active==='attractions'?'attraction-editor-panel':active==='destinations'&&recordEditorTab==='links'?'destination-empty-panel':'record-editor-panel'" class="form-grid" :class="{ 'form-grid-single': currentMenu.singleColumn }" :role="active==='attractions'||recordEditorGroups.length?'tabpanel':null" :aria-labelledby="active==='attractions'?'attraction-editor-tab-'+attractionEditorTab:recordEditorGroups.length?'record-editor-tab-'+recordEditorTab:null" tabindex="-1">
                <el-form-item v-for="field in editor.fields" v-if="active!=='destinations'||!['cityId','attractionIds'].includes(field.key)" v-show="(active!=='attractions'||attractionEditorFieldGroup(field.key)===attractionEditorTab)&&(!recordEditorGroups.length||recordEditorFieldGroup(field.key)===recordEditorTab)" :key="field.key" :label="field.label" :prop="field.required ? field.key : undefined" :class="{ 'full-field': field.full || ['json','array','image','object','deepDive','checkboxList'].includes(field.type) }">
                  <el-input v-if="field.type==='textarea'" v-model="form[field.key]" type="textarea" :rows="field.rows || 3" :placeholder="field.placeholder" @input="handleEditorTextInput(field.key)"/>
                  <el-input-number v-else-if="field.type==='number'" v-model="form[field.key]" :min="field.min == null ? 0 : field.min" :max="field.max"/>
                  <el-select v-else-if="field.type==='select'" v-model="form[field.key]" :filterable="!!field.filterable" :clearable="!!field.clearable" :no-data-text="field.noDataText || '无数据'" :placeholder="field.placeholder || '请选择'" @change="handleEditorSelectChange(field.key,$event)"><el-option v-for="o in resolveOptions(field.options)" :key="o.value" :label="o.label" :value="o.value"/><el-option v-if="form[field.key] && !resolveOptions(field.options).some(o=>o.value===form[field.key])" :key="'__current'" :label="'当前值 · '+form[field.key]" :value="form[field.key]" disabled/></el-select>
                  <el-select v-else-if="field.type==='multiselect'" v-model="form[field.key]" multiple filterable :data-tag-cap="asArray(form[field.key]).length" data-tag-max="5" :placeholder="field.placeholder || '可搜索并多选'"><el-option v-for="o in resolveOptions(field.options)" :key="o.value" :label="o.label" :value="o.value"/></el-select>
                  <div v-else-if="field.type==='checkboxList'" class="checkbox-list"><el-checkbox-group v-model="form[field.key]" class="checkbox-list-body"><el-checkbox v-for="o in resolveOptions(field.options)" :key="o.value" :label="o.value" class="checkbox-list-item">{{ o.label }}</el-checkbox></el-checkbox-group><div class="checkbox-list-foot"><span>已选 {{ asArray(form[field.key]).length }} / {{ resolveOptions(field.options).length }}</span><el-button v-if="asArray(form[field.key]).length" type="text" size="mini" @click="form[field.key]=[]">清空</el-button></div><small v-if="!resolveOptions(field.options).length" class="field-help">暂无可选项，请先创建目的地。</small></div>
                  <el-switch v-else-if="field.type==='switch'" v-model="form[field.key]" active-text="启用" inactive-text="停用"/>
                  <el-date-picker v-else-if="field.type==='date'" v-model="form[field.key]" type="date" value-format="yyyy-MM-dd" placeholder="选择日期"/>
                  <el-date-picker v-else-if="field.type==='daterange'" v-model="dateRange" type="daterange" value-format="yyyy-MM-dd" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"/>
                  <div v-else-if="field.type==='image'" class="image-editor"><div v-if="form[field.key]" class="image-preview"><img :src="assetUrl(form[field.key])" :alt="field.label"/></div><div class="image-actions"><el-upload action="#" :show-file-list="false" :http-request="(req)=>uploadImage(req,field.key)"><el-button icon="el-icon-upload">{{ form[field.key] ? '重新上传' : '选择图片上传' }}</el-button></el-upload><el-button v-if="form[field.key]" type="danger" plain size="small" icon="el-icon-delete" @click="removeFormImage(field.key)">删除图片</el-button></div><small class="image-guidance">{{ imageGuidance(active,field.key,undefined,field.required) }}</small></div>
                  <div v-else-if="field.type==='array'" class="array-editor"><div v-for="(entry,index) in asArray(form[field.key])" :key="index" class="array-entry"><div class="array-entry-head"><b>{{ field.itemLabel || field.label }} {{ index+1 }}</b><el-button type="text" class="danger-text" @click="removeArrayEntry(field.key,index)">移除</el-button></div><div class="array-fields"><template v-for="sub in field.fields"><div v-if="sub.type==='object'" :key="sub.key" class="object-subfields"><span class="object-subtitle">{{ sub.label }}</span><el-form-item v-for="child in sub.fields" :key="child.key" :label="child.label"><el-input v-model="entry[sub.key][child.key]" :placeholder="child.placeholder"/></el-form-item></div><el-form-item v-else-if="sub.type==='image'" :key="sub.key" :label="sub.label" class="full-field"><div class="image-editor"><div v-if="entry[sub.key]" class="image-preview"><img :src="assetUrl(entry[sub.key])" :alt="sub.label"/></div><div class="image-actions"><el-upload action="#" :show-file-list="false" :http-request="(req)=>uploadNestedImage(req,field.key,index,sub.key)"><el-button icon="el-icon-upload">{{ entry[sub.key] ? '重新上传' : '选择图片上传' }}</el-button></el-upload><el-button v-if="entry[sub.key]" type="danger" plain size="small" icon="el-icon-delete" @click="removeNestedImage(field.key,index,sub.key)">删除图片</el-button></div><small class="image-guidance">{{ imageGuidance(active,field.key,sub.key,false) }}</small></div></el-form-item><el-form-item v-else-if="sub.type==='richText'" :key="sub.key" :label="sub.label" class="full-field"><div class="rich-text-control"><div class="rich-text-toolbar"><button type="button" @mousedown.prevent="richCommand('bold')"><b>B</b></button><button type="button" @mousedown.prevent="richCommand('italic')"><i>I</i></button><button type="button" @mousedown.prevent="richCommand('insertUnorderedList')">• 列表</button><button type="button" @mousedown.prevent="richCommand('insertOrderedList')">1. 列表</button><button type="button" @mousedown.prevent="richCommand('createLink')">插入链接</button></div><div class="rich-text-editable" contenteditable="true" :inner-html.prop="safeEditorHtml(entry[sub.key])" @input="updateArrayRichText(field.key,index,sub.key,$event)"></div></div></el-form-item><el-form-item v-else :key="sub.key" :label="sub.label" :class="{ 'full-field': sub.type==='textarea' }"><el-input-number v-if="sub.type==='number'" v-model="entry[sub.key]" :min="sub.min == null ? 0 : sub.min" :max="sub.max"/><el-select v-else-if="sub.type==='select'" v-model="entry[sub.key]"><el-option v-for="o in resolveOptions(sub.options)" :key="o.value" :label="o.label" :value="o.value"/></el-select><el-select v-else-if="sub.type==='multiselect'" v-model="entry[sub.key]" multiple filterable :data-tag-cap="asArray(entry[sub.key]).length" data-tag-max="5" :placeholder="sub.placeholder || '可搜索并多选'"><el-option v-for="o in resolveOptions(sub.options)" :key="o.value" :label="o.label" :value="o.value"/></el-select><el-input v-else-if="sub.type==='textarea'" v-model="entry[sub.key]" type="textarea" :rows="2" :placeholder="sub.placeholder"/><el-input v-else v-model="entry[sub.key]" :placeholder="sub.placeholder"/></el-form-item></template></div></div><el-button plain icon="el-icon-plus" @click="addArrayEntry(field)">{{ field.addLabel || ('添加'+(field.itemLabel || field.label)) }}</el-button></div>
                  <div v-else-if="field.type==='object'" class="structured-object-editor"><el-form-item v-for="sub in field.fields" :key="sub.key" :label="active==='attractions'&&field.key==='guide'&&sub.type==='textarea' ? sub.label+'（“；”分隔多项；小程序不按分号换行）' : sub.label" :class="{ 'full-field': sub.type==='richText' }"><div v-if="sub.type==='richText'" class="rich-text-control"><div class="rich-text-toolbar"><button type="button" @mousedown.prevent="richCommand('bold')"><b>B</b></button><button type="button" @mousedown.prevent="richCommand('italic')"><i>I</i></button><button type="button" @mousedown.prevent="richCommand('insertUnorderedList')">• 列表</button><button type="button" @mousedown.prevent="richCommand('insertOrderedList')">1. 列表</button><button type="button" @mousedown.prevent="richCommand('createLink')">插入链接</button></div><div class="rich-text-editable" contenteditable="true" :inner-html.prop="safeEditorHtml(form[field.key][sub.key])" @input="updateObjectRichText(field.key,sub.key,$event)"></div></div><el-input v-else-if="sub.type==='textarea'" v-model="form[field.key][sub.key]" type="textarea" :rows="sub.rows || 2" :placeholder="sub.placeholder"/><el-input v-else v-model="form[field.key][sub.key]" :placeholder="sub.placeholder"/></el-form-item></div>
                  <div v-else-if="field.type==='deepDive'" class="deep-dive-editor"><el-form-item label="免费预览内容"><el-input v-model="form[field.key].preview" type="textarea" :rows="5" placeholder="填写免费展示的内容"/></el-form-item><div class="deep-dive-sections"><div class="array-entry-head"><b>付费章节（{{ form[field.key].locked.length }}）</b><el-button plain size="small" icon="el-icon-plus" @click="addDeepDiveSection(field.key)">添加章节</el-button></div><div v-for="(section,index) in form[field.key].locked" :key="index" class="deep-dive-section"><div class="array-entry-head"><span>章节 {{ index+1 }}</span><el-button type="text" class="danger-text" @click="removeDeepDiveSection(field.key,index)">删除</el-button></div><el-input :value="section" type="textarea" :rows="4" placeholder="填写本章节内容" @input="value=>updateDeepDiveSection(field.key,index,value)"/></div><div v-if="!form[field.key].locked.length" class="deep-dive-empty">暂未添加付费章节</div></div></div>
                  <el-input v-else-if="field.type==='json'" v-model="jsonFields[field.key]" type="textarea" :rows="field.rows || 8" spellcheck="false" :placeholder="field.placeholder || '请输入合法 JSON'"/>
                  <el-input v-else-if="field.type==='code'" v-model="form[field.key]" :placeholder="field.placeholder"><el-button slot="append" @click="generateCode">自动生成优惠码</el-button></el-input>
                  <el-input v-else v-model="form[field.key]" :placeholder="field.placeholder" :disabled="active==='cities'&&field.key==='id'&&!editor.isNew" @input="handleEditorTextInput(field.key)"/>
                  <small v-if="field.help" class="field-help">{{ field.help }}</small>
                </el-form-item>
              </div><el-form-item v-if="active==='attractions'" label="参观地图图片"><div class="image-editor"><div v-if="form.guide?.mapImage" class="image-preview"><img :src="assetUrl(form.guide.mapImage)" alt="参观地图预览"/></div><div class="image-actions"><el-upload action="#" :show-file-list="false" :http-request="uploadGuideMap" accept="image/png,image/jpeg,image/webp"><el-button plain icon="el-icon-picture">{{ form.guide?.mapImage ? '重新上传地图' : '上传参观地图' }}</el-button></el-upload><el-button v-if="form.guide?.mapImage" type="danger" plain size="small" icon="el-icon-delete" @click="removeGuideMap">删除地图图片</el-button></div><el-input v-model="form.guide.mapImage" placeholder="也可粘贴 HTTPS 图片链接"/><small class="image-guidance">{{ imageGuidance('attractions','mapImage',undefined,false) }} 可粘贴 HTTPS 图片地址。</small></div></el-form-item><el-form-item v-if="active==='audioTracks'&&recordEditorTab==='audio'" label="上传私有音频（MP3 / M4A，≤30MB）"><el-upload action="#" :show-file-list="false" :http-request="uploadAudio" accept=".mp3,.m4a,audio/mpeg,audio/mp4"><el-button icon="el-icon-upload" :loading="busy">{{ form.audioFile ? '重新上传并生成 60 秒试听' : '上传音频并生成 60 秒试听' }}</el-button></el-upload><small v-if="form.audioFile">已上传：{{ form.durationSeconds }} 秒；试听：{{ form.previewSeconds }} 秒。完整文件仅由服务端按权益授权播放。</small><small v-else>无音频的草稿可保存，但不可发布或成为可播放内容。</small></el-form-item><div v-if="active==='audioTracks' && recordEditorTab==='content' && (form.titleTw || form.titleEn || form.descriptionTw || form.descriptionEn)" class="audio-translation-preview"><b>翻译结果（只读预览）</b><p>繁体标题：{{ form.titleTw || '—' }}</p><p>英文标题：{{ form.titleEn || '—' }}</p><p>繁体简介：{{ form.descriptionTw || '—' }}</p><p>英文简介：{{ form.descriptionEn || '—' }}</p></div><el-alert v-if="jsonError" :title="jsonError" type="error" :closable="false" show-icon/><div class="form-actions"><el-button plain :disabled="busy||aiTranslating" @click="closeEditor">取消</el-button><el-button v-if="active==='audioTracks'&&recordEditorTab==='content'" icon="el-icon-magic-stick" :loading="aiTranslating" :disabled="!localAiEnabled || busy" :title="localAiEnabled ? '根据简体标题和简介生成繁体及英文内容' : 'AI 翻译未启用，请检查服务端配置'" @click="translateAudioTrack">自动翻译</el-button><el-button class="save-continue" type="primary" plain :loading="busy" :disabled="publicationChecking||aiFilling||aiTranslating" @click="saveEditor(true)">保存并继续编辑</el-button><el-button class="save-return" type="primary" icon="el-icon-check" :loading="busy" :disabled="publicationChecking||aiFilling||aiTranslating" @click="saveEditor(false)">保存并返回</el-button></div></el-form>
            </el-card>
          </section>
        </main>
      </el-container>
      <el-dialog title="后台入口指南" :visible.sync="guideVisible" width="min(960px, calc(100vw - 32px))" top="5vh" custom-class="admin-entry-guide">
        <div class="entry-guide-intro"><span class="eyebrow">MINI PROGRAM CONTENT MAP</span><p>按小程序里的展示位置找后台板块。点击「进入编辑」会打开对应列表；音频入口会自动筛选类别。</p></div>
        <div class="entry-guide-groups">
          <section v-for="group in guideGroups" :key="group.title" class="entry-guide-group">
            <h3>{{ group.title }}</h3>
            <article v-for="entry in group.items" :key="entry.title" class="entry-guide-card">
              <div class="entry-guide-card-head"><strong>{{ entry.title }}</strong><el-tag size="mini" effect="plain">{{ entry.menuLabel }}</el-tag></div>
              <p><b>小程序位置</b>{{ entry.location }}</p>
              <p class="entry-guide-desc">{{ entry.description }}</p>
              <el-button type="primary" plain size="small" icon="el-icon-right" @click="openGuideEntry(entry)">进入编辑</el-button>
            </article>
          </section>
        </div>
        <span slot="footer"><el-button @click="guideVisible=false">关闭说明</el-button></span>
      </el-dialog>
      <el-dialog title="请确认" :visible.sync="confirmVisible" width="420px" custom-class="admin-confirm-dialog" :before-close="()=>resolveConfirm(false)"><div class="admin-confirm-text">{{ confirmText }}</div><span slot="footer"><el-button @click="resolveConfirm(false)">取消</el-button><el-button type="danger" @click="resolveConfirm(true)">确认</el-button></span></el-dialog>
      <el-backtop :right="24" :bottom="24"/>
    </el-container>
  </div>
</template>

<script>
import { adminAssetUrl } from './asset-url.mjs'
const TOKEN = 'sy-greece-admin-token'
const ACTIVE_MENU = 'sy-greece-admin-menu'
const groups = [
  { label:'共同数据', items:[['overview','总览','el-icon-s-data'],['countries','国家管理','el-icon-map-location'],['guides','导游管理','el-icon-user'],['leads','咨询 CRM','el-icon-chat-line-round'],['guideBookings','导游预约','el-icon-date']] },
  { label:'路线与目的地', items:[['routes','路线管理','el-icon-document'],['cities','城市与价格','el-icon-location-outline'],['destinationTypes','目的地分类','el-icon-collection-tag'],['destinations','目的地','el-icon-map-location'],['attractions','景点管理','el-icon-school'],['sampleItineraries','甄选路线','el-icon-guide']] },
  { label:'网站管理', items:[['homeBanners','首页 Banner','el-icon-picture'],['settings','站点配置','el-icon-setting'],['attractionDetailPage','景点详情配置','el-icon-document']] },
  { label:'语音与文史', items:[['audioRoutes','路线导览','el-icon-location-information'],['audioTracks','导览音频 / 文史节目','el-icon-headset'],['audioAlbums','希腊文史专辑','el-icon-collection'],['heritageGuideBanners','古迹讲解 Banner','el-icon-picture-outline']] },
  { label:'小程序管理', items:[['miniProgramBookings','小程序预约','el-icon-mobile-phone'],['miniprogramBanners','小程序 Banner','el-icon-picture-outline'],['miniprogramServiceEntries','首页服务入口','el-icon-menu'],['vehicleService','在地用车','el-icon-truck'],['miniprogramUsers','小程序用户','el-icon-user'],['miniprogramOrders','订单管理','el-icon-s-finance'],['miniprogramTrips','小程序行程','el-icon-map-location'],['customTrips','定制行程订单','el-icon-link'],['miniprogramTravelers','出行人资料','el-icon-user-solid'],['miniprogramDocuments','签证资料','el-icon-document'],['miniprogramCoupons','优惠券','el-icon-s-ticket']] },
]
const MENU_IDS = new Set(groups.flatMap(group=>group.items).map(item=>item[0]))
const emptyData = { audioRoutes:[],audioTracks:[],audioAlbums:[],routes:[],destinations:[],cities:[],attractions:[],sampleItineraries:[],customTrips:[],leads:[],guides:[],countries:[],destinationTypes:[],guideBookings:[],miniProgramBookings:[],miniprogramUsers:[],miniprogramOrders:[],miniprogramTravelers:[],miniprogramDocuments:[],miniprogramCoupons:[],homeBanners:[],miniprogramBanners:[],miniprogramServiceEntries:[],heritageGuideBanners:[],settings:{} }
const routes = { audioRoutes:'/admin/audioRoutes',audioTracks:'/admin/audioTracks',audioAlbums:'/admin/audioAlbums',stats:'/admin/stats',routes:'/admin/routes',destinations:'/admin/destinations',cities:'/admin/cities',attractions:'/admin/attractions',sampleItineraries:'/admin/sampleItineraries',customTrips:'/admin/customTrips',leads:'/admin/leads',guideBookings:'/admin/guide-bookings',miniProgramBookings:'/admin/miniprogram-bookings',settings:'/admin/settings',attractionDetailPage:'/admin/attraction-detail-page',miniprogramUsers:'/admin/miniprogram-users',miniprogramOrders:'/admin/miniprogram-orders',miniprogramTravelers:'/admin/miniprogram-travelers',miniprogramDocuments:'/admin/miniprogram-documents',miniprogramCoupons:'/admin/miniprogram-coupons',countries:'/admin/countries',guides:'/admin/guides',destinationTypes:'/admin/destinationCategories',homeBanners:'/admin/home-banners',miniprogramBanners:'/admin/miniprogram-home-banners',miniprogramServiceEntries:'/admin/miniprogram-service-entries',heritageGuideBanners:'/admin/heritage-guide-banners' }
const detailLocales = [{key:'zh',label:'简体'},{key:'tw',label:'繁体'},{key:'en',label:'英文'}]
const vehicleOptionGroups = [{key:'vehicle',label:'车型'},{key:'duration',label:'时长'},{key:'people',label:'人数'}]
const detailSectionKeys = [{key:'overview',label:'概览'},{key:'visitor',label:'参观指南'},{key:'highlights',label:'必看亮点'},{key:'audioHow',label:'语音导览使用指南'},{key:'route',label:'路线导览'},{key:'online',label:'线上预览'},{key:'expert',label:'名导讲解'}]
const detailVisitorKeys = [{key:'hours',label:'开放时间'},{key:'tickets',label:'门票与预约'},{key:'transport',label:'交通方式'},{key:'map',label:'地图'},{key:'faq',label:'FAQ'}]
const detailExhibitFields = [{key:'name',label:'标题',keys:{zh:'name',tw:'nameTw',en:'nameEn'}},{key:'description',label:'描述',keys:{zh:'description',tw:'descriptionTw',en:'descriptionEn'}}]
const detailHighlightFields = [{key:'name',label:'标题',keys:{zh:'name',tw:'nameTw',en:'nameEn'}},{key:'desc',label:'描述',keys:{zh:'desc',tw:'descTw',en:'descEn'}}]
const detailRouteFields = [{key:'title',label:'标题',keys:{zh:'title',tw:'titleTw',en:'titleEn'}},{key:'description',label:'描述',keys:{zh:'description',tw:'descriptionTw',en:'descriptionEn'}}]
const detailAudioFields = detailRouteFields
const guideGroups = [
  {title:'景点讲解与音频',items:[
    {title:'景点资料与讲解点',menu:'attractions',menuLabel:'景点管理',location:'小程序「城市景点 → 景点详情」的介绍、亮点、讲解点和参观信息。',description:'进入景点列表后编辑对应景点；讲解点在景点编辑表单的「讲解点」区域增删改。'},
    {title:'名导讲解',menu:'audioTracks',filter:{key:'category',value:'expert'},menuLabel:'导览音频 / 文史节目',location:'景点详情页的「名导讲解」音频列表。',description:'进入后已筛选「名导讲解」类别。音轨要关联景点，发布后才会显示在该景点。'},
    {title:'线上预览',menu:'audioTracks',filter:{key:'category',value:'online'},menuLabel:'导览音频 / 文史节目',location:'景点详情页的「线上预览」音频列表。',description:'进入后已筛选「线上预览」类别；音轨关联景点，讲解点关联为可选。'},
    {title:'路线讲解音频',menu:'audioTracks',filter:{key:'category',value:'route'},menuLabel:'导览音频 / 文史节目',location:'景点详情页的「路线导览」音频。',description:'进入后已筛选「路线导览」类别；还需关联对应路线。'},
    {title:'讲解路线与点位顺序',menu:'audioRoutes',menuLabel:'路线导览',location:'景点详情页的「路线导览」路线卡片与讲解点顺序。',description:'维护路线名称、所属景点、路线说明和讲解点顺序。'},
    {title:'文史知识库节目',menu:'audioAlbums',menuLabel:'希腊文史专辑',location:'小程序「文史知识库」的专辑及其节目入口。',description:'维护专辑名称、简介和封面；节目音轨在「导览音频 / 文史节目」中编辑。'}
  ]},
  {title:'小程序页面与服务',items:[
    {title:'景点详情页面说明',menu:'attractionDetailPage',menuLabel:'景点详情配置',location:'小程序景点详情页各区块的标题、说明和使用提示。',description:'用于维护页面文案与区块说明，不编辑景点本身的资料或音频。'},
    {title:'古迹讲解 Banner',menu:'heritageGuideBanners',menuLabel:'古迹讲解 Banner',location:'小程序「古迹讲解」页面顶部轮播。',description:'只影响古迹讲解页，不影响首页 Banner。'},
    {title:'小程序首页 Banner',menu:'miniprogramBanners',menuLabel:'小程序 Banner',location:'小程序首页顶部轮播。',description:'维护首页图片和文案；与 Website 首页 Banner 分开。'},
    {title:'首页快捷服务入口',menu:'miniprogramServiceEntries',menuLabel:'首页服务入口',location:'小程序首页快捷服务区的图标、标题和副标题。',description:'仅维护固定服务入口的展示内容；入口跳转由小程序端控制。'},
    {title:'城市与讲解价格',menu:'cities',menuLabel:'城市与价格',location:'小程序城市列表、城市信息及讲解价格。',description:'维护城市名称、国家、启用状态、讲解价格和币种。'},
    {title:'目的地',menu:'destinations',menuLabel:'目的地',location:'小程序目的地内容与目的地下的景点关联。',description:'维护目的地文案、图片、城市和关联景点。'},
    {title:'甄选路线',menu:'sampleItineraries',menuLabel:'甄选路线',location:'小程序首页「甄选路线」和路线详情。',description:'维护路线卡片、天数、封面和逐日行程；仅发布内容会展示。'},
    {title:'在地用车',menu:'vehicleService',menuLabel:'在地用车',location:'小程序「在地用车」介绍、服务标签和车型选项。',description:'维护用车页面文案、图片、服务标签及车型、时长和人数选项。'},
    {title:'小程序预约记录',menu:'miniProgramBookings',menuLabel:'小程序预约',location:'小程序提交的预约咨询记录。',description:'查看并更新预约跟进状态；这里维护的是客户提交记录，不是页面展示文案。'}
  ]}
]
const detailAudioCategoryLabels = {route:'路线讲解',online:'线上预览',expert:'名导讲解'}
const basic = (key,label,type='text',extra={}) => ({ key,label,type,...extra })
const longEditorGroups = {
  destinations:[
    {key:'basic',label:'目的地资料',description:'维护名称、图片和发布状态。',fields:['id','name','en','type','image','status']},
    {key:'links',label:'关联城市与景点',description:'选择目的地所属城市并关联已发布景点。',count:2,fields:['__destinationLinks']}
  ],
  guides:[
    {key:'identity',label:'身份与服务范围',description:'维护导游名称、职位、国家、服务地区和联系方式。',fields:['id','countryId','name','nameTw','nameEn','role','roleTw','roleEn','location','wechat']},
    {key:'profile',label:'简介与图片',description:'维护三语简介、头像、形象图和专业资质摘要。',fields:['intro','introTw','introEn','avatar','fullImage','eyebrow','proof']},
    {key:'expertise',label:'专业背书与擅长方向',description:'可添加多条资质说明与服务方向。',fields:['credentials','directions']},
    {key:'reviews',label:'客户评价与发布',description:'维护客户评价、首页推荐和发布状态。',fields:['reviews','featured','enabled','sort']}
  ],
  audioTracks:[
    {key:'content',label:'节目资料与关联',description:'维护标题、简介、类别和景点、路线或专辑关联。',fields:['title','description','category','attractionId','exhibitId','routeId','albumId']},
    {key:'audio',label:'音频与试听',description:'上传音频并设置语种、封面、时长和试听时长。',fields:['language','cover','durationSeconds','previewSeconds']},
    {key:'access',label:'播放权限与发布',description:'维护完整内容的播放权限、排序和发布状态。',fields:['unlockMode','sort','status']}
  ],
  sampleItineraries:[
    {key:'basic',label:'路线资料',description:'维护路线名称、标签、天数、适合人群和封面。',fields:['id','title','tag','days','crowd','cover','summary']},
    {key:'itinerary',label:'逐日行程与发布',description:'按天添加安排并关联景点，然后设置发布状态。',fields:['itinerary','status']}
  ],
  customTrips:[
    {key:'trip',label:'客户与日期',description:'维护客户、订单、日期范围、人数和语种。',fields:['client','title','orderNo','period','travelers','language']},
    {key:'service',label:'服务安排与费用',description:'维护车型、司导说明和服务费。',fields:['vehicle','guide','totalFee']},
    {key:'schedule',label:'每日行程与须知',description:'维护每日安排、出行须知和链接状态。',fields:['days','notices','status']}
  ]
}
const imageGuidanceByField = {
  'settings.ogImage':'建议 1200×630 px（约 1.91:1）；OG 社交分享预览按宽图展示，重要主体与文字放在中央安全区。',
  'audioAlbums.cover':'建议 1200×1200 px（1:1 方图）；专辑封面在小程序专辑列表中按正方形裁切。',
  'audioTracks.cover':'建议 1200×900 px（4:3 横图）；音频列表封面会裁切填满图片卡片，主体尽量居中。',
  'countries.heroImage':'建议 1920×1080 px（16:9 横图）；网站知识库头图使用 cover 背景，边缘会随屏幕裁切。',
  'guides.avatar':'建议 800×800 px（1:1 方图）；前台头像裁成圆形，人物脸部留足边距。',
  'guides.fullImage':'建议 1200×1200 px（1:1 方图）；当前前台形象区与头像共用圆形裁切，人物脸部保持居中。',
  'routes.image':'建议 1600×900 px（16:9 横图）；路线卡片和详情头图均使用 cover，主体放在画面中央，边缘会裁切。',
  'destinations.image':'建议 1200×900 px（4:3 横图）；网站目的地卡片约 1.38:1，窄屏约 1.2:1，四周会轻微裁切。',
  'attractions.image':'建议 1400×700 px（2:1 横图）；小程序城市景点卡片约 2.1:1（图片框 320rpx 高），网站卡片/详情头图也会 cover 裁切，请把主体放中间。',
  'attractions.highlights.image':'建议 1200×800 px（3:2 横图）；小程序横向卡片约 2:1、双列网格约 1.5:1，均会按容器裁切，建议主体居中。',
  'attractions.exhibits.image':'建议 1000×1000 px（1:1 方图）；讲解点缩略图会裁切填充窄图框，重点放在中心。',
  'attractions.articles.cover':'建议 1800×750 px（约 2.4:1 横图）；文章卡片高度固定、宽度随屏幕变化，使用 cover 裁切，标题/主体置中。',
  'attractions.mapImage':'建议 1600×1200 px（4:3）或更清晰的横版地图；详情页按原比例缩放展示（不裁切），请确保图例和文字清晰。',
  'sampleItineraries.cover':'建议 1200×800 px（3:2 横图）；网站卡片与小程序路线卡片比例不同，采用 cover 裁切，请将主体置中。',
  'homeBanners.image':'建议 1920×1080 px（16:9 横图）；网站首页首屏按 cover 铺满，桌面/手机会裁切不同边缘，文字和主体置中。',
  'miniprogramBanners.image':'建议 1200×1440 px（5:6 竖图）；小程序首页 Banner 容器约 750×900rpx，按 aspectFill 裁切。',
  'miniprogramServiceEntries.iconImage':'建议 256×256 px（1:1 方图）；小程序入口以小图标展示，优先用透明背景 PNG/WebP，图形四周留白。',
  'heritageGuideBanners.image':'建议 1600×1000 px（16:10 横图）；小程序讲解轮播容器约 686×430rpx，按 aspectFill 裁切。'
}
const publish = [{label:'发布',value:'published'},{label:'下架',value:'unpublished'}]
const listFilterKeys = {
  audioRoutes:['status','attractionId'], audioTracks:['status','category','attractionId','unlockMode'], audioAlbums:['status'],
  countries:['enabled'], guides:['enabled','countryId','featured'], routes:['status','days'], destinations:['status','type'], cities:['currency','priceCny'], destinationTypes:['enabled'], attractions:['status','city','type'], sampleItineraries:['status','tag'], customTrips:['status','period'],
  leads:['status','leadType','createdAt'], guideBookings:['status','bookingDate','createdAt'], miniProgramBookings:['status','leadType','createdAt'], miniprogramTrips:['status','leadType','createdAt'], homeBanners:['enabled'], miniprogramBanners:['enabled'], miniprogramServiceEntries:['enabled'], heritageGuideBanners:['enabled'],
  miniprogramUsers:['member','createdAt'], miniprogramOrders:['status','productType','createdAt'], miniprogramTravelers:['relation'], miniprogramDocuments:['visaStatus','expiry'], miniprogramCoupons:['status','expiresAt']
}
const listFilterLabels = {enabled:'发布状态',featured:'首页推荐',countryId:'所属国家',status:'状态',days:'天数',type:'分类 / 类型',currency:'币种',priceCny:'讲解价格',city:'城市',tag:'标签',period:'出行日期',leadType:'记录类型',createdAt:'创建日期',vehicleDate:'用车日期',vehicleNeed:'用车场景',bookingDate:'预约日期',member:'会员类型',productType:'商品类型',relation:'关系',visaStatus:'签证状态',expiry:'证件到期日期',expiresAt:'优惠券有效期'}
const listDateFilterKeys = ['period','createdAt','bookingDate','expiry','expiresAt','vehicleDate']
const listNumberFilterKeys = ['priceCny']
const fields = {
  audioRoutes:{label:'路线导览',endpoint:'audioRoutes',addLabel:'新增路线',columns:[['title','路线'],['attractionId','所属景点'],['sort','排序'],['status','状态','status']],fields:[basic('title','路线名称','text',{required:true}),basic('titleTw','繁体名称'),basic('titleEn','英文名称'),basic('description','说明','textarea'),basic('attractionId','所属景点','select',{required:true,options:'attractions'}),basic('pointIds','点位顺序','multiselect',{options:'exhibits',help:'选择本景点讲解点，拖动排序暂不支持；顺序以当前选择顺序为准。'}),basic('sort','排序','number'),basic('status','发布状态','select',{options:'publish'})]},
  audioAlbums:{label:'希腊文史专辑',endpoint:'audioAlbums',addLabel:'新增专辑',singleColumn:true,columns:[['cover','封面','image'],['title','名称'],['sort','排序'],['status','状态','status']],fields:[basic('title','简体名称','text',{required:true}),basic('description','简体简介','textarea'),basic('cover','封面','image'),basic('sort','排序','number'),basic('status','发布状态','select',{options:'publish'})]},
  audioTracks:{label:'导览音频 / 文史节目',editorGroups:longEditorGroups.audioTracks,endpoint:'audioTracks',addLabel:'新增音频',singleColumn:true,columns:[['title','音频 / 节目'],['category','类别'],['attractionId','景点'],['sort','排序'],['status','状态','status']],fields:[basic('title','简体标题','text',{required:true}),basic('description','简体简介','textarea'),basic('category','类别','select',{required:true,options:[{label:'路线导览',value:'route'},{label:'线上游览',value:'online'},{label:'名导讲解',value:'expert'},{label:'希腊文史节目',value:'heritage'}]}),basic('attractionId','所属景点（文史节目留空）','select',{options:'attractions',filterable:true}),basic('exhibitId','所属讲解点（可选）','select',{options:'exhibits',filterable:true,clearable:true,noDataText:'请先选择所属景点',placeholder:'选择当前景点已发布讲解点'}),basic('routeId','路线 ID（路线导览必填）','select',{options:'audioRoutes',filterable:true,noDataText:'暂无路线导览，请先到「路线导览」新增'}),basic('albumId','专辑 ID（文史节目必填）','select',{options:'audioAlbums',filterable:true,noDataText:'暂无专辑，请先到「希腊文史专辑」新增'}),basic('language','音频语种','select',{options:[{label:'中文',value:'zh-CN'},{label:'繁体中文',value:'zh-TW'},{label:'英文',value:'en'}]}),basic('cover','封面','image'),basic('durationSeconds','音频秒数（上传后自动填入）','number'),basic('previewSeconds','试听秒数（最高 60 秒）','number',{max:60}),basic('unlockMode','完整播放权限','select',{required:true,options:[{label:'免费',value:'free'},{label:'单景点有效订单（不含会员）',value:'attraction'},{label:'有效会员订单',value:'membership'},{label:'未配置商品：仅试听',value:'locked'}]}),basic('sort','排序','number'),basic('status','发布状态','select',{options:'publish'})]},
  countries:{ label:'国家管理',endpoint:'countries',addLabel:'新增国家',columns:[['name','国家'],['nameEn','英文名'],['sort','排序'],['enabled','状态','status']],fields:[basic('id','国家 ID','text',{required:true}),basic('name','简体中文名称','text',{required:true}),basic('nameTw','繁体中文名称'),basic('nameEn','英文名称'),basic('sort','排序','number'),basic('enabled','启用状态','switch'),basic('heroImage','国家主图','image')] },
  guides:{ label:'导游管理',editorGroups:longEditorGroups.guides,endpoint:'guides',addLabel:'新增导游',columns:[['avatar','头像','image'],['name','导游'],['role','职位'],['location','服务地区'],['enabled','状态','status']],fields:[basic('id','导游 ID','text',{required:true}),basic('countryId','所属国家','select',{options:'countries'}),basic('name','姓名','text',{required:true}),basic('nameTw','繁体姓名'),basic('nameEn','英文姓名'),basic('role','职位'),basic('roleTw','繁体职位'),basic('roleEn','英文职位'),basic('intro','个人简介','textarea'),basic('introTw','繁体简介','textarea'),basic('introEn','英文简介','textarea'),basic('location','服务地区'),basic('wechat','微信号'),basic('avatar','导游头像','image',{required:true}),basic('fullImage','形象大图','image'),basic('eyebrow','眉题'),basic('proof','专业资质摘要','textarea'),basic('credentials','专业背书','array',{itemLabel:'背书',addLabel:'添加背书',fields:[basic('title','标题'),basic('desc','说明','textarea')]}),basic('directions','擅长方向','array',{itemLabel:'方向',addLabel:'添加方向',fields:[basic('title','标题'),basic('subtitle','副标题'),basic('desc','说明','textarea'),basic('suitable','适合人群'),basic('duration','建议时长')]}),basic('reviews','客户评价','array',{itemLabel:'评价',addLabel:'添加评价',fields:[basic('quote','评价内容','textarea'),basic('name','客户称呼'),basic('meta','行程类型')]}),basic('featured','首页推荐','switch'),basic('enabled','发布状态','switch'),basic('sort','排序','number')]},
  routes:{label:'路线管理',endpoint:'routes',addLabel:'新增路线',template:'route',miniProgramDisplay:'当前小程序不读取此板块；这里维护 Website 前台的主题路线。小程序首页「甄选路线」请在「甄选路线」板块维护。',columns:[['title','路线名称'],['days','天数'],['tags','主题','tags'],['status','状态','status']],fields:[basic('id','路线 ID','text',{required:true}),basic('title','路线名称','text',{required:true}),basic('kicker','路线副标题'),basic('days','天数','number'),basic('tags','标签（逗号分隔）'),basic('desc','路线介绍','textarea',{required:true}),basic('image','路线主图','image',{required:true}),basic('destinationIds','关联目的地 ID','multiselect',{options:'destinations'}),basic('sampleItineraryIds','关联甄选路线 ID','multiselect',{options:'sampleItineraries'}),basic('status','发布状态','select',{options:'publish'})]},
  destinations:{label:'精选目的地',editorGroups:longEditorGroups.destinations,endpoint:'destinations',addLabel:'新增目的地',template:'destination',columns:[['name','目的地 / 关联景点','destinationLinks',260],['en','英文名'],['type','分类'],['status','状态','status']],fields:[basic('id','目的地 ID','text',{required:true}),basic('name','中文名称','text',{required:true}),basic('en','英文名称'),basic('type','分类'),basic('cityId','关联城市','select',{options:'cities'}),basic('image','目的地图片','image'),basic('status','发布状态','select',{options:'publish'}),basic('attractionIds','关联景点','multiselect',{options:'attractions'})]},
  attractions:{label:'景点管理',endpoint:'attractions',addLabel:'新增景点',template:'attraction',columns:[['image','景点','image'],['cityName','所属城市'],['type','类型'],['linkedDestinationIds','关联目的地','association',260],['status','状态','status']],fields:[basic('name','景点名称','text',{required:true}),basic('en','英文名称'),basic('originalName','希腊语名称'),basic('city','城市 ID'),basic('cityName','城市名称'),basic('type','类型','select',{options:[{label:'景点',value:'landmark'},{label:'博物馆',value:'museum'}]}),basic('category','分类'),basic('sizeLabel','规模标签'),basic('tags','标签（逗号分隔）'),basic('image','景点图片','image'),basic('summary','景点简介','textarea',{required:true}),basic('linkedDestinationIds','关联目的地','checkboxList',{options:'destinations',help:'勾选该景点所属的目的地，可多选。'}),basic('highlights','景点亮点','array',{itemLabel:'亮点',addLabel:'添加亮点',fields:[basic('name','名称'),basic('desc','说明','textarea'),basic('image','亮点图片（可选）','image')]}),basic('exhibits','讲解点','array',{itemLabel:'讲解点',addLabel:'添加讲解点',fields:[basic('name','名称'),basic('author','年代 / 作者'),basic('duration','讲解时长'),basic('location','展厅位置','object',{fields:[basic('floor','楼层 / 区域'),basic('hall','展厅 / 具体位置')]})]}),basic('guide','参观服务信息','object',{help:'按项目填写参观所需信息；留空的项目不会展示。',fields:[basic('hours','开放时间','textarea',{rows:2}),basic('tickets','门票与预约','textarea',{rows:2}),basic('transport','交通方式','textarea',{rows:2}),basic('worth','游览建议','textarea',{rows:2}),basic('services','场馆服务','textarea',{rows:2}),basic('family','亲子参观','textarea',{rows:2}),basic('map','路线与导航提示','textarea',{rows:2}),basic('shop','商店与餐饮','textarea',{rows:2}),basic('accessibility','无障碍信息','textarea',{rows:2}),basic('exhibitions','展览信息','textarea',{rows:2}),basic('faq','常见问题','textarea',{rows:2}),basic('notices','重要提醒','textarea',{rows:2}),basic('sourceTitle','信息来源名称')]}),basic('articles','文史文章','array',{itemLabel:'文章',addLabel:'添加文章',fields:[basic('title','标题'),basic('date','日期'),basic('summary','摘要','textarea'),basic('cover','文章封面','image')]}),basic('deepDive','深度内容设置','deepDive',{help:'编辑免费预览与付费章节内容。'}),basic('status','发布状态','select',{options:'publish'})]},
  sampleItineraries:{label:'甄选路线',editorGroups:longEditorGroups.sampleItineraries,endpoint:'sampleItineraries',addLabel:'新增甄选路线',template:'itinerary',miniProgramDisplay:'小程序首页「甄选路线」卡片（最多展示前 4 条）；「查看全部甄选路线」进入列表，点击卡片查看行程详情。仅发布状态会显示。',columns:[['title','路线名称'],['days','天数'],['status','状态','status']],fields:[basic('id','甄选路线 ID','text',{required:true}),basic('title','路线名称','text',{required:true}),basic('tag','路线标签'),basic('days','天数','number'),basic('crowd','适合人群'),basic('cover','封面图片','image'),basic('summary','简介','textarea'),basic('itinerary','逐日行程','array',{itemLabel:'第',addLabel:'添加一天',help:'按天维护当天标题、所在城市、当天安排与关联景点；保存时自动按顺序记录第几天，不再需要手写 JSON。',fields:[basic('day','第几天','number',{min:1}),basic('title','当天标题','text',{required:true}),basic('city','所在城市'),basic('desc','当天安排','textarea'),basic('attractionIds','关联景点','multiselect',{options:'attractions'})]}),basic('status','发布状态','select',{options:'publish'})]},
  customTrips:{label:'定制行程订单',editorGroups:longEditorGroups.customTrips,endpoint:'customTrips',addLabel:'新增定制行程',template:'customTrip',miniProgramDisplay:'不进入小程序首页或公开行程列表。每条记录生成专属私密链接，客户通过分享链接在小程序「行程详情」页（token）或网页查看；停用后链接失效。',columns:[['client','客户 / 订单'],['period','出行日期'],['travelers','人数'],['status','状态','status']],fields:[basic('client','客户称呼','text',{required:true}),basic('title','行程标题'),basic('orderNo','订单编号'),basic('period','出行日期范围','daterange',{required:true}),basic('travelers','旅客人数'),basic('language','语种需求'),basic('vehicle','计划车型'),basic('guide','司导说明','textarea'),basic('totalFee','服务费'),basic('days','每日行程','json',{rows:10}),basic('notices','须知','json',{rows:5}),basic('status','状态','select',{options:[{label:'生效中',value:'active'},{label:'已停用',value:'archived'}]})]},
  destinationTypes:{label:'目的地分类',endpoint:'destinationCategories',addLabel:'新增分类',columns:[['name','分类'],['nameEn','英文名'],['sort','排序'],['enabled','状态','status']],fields:[basic('key','分类 Key','text',{required:true}),basic('name','简体名称','text',{required:true}),basic('nameTw','繁体名称'),basic('nameEn','英文名称'),basic('description','分类说明','textarea'),basic('sort','排序','number'),basic('enabled','启用','switch')]},
  homeBanners:{label:'首页 Banner',endpoint:'homeBanners',addLabel:'新增 Banner',columns:[['image','图片','image'],['title','标题'],['sort','排序'],['enabled','状态','status']],fields:[basic('title','标题','text',{required:true}),basic('description','图片替代文案','text',{required:true}),basic('alt','无障碍描述','text',{required:true}),basic('image','Banner 图片','image',{required:true}),basic('sort','排序','number'),basic('enabled','启用状态','switch')]},
  miniprogramBanners:{label:'小程序首页 Banner',endpoint:'miniprogramBanners',addLabel:'新增 Banner',columns:[['image','图片','image'],['title','标题'],['sort','排序'],['enabled','状态','status']],fields:[basic('title','Banner 标题','text',{required:true}),basic('description','图片替代文案','text',{required:true}),basic('alt','图片说明','text',{required:true}),basic('image','Banner 图片','image',{required:true}),basic('sort','排序','number'),basic('enabled','发布状态','switch')]},
  miniprogramServiceEntries:{label:'小程序首页服务入口',endpoint:'miniprogram-service-entries',addLabel:'新增服务入口',miniProgramDisplay:'小程序首页快捷服务区。仅允许配置 6 个固定入口 key；跳转路由由小程序端维护，后台不能填写任意链接。',columns:[['iconImage','图标','image',150],['title','标题'],['subtitle','副标题'],['key','入口标识'],['sort','排序'],['enabled','状态','status']],fields:[basic('key','固定入口','select',{required:true,options:[{label:'行程定制 · customization',value:'customization'},{label:'古迹讲解 · guide',value:'guide'},{label:'在地用车 · vehicle',value:'vehicle'},{label:'文史知识库 · knowledge',value:'knowledge'},{label:'希腊商旅 · business',value:'business'},{label:'出行指南 · travel-guide',value:'travel-guide'}],help:'每个固定入口只能配置一次；入口点击后的页面由小程序端决定。'}),basic('title','多语言标题','object',{required:true,fields:[basic('zh-CN','简体中文','text',{required:true}),basic('zh-TW','繁體中文','text',{required:true}),basic('en','English','text',{required:true})]}),basic('subtitle','多语言副标题','object',{required:true,fields:[basic('zh-CN','简体中文','text',{required:true}),basic('zh-TW','繁體中文','text',{required:true}),basic('en','English','text',{required:true})]}),basic('iconImage','入口图标','image',{required:true}),basic('sort','排序','number'),basic('enabled','启用状态','switch')]},
  heritageGuideBanners:{label:'古迹讲解 Banner',endpoint:'heritage-guide-banners',addLabel:'新增讲解 Banner',columns:[['image','图片','image'],['title','标题'],['description','描述'],['sort','排序'],['enabled','状态','status']],fields:[basic('title','Banner 标题','text',{required:true}),basic('description','Banner 描述','textarea',{rows:3}),basic('alt','图片替代文本'),basic('image','Banner 图片','image',{required:true}),basic('sort','排序','number'),basic('enabled','发布状态','switch')]},
  miniprogramTravelers:{label:'小程序出行人资料',endpoint:'miniprogramTravelers',addLabel:'新增出行人',columns:[['userNickname','所属用户'],['name','出行人'],['relation','关系'],['passportNo','证件号']],fields:[basic('userId','所属用户','select',{required:true,options:'users'}),basic('name','姓名','text',{required:true}),basic('relation','关系'),basic('passportNo','护照号码')]},
  miniprogramDocuments:{label:'小程序签证资料',endpoint:'miniprogramDocuments',addLabel:'新增签证资料',columns:[['userNickname','所属用户'],['name','资料名称'],['expiry','有效期'],['visaStatus','签证状态']],fields:[basic('userId','所属用户','select',{required:true,options:'users'}),basic('name','资料名称','text',{required:true}),basic('passportNo','护照号码'),basic('expiry','到期日期','date'),basic('visaStatus','签证状态')]},
  miniprogramCoupons:{label:'小程序优惠券',endpoint:'miniprogramCoupons',addLabel:'新增优惠券',template:'coupons',columns:[['userNickname','所属用户'],['title','优惠券'],['code','优惠码'],['expiresAt','有效期'],['status','状态','status']],fields:[basic('userId','所属用户','select',{required:true,options:'users'}),basic('title','优惠券名称','text',{required:true}),basic('description','使用说明','textarea'),basic('code','优惠码','code',{required:true}),basic('expiresAt','有效期','date'),basic('status','状态','select',{options:[{label:'有效',value:'active'},{label:'已使用',value:'used'},{label:'已过期',value:'expired'}]})]},
}
fields.cities={label:'城市与价格',endpoint:'cities',addLabel:'新增城市',columns:[['name','城市'],['id','城市 ID'],['priceCny','小程序讲解价格'],['currency','币种']],fields:[basic('id','城市 ID','text',{required:true,help:'与目的地的 cityId、景点的 city 完全一致；不要使用中文名替代 ID。'}),basic('name','城市名称','text',{required:true}),basic('nameTw','繁体名称'),basic('nameEn','英文名称'),basic('countryId','所属国家','select',{required:true,options:'countries'}),basic('status','城市状态','select',{options:[{label:'草稿（小程序不展示）',value:'draft'},{label:'发布',value:'published'},{label:'停用',value:'disabled'}]}),basic('enabled','小程序启用','switch'),basic('priceCny','讲解价格（元）','number',{help:'价格必须核对后填写；留空不能视为免费或 0 元。'}),basic('currency','币种','select',{options:[{label:'人民币 CNY',value:'CNY'},{label:'欧元 EUR',value:'EUR'}]})]}
fields.attractions.fields.find(x=>x.key==='exhibits').fields.unshift(basic('id','讲解点 ID'))
fields.attractions.fields.find(x=>x.key==='exhibits').fields.find(x=>x.key==='location').type='object'
fields.attractions.fields.find(x=>x.key==='exhibits').fields.find(x=>x.key==='location').label='位置'
fields.attractions.fields.find(x=>x.key==='exhibits').fields.find(x=>x.key==='location').fields=[basic('floor','楼层 / 区域'),basic('hall','展厅 / 位置')]
fields.attractions.fields.find(x=>x.key==='exhibits').fields.push(basic('image','讲解点图片','image'))
// Keep legacy translations in stored records, but only expose Simplified Chinese narrative fields for editing.
fields.attractions.fields.find(x=>x.key==='exhibits').fields.push(basic('description','简体介绍','textarea'),basic('sort','排序'),basic('routeOrder','路线位置'),basic('status','状态','select',{options:'publish'}))
fields.attractions.fields.find(x=>x.key==='guide').fields.push(basic('mapUrl','HTTPS 地图链接'),basic('sourceUrl','官网来源 HTTPS URL'),basic('verifiedAt','人工最后核对日期 YYYY-MM-DD'),basic('hoursHtml','开放时间富文本','richText'),basic('ticketsHtml','门票信息富文本','richText'),basic('transportHtml','交通信息富文本','richText'),basic('mapHtml','地图说明富文本','richText'))
fields.attractions.fields.push(basic('visitorSections','自定义参观板块','array',{itemLabel:'板块',addLabel:'新增自定义板块',help:'固定的开放时间、门票、交通、地图始终存在；这里可增加、排序与下架其他说明。',fields:[basic('id','板块 ID'),basic('title','简体标题'),basic('bodyHtml','简体富文本','richText'),basic('sort','排序','number'),basic('status','状态','select',{options:'publish'})]}))
fields.leads={label:'咨询 CRM',endpoint:'leads',columns:[['createdAt','提交时间','date'],['destination','目的地 / 主题'],['contact','联系方式'],['status','状态','status']],fields:[basic('leadType','咨询类型'),basic('contact','联系方式','text',{required:true}),basic('destination','目的地 / 主题'),basic('travelDate','出行日期','date'),basic('travelers','出行人数'),basic('requirements','服务需求','textarea'),basic('status','跟进状态','select',{options:[{label:'待处理',value:'new'},{label:'已联系',value:'contacted'},{label:'已报价',value:'quoted'},{label:'已完成',value:'closed'}]})]}
fields.guideBookings={label:'导游预约',endpoint:'leads',columns:[['createdAt','提交时间','date'],['bookingDate','预约日期','date'],['contact','联系方式'],['status','状态','status']],fields:[basic('contact','联系方式','text',{required:true}),basic('bookingDate','预约日期','date'),basic('serviceLength','服务时长'),basic('travelers','出行人数'),basic('requirements','服务需求','textarea'),basic('status','跟进状态','select',{options:[{label:'待处理',value:'new'},{label:'已联系',value:'contacted'},{label:'已报价',value:'quoted'},{label:'已完成',value:'closed'}]})]}
fields.miniProgramBookings={label:'小程序预约',endpoint:'leads',columns:[['createdAt','提交时间','date'],['destination','预约内容'],['contact','联系方式'],['status','状态','status']],fields:fields.guideBookings.fields}
fields.miniprogramTrips={label:'小程序行程',endpoint:'leads',columns:[['createdAt','提交时间','date'],['destination','主题'],['travelers','人数'],['status','状态','status']],fields:fields.leads.fields}
fields.miniprogramUsers={label:'小程序用户',endpoint:'miniprogram-users',columns:[['nickname','用户'],['phoneMasked','手机号'],['memberLabel','会员'],['createdAt','创建时间','date']],fields:[basic('nickname','用户昵称','text',{required:true}),basic('phone','手机号（选填）')]}
fields.miniprogramOrders={label:'订单管理',endpoint:'miniprogram-orders',editable:false,columns:[['orderNo','订单号'],['nickname','用户'],['productName','商品'],['amount','金额'],['status','状态','badge'],['createdAt','创建时间','date']],fields:[]}
fields.homeBanners.endpoint='home-banners'
fields.miniprogramBanners.endpoint='miniprogram-home-banners'
fields.miniprogramTravelers.endpoint='miniprogram-travelers'
fields.miniprogramDocuments.endpoint='miniprogram-documents'
fields.miniprogramCoupons.endpoint='miniprogram-coupons'
const settingTabs = [
  {name:'site',label:'站点与 SEO',description:'网站名称、默认 SEO、首页文案及联系信息。',fields:[basic('siteName','站点名称'),basic('siteUrl','站点正式网址'),basic('defaultTitle','默认页面标题'),basic('defaultDescription','默认 SEO 描述','textarea',{full:true}),basic('homeEyebrow','首页眉题'),basic('homeTitle','首页标题'),basic('homeDescription','首页描述','textarea',{full:true}),basic('keywords','关键词'),basic('googleVerification','Google 验证码'),basic('robotsPolicy','Robots 策略','select'),basic('wechat','微信号'),basic('phone','联系电话'),basic('email','联系邮箱'),basic('replyHours','回复承诺')]},
  {name:'share',label:'分享图片',description:'维护网站社交分享卡片使用的 OG 图片。',fields:[basic('ogImage','OG 分享图片','image',{full:true})]},
  {name:'knowledge',label:'景点讲解',description:'景点讲解试听时长与单景点永久讲解商品设置。',fields:[]},
  {name:'membership',label:'终身会员',description:'单独维护终身会员商品名称、价格、状态与币种。',fields:[]}
]
const templates = {
  country:{title:'国家资料模板',tip:'示例以希腊为例；请按实际国家名称、主图与排序修改。',values:{id:'greece',name:'希腊',nameTw:'希臘',nameEn:'Greece',sort:1,enabled:true,heroImage:'greece.webp'}},
  guide:{title:'导游资料模板',tip:'填写三种语言的姓名、职位与简介，并补齐资质、擅长方向和客户评价。',values:{id:'guide-demo',countryId:'greece',name:'李安娜',nameTw:'李安娜',nameEn:'Anna Li',role:'中文金牌导游',roleTw:'中文金牌導遊',roleEn:'Licensed Chinese-speaking guide',intro:'常驻雅典，专注古典文明与亲子文化体验。',introTw:'常駐雅典，專注古典文明與親子文化體驗。',introEn:'Athens-based guide specializing in classical history and family experiences.',location:'雅典及周边',wechat:'anna-greece',avatar:'guide-demo.webp',fullImage:'guide-demo.webp',eyebrow:'LOCAL EXPERT',proof:'希腊国家持证导游 · 中文服务 10 年',credentials:[{title:'国家持证导游',desc:'希腊官方导游资格，熟悉雅典卫城及国家考古博物馆。'}],directions:[{title:'古典文明深度讲解',subtitle:'雅典卫城与古 Agora',desc:'结合城邦历史与建筑细节，让遗址参观更有脉络。',suitable:'历史爱好者 / 首次到访',duration:'3 小时'}],reviews:[{quote:'讲解生动细致，孩子一路听得很投入。',name:'王女士',meta:'雅典亲子文化之旅'}],featured:true,enabled:false,sort:1}},
  route:{title:'路线填写模板',tip:'先确定目的地、天数和适合人群，再写路线亮点。',values:{title:'雅典 · 圣托里尼经典 8 日',kicker:'古典文明与爱琴海慢旅',days:8,tags:'首次到访 · 亲子 · 文化',desc:'从雅典卫城到圣托里尼日落，串联希腊文明与海岛风景。',image:'santorini.webp',status:'published'}},
  destination:{title:'目的地填写模板',tip:'中英文名称用于多语言页面，请保持拼写一致。',values:{name:'圣托里尼',en:'Santorini',type:'island',image:'santorini.webp',status:'published'}},
  attraction:{title:'景点填写模板',tip:'补充标准名称、城市、图片和可维护的讲解点。',values:{name:'雅典卫城',en:'Acropolis of Athens',city:'athens',cityName:'雅典',type:'landmark',category:'世界文化遗产',tags:'古典文明 · 建筑 · 亲子',image:'athens.webp',summary:'在帕特农神庙前读懂雅典城邦、神话与古典建筑。',highlights:[{name:'帕特农神庙',desc:'雅典卫城核心建筑，可结合建筑比例与城邦历史讲解。'}],exhibits:[{id:'demo-exhibit',name:'帕特农神庙',author:'古典时期',duration:'8 分钟',location:{floor:'山顶',hall:'卫城主殿'}}],guide:{},articles:[],deepDive:{preview:'',locked:[]},status:'published'}},
  itinerary:{title:'甄选路线填写模板',tip:'封面、天数与每日安排应相互匹配。',values:{title:'雅典深度文化 5 日',tag:'短途 · 中转',days:5,crowd:'首次到访 / 亲子 / 文化旅行',cover:'athens.webp',summary:'以雅典为中心安排卫城、博物馆与海岸线的舒缓旅程。',itinerary:[{day:1,title:'抵达雅典 · 城市初见',city:'雅典',desc:'机场接送后漫步普拉卡老城。',attractionIds:[]}],status:'published'}},
  customTrip:{title:'定制行程模板',tip:'示例日期为空；按与客户确认的信息选择日历日期。',values:{client:'张先生家庭',title:'张先生希腊亲子定制旅程',travelers:'2 位成人 + 1 位儿童',language:'中文普通话',vehicle:'七座奔驰商务车',guide:'中文金牌司导，兼顾亲子节奏与历史讲解。',days:[],notices:[],status:'active'}},
  coupons:{title:'优惠券填写模板',tip:'优惠码可自动生成；确认所属用户与有效期。',values:{title:'机场接送立减 €50',description:'适用于雅典机场至市区的首次接送服务。',code:'SY-AIRPORT-50',status:'active'}}
}
fields.countries.template='country'
fields.guides.template='guide'
const attractionEditorFieldGroups = [
  {key:'basic',label:'基础资料',eyebrow:'基础资料',description:'名称、城市、类型、标签和发布状态等基础信息。',fields:['name','en','originalName','city','cityName','type','category','sizeLabel','tags','status']},
  {key:'display',label:'景点展示',eyebrow:'景点展示',description:'小程序景点卡片和详情页使用的图片、简介与亮点。',fields:['image','summary','highlights']},
  {key:'exhibits',label:'讲解点',eyebrow:'讲解点与展品',description:'维护景点详情中的展品讲解点及其展厅位置。',fields:['exhibits']},
  {key:'visitor',label:'参观服务',eyebrow:'参观服务信息',description:'开放时间、门票、交通、游览建议、场馆服务与参观提醒。',fields:['guide']},
  {key:'stories',label:'文史内容',eyebrow:'文史与深度内容',description:'维护关联文章、免费预览和付费章节。',fields:['articles','deepDive']},
  {key:'destinations',label:'关联目的地',eyebrow:'目的地关联',description:'勾选景点所属的目的地；保存景点后同步关联关系。',fields:['linkedDestinationIds']}
]

export default {
  name:'AdminApp',
  data(){return{token:sessionStorage.getItem(TOKEN)||'',password:'',error:'',active:MENU_IDS.has(sessionStorage.getItem(ACTIVE_MENU))?sessionStorage.getItem(ACTIVE_MENU):'overview',guideVisible:false,guideGroups,settingsTab:'site',detailTab:'sections',detailPage:null,vehicleService:null,vehicleView:'list',detailLocales,vehicleOptionGroups,detailSectionKeys,detailVisitorKeys,detailExhibitFields,detailHighlightFields,detailRouteFields,detailAudioFields,detailAudioCategoryLabels,attractionView:'list',attractionEditorTab:'basic',recordEditorTab:'basic',vehicleConfigTab:'page',attractionDestinationFilter:'',destinationLinkSaving:{},data:JSON.parse(JSON.stringify(emptyData)),stats:{},commerce:{},settings:this.defaultSettings(),loading:false,busy:false,localAiEnabled:false,aiFillDialogVisible:false,aiFilling:false,aiTranslating:false,aiAttractionName:'',aiEntityType:'attraction',aiProgressMessage:'正在准备…',filterText:'',page:1,pageSize:10,pageSizes:[5,10,20,50,100],groupPages:{},filters:{enabled:'',featured:'',countryId:'',status:'',days:'',type:'',currency:'',priceCny:[null,null],city:'',tag:'',period:[],leadType:'',createdAt:[],bookingDate:[],member:'',productType:'',relation:'',visaStatus:'',expiry:[],expiresAt:[]},editor:null,editorBaseline:'',destinationAttractionSearch:'',destinationShowAllCities:false,selectedAttractionIds:[],batchBusy:false,publicationResults:[],publicationChecking:false,publicationCheckedAt:'',apiOrigin:window.location.origin,form:{},jsonFields:{},dateRange:[],jsonError:'',confirmVisible:false,confirmText:'',confirmHandler:null,menuGroups:groups,rowStatusOptions:[{label:'发布',value:'published'},{label:'下架',value:'unpublished'}],settingTabs}},
  computed:{
    editorDirty(){return Boolean(this.editor)&&this.editorState()!==this.editorBaseline},
    attractionEditorFieldGroups(){return attractionEditorFieldGroups},
    recordEditorGroups(){return this.editor?.editorGroups||[]},
    activeRecordEditorGroup(){return this.recordEditorGroups.find(group=>group.key===this.recordEditorTab)||null},
    activeAttractionEditorGroup(){return attractionEditorFieldGroups.find(group=>group.key===this.attractionEditorTab)||attractionEditorFieldGroups[0]},
    destinationFormLinks(){return this.destinationLinkState(this.form)},
    destinationAttractionOptions(){
      const selected=this.asArray(this.form.attractionIds),country=this.form.countryId||'greece',city=this.form.cityId||this.destinationFormLinks.cityId,q=this.destinationAttractionSearch.trim().toLowerCase()
      const items=(this.data.attractions||[]).filter(item=>(item.countryId||'greece')===country||selected.includes(item.id)).slice()
      for(const id of selected)if(!items.some(item=>item.id===id))items.push({id,name:'已失效景点 · '+id,status:'missing'})
      return items.filter(item=>(!city||this.destinationShowAllCities||item.city===city||selected.includes(item.id))&&(!q||[item.name,item.en,item.id].some(value=>String(value||'').toLowerCase().includes(q))))
    },
    allPageAttractionsSelected(){return this.paginatedItems.length>0&&this.paginatedItems.every(row=>this.selectedAttractionIds.includes(row.id))},
    activeGroupLabel(){const group=(this.menuGroups||[]).find(item=>item.items.some(entry=>entry[0]===this.active));return group&&group.label!=='共同数据'?group.label:''},
    currentMenu(){const pair=groups.flatMap(g=>g.items).find(item=>item[0]===this.active);const config=fields[this.active]||{};return{id:this.active,label:pair?pair[1]:'总览',icon:pair?pair[2]:'',...config,columns:(config.columns||[]).map(column=>({key:column[0],label:column[1],type:column[2],width:column[3]})),editable:config.editable!==false&&!!config.fields?.length,eyebrow:'CONTENT MANAGEMENT'}},
    aiEntityLabel(){return({attractions:'景点',routes:'路线',destinations:'目的地'})[this.aiEntityType]||'内容'},
    aiNameLabel(){return({attractions:'景点名称',routes:'路线名称',destinations:'目的地名称'})[this.aiEntityType]||'名称'},
    aiNamePlaceholder(){return({attractions:'例如：雅典卫城',routes:'例如：雅典古城与爱琴海 8 日游',destinations:'例如：圣托里尼'})[this.aiEntityType]||'请输入名称'},
    aiFillDescription(){return({attractions:'仅将名称发送至 SenseNova 6.8 Flash Lite。会生成基本资料、亮点、讲解点、参观服务、文史文章和深度内容；图片、关联及发布状态会保留。',routes:'仅将路线名称发送至 SenseNova 6.8 Flash Lite。会生成路线副标题、天数、主题标签和路线介绍；图片、目的地/行程关联及发布状态会保留。',destinations:'仅将目的地名称发送至 SenseNova 6.8 Flash Lite。会生成规范中英文名称和目的地分类；图片、城市/景点关联及发布状态会保留。'})[this.aiEntityType]||''},
    statusOptionsForCurrent(){const f=fields[this.active]?.fields?.find(x=>x.key==='status');return f?.options==='publish'?publish:(Array.isArray(f?.options)?f.options:this.rowStatusOptions)},
    vehicleInquiries(){return(this.data.leads||[]).filter(x=>x.leadType==='vehicle-consultation')},
    items(){if(this.active==='miniprogramTrips')return(this.data.leads||[]).filter(x=>this.isMiniBooking(x)&&['customization','business-travel'].includes(x.leadType));if(this.active==='cities')return this.data.cities;if(this.active==='leads')return this.data.leads;if(this.active==='guideBookings')return this.data.guideBookings;if(this.active==='miniProgramBookings')return this.data.miniProgramBookings;if(this.active==='miniprogramUsers')return this.data.miniprogramUsers;if(this.active==='miniprogramOrders')return this.data.miniprogramOrders;return this.data[this.active]||[]},
    attractionDestinationOptions(){return[{label:'未关联目的地',value:'__unassigned_destination__'},...(this.data.destinations||[]).filter(destination=>destination?.id).map(destination=>({value:String(destination.id),label:[destination.name||'未命名目的地',this.destinationCityLabel(destination),`destinationId: ${destination.id}`].join(' · ')}))]},
    associationDestinationOptions(){return(this.data.destinations||[]).filter(destination=>destination?.id).map(destination=>({value:String(destination.id),label:[destination.name||'未命名目的地',this.destinationCityLabel(destination)].join(' · ')}))},
    visibleAttractionGroups(){
      if(this.active!=='attractions')return[]
      const attractions=this.filteredItems
      const destinations=(this.data.destinations||[]).filter(destination=>destination?.id)
      const groups=destinations.map(destination=>{
        const linkedIds=new Set(this.destinationAttractionIds(destination))
        return{key:`destination:${destination.id}`,title:destination.name||'未命名目的地',destinationId:String(destination.id),cityId:String(destination.cityId||''),items:attractions.filter(attraction=>linkedIds.has(String(attraction.id||'')))}
      })
      const linkedAttractionIds=new Set(destinations.flatMap(destination=>this.destinationAttractionIds(destination)))
      const unassigned=attractions.filter(attraction=>!linkedAttractionIds.has(String(attraction.id||'')))
      const unassignedGroup={key:'destination:unassigned',title:'未关联目的地',destinationId:'',cityId:'',items:unassigned}
      let visible=groups.filter(group=>group.items.length>0)
      if(unassigned.length)visible.push(unassignedGroup)
      if(this.attractionDestinationFilter==='__unassigned_destination__')return[unassignedGroup]
      if(this.attractionDestinationFilter)return groups.filter(group=>group.destinationId===String(this.attractionDestinationFilter))
      return visible
    },
    availableFilters(){return(listFilterKeys[this.active]||[]).map(key=>{const type=listDateFilterKeys.includes(key)?'daterange':listNumberFilterKeys.includes(key)?'numberrange':'select';let options=[];if(type==='select'){if(['status','enabled'].includes(key))options=this.active==='miniprogramOrders'?[{label:'待支付',value:'pending'},{label:'已支付',value:'paid'},{label:'失败',value:'failed'},{label:'已关闭 / 过期',value:'expired'}]:this.statusOptionsForCurrent;else if(key==='featured')options=[{label:'首页推荐',value:true},{label:'普通展示',value:false}];else if(key==='member')options=[{label:'终身会员',value:'member'},{label:'普通用户',value:'regular'}];else{const values=[...new Set(this.items.map(row=>this.filterValue(row,key)).filter(value=>value!==''&&value!=null))];options=values.map(value=>({value,label:this.filterOptionLabel(key,value)})).sort((a,b)=>a.label.localeCompare(b.label,'zh-CN'))}}const label=key==='createdAt'&&['leads','guideBookings','miniProgramBookings','miniprogramTrips'].includes(this.active)?'提交日期':listFilterLabels[key]||key;return{key,type,label,options}}).filter(filter=>this.items.length>0&&(filter.type==='daterange'?this.items.some(row=>this.filterValue(row,filter.key)):filter.type==='numberrange'?this.items.some(row=>Number.isFinite(Number(this.filterValue(row,filter.key)))):(['status','enabled','featured','member'].includes(filter.key)||filter.options.length>1)))},
    hasActiveFilters(){return Boolean(this.filterText.trim())||Object.values(this.filters).some(value=>Array.isArray(value)?value.some(item=>item!==''&&item!=null):Boolean(value))},
    filteredItems(){const q=this.filterText.trim().toLowerCase();return this.items.filter(row=>{if(q&&!JSON.stringify(row).toLowerCase().includes(q))return false;for(const filter of this.availableFilters){const selected=this.filters[filter.key];if(filter.type==='daterange'){if(selected?.length===2&&!this.matchesDateRange(row,filter.key,selected))return false}else if(filter.type==='numberrange'){const raw=this.filterValue(row,filter.key);if(raw==null||raw===''||!Number.isFinite(Number(raw)))return false;const number=Number(raw);if((selected?.[0]!=null&&number<selected[0])||(selected?.[1]!=null&&number>selected[1]))return false}else if(selected!==''&&selected!=null&&String(this.filterValue(row,filter.key))!==String(selected))return false}return true})},
    currentPage(){return Math.min(this.page,Math.max(1,Math.ceil(this.filteredItems.length/this.pageSize)))},
    paginatedItems(){return this.filteredItems.slice((this.currentPage-1)*this.pageSize,this.currentPage*this.pageSize)},
    statCards(){return[{label:'已发布路线',value:this.stats.routes||0},{label:'目的地',value:this.stats.destinations||0},{label:'全部线索',value:this.stats.leads||0},{label:'待处理',value:this.stats.pendingLeads||0},{label:'导游预约',value:this.stats.guideBookings||0},{label:'小程序预约',value:this.stats.miniProgramBookings||0},{label:'已支付订单',value:this.commerce.totals?.paidOrderCount||0},{label:'终身会员',value:this.commerce.totals?.memberCount||0}]},
    commerceRows(){return[['today','今天'],['last7Days','近 7 天'],['last30Days','近 30 天']].map(([key,label])=>({label,...(this.commerce.windows?.[key]||{})}))},
    formRules(){const result={};(this.editor?.fields||[]).filter(f=>f.required).forEach(f=>{result[f.key]=[{required:true,message:'请填写'+f.label,trigger:'blur'}]});return result}
  },
  watch:{
    filterText(){this.resetPagination()},
    filters:{handler(){this.resetPagination()},deep:true},
    attractionDestinationFilter(){this.resetPagination()},
    attractionView(){this.resetPagination()},
    active(value){sessionStorage.setItem(ACTIVE_MENU,value);this.selectedAttractionIds=[]},
    paginatedItems(){this.selectedAttractionIds=[]},
  },
  created(){if(this.token){this.loadAll();this.checkLocalAiAvailability();if(this.active==='attractionDetailPage')this.loadDetailPage();if(this.active==='vehicleService')this.loadVehicleService()}},
  mounted(){window.addEventListener('beforeunload',this.handleBeforeUnload)},
  beforeDestroy(){window.removeEventListener('beforeunload',this.handleBeforeUnload)},
  updated(){this.applyTagCaps()},
  methods:{
    attractionEditorFieldGroup(fieldKey){const group=attractionEditorFieldGroups.find(item=>item.fields.includes(fieldKey));return group?.key||'basic'},
    recordEditorFieldGroup(fieldKey){const group=this.recordEditorGroups.find(item=>item.fields.includes(fieldKey));return group?.key||''},
    focusRecordEditorTab(index){const groups=this.recordEditorGroups;const count=groups.length;if(!count)return;const target=groups[(index+count)%count];this.recordEditorTab=target.key;this.$nextTick(()=>this.$el.querySelector('#record-editor-tab-'+target.key)?.focus())},
    focusAttractionTab(index){const count=attractionEditorFieldGroups.length;const target=attractionEditorFieldGroups[(index+count)%count];this.attractionEditorTab=target.key;this.$nextTick(()=>this.$el.querySelector('#attraction-editor-tab-'+target.key)?.focus())},
    destinationCityLabel(destination){const cityId=String(destination.cityId||'').trim(),city=(this.data.cities||[]).find(item=>item.id===cityId);return cityId?(city?`城市：${city.name||cityId} (${cityId})`:`城市主数据缺失 (${cityId})`):'未关联城市 ID'},
    // 多选控件默认只折叠为 1 个标签；此处改为最多显示 5 个，超出部分用内联“+N”标签折叠。
    applyTagCaps(){const hosts=this.$el?Array.from(this.$el.querySelectorAll('[data-tag-cap]')):[];hosts.forEach((host)=>{const tagsBox=host.querySelector('.el-select__tags');if(!tagsBox)return;const max=Number(host.getAttribute('data-tag-max'))||5;const count=Number(host.getAttribute('data-tag-cap'))||0;const sizeClass=host.classList.contains('el-select--mini')||host.classList.contains('el-select--small')?'el-tag--mini':'el-tag--small';const tags=Array.from(tagsBox.querySelectorAll('.el-tag')).filter(node=>!node.classList.contains('sy-tag-cap'));tags.forEach((tag,index)=>{tag.style.display=index>=max?'none':''});let chip=tagsBox.querySelector('.sy-tag-cap');if(count>max){if(!chip){chip=document.createElement('span');const input=tagsBox.querySelector('input');if(input)tagsBox.insertBefore(chip,input);else tagsBox.appendChild(chip)}chip.className=`el-tag el-tag--info ${sizeClass} sy-tag-cap`;chip.textContent=`+${count-max}`}else if(chip){chip.remove()}})},
    imageGuidance(entity,key,nestedKey,required=false){const lookup=`${entity}.${nestedKey?`${key}.${nestedKey}`:key}`;const size=imageGuidanceByField[lookup]||'建议使用清晰、主体居中的横图；预览区域会显示实际上传结果。';return `${required?'必填':'选填'} · ${size} 支持 PNG / JPG / WebP，单张最大 6MB。`},
    rowKey(row){return row.id||row.key||row.orderNo||row.openid||undefined},
    destinationAttractionIds(destination){
      const hasExplicitIds=Array.isArray(destination.attractionIds)||Object.prototype.hasOwnProperty.call(destination,'attractionId')
      if(hasExplicitIds){const ids=Array.isArray(destination.attractionIds)?destination.attractionIds:(destination.attractionId?[destination.attractionId]:[]);return ids.map(id=>String(id??'')).filter(Boolean)}
      const cityId=String(destination.cityId||'').trim()
      return cityId?(this.data.attractions||[]).filter(attraction=>String(attraction.city||'')===cityId).map(attraction=>String(attraction.id||'')).filter(Boolean):[]
    },
    destinationLinkState(row={}){
      const country=row.countryId||'greece',cities=(this.data.cities||[]).filter(item=>(item.countryId||'greece')===country&&item.status!=='archived'),attractions=(this.data.attractions||[]).filter(item=>(item.countryId||'greece')===country&&item.status==='published')
      const configured=Object.prototype.hasOwnProperty.call(row,'attractionIds')||Object.prototype.hasOwnProperty.call(row,'attractionId'),requested=[...new Set((Array.isArray(row.attractionIds)?row.attractionIds:typeof row.attractionIds==='string'?this.listValue(row.attractionIds):row.attractionId?[row.attractionId]:[]).map(id=>String(id||'').trim()).filter(Boolean))],valid=requested.filter(id=>attractions.some(item=>item.id===id)),explicit=String(row.cityId||'').trim()
      let city=cities.find(item=>item.id===(explicit||row.id))
      if(!city)city=valid.map(id=>cities.find(item=>item.id===attractions.find(attraction=>attraction.id===id)?.city)).find(Boolean)
      const ids=configured?valid:city?attractions.filter(item=>item.city===city.id).map(item=>item.id):[],issues=[]
      if(!city)issues.push('未关联有效城市：请在第 1 步选择城市；没有该城市时先到「城市与价格」新增。')
      else if(city.enabled===false||['disabled','inactive','archived','draft'].includes(String(city.status||'').trim().toLowerCase()))issues.push('城市处于停用或草稿状态，小程序会隐藏该目的地；请到「城市与价格」检查。')
      if(!ids.length)issues.push(requested.length?'已选景点均不可公开：可能未发布、已删除或属于其他国家，请至少关联一个已发布景点。':'尚未关联景点：请在第 2 步勾选至少一个已发布景点。')
      if(this.data.destinationTypes.length&&!this.data.destinationTypes.some(item=>item.id===row.type&&item.enabled!==false))issues.push('分类未启用或不存在：请检查下方「分类」是否为已启用的目的地分类 key。')
      if(row.status!=='published')issues.push('目的地尚未发布：完善关联后，将下方「发布状态」设为发布再保存。')
      return{cityId:city?.id||'',attractionIds:ids,requestedIds:requested,linkedCount:configured?requested.length:ids.length,publicCount:ids.length,issues,ready:issues.length===0,label:!city?'待选择城市':issues.some(issue=>issue.startsWith('城市处于'))?'城市待启用':!ids.length?'待关联已发布景点':issues.some(issue=>issue.startsWith('分类未'))?'分类待启用':row.status!=='published'?'目的地未发布':'关联已就绪'}
    },
    destinationAttractionName(id){return(this.data.attractions||[]).find(item=>item.id===id)?.name||'已失效 · '+id},
    destinationAttractionNote(item){const city=(this.data.cities||[]).find(city=>city.id===item.city);return[(item.countryId||'greece')!==(this.form.countryId||'greece')?'其他国家':item.status==='published'?'已发布':item.status==='missing'?'记录不存在':'未发布 / 下架',city?.name||item.city||'未填城市'].join(' · ')},
    removeDestinationAttraction(id){if(!this.busy)this.$set(this.form,'attractionIds',this.asArray(this.form.attractionIds).filter(value=>value!==id))},
    editDestinationLinks(row){this.openEditor(row,false);this.$nextTick(()=>{this.$refs.destinationLinks?.scrollIntoView({behavior:'smooth',block:'start'});this.$refs.destinationLinks?.focus({preventScroll:true})})},
    async confirmDestinationPublish(row){const state=this.destinationLinkState(row);return row.status!=='published'||state.ready||await this.confirm('该目的地尚未满足展示条件：\n'+state.issues.join('\n')+'\n\n可以先保存资料再完善关联。确认仍要保存吗？')},
    linkedDestinationIdsForAttraction(attractionId){if(!attractionId)return[];const id=String(attractionId);return(this.data.destinations||[]).filter(destination=>this.destinationAttractionIds(destination).includes(id)).map(destination=>String(destination.id))},
    async syncAttractionDestinationLinks(attractionId,requestedIds){
      if(!attractionId)throw new Error('景点 ID 缺失，无法保存关联')
      const validIds=new Set(this.associationDestinationOptions.map(option=>option.value))
      const desired=new Set((Array.isArray(requestedIds)?requestedIds:[]).map(String).filter(id=>validIds.has(id)))
      const changes=(this.data.destinations||[]).filter(destination=>destination?.id).map(destination=>{
        const id=String(destination.id),before=this.destinationAttractionIds(destination),has=before.includes(String(attractionId)),want=desired.has(id)
        if(has===want)return null
        const after=want?[...new Set([...before,String(attractionId)])]:before.filter(item=>item!==String(attractionId))
        return{ id,before,after }
      }).filter(Boolean)
      const applied=[]
      try{for(const change of changes){await this.request('/admin/destinations/'+encodeURIComponent(change.id),{method:'PATCH',body:JSON.stringify({attractionIds:change.after,attractionId:change.after[0]||''})});applied.push(change)}}
      catch(error){let rollbackError=null;for(const change of applied.reverse()){try{await this.request('/admin/destinations/'+encodeURIComponent(change.id),{method:'PATCH',body:JSON.stringify({attractionIds:change.before,attractionId:change.before[0]||''})})}catch(rollback){rollbackError=rollback}}if(rollbackError)throw new Error(error.message+'；部分关联回滚失败，请重新加载核对');throw error}
    },
    newExperience(item={}){return{id:'',title:'',label:'',nameEn:'',subtitle:'',shareType:'',desc:'',image:'',notice:'',status:'published',enabled:true,...item,points:Array.isArray(item.points)?item.points:[]}},
    settingListText(item){return typeof item==='string'?item:item?.text??item?.title??''},
    weatherTemperature(city){return city.temperature??city.temp??''},
    updateSettingListText(list,index,value){const item=list[index];if(item&&typeof item==='object')this.$set(item,Object.prototype.hasOwnProperty.call(item,'text')?'text':'title',value);else this.$set(list,index,value)},
    updateWeatherTemperature(city,value){this.$set(city,Object.prototype.hasOwnProperty.call(city,'temperature')?'temperature':Object.prototype.hasOwnProperty.call(city,'temp')?'temp':'temperature',value)},
    defaultSettings(){return{siteName:'',siteUrl:'',defaultTitle:'',defaultDescription:'',homeEyebrow:'',homeTitle:'',homeDescription:'',keywords:'',ogImage:'',googleVerification:'',robotsPolicy:'index,follow',wechat:'',phone:'',email:'',replyHours:'',experiences:[],travelTools:{visa:{title:'',summary:'',url:'',checklist:[]},eurCny:null,rateUpdatedAt:'',rateSource:'',weatherCities:[],weatherUpdatedAt:''},miniprogramKnowledge:{trialSeconds:60,products:{attraction:{name:'单景点永久讲解',price:19.9,enabled:true,currency:'CNY'},membership:{name:'终身会员',price:99,enabled:true,currency:'CNY'}}}}},
    async request(path,options={}){const headers={...(typeof Blob!=='undefined'&&options.body instanceof Blob?{}:{'Content-Type':'application/json'}),...(this.token?{Authorization:'Bearer '+this.token}:{}),...(options.headers||{})};const response=await fetch('/api'+path,{...options,headers});const contentType=response.headers.get('content-type')||'',isJson=/\bapplication\/(?:[\w.+-]*\+)?json\b/i.test(contentType);let result=null;if(response.status!==204&&isJson){try{result=await response.json()}catch{throw new Error(`接口 /api${path} 返回无效 JSON（HTTP ${response.status}）`)}}if(response.status===401&&path!=='/auth/login'){this.logout(true);throw new Error('登录已过期，请重新登录')}if(response.status!==204&&!isJson)throw new Error(`接口 /api${path} 返回非 JSON（HTTP ${response.status}，${contentType||'未提供 Content-Type'}${response.redirected?'，发生跳转':''}），请检查接口部署和上传大小限制`);if(!response.ok)throw new Error(result?.error||'请求失败（'+response.status+'）');return result},
    async checkLocalAiAvailability(){try{const result=await this.request('/admin/ai-fill/status');this.localAiEnabled=result?.enabled===true}catch{this.localAiEnabled=false}},
    openAiFillDialog(){this.aiEntityType=this.active;this.aiAttractionName=this.active==='routes'?(this.form.title||''):(this.form.name||'');this.aiFillDialogVisible=true;this.$nextTick(()=>this.$refs.aiAttractionNameInput?.focus())},
    async submitAiFill(){
      const name=this.aiAttractionName.trim();if(!name||this.aiFilling)return
      this.aiFilling=true;this.aiProgressMessage='正在连接 SenseNova…'
      try{
        const contentType=({attractions:'attraction',routes:'route',destinations:'destination'})[this.aiEntityType]||'attraction'
        const response=await fetch('/api/admin/ai-fill',{method:'POST',headers:{'Content-Type':'application/json',...(this.token?{Authorization:'Bearer '+this.token}:{})},body:JSON.stringify({type:contentType,name})})
        if(response.status===401){this.logout(true);throw new Error('登录已过期，请重新登录')}
        if(!response.ok){let failure={};try{failure=await response.json()}catch{};throw new Error(failure.error||'请求失败（'+response.status+'）')}
        if(!response.body?.getReader)throw new Error('当前浏览器不支持实时反馈，请更新浏览器后重试')
        const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',draft=null,streamError=null
        const consume=eventText=>{const event=eventText.split(/\r?\n/).find(line=>line.startsWith('event:'))?.slice(6).trim();const data=eventText.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)return;let value;try{value=JSON.parse(data)}catch{return}if(event==='progress'&&typeof value.message==='string')this.aiProgressMessage=value.message;if(event==='result')draft=value.data||{};if(event==='error')streamError=new Error(value.error||'AI 服务暂不可用')}
        while(true){const{value,done}=await reader.read();buffer+=decoder.decode(value||new Uint8Array(),{stream:!done});let boundary;while((boundary=buffer.search(/\r?\n\r?\n/))>=0){const eventText=buffer.slice(0,boundary),separator=buffer.slice(boundary).match(/^\r?\n\r?\n/)[0];buffer=buffer.slice(boundary+separator.length);consume(eventText)}if(done)break}
        if(buffer.trim())consume(buffer)
        if(streamError)throw streamError
        if(!draft)throw new Error('AI 实时连接已结束，但没有收到完整资料，请重试')
        if(this.aiEntityType==='routes'){
          ;['title','kicker','tags','desc'].forEach(key=>{if(typeof draft[key]==='string'&&draft[key].trim())this.$set(this.form,key,draft[key])})
          if(Number.isInteger(draft.days)&&draft.days>0)this.$set(this.form,'days',draft.days)
        }else if(this.aiEntityType==='destinations'){
          ;['name','en','type'].forEach(key=>{if(typeof draft[key]==='string'&&draft[key].trim())this.$set(this.form,key,draft[key])})
        }else{
        const textKeys=['name','en','originalName','cityName','type','category','sizeLabel','tags','summary'];textKeys.forEach(key=>{if(typeof draft[key]==='string'&&draft[key].trim())this.$set(this.form,key,draft[key])})
        if(draft.cityName){const normalize=value=>String(value||'').trim().toLocaleLowerCase();const city=(this.data.cities||[]).find(item=>[item.name,item.nameTw,item.nameEn,item.id].some(value=>normalize(value)===normalize(draft.cityName)));if(city)this.$set(this.form,'city',city.id)}
        const mergeArray=(key,rows,merge)=>{if(!Array.isArray(rows)||!rows.length)return;const existing=Array.isArray(this.form[key])?this.form[key]:[];this.$set(this.form,key,[...rows.map((entry,index)=>merge(existing[index]||{},entry)),...existing.slice(rows.length)])}
        mergeArray('highlights',draft.highlights,(existing,entry)=>({...existing,...entry}))
        mergeArray('exhibits',draft.exhibits,(existing,entry)=>({...existing,...entry,location:{...(existing.location||{}),...(entry.location||{})}}))
        if(draft.guide&&typeof draft.guide==='object'){const guide={...(this.form.guide||{})};Object.entries(draft.guide).forEach(([key,value])=>{if(typeof value==='string'&&value.trim())guide[key]=value});this.$set(this.form,'guide',guide)}
        mergeArray('articles',draft.articles,(existing,entry)=>({...existing,...entry}))
        if(draft.deepDive&&typeof draft.deepDive==='object'){const existing=this.form.deepDive||{preview:'',locked:[]};const locked=Array.isArray(draft.deepDive.locked)?draft.deepDive.locked:[];this.$set(this.form,'deepDive',{...existing,...(draft.deepDive.preview?{preview:draft.deepDive.preview}:{}),locked:locked.length?[...locked,...(Array.isArray(existing.locked)?existing.locked.slice(locked.length):[])]:existing.locked||[]})}
        }
        this.aiFillDialogVisible=false;this.$message.success('AI 资料已填入，请核实内容后再保存')
      }catch(error){this.$message.error('智能填写失败：'+error.message)}finally{this.aiFilling=false}
    },
    async translateAudioTrack(){
      if(this.aiTranslating||this.busy)return
      const title=String(this.form.title||'').trim(),description=String(this.form.description||'').trim()
      if(!title){this.$message.warning('请先填写简体标题');return}
      const editor=this.editor
      this.aiTranslating=true
      try{
        const result=await this.request('/admin/audio-track-translation',{method:'POST',body:JSON.stringify({title,description})})
        if(this.editor!==editor||this.active!=='audioTracks'||String(this.form.title||'').trim()!==title||String(this.form.description||'').trim()!==description){this.$message.warning('简体内容已改变，请重新点击自动翻译');return}
        ;['titleTw','titleEn','descriptionTw','descriptionEn'].forEach(key=>this.$set(this.form,key,result?.[key]||''))
        this.$message.success('繁体与英文标题、简介已自动翻译，请核对后保存')
      }catch(error){this.$message.error('自动翻译失败：'+error.message)}finally{this.aiTranslating=false}
    },
    async login(){if(!this.password){this.error='请输入管理员密码';return}this.busy=true;this.error='';try{const result=await this.request('/auth/login',{method:'POST',body:JSON.stringify({password:this.password})});this.token=result.token;sessionStorage.setItem(TOKEN,result.token);await Promise.all([this.loadAll(),this.checkLocalAiAvailability()])}catch(e){this.error=e.message}finally{this.busy=false}},
    async logout(force=false){if(force!==true&&!await this.canLeaveEditor())return;sessionStorage.removeItem(TOKEN);this.token='';this.localAiEnabled=false;this.data=JSON.parse(JSON.stringify(emptyData));if(force!==true)this.resetEditor()},
    async selectMenu(id){if(!await this.canLeaveEditor()){this.$refs.sideMenu?.updateActiveIndex(this.active);return false}this.active=id;this.resetEditor();this.filterText='';this.attractionDestinationFilter='';this.attractionView='list';this.vehicleView='list';this.clearFilterValues();this.resetPagination();if(id==='attractionDetailPage')this.loadDetailPage();if(id==='vehicleService')this.loadVehicleService();return true},
    async openGuideEntry(entry){if(!entry?.menu)return;const opened=await this.selectMenu(entry.menu);if(!opened)return;if(entry.filter)this.$set(this.filters,entry.filter.key,entry.filter.value);this.page=1;this.guideVisible=false},
    async loadDetailPage(){try{this.detailPage=await this.request('/admin/attraction-detail-page')}catch(e){this.$message.error('景点详情配置加载失败：'+e.message)}},
    normalizeVehicle(value){const locales=['','Tw','En'];const service=value&&typeof value==='object'&&!Array.isArray(value)?value:{};['title','subtitle','description','note','disclaimer'].forEach(field=>locales.forEach(suffix=>{if(typeof service[field+suffix]!=='string')this.$set(service,field+suffix,'')}));['tags','tagsTw','tagsEn'].forEach(key=>{if(!Array.isArray(service[key]))this.$set(service,key,[])});if(!Array.isArray(service.images))this.$set(service,'images',[]);if(typeof service.sort!=='number')this.$set(service,'sort',1);if(typeof service.enabled!=='boolean')this.$set(service,'enabled',true);if(!service.options||typeof service.options!=='object'||Array.isArray(service.options))this.$set(service,'options',{});vehicleOptionGroups.forEach(group=>{if(!Array.isArray(service.options[group.key]))this.$set(service.options,group.key,[]);service.options[group.key].forEach(item=>{['label','labelTw','labelEn'].forEach(key=>{if(typeof item[key]!=='string')this.$set(item,key,'')});if(typeof item.sort!=='number')this.$set(item,'sort',1);if(typeof item.enabled!=='boolean')this.$set(item,'enabled',true);if(!item.id)this.$set(item,'id',group.key+'-'+Date.now().toString(36))})});if(!service.form||typeof service.form!=='object'||Array.isArray(service.form))this.$set(service,'form',{});['title','tip','dateLabel','durationLabel','vehicleLabel','peopleLabel','routeLabel','contactLabel','submitLabel','routePlaceholder','phonePlaceholder','wechatPlaceholder'].forEach(key=>{if(typeof service.form[key]!=='string')this.$set(service.form,key,'')});['contactPhone','contactWechat','routeRequired'].forEach(key=>{if(typeof service.form[key]!=='boolean')this.$set(service.form,key,true)});if(typeof service.form.dateStart!=='string')this.$set(service.form,'dateStart','today');if(typeof service.form.dateEnd!=='string')this.$set(service.form,'dateEnd','');return service},
    async loadVehicleService(){try{this.vehicleService=this.normalizeVehicle(await this.request('/admin/vehicle-service'))}catch(e){this.$message.error('在地用车配置加载失败：'+e.message)}},
    async saveVehicleService(){if(!this.vehicleService)return;try{this.busy=true;this.vehicleService=this.normalizeVehicle(await this.request('/admin/vehicle-service',{method:'PATCH',body:JSON.stringify(this.vehicleService)}));this.$message.success('在地用车配置已保存')}catch(e){this.$message.error(e.message)}finally{this.busy=false}},
    vehicleOption(group){if(!this.vehicleService)return[];if(!this.vehicleService.options||typeof this.vehicleService.options!=='object')this.$set(this.vehicleService,'options',{});if(!Array.isArray(this.vehicleService.options[group]))this.$set(this.vehicleService.options,group,[]);return this.vehicleService.options[group]},
    addVehicleOption(group){const list=this.vehicleOption(group);list.push({id:group+'-'+Date.now().toString(36),label:'',labelTw:'',labelEn:'',sort:list.length+1,enabled:true})},
    removeVehicleOption(group,index){this.vehicleOption(group).splice(index,1)},
    moveVehicleOption(group,index,offset){const list=this.vehicleOption(group);const target=index+offset;if(target<0||target>=list.length)return;const moved=list.splice(index,1)[0];list.splice(target,0,moved);list.forEach((item,itemIndex)=>{item.sort=itemIndex+1})},
    addVehicleTag(){if(!this.vehicleService)return;if(!Array.isArray(this.vehicleService.tags))this.$set(this.vehicleService,'tags',[]);this.vehicleService.tags.push('')},
    removeVehicleTag(index){if(!this.vehicleService)return;if(Array.isArray(this.vehicleService.tags)&&index<this.vehicleService.tags.length)this.vehicleService.tags.splice(index,1)},
    async uploadVehicleImage(req){try{if(!/^image\/(png|jpeg|webp)$/.test(req.file.type))throw new Error('仅支持 PNG、JPG 或 WebP 图片');if(req.file.size>6*1024*1024)throw new Error('图片大小需在 6MB 以内');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(req.file)});const result=await this.request('/admin/upload-image',{method:'POST',body:JSON.stringify({name:req.file.name,type:req.file.type,data,prefix:'vehicle',updateSettings:false})});if(!Array.isArray(this.vehicleService.images))this.$set(this.vehicleService,'images',[]);this.vehicleService.images.push(result.path);this.$message.success('图片上传成功');req.onSuccess(result)}catch(e){this.$message.error('图片上传失败：'+e.message);req.onError(e)}},
    async reloadAll(){if(!await this.canLeaveEditor())return;this.editorBaseline=this.editorState();sessionStorage.setItem(ACTIVE_MENU,this.active);location.reload()},
    editDestinationGroup(id){const destination=(this.data.destinations||[]).find(item=>String(item.id)===String(id));if(!destination)return;this.active='destinations';this.filterText='';this.clearFilterValues();this.resetPagination();this.openEditor(destination,false)},
    startCreateAttractionForGroup(destinationId){this.active='attractions';this.startCreate();this.$set(this.form,'linkedDestinationIds',destinationId?[String(destinationId)]:[])},
    clearFilterValues(){Object.keys(this.filters).forEach(key=>this.$set(this.filters,key,listDateFilterKeys.includes(key)?[]:listNumberFilterKeys.includes(key)?[null,null]:''))},
    resetFilters(){this.filterText='';this.attractionDestinationFilter='';this.clearFilterValues();this.resetPagination()},
    resetPagination(){this.page=1;this.groupPages={};this.selectedAttractionIds=[]},
    changePageSize(size){this.pageSize=size;this.resetPagination()},
    groupPage(group){return Math.min(this.groupPages[group.key]||1,Math.max(1,Math.ceil(group.items.length/this.pageSize)))},
    groupPageItems(group){const page=this.groupPage(group);return group.items.slice((page-1)*this.pageSize,page*this.pageSize)},
    setNumberBound(key,index,value){const bounds=(this.filters[key]||[null,null]).slice();this.$set(bounds,index,value===''||value==null?null:Number(value));this.$set(this.filters,key,bounds)},
    filterValue(row,key){if(key==='status')return this.rowStatus(row);if(key==='enabled')return row.enabled===false?'unpublished':'published';if(key==='member')return row.member?'member':'regular';return row[key]},
    filterOptionLabel(key,value){if(key==='status'||key==='enabled')return this.statusLabel(value);if(key==='featured')return value?'首页推荐':'普通展示';if(key==='member')return value==='member'?'终身会员':'普通用户';const labels={customization:'定制行程', 'business-travel':'商务出行','guide-booking':'导游预约','vehicle-consultation':'用车咨询','mini-program-booking':'小程序预约',landmark:'景点',museum:'博物馆',published:'发布',unpublished:'下架'};if(key==='leadType'||key==='type')return labels[value]||this.displayValue(value);return this.displayValue(value)},
    matchesDateRange(row,key,range){const value=this.filterValue(row,key);if(!value)return false;const start=range[0],end=range[1];let from='',to='';if(key==='period'){const raw=String(value).trim();const compact=raw.match(/^(\d{4})(\d{2})(\d{2})\s*[~～至—–]\s*(?:(\d{4}))?(\d{2})(\d{2})$/);if(compact){from=`${compact[1]}-${compact[2]}-${compact[3]}`;const year=Number(compact[4]||compact[1])+(compact[4]?0:Number(compact[5]+compact[6])<Number(compact[2]+compact[3])?1:0);to=`${year}-${compact[5]}-${compact[6]}`}else{const parts=raw.split(/\s*[~～至—–]\s*/);from=String(parts[0]||'').slice(0,10);to=String(parts[1]||parts[0]||'').slice(0,10)}}else from=to=String(value).slice(0,10);return Boolean(from&&to&&from<=end&&to>=start)},
    async loadAll(){if(!this.token)return;this.selectedAttractionIds=[];this.loading=true;const keys=Object.keys(routes);const results=await Promise.allSettled(keys.map(key=>this.request(routes[key])));results.forEach((res,i)=>{if(res.status!=='fulfilled')return;const key=keys[i],value=res.value;if(key==='stats'){this.stats=value||{};this.commerce=value?.commerce||{};return}if(key==='settings'){const defaults=this.defaultSettings();const tools=value?.travelTools&&typeof value.travelTools==='object'&&!Array.isArray(value.travelTools)?value.travelTools:{};const visa=tools.visa&&typeof tools.visa==='object'&&!Array.isArray(tools.visa)?tools.visa:{};this.settings={...defaults,...value,experiences:Array.isArray(value?.experiences)?value.experiences.map(item=>this.newExperience(item)):[],travelTools:{...defaults.travelTools,...tools,visa:{...defaults.travelTools.visa,...visa,checklist:Array.isArray(visa.checklist)?visa.checklist:[]},weatherCities:Array.isArray(tools.weatherCities)?tools.weatherCities.map(city=>({id:'',name:'',condition:'',...city})):[]},miniprogramKnowledge:{...defaults.miniprogramKnowledge,...(value?.miniprogramKnowledge||{}),products:{...defaults.miniprogramKnowledge.products,...(value?.miniprogramKnowledge?.products||{})}}};for(const product of ['attraction','membership'])this.settings.miniprogramKnowledge.products[product]={...defaults.miniprogramKnowledge.products[product],...(this.settings.miniprogramKnowledge.products[product]||{})};return}const rows=Array.isArray(value)?value:(value?.items||[]);if(key==='destinationTypes')this.data.destinationTypes=rows.map(x=>({...x,id:x.key||x.id,enabled:x.enabled!==false}));else this.data[key]=rows;if(key==='leads'){this.data.guideBookings=rows.filter(x=>x.leadType==='guide-booking'||Boolean(x.guideSlug));this.data.miniProgramBookings=rows.filter(x=>this.isMiniBooking(x))}});const failure=results.find(x=>x.status==='rejected');if(failure&&this.token)this.$message.error('部分数据加载失败：'+failure.reason.message);this.loading=false},
    openWebsite(){window.open('/','_blank','noopener')},
    statusLabel(value){return({published:'发布',unpublished:'下架',active:'生效中',archived:'已停用',new:'待处理',contacted:'已联系',quoted:'已报价',closed:'已完成',paid:'已支付',pending:'待支付',failed:'失败',expired:'已过期',used:'已使用'})[value]||value||'—'},
    statusTone(value){return value==='new'?'warning':(['published','active','paid','closed'].includes(value)?'success':'info')},
    rowStatus(row){let value=row.status;if(this.active==='countries'||this.active==='guides'||this.active==='destinationTypes'||this.active==='homeBanners'||this.active==='miniprogramBanners'||this.active==='miniprogramServiceEntries'||this.active==='heritageGuideBanners')value=row.enabled===false?'unpublished':'published';if(['leads','guideBookings','miniProgramBookings','miniprogramTrips'].includes(this.active))return row.status||'new';return value||'unpublished'},
    listValue(value){return Array.isArray(value)?value:(typeof value==='string'?value.split(/[,，、\s]+/).filter(Boolean):[])},
    tagValues(value){const values=Array.isArray(value)?value:(typeof value==='string'?value.split(/[,，、·•‧\s]+/):[]);return values.map(tag=>String(tag??'').trim()).filter(tag=>tag&&!/^[·•‧]+$/.test(tag))},
    displayValue(value){if(value===true)return'启用';if(value===false)return'停用';if(Array.isArray(value))return value.map(x=>typeof x==='object'?(x.name||x.title||''):x).join('、')||'—';if(value&&typeof value==='object')return value.title||value.name||JSON.stringify(value);return value||'—'},
    localizedText(value){return value&&typeof value==='object'?(value['zh-CN']||value['zh-TW']||value.en||'—'):this.displayValue(value)},
    imageCellTitle(row,column){const value=column.titleKey?row[column.titleKey]:row.title||row.name||row.id;return this.localizedText(value)},
    dateTime(value){return value?new Date(value).toLocaleString('zh-CN'):'—'},money(value){return Number(value||0).toFixed(2)+' 元'},
    assetUrl(path){return adminAssetUrl(path)},
    isMiniBooking(lead){return['miniprogram','wechat-miniprogram'].includes(lead.platform)||['miniprogram','wechat-miniprogram'].includes(lead.source)||lead.leadType==='mini-program-booking'},
    resolveOptions(value){if(value==='cities')return(this.data.cities||[]).filter(item=>(item.countryId||'greece')===(this.form.countryId||'greece')).map(item=>({value:item.id,label:[item.name||item.id,item.nameEn||item.en,`cityId: ${item.id}`,item.enabled===false||['archived','draft','disabled','inactive'].includes(String(item.status||'').trim().toLowerCase())?'（小程序不可用）':''].filter(Boolean).join(' · ')}));if(value==='exhibits')return(this.data.attractions||[]).find(x=>x.id===this.form.attractionId)?.exhibits?.filter(x=>x?.id&&(x.status==null||x.status==='published')).map(x=>({label:[x.name||x.id,x.id].filter(Boolean).join(' · '),value:x.id}))||[];if(value==='audioRoutes')return(this.data.audioRoutes||[]).map(x=>({label:x.title||x.id,value:x.id}));if(value==='audioAlbums')return(this.data.audioAlbums||[]).map(x=>({label:x.title||x.id,value:x.id}));if(value==='publish')return publish;if(value==='users')return(this.data.miniprogramUsers||[]).map(user=>({label:(user.nickname||user.id)+' · '+user.id,value:user.id}));if(value==='countries')return(this.data.countries||[]).map(x=>({label:x.name,value:x.id}));if(value==='attractions')return(this.data.attractions||[]).map(x=>({label:(x.name||x.id)+' · '+x.id,value:x.id}));if(value==='destinations')return this.associationDestinationOptions;return value||[]},
    handleEditorTextInput(key){if(this.active!=='audioTracks'||!['title','description'].includes(key))return;['titleTw','titleEn','descriptionTw','descriptionEn'].forEach(target=>this.$set(this.form,target,''))},
    handleEditorSelectChange(key,value){if(this.active==='audioTracks'&&key==='attractionId'&&this.form.exhibitId&&!this.resolveOptions('exhibits').some(option=>option.value===this.form.exhibitId))this.$set(this.form,'exhibitId','')},
    startCreate(){const config=this.currentMenu;const row={};config.fields.forEach(f=>{row[f.key]=f.type==='array'||f.type==='multiselect'||f.type==='checkboxList'?[]:f.type==='object'?{}:f.type==='deepDive'?{preview:'',locked:[]}:f.type==='switch'?true:f.type==='number'?0:f.type==='json'?(['itinerary','days','notices'].includes(f.key)?[]:{}):''});if(['audioRoutes','audioAlbums','audioTracks'].includes(this.active))row.status='unpublished';if(this.active==='audioTracks'){row.category='online';row.unlockMode='locked';row.language='zh-CN';row.previewSeconds=60;row.titleTw='';row.titleEn='';row.descriptionTw='';row.descriptionEn=''}if(this.active==='audioRoutes')row.pointIds=[];if(this.active==='cities'){row.countryId='greece';row.status='draft';row.priceCny=null}if(['homeBanners','miniprogramBanners','heritageGuideBanners'].includes(this.active)){row.id='banner-'+Date.now().toString(36);row.sort=this.items.length+1;row.enabled=true}if(this.active==='miniprogramServiceEntries'){row.id='';row.sort=this.items.length+1;row.enabled=true}if(['miniprogramTravelers','miniprogramDocuments','miniprogramCoupons'].includes(this.active)&&this.data.miniprogramUsers[0])row.userId=this.data.miniprogramUsers[0].id;this.openEditor(row,true)},
    safeEditorHtml(value){const template=document.createElement('template');template.innerHTML=String(value||'');const tags=new Set(['P','DIV','BR','STRONG','B','EM','I','UL','OL','LI','BLOCKQUOTE','H2','H3','A','IMG']);const cleanUrl=(raw,image=false)=>{const value=String(raw||'').trim();if(!value||value.startsWith('//')||/[\\\\\u0000-\u001f]/.test(value)||value.split('/').includes('..'))return'';if(/^https:\/\//i.test(value)){try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?value:''}catch{return''}}if(image)return/^\/?(?:\.\/)?images\/[\w./%-]+$/.test(value)?value:'';return/^mailto:[^\s@]+@[^\s@]+$/i.test(value)||value.startsWith('/')?value:''};const walk=node=>{if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.nodeValue);if(node.nodeType!==Node.ELEMENT_NODE)return null;const tag=node.tagName.toUpperCase();if(tag==='SCRIPT'||tag==='STYLE')return null;if(!tags.has(tag)){const fragment=document.createDocumentFragment();Array.from(node.childNodes).forEach(child=>{const next=walk(child);if(next)fragment.appendChild(next)});return fragment}const element=document.createElement(tag.toLowerCase());if(tag==='A'){const href=cleanUrl(node.getAttribute('href'));if(href)element.setAttribute('href',href)}if(tag==='IMG'){const src=cleanUrl(node.getAttribute('src'),true);if(!src)return null;element.setAttribute('src',src);element.setAttribute('alt',String(node.getAttribute('alt')||'').slice(0,300))}Array.from(node.childNodes).forEach(child=>{const next=walk(child);if(next)element.appendChild(next)});return element};const output=document.createElement('div');Array.from(template.content.childNodes).forEach(node=>{const next=walk(node);if(next)output.appendChild(next)});return output.innerHTML},
    richCommand(command){let value=null;if(command==='createLink'){value=window.prompt('请输入 HTTPS 或站内链接');if(!value)return}document.execCommand(command,false,value)},
    updateObjectRichText(parent,key,event){const value=this.safeEditorHtml(event.currentTarget.innerHTML);if(value!==event.currentTarget.innerHTML)event.currentTarget.innerHTML=value;this.$set(this.form[parent],key,value)},
    updateArrayRichText(parent,index,key,event){const value=this.safeEditorHtml(event.currentTarget.innerHTML);if(value!==event.currentTarget.innerHTML)event.currentTarget.innerHTML=value;this.$set(this.form[parent][index],key,value)},
    editRow(row){if(this.active==='cities'){this.openEditor(row,false);return}this.openEditor(row,false)},
    openEditor(row,isNew){const config=this.currentMenu;this.form=JSON.parse(JSON.stringify(row));if(this.active==='destinations'){const state=this.destinationLinkState(row);this.$set(this.form,'cityId',row.cityId||state.cityId||'');this.$set(this.form,'attractionIds',Object.prototype.hasOwnProperty.call(row,'attractionIds')||Object.prototype.hasOwnProperty.call(row,'attractionId')?state.requestedIds:state.attractionIds);this.destinationAttractionSearch='';this.destinationShowAllCities=false}if(this.active==='attractions')this.$set(this.form,'linkedDestinationIds',this.linkedDestinationIdsForAttraction(this.form.id));(config.fields||[]).filter(f=>f.type==='object').forEach(f=>{const value=this.form[f.key];if(!value||typeof value!=='object'||Array.isArray(value))this.$set(this.form,f.key,{});f.fields.forEach(sub=>{if(this.form[f.key][sub.key]==null)this.$set(this.form[f.key],sub.key,'')})});(config.fields||[]).filter(f=>f.type==='deepDive').forEach(f=>{const value=this.form[f.key];if(!value||typeof value!=='object'||Array.isArray(value))this.$set(this.form,f.key,{preview:'',locked:[]});if(this.form[f.key].preview==null)this.$set(this.form[f.key],'preview','');if(!Array.isArray(this.form[f.key].locked))this.$set(this.form[f.key],'locked',[])});if(['routes','attractions'].includes(this.active)&&this.form.tags!=null)this.form.tags=this.tagValues(this.form.tags).join(' · ');(config.fields||[]).filter(f=>f.type==='multiselect'||f.type==='checkboxList').forEach(f=>{if(!Array.isArray(this.form[f.key]))this.$set(this.form,f.key,this.listValue(this.form[f.key]))});(config.fields||[]).filter(f=>f.type==='array').forEach(f=>{if(typeof this.form[f.key]==='string'){try{this.$set(this.form,f.key,JSON.parse(this.form[f.key]||'[]'))}catch(e){this.$set(this.form,f.key,[])}}if(!Array.isArray(this.form[f.key]))this.$set(this.form,f.key,[]);this.form[f.key].forEach(entry=>{f.fields.forEach(sub=>{if(sub.type==='object'){if(!entry[sub.key])this.$set(entry,sub.key,{});sub.fields.forEach(child=>{if(entry[sub.key][child.key]==null)this.$set(entry[sub.key],child.key,'')})}else if(sub.type==='multiselect'||sub.type==='array'){if(!Array.isArray(entry[sub.key]))this.$set(entry,sub.key,this.listValue(entry[sub.key]))}else if(sub.type==='number'){if(entry[sub.key]==null||entry[sub.key]==='')this.$set(entry,sub.key,sub.min==null?0:sub.min)}})})});this.jsonFields={};(config.fields||[]).filter(f=>f.type==='json').forEach(f=>{this.jsonFields[f.key]=JSON.stringify(this.form[f.key]??(['itinerary','days','notices'].includes(f.key)?[]:{}),null,2)});this.dateRange=[];if(this.active==='customTrips'&&this.form.period){const parts=String(this.form.period).split('~').map(x=>x.trim());if(parts.length===2)this.dateRange=parts}this.editor={isNew,rowId:row.id||row.key||'',title:(isNew?'新增':'编辑')+config.label,template:config.template?templates[config.template]:null,fields:config.fields||[],editorGroups:config.editorGroups||[],...(this.active==='destinations'?{implicitLinks:!isNew&&!Object.prototype.hasOwnProperty.call(row,'attractionIds')&&!Object.prototype.hasOwnProperty.call(row,'attractionId'),originalCityId:this.form.cityId,originalAttractionIds:JSON.stringify(this.form.attractionIds)}:{})};this.recordEditorTab=config.editorGroups?.[0]?.key||'basic';this.jsonError='';this.editorBaseline=this.editorState();this.$nextTick(()=>this.$refs.editForm?.clearValidate())},
    fillTemplate(){const values=JSON.parse(JSON.stringify(this.editor.template.values));Object.keys(values).forEach(k=>this.$set(this.form,k,values[k]));if(this.active==='miniprogramCoupons'&&!this.form.userId&&this.data.miniprogramUsers[0])this.$set(this.form,'userId',this.data.miniprogramUsers[0].id);(this.editor.fields||[]).filter(f=>f.type==='json').forEach(f=>{this.$set(this.jsonFields,f.key,JSON.stringify(this.form[f.key]??(['itinerary','days','notices'].includes(f.key)?[]:{}),null,2))});this.$message.success('示例已填入，请按实际资料调整')},
    editorState(){return JSON.stringify([this.form,this.jsonFields,this.dateRange])},
    async canLeaveEditor(){if(this.busy||this.batchBusy||this.aiFilling){this.$message.warning('操作进行中，请稍后再离开');return false}return !this.editorDirty||await this.confirm('有未保存的修改。离开将丢弃这些修改，确认离开？')},
    handleBeforeUnload(event){if(this.editorDirty||this.busy||this.batchBusy){event.preventDefault();event.returnValue=''}},
    resetEditor(){this.editor=null;this.editorBaseline='';this.form={};this.jsonFields={};this.dateRange=[];this.jsonError='';this.attractionEditorTab='basic';this.recordEditorTab='basic'},
    async closeEditor(){if(await this.canLeaveEditor())this.resetEditor()},
    asArray(value){return Array.isArray(value)?value:[]},
    addArrayEntry(field){if(!Array.isArray(this.form[field.key]))this.$set(this.form,field.key,[]);const row={};field.fields.forEach(f=>{row[f.key]=f.type==='object'?{}:(f.type==='multiselect'||f.type==='array')?[]:f.type==='number'?(f.min==null?0:f.min):''});if('day' in row)row.day=this.form[field.key].length+1;this.form[field.key].push(row)},
    generateCode(){this.$set(this.form,'code','SY-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+Math.random().toString(36).slice(2,7).toUpperCase())},
    removeArrayEntry(key,index){this.form[key].splice(index,1)},
    addDeepDiveSection(key){if(!Array.isArray(this.form[key]?.locked))this.$set(this.form[key],'locked',[]);this.form[key].locked.push('')},
    removeDeepDiveSection(key,index){this.form[key]?.locked?.splice(index,1)},
    updateDeepDiveSection(key,index,value){if(Array.isArray(this.form[key]?.locked))this.$set(this.form[key].locked,index,value)},
    removeSettingsImage(){this.settings.ogImage='';this.$message.success('图片已移除，请保存设置')},
    removeFormImage(key){this.$set(this.form,key,'');this.$message.success('图片已移除，请保存后生效')},
    removeGuideMap(){if(!this.form.guide||typeof this.form.guide!=='object')this.$set(this.form,'guide',{});this.$set(this.form.guide,'mapImage','');this.$message.success('参观地图已移除，请保存后生效')},
    removeNestedImage(parentKey,index,subKey){const entry=this.form[parentKey]?.[index];if(!entry)return;this.$set(entry,subKey,'');this.$message.success('图片已移除，请保存后生效')},
    async uploadImage(req,key){try{if(!/^image\/(png|jpeg|webp)$/.test(req.file.type))throw new Error('仅支持 PNG、JPG 或 WebP 图片');if(req.file.size>6*1024*1024)throw new Error('图片大小需在 6MB 以内');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(req.file)});const result=await this.request('/admin/upload-image',{method:'POST',body:JSON.stringify({name:req.file.name,type:req.file.type,data,...(key==='og'?{}:{prefix:key,updateSettings:false})})});if(key==='og')this.settings.ogImage=result.path;else this.$set(this.form,key,result.path);this.$message.success('图片上传成功');req.onSuccess(result)}catch(e){this.$message.error('图片上传失败：'+e.message);req.onError(e)}},
    async uploadNestedImage(req,parentKey,index,subKey){try{if(!/^image\/(png|jpeg|webp)$/.test(req.file.type))throw new Error('仅支持 PNG、JPG 或 WebP 图片');if(req.file.size>6*1024*1024)throw new Error('图片大小需在 6MB 以内');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(req.file)});const result=await this.request('/admin/upload-image',{method:'POST',body:JSON.stringify({name:req.file.name,type:req.file.type,data,prefix:parentKey,updateSettings:false})});this.$set(this.form[parentKey][index],subKey,result.path);this.$message.success('图片上传成功');req.onSuccess(result)}catch(e){this.$message.error('图片上传失败：'+e.message);req.onError(e)}},
    async uploadGuideMap(req){await this.uploadImage(req,'mapImage');if(this.form.mapImage){this.$set(this.form.guide,'mapImage',this.form.mapImage);this.$delete(this.form,'mapImage')}},
    async uploadAudio(req){try{const file=req.file;if(!/\.(mp3|m4a)$/i.test(file.name)||!/^audio\/(mpeg|mp3|mp4|x-m4a|m4a)$/.test(file.type||''))throw new Error('仅支持 MP3/M4A 音频');if(!file.size||file.size>30*1024*1024)throw new Error('音频须小于 30MB 且不可为空');this.busy=true;const result=await this.request('/admin/upload-audio',{method:'POST',headers:{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name),'X-Preview-Seconds':String(this.form.previewSeconds||60)},body:file});if(!result?.audioFile||!result.previewFile||!Number.isFinite(Number(result.durationSeconds)))throw new Error('音频接口未返回可用的上传结果');['audioFile','previewFile','durationSeconds','previewSeconds'].forEach(key=>this.$set(this.form,key,result[key]));this.$message.success('音频已安全上传，并生成不超过 60 秒的试听文件');req.onSuccess(result)}catch(e){this.$message.error('音频上传失败：'+e.message);req.onError(e)}finally{this.busy=false}},
    async saveEditor(continueEditing=false){
      if(this.busy||this.batchBusy||this.publicationChecking||this.aiFilling)return
      this.busy=true;this.jsonError=''
      try{
        const valid=await new Promise(resolve=>this.$refs.editForm.validate(resolve));if(!valid)return
        const payload=JSON.parse(JSON.stringify(this.form));const desiredDestinationIds=this.active==='attractions'?[...(payload.linkedDestinationIds||[])]:null
        for(const field of this.editor.fields.filter(f=>f.type==='json')){try{payload[field.key]=JSON.parse(this.jsonFields[field.key]||'{}')}catch(e){this.jsonError=field.label+' JSON 格式无效：'+e.message;return}}
        if(['routes','attractions'].includes(this.active)&&payload.tags!=null)payload.tags=this.tagValues(payload.tags)
        if(typeof payload.attractionIds==='string')payload.attractionIds=payload.attractionIds.split(/[,，、\s]+/).filter(Boolean)
        if(this.active==='destinations'){if(!await this.confirmDestinationPublish(payload))return;if(this.editor.implicitLinks&&payload.cityId===this.editor.originalCityId&&JSON.stringify(payload.attractionIds)===this.editor.originalAttractionIds){delete payload.attractionIds;delete payload.attractionId}else payload.attractionId=payload.attractionIds?.[0]||''}
        if(this.active==='attractions')delete payload.linkedDestinationIds
        if(this.active==='customTrips'&&this.dateRange?.length===2)payload.period=this.dateRange.join(' ~ ')
        let result
        if(this.active==='homeBanners'){const list=this.data.homeBanners.slice();if(this.editor.isNew)list.push(payload);else{const i=list.findIndex(x=>x.id===this.editor.rowId);if(i>=0)list.splice(i,1,payload)}await this.request('/admin/home-banners',{method:'PUT',body:JSON.stringify({items:list})});result=payload}
        else{const wasNew=this.editor.isNew,endpoint=this.currentMenu.endpoint,id=encodeURIComponent(this.editor.rowId);result=await this.request('/admin/'+endpoint+(wasNew?'':'/'+id),{method:wasNew?'POST':'PATCH',body:JSON.stringify(payload)})}
        const saved={...payload,...result};this.editor.isNew=false;this.editor.rowId=saved.id||saved.key||this.editor.rowId
        if(this.active==='attractions'){
          const attractionId=result?.id||this.editor.rowId
          if(!attractionId)throw new Error('景点内容已提交，但服务端未返回景点 ID，关联未保存')
          this.$set(this.form,'id',attractionId);this.editor.isNew=false;this.editor.rowId=attractionId
          try{await this.syncAttractionDestinationLinks(attractionId,desiredDestinationIds)}catch(error){await this.verifyAttractions([saved]);await this.loadAll();this.$message.error('景点资料已保存，但关联目的地未完成：'+error.message);return}
          await this.verifyAttractions([saved])
        }
        await this.loadAll();if(continueEditing===true)this.openEditor(saved,false);else this.resetEditor();this.$message.success(result?.token?'后台已保存，分享链接 /trip/'+result.token:'后台已保存')
      }catch(e){this.$message.error(e.message)}finally{this.busy=false}
    },
    async changeAttractionDestinationLinks(row,ids){
      const attractionId=String(row?.id||'');if(!attractionId)return
      this.$set(this.destinationLinkSaving,attractionId,true)
      try{await this.syncAttractionDestinationLinks(attractionId,ids);await this.loadAll();this.$message.success('景点关联已更新')}
      catch(error){this.$message.error('关联修改失败：'+error.message);await this.loadAll()}
      finally{this.$set(this.destinationLinkSaving,attractionId,false)}
    },
    async changeStatus(row,status){if(this.busy||this.batchBusy||this.publicationChecking)return;this.busy=true;try{if(this.active==='destinations'&&!await this.confirmDestinationPublish({...row,status}))return;const endpoint=this.currentMenu.endpoint;const id=encodeURIComponent(row.key||row.id);const path=this.active==='miniprogramTrips'?'/admin/leads/'+id:'/admin/'+endpoint+'/'+id;let patch={status};if(['countries','guides','destinationTypes','homeBanners','miniprogramBanners','miniprogramServiceEntries','heritageGuideBanners'].includes(this.active))patch={enabled:status==='published'};const result=await this.request(path,{method:'PATCH',body:JSON.stringify(patch)});if(this.active==='attractions')await this.verifyAttractions([{...row,...result,status}]);await this.loadAll();this.$message.success('后台状态已保存')}catch(e){this.$message.error(e.message);await this.loadAll()}finally{this.busy=false}},
    async updateVehicleInquiryStatus(row,status){try{await this.request('/admin/leads/'+encodeURIComponent(row.id),{method:'PATCH',body:JSON.stringify({status})});await this.loadAll();this.$message.success('询盘状态已更新')}catch(e){this.$message.error(e.message);this.loadAll()}},
    async deleteVehicleInquiry(row){if(!await this.confirm('确定删除这条用车询盘吗？此操作不可撤销。'))return;try{await this.request('/admin/leads/'+encodeURIComponent(row.id),{method:'DELETE'});await this.loadAll();this.$message.success('用车询盘已删除')}catch(e){this.$message.error(e.message)}},
    selectAttraction(id,checked){if(checked&&!this.selectedAttractionIds.includes(id))this.selectedAttractionIds.push(id);else if(!checked)this.selectedAttractionIds=this.selectedAttractionIds.filter(value=>value!==id)},
    selectAttractionPage(checked){this.selectedAttractionIds=checked?this.paginatedItems.map(row=>row.id):[]},
    async batchAttractionStatus(status){
      if(this.active!=='attractions'||this.attractionView!=='list'||this.busy||this.batchBusy||this.publicationChecking||!['published','unpublished'].includes(status))return
      const targets=this.paginatedItems.filter(row=>this.selectedAttractionIds.includes(row.id)).map(row=>({...row,status}));if(!targets.length)return
      this.batchBusy=true
      try{
        if(!await this.confirm(`将${status==='published'?'发布':'下架'}以下 ${targets.length} 个已勾选景点（仅当前页）。逐项保存，失败项会单独列出：\n${targets.map(row=>`${row.name||'未命名'} · ${row.id}`).join('\n')}`))return
        const saved=[],failed=[]
        for(const row of targets){try{if(!this.token)throw new Error('登录已过期，未执行');const result=await this.request('/admin/attractions/'+encodeURIComponent(row.id),{method:'PATCH',body:JSON.stringify({status})});if(result?.id!==row.id||result.status!==status)throw new Error('保存响应不符，请重新加载核对');saved.push({...row,...result})}catch(error){failed.push({...row,saveError:'保存未确认：'+error.message})}}
        await this.verifyAttractions(saved,failed);await this.loadAll();this.$message[failed.length?'warning':'success'](`批量操作完成：保存成功 ${saved.length} 项，失败/未确认 ${failed.length} 项`)
      }finally{this.batchBusy=false;this.selectedAttractionIds=[]}
    },
    publicationLabel(row){return({checking:'核验中',matched:row.status==='published'?'已公开（匹配）':'已下架（匹配）',mismatch:'结果不一致',unknown:'无法核验',skipped:'未核验'})[row.state]||'未核验'},
    async verifyAttractions(rows,failures=[]){
      if(this.publicationChecking)return
      this.publicationChecking=true;this.publicationCheckedAt=''
      this.publicationResults=[...rows.map(row=>({id:row.id,name:row.name,countryId:row.countryId||'greece',status:row.status,saveError:'',state:'checking',message:''})),...failures.map(row=>({...row,state:'skipped',message:'请重新加载后台核对，不自动重试写入'}))]
      try{for(const country of [...new Set(rows.map(row=>row.countryId||'greece'))]){
        const targets=this.publicationResults.filter(row=>!row.saveError&&row.countryId===country),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000)
        try{
          const response=await fetch('/api/content?country='+encodeURIComponent(country),{cache:'no-store',credentials:'omit',signal:controller.signal});if(!response.ok)throw new Error('公开 API 返回 HTTP '+response.status)
          const content=await response.json();if(!Array.isArray(content.attractions)||!content.attractionDetails||typeof content.attractionDetails!=='object'||Array.isArray(content.attractionDetails))throw new Error('公开响应结构异常')
          for(const row of targets){const item=content.attractions.find(item=>item.id===row.id),detail=Object.prototype.hasOwnProperty.call(content.attractionDetails,row.id);const matches=row.status==='published'?item?.status==='published'&&detail:!item&&!detail;row.state=matches?'matched':'mismatch';row.message=`${country} · 列表${item?'包含':'不包含'} / 详情${detail?'包含':'不包含'}该 ID`}
        }catch(error){for(const row of targets){row.state='unknown';row.message=error.name==='AbortError'?'公开 API 核验超时；后台保存结果不受影响':error.message}}
        finally{clearTimeout(timer)}
      }}finally{this.publicationChecking=false;this.publicationCheckedAt=new Date().toLocaleString('zh-CN')}
    },
    confirm(message){if(this.confirmVisible)return Promise.resolve(false);return new Promise(resolve=>{this.confirmText=message;this.confirmHandler=resolve;this.confirmVisible=true})},
    resolveConfirm(value){this.confirmVisible=false;this.confirmHandler?.(value);this.confirmHandler=null},
    async deleteRow(row){if(!await this.confirm('确定删除这条内容吗？此操作不可撤销。'))return;try{await this.request('/admin/'+this.currentMenu.endpoint+'/'+encodeURIComponent(row.key||row.id),{method:'DELETE'});await this.loadAll();this.$message.success('已删除')}catch(e){this.$message.error(e.message)}},
    async copyGuide(row){if(!await this.confirm('将复制此导游的多语言文案、头像、资质、擅长方向与评价为新草稿，确认继续？'))return;const copy=JSON.parse(JSON.stringify(row));copy.id=(row.id||'guide')+'-copy-'+Date.now().toString(36);copy.name=(copy.name||'导游')+'（副本）';copy.enabled=false;copy.featured=false;this.openEditor(copy,true);this.$message.info('已复制为未发布草稿，请修改导游 ID 与姓名后保存')},
    async saveSettings(){try{this.busy=true;await this.request('/admin/settings',{method:'PATCH',body:JSON.stringify(this.settings)});await this.loadAll();this.$message.success('站点配置已保存')}catch(e){this.$message.error(e.message)}finally{this.busy=false}},
    async saveDetailPage(){try{this.busy=true;this.detailPage=await this.request('/admin/attraction-detail-page',{method:'PATCH',body:JSON.stringify(this.detailPage)});this.$message.success('景点详情配置已保存')}catch(e){this.$message.error(e.message)}finally{this.busy=false}}
  }
}
</script>
<style>
@import './admin-element.css';
.el-dialog.admin-entry-guide{border-radius:12px;overflow:hidden}
.admin-entry-guide .el-dialog__header{padding:22px 26px 16px;border-bottom:1px solid #e2ebeb}
.admin-entry-guide .el-dialog__title{font-size:19px;font-weight:650;color:#21363a}
.admin-entry-guide .el-dialog__body{max-height:76vh;overflow:auto;padding:18px 26px 22px;background:#f7faf9}
.admin-entry-guide .el-dialog__footer{padding:12px 26px;border-top:1px solid #e2ebeb;background:#fff}
.entry-guide-intro{margin:0 0 18px;padding:13px 16px;border-left:3px solid #178c86;border-radius:0 7px 7px 0;background:#eef7f5;color:#53686b}
.entry-guide-intro .eyebrow{color:#14827e;font-size:10px;letter-spacing:.13em}
.entry-guide-intro p{margin:6px 0 0;line-height:1.65}
.entry-guide-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-items:start}
.entry-guide-group h3{margin:0 0 10px;color:#30474b;font-size:14px}
.entry-guide-card{margin-bottom:9px;padding:13px 14px;border:1px solid #e2eaea;border-radius:8px;background:#fff;box-shadow:0 2px 7px rgba(30,64,65,.035)}
.entry-guide-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.entry-guide-card-head strong{color:#20383a;font-size:14px}
.entry-guide-card p{margin:9px 0 0;color:#607174;font-size:12px;line-height:1.6}
.entry-guide-card p b{margin-right:7px;color:#357270;font-weight:600}
.entry-guide-card .entry-guide-desc{margin-top:4px;color:#78878a}
.entry-guide-card .el-button{margin-top:10px}
@media(max-width:700px){.admin-entry-guide .el-dialog__header{padding:18px 18px 14px}.admin-entry-guide .el-dialog__body{padding:14px 14px 18px}.entry-guide-groups{grid-template-columns:1fr;gap:12px}.entry-guide-card{padding:12px}}
.detail-locale-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.detail-locale-grid .el-form-item{margin-bottom:12px}
.el-admin .form-grid.form-grid-single{grid-template-columns:minmax(0,1fr)}
.el-admin .rich-text-control{width:100%;overflow:hidden;border:1px solid #d9e2e5;border-radius:8px;background:#fff;box-shadow:0 1px 2px rgba(25,50,58,.04);transition:border-color .18s ease,box-shadow .18s ease}
.el-admin .rich-text-control:focus-within{border-color:#168c88;box-shadow:0 0 0 3px rgba(22,140,136,.12)}
.el-admin .rich-text-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:8px 10px;border-bottom:1px solid #e8edef;background:linear-gradient(180deg,#fbfdfd,#f5f8f8)}
.el-admin .rich-text-toolbar button{min-width:34px;height:30px;padding:0 10px;border:1px solid transparent;border-radius:5px;background:transparent;color:#40545a;font:inherit;font-size:12px;cursor:pointer;transition:background .15s ease,color .15s ease,border-color .15s ease}
.el-admin .rich-text-toolbar button:hover{border-color:#dce9e9;background:#fff;color:#087f7a}
.el-admin .rich-text-toolbar button:focus-visible{outline:2px solid #168c88;outline-offset:1px}
.el-admin .rich-text-editable{min-height:150px;padding:14px 16px;outline:none;color:#34464b;font-size:14px;line-height:1.8;overflow-wrap:anywhere}
.el-admin .rich-text-editable:empty:before{content:'输入景点介绍… 可使用粗体、列表与安全链接';color:#a0adb1;pointer-events:none}
.el-admin .rich-text-editable p{margin:0 0 10px}
.el-admin .rich-text-editable ul,.el-admin .rich-text-editable ol{padding-left:24px}
.el-admin .rich-text-editable blockquote{margin:10px 0;padding:8px 12px;border-left:3px solid #168c88;border-radius:0 4px 4px 0;background:#f3f9f8;color:#53666b}
.el-admin .rich-text-editable a{color:#087f7a;text-decoration:underline;text-underline-offset:2px}
.el-admin .audio-translation-preview{margin:10px 0 20px;padding:14px 18px;border:1px solid #d9e9e7;border-radius:8px;background:#f5faf9;color:#34464b;overflow-wrap:anywhere}
.el-admin .audio-translation-preview p{margin:8px 0 0;line-height:1.6;white-space:pre-wrap}
</style>
